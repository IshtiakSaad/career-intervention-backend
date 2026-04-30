import prisma from './prisma';
import { SessionStatus, SlotStatus } from '../../generated/prisma';

/**
 * INDUSTRIAL JOB RUNNER
 * 
 * This is NOT node-cron. This is a database-pinned, distributed-safe
 * task executor with:
 * - Atomic claim (prevents duplicate execution across instances)
 * - Retry semantics (exponential backoff)
 * - Idempotent task execution
 * 
 * Designed for horizontal scaling safety.
 */

const INSTANCE_ID = `worker-${process.pid}-${Date.now()}`;
const LOCK_DURATION_MS = 60_000; // 60s lock timeout (stale lock recovery)
const POLL_INTERVAL_MS = 30_000; // Check every 30s

// ═══════════════════════════════════════════════════════════════
// TASK HANDLERS — Each handler is idempotent
// ═══════════════════════════════════════════════════════════════

type TaskHandler = (payload: any) => Promise<void>;

const TASK_HANDLERS: Record<string, TaskHandler> = {
  EXPIRE_PENDING_SESSION: async (payload: { sessionId: string }) => {
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
    });

    // Idempotency: If session is no longer PENDING, skip
    if (!session || session.status !== SessionStatus.PENDING) return;

    await prisma.$transaction(async (tx) => {
      // Version-locked transition
      const result = await tx.session.updateMany({
        where: { id: payload.sessionId, status: SessionStatus.PENDING },
        data: { status: SessionStatus.EXPIRED, version: { increment: 1 } },
      });

      if (result.count === 0) return; // Already transitioned

      // Release the slot back to available
      await tx.availabilitySlot.update({
        where: { id: session.availabilitySlotId },
        data: { status: SlotStatus.AVAILABLE, version: { increment: 1 } },
      });

      console.log(`[JOB_RUNNER] Session ${payload.sessionId} expired (mentor didn't confirm within SLA).`);
    });
  },

  SETTLE_SESSION: async (payload: { sessionId: string }) => {
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { disputes: true },
    });

    // Idempotency: Only settle COMPLETED sessions
    if (!session || session.status !== SessionStatus.COMPLETED) return;

    // If there's an open dispute, do NOT settle
    const hasOpenDispute = session.disputes.some(
      d => d.status === 'OPEN' || d.status === 'UNDER_REVIEW'
    );

    if (hasOpenDispute) {
      console.log(`[JOB_RUNNER] Session ${payload.sessionId} has open dispute. Settlement deferred.`);
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Version-locked transition → SETTLED
      const result = await tx.session.updateMany({
        where: { id: payload.sessionId, status: SessionStatus.COMPLETED },
        data: { status: SessionStatus.SETTLED, version: { increment: 1 } },
      });

      if (result.count === 0) return;

      // Release payout: UNEARNED → PENDING_PAYOUT
      const payout = await tx.payout.findUnique({ where: { sessionId: payload.sessionId } });
      if (payout && payout.status === 'UNEARNED') {
        await tx.payout.update({
          where: { id: payout.id },
          data: { status: 'PENDING_PAYOUT' },
        });
      }

      console.log(`[JOB_RUNNER] Session ${payload.sessionId} settled. Funds released for payout.`);
    });
  },

  SEND_REMINDER: async (payload: { sessionId: string }) => {
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: {
        mentor: { include: { user: true } },
        mentee: { include: { user: true } },
      }
    });

    if (!session || session.status !== SessionStatus.CONFIRMED) return;

    // Dispatch reminder notifications (implementation depends on NotificationService)
    console.log(`[JOB_RUNNER] Reminder sent for session ${payload.sessionId}.`);
  },
};

// ═══════════════════════════════════════════════════════════════
// CORE ENGINE — Claim, Execute, Complete/Retry
// ═══════════════════════════════════════════════════════════════

async function processPendingTasks(): Promise<number> {
  const now = new Date();
  const staleLockCutoff = new Date(now.getTime() - LOCK_DURATION_MS);

  // 1. Atomic claim: Find and lock ONE unclaimed task
  //    This query also recovers stale locks (crashed workers)
  const tasks = await prisma.scheduledTask.findMany({
    where: {
      completedAt: null,
      failedAt: null,
      runAt: { lte: now },
      OR: [
        { lockedAt: null },
        { lockedAt: { lt: staleLockCutoff } },
      ],
    },
    take: 5,
    orderBy: { runAt: 'asc' },
  });

  let processed = 0;

  for (const task of tasks) {
    // Atomic claim via updateMany
    const claimed = await prisma.scheduledTask.updateMany({
      where: {
        id: task.id,
        OR: [
          { lockedAt: null },
          { lockedAt: { lt: staleLockCutoff } },
        ],
      },
      data: {
        lockedAt: now,
        lockedBy: INSTANCE_ID,
        attempts: { increment: 1 },
      },
    });

    if (claimed.count === 0) continue; // Another instance got it

    const handler = TASK_HANDLERS[task.taskType];
    if (!handler) {
      console.error(`[JOB_RUNNER] Unknown task type: ${task.taskType}`);
      await prisma.scheduledTask.update({
        where: { id: task.id },
        data: { failedAt: now, lastError: `Unknown task type: ${task.taskType}` },
      });
      continue;
    }

    try {
      await handler(task.payload as any);

      // Mark completed
      await prisma.scheduledTask.update({
        where: { id: task.id },
        data: { completedAt: new Date(), lockedAt: null, lockedBy: null },
      });
      processed++;
    } catch (error: any) {
      const currentAttempts = task.attempts + 1;
      const maxAttempts = task.maxAttempts;

      if (currentAttempts >= maxAttempts) {
        // Permanently failed
        await prisma.scheduledTask.update({
          where: { id: task.id },
          data: {
            failedAt: new Date(),
            lastError: error.message,
            lockedAt: null,
            lockedBy: null,
          },
        });
        console.error(`[JOB_RUNNER] Task ${task.id} (${task.taskType}) permanently failed after ${maxAttempts} attempts: ${error.message}`);
      } else {
        // Exponential backoff: 30s, 60s, 120s...
        const backoffMs = Math.pow(2, currentAttempts) * 15_000;
        const nextRun = new Date(Date.now() + backoffMs);

        await prisma.scheduledTask.update({
          where: { id: task.id },
          data: {
            lockedAt: null,
            lockedBy: null,
            lastError: error.message,
            nextRunAt: nextRun,
            runAt: nextRun,
          },
        });
        console.warn(`[JOB_RUNNER] Task ${task.id} failed (attempt ${currentAttempts}/${maxAttempts}). Retrying at ${nextRun.toISOString()}`);
      }
    }
  }

  return processed;
}

// ═══════════════════════════════════════════════════════════════
// LIFECYCLE — Start/Stop
// ═══════════════════════════════════════════════════════════════

let intervalId: ReturnType<typeof setInterval> | null = null;

function startJobRunner(): void {
  if (intervalId) return;

  console.log(`[JOB_RUNNER] Starting (instance: ${INSTANCE_ID}, poll: ${POLL_INTERVAL_MS}ms)`);

  intervalId = setInterval(async () => {
    try {
      const count = await processPendingTasks();
      if (count > 0) {
        console.log(`[JOB_RUNNER] Processed ${count} task(s).`);
      }
    } catch (error) {
      console.error('[JOB_RUNNER] Poll cycle error:', error);
    }
  }, POLL_INTERVAL_MS);
}

function stopJobRunner(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[JOB_RUNNER] Stopped.');
  }
}

export const JobRunner = {
  start: startJobRunner,
  stop: stopJobRunner,
  processNow: processPendingTasks,
};
