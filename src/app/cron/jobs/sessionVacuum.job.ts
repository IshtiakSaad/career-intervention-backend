import { SessionStatus, SlotStatus, PaymentStatus, NotificationType, AuditAction, AuditEventType } from "../../../generated/prisma";
import prisma from "../../utils/prisma";
import { envVars } from "../../config/env";
import AuditService from "../../modules/audit/audit.service";
import NotificationService from "../../modules/notification/notification.service";

/**
 * Session Vacuum Job
 *
 * Sweeps PENDING sessions older than the configured timeout and:
 * 1. Cancels the session (soft-delete)
 * 2. Releases the availability slot back to AVAILABLE
 * 3. Cancels any orphaned PaymentIntents
 * 4. Decrements the mentor's totalSessions counter
 * 5. Logs to AuditService for traceability
 * 6. Notifies the mentee
 *
 * Each session is processed in its own transaction so failures are isolated.
 */
export const sessionVacuum = async (): Promise<void> => {
  const timeoutMinutes = parseInt(envVars.SESSION_PAYMENT_TIMEOUT_MINUTES || "30", 10);
  const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);

  try {
    const staleSessions = await prisma.session.findMany({
      where: {
        status: SessionStatus.PENDING,
        deletedAt: null,
        createdAt: { lt: cutoffTime },
      },
      include: {
        mentee: { include: { user: true } },
        paymentIntent: true,
      },
    });

    if (staleSessions.length === 0) return;

    console.log(`[SessionVacuum] Found ${staleSessions.length} stale PENDING session(s). Sweeping...`);

    for (const session of staleSessions) {
      try {
        await prisma.$transaction(async (tx: any) => {
          // 1. Cancel the session
          await tx.session.update({
            where: { id: session.id },
            data: {
              status: SessionStatus.CANCELLED,
              deletedAt: new Date(),
            },
          });

          // 2. Release the slot
          await tx.availabilitySlot.update({
            where: { id: session.availabilitySlotId },
            data: { status: SlotStatus.AVAILABLE },
          });

          // 3. Cancel orphaned PaymentIntent
          if (
            session.paymentIntent &&
            session.paymentIntent.status !== PaymentStatus.SUCCESS
          ) {
            await tx.paymentIntent.update({
              where: { id: session.paymentIntent.id },
              data: { status: PaymentStatus.CANCELLED },
            });
          }

          // 4. Decrement mentor's totalSessions
          await tx.mentorProfile.update({
            where: { id: session.mentorId },
            data: { totalSessions: { decrement: 1 } },
          });

          // 5. Audit trail
          await AuditService.log(
            {
              eventType: AuditEventType.SESSION_EVENT,
              action: AuditAction.CANCEL,
              entityType: "Session",
              entityId: session.id,
              stateBefore: { status: SessionStatus.PENDING },
              stateAfter: { status: SessionStatus.CANCELLED },
              reason: `Auto-cancelled: payment timeout (${timeoutMinutes}m)`,
            },
            tx
          );

          // 6. Notify the mentee
          await NotificationService.dispatch(
            {
              userId: session.mentee.user.id,
              type: NotificationType.SESSION_CANCELLED,
              title: "Session Cancelled",
              body: `Your session was automatically cancelled due to non-payment within ${timeoutMinutes} minutes.`,
              entityType: "Session",
              entityId: session.id,
            },
            tx
          );
        });

        console.log(`[SessionVacuum] Cancelled session ${session.id}`);
      } catch (err: any) {
        // Log but don't crash the entire sweep
        console.error(`[SessionVacuum] Failed to process session ${session.id}: ${err.message}`);
      }
    }

    console.log(`[SessionVacuum] Sweep complete.`);
  } catch (err: any) {
    console.error(`[SessionVacuum] Fatal error: ${err.message}`);
  }
};
