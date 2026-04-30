import { ActionPlan, ActionPlanStatus, SessionStatus, AuditAction, AuditEventType } from '../../../generated/prisma';
import prisma from '../../utils/prisma';
import { AppError } from '../../errorHelpers/app-error';
import httpStatus from 'http-status';
import AuditService from '../audit/audit.service';

// ═══════════════════════════════════════════════════════════════
// ACTION PLAN SERVICE
// Structured post-session deliverables with versioning.
// Only the Mentor who conducted the session can create/edit.
// ═══════════════════════════════════════════════════════════════

export interface IActionPlanPayload {
  summary: string;
  tasks: Array<{ title: string; deadline?: string; isDone: boolean }>;
  resources?: Array<{ label: string; url: string }>;
  notes?: string;
}

const createActionPlan = async (
  sessionId: string,
  mentorUserId: string,
  payload: IActionPlanPayload
): Promise<ActionPlan> => {
  // 1. Verify session exists and is COMPLETED (or SETTLED)
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      mentor: { include: { user: true } },
      actionPlan: true,
    }
  });

  if (!session) {
    throw new AppError(httpStatus.NOT_FOUND, "Session not found");
  }

  // 2. Authorization: Only the session's mentor can create
  if (session.mentor.user.id !== mentorUserId) {
    throw new AppError(httpStatus.FORBIDDEN, "Only the session mentor can create an action plan");
  }

  // 3. Session must be completed
  if (session.status !== SessionStatus.COMPLETED && session.status !== SessionStatus.SETTLED) {
    throw new AppError(httpStatus.BAD_REQUEST, "Action plans can only be created for completed sessions");
  }

  // 4. Idempotency: If plan already exists, reject (use update instead)
  if (session.actionPlan) {
    throw new AppError(httpStatus.CONFLICT, "An action plan already exists for this session. Use update instead.");
  }

  const actionPlan = await prisma.$transaction(async (tx) => {
    const plan = await tx.actionPlan.create({
      data: {
        sessionId,
        summary: payload.summary,
        tasks: payload.tasks as any,
        resources: (payload.resources || []) as any,
        notes: payload.notes,
        status: ActionPlanStatus.DRAFT,
        version: 1,
      }
    });

    await AuditService.log({
      actorId: mentorUserId,
      eventType: AuditEventType.SESSION_EVENT,
      action: AuditAction.CREATE,
      entityType: "ActionPlan",
      entityId: plan.id,
      stateAfter: plan,
      reason: "Action plan created for completed session",
    }, tx);

    return plan;
  });

  return actionPlan;
};

const updateActionPlan = async (
  planId: string,
  mentorUserId: string,
  payload: Partial<IActionPlanPayload>,
  expectedVersion: number
): Promise<ActionPlan> => {
  const plan = await prisma.actionPlan.findUnique({
    where: { id: planId },
    include: {
      session: {
        include: { mentor: { include: { user: true } } }
      }
    }
  });

  if (!plan) {
    throw new AppError(httpStatus.NOT_FOUND, "Action plan not found");
  }

  if (plan.session.mentor.user.id !== mentorUserId) {
    throw new AppError(httpStatus.FORBIDDEN, "Only the session mentor can update the action plan");
  }

  // Version lock
  if (plan.version !== expectedVersion) {
    throw new AppError(httpStatus.CONFLICT, `Concurrency conflict: expected version ${expectedVersion}, current is ${plan.version}`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updateResult = await tx.actionPlan.updateMany({
      where: { id: planId, version: expectedVersion },
      data: {
        ...(payload.summary !== undefined && { summary: payload.summary }),
        ...(payload.tasks !== undefined && { tasks: payload.tasks as any }),
        ...(payload.resources !== undefined && { resources: payload.resources as any }),
        ...(payload.notes !== undefined && { notes: payload.notes }),
        status: ActionPlanStatus.REVISED,
        version: { increment: 1 },
      }
    });

    if (updateResult.count === 0) {
      throw new AppError(httpStatus.CONFLICT, "Action plan was modified by another request");
    }

    const updated = await tx.actionPlan.findUniqueOrThrow({ where: { id: planId } });

    await AuditService.log({
      actorId: mentorUserId,
      eventType: AuditEventType.SESSION_EVENT,
      action: AuditAction.UPDATE,
      entityType: "ActionPlan",
      entityId: planId,
      stateBefore: { version: expectedVersion },
      stateAfter: { version: updated.version },
      reason: "Action plan revised",
    }, tx);

    return updated;
  });

  return result;
};

const submitActionPlan = async (
  planId: string,
  mentorUserId: string
): Promise<ActionPlan> => {
  const plan = await prisma.actionPlan.findUnique({
    where: { id: planId },
    include: {
      session: {
        include: { mentor: { include: { user: true } } }
      }
    }
  });

  if (!plan) {
    throw new AppError(httpStatus.NOT_FOUND, "Action plan not found");
  }

  if (plan.session.mentor.user.id !== mentorUserId) {
    throw new AppError(httpStatus.FORBIDDEN, "Only the session mentor can submit the action plan");
  }

  if (plan.status === ActionPlanStatus.SUBMITTED) {
    throw new AppError(httpStatus.BAD_REQUEST, "Action plan is already submitted");
  }

  const updated = await prisma.actionPlan.update({
    where: { id: planId },
    data: { status: ActionPlanStatus.SUBMITTED }
  });

  return updated;
};

const getActionPlanBySessionId = async (sessionId: string) => {
  return await prisma.actionPlan.findUnique({
    where: { sessionId },
  });
};

const getMyActionPlans = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { menteeProfile: true, mentorProfile: true }
  });

  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

  const conditions: any[] = [];

  if (user.menteeProfile) {
    conditions.push({ session: { menteeId: user.menteeProfile.id } });
  }
  if (user.mentorProfile) {
    conditions.push({ session: { mentorId: user.mentorProfile.id } });
  }

  if (conditions.length === 0) return [];

  return await prisma.actionPlan.findMany({
    where: { OR: conditions, status: ActionPlanStatus.SUBMITTED },
    include: {
      session: {
        include: {
          mentor: { include: { user: { select: { name: true, email: true, profileImageUrl: true } } } },
          mentee: { include: { user: { select: { name: true, email: true, profileImageUrl: true } } } },
          service: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

export const ActionPlanService = {
  createActionPlan,
  updateActionPlan,
  submitActionPlan,
  getActionPlanBySessionId,
  getMyActionPlans,
};
