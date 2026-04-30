import { Session, SessionStatus, SlotStatus, AuditAction, AuditEventType, NotificationType } from '../../../generated/prisma';
import prisma from '../../utils/prisma';
import { ISessionBookPayload, ISessionUpdatePayload } from './session.interface';
import { AppError } from '../../errorHelpers/app-error';
import httpStatus from 'http-status';
import AuditService from '../audit/audit.service';
import NotificationService from '../notification/notification.service';

// ═══════════════════════════════════════════════════════════════
// SESSION STATE MACHINE — Single Source of Truth
// Any transition not listed here is ILLEGAL and will be rejected.
// ═══════════════════════════════════════════════════════════════

const SESSION_STATE_GRAPH: Record<SessionStatus, SessionStatus[]> = {
  PENDING:             [SessionStatus.CONFIRMED, SessionStatus.EXPIRED, SessionStatus.CANCELLED_BY_MENTEE, SessionStatus.REJECTED],
  CONFIRMED:           [SessionStatus.ONGOING, SessionStatus.COMPLETED, SessionStatus.NO_SHOW, SessionStatus.CANCELLED_BY_MENTOR, SessionStatus.DISPUTED],
  ONGOING:             [SessionStatus.COMPLETED, SessionStatus.NO_SHOW],
  COMPLETED:           [SessionStatus.DISPUTED, SessionStatus.SETTLED],
  SETTLED:             [], // Terminal
  CANCELLED_BY_MENTEE: [], // Terminal
  CANCELLED_BY_MENTOR: [], // Terminal
  EXPIRED:             [], // Terminal
  NO_SHOW:             [SessionStatus.DISPUTED],
  DISPUTED:            [SessionStatus.REFUNDED, SessionStatus.COMPLETED], // Admin override
  REFUNDED:            [], // Terminal
  REJECTED:            [], // Terminal
};

function assertTransition(from: SessionStatus, to: SessionStatus): void {
  const allowed = SESSION_STATE_GRAPH[from];
  if (!allowed || !allowed.includes(to)) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Illegal transition: ${from} → ${to}. Allowed: [${(allowed || []).join(', ')}]`
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// BOOK SESSION — Atomic, Version-Locked, Idempotent
// ═══════════════════════════════════════════════════════════════

const bookSession = async (
  menteeId: string,
  payload: ISessionBookPayload
): Promise<Session> => {
  const { availabilitySlotId, serviceId, notes, idempotencyKey } = payload;

  // Idempotency guard: check if this exact booking already exists
  if (idempotencyKey) {
    const existing = await prisma.session.findUnique({
      where: { menteeId_idempotencyKey: { menteeId, idempotencyKey } },
    });
    if (existing) return existing;
  }

  return await prisma.$transaction(async (tx) => {
    // 1. ATOMIC SLOT LOCK — Version-based conditional update
    //    This is the ONLY way to prevent double-booking under concurrent load.
    const lockResult = await tx.availabilitySlot.updateMany({
      where: {
        id: availabilitySlotId,
        status: SlotStatus.AVAILABLE,
      },
      data: {
        status: SlotStatus.BOOKED,
        version: { increment: 1 },
      },
    });

    if (lockResult.count === 0) {
      throw new AppError(httpStatus.CONFLICT, "Slot is no longer available. It may have been booked by another user.");
    }

    // 2. Validate slot and mentor authorization
    const slot = await tx.availabilitySlot.findUnique({
      where: { id: availabilitySlotId },
      include: {
        mentor: {
          include: {
            user: {
              include: {
                userRoles: {
                  where: { role: 'MENTOR', revokedAt: null }
                }
              }
            }
          }
        }
      }
    });

    if (!slot) {
      throw new AppError(httpStatus.NOT_FOUND, "Availability slot not found");
    }

    if (!slot.mentor.user || slot.mentor.user.deletedAt || slot.mentor.user.userRoles.length === 0) {
      throw new AppError(httpStatus.FORBIDDEN, "This mentor is no longer authorized to accept bookings");
    }

    // 3. Validate service offering
    const service = await tx.serviceOffering.findUnique({
      where: { id: serviceId }
    });

    if (!service) {
      throw new AppError(httpStatus.NOT_FOUND, "Service offering not found");
    }

    if (service.mentorId !== slot.mentorId) {
      throw new AppError(httpStatus.BAD_REQUEST, "This service is not offered by the selected mentor");
    }

    if (!service.isActive) {
      throw new AppError(httpStatus.BAD_REQUEST, "This service is currently inactive");
    }

    // ─── NEW: Duration Enforcement ───
    const slotDurationMs = new Date(slot.endTime).getTime() - new Date(slot.startTime).getTime();
    const serviceDurationMs = service.durationMinutes * 60 * 1000;

    if (slotDurationMs < serviceDurationMs) {
      throw new AppError(
        httpStatus.BAD_REQUEST, 
        `The selected time slot (${slotDurationMs / 60000}m) is too short for this ${service.durationMinutes}m consultation type.`
      );
    }

    // 4. Create Session (Atomic — inside same transaction as slot lock)
    const session = await tx.session.create({
      data: {
        mentorId: slot.mentorId,
        menteeId,
        availabilitySlotId,
        serviceId,
        startTime: slot.startTime,
        durationMinutes: service.durationMinutes,
        priceAtBooking: service.price,
        notes,
        idempotencyKey,
        status: SessionStatus.PENDING,
        version: 1,
      }
    });

    // 5. Audit trail
    const menteeUser = await tx.menteeProfile.findUnique({
      where: { id: menteeId },
      include: { user: true }
    });

    await AuditService.log({
      actorId: menteeUser?.user?.id,
      eventType: AuditEventType.SESSION_EVENT,
      action: AuditAction.CREATE,
      entityType: "Session",
      entityId: session.id,
      stateAfter: session
    }, tx);

    // 6. Notify mentor
    await NotificationService.dispatch({
      userId: slot.mentor.user.id,
      type: NotificationType.SESSION_BOOKED,
      title: "New Session Booked",
      body: `A mentee has booked a session with you for ${slot.startTime.toLocaleDateString()}.`,
      entityType: "Session",
      entityId: session.id,
    }, tx);

    // 7. Schedule expiry task (24h SLA for mentor confirmation)
    const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await tx.scheduledTask.create({
      data: {
        taskType: "EXPIRE_PENDING_SESSION",
        entityId: session.id,
        payload: { sessionId: session.id },
        runAt: expiryTime,
      }
    });

    // 8. Increment mentor's total sessions
    await tx.mentorProfile.update({
      where: { id: slot.mentorId },
      data: { totalSessions: { increment: 1 } }
    });

    return session;
  });
};

// ═══════════════════════════════════════════════════════════════
// GET MY SESSIONS
// ═══════════════════════════════════════════════════════════════

const getMySessions = async (userId: string, roles: string[]) => {
  const whereConditions: any = { deletedAt: null };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { mentorProfile: true, menteeProfile: true }
  });

  const orConditions: any[] = [];

  if (roles.includes('MENTOR') && user?.mentorProfile) {
    orConditions.push({ mentorId: user.mentorProfile.id });
  }

  if (roles.includes('MENTEE') && user?.menteeProfile) {
    orConditions.push({ menteeId: user.menteeProfile.id });
  }

  if (orConditions.length > 0) {
    whereConditions.OR = orConditions;
  } else if (!roles.includes('ADMIN')) {
    return [];
  }

  const result = await prisma.session.findMany({
    where: whereConditions,
    include: {
      mentor: { include: { user: true } },
      mentee: { include: { user: true } },
      service: true,
      availabilitySlot: true,
      feedback: true,
      paymentIntent: true,
      actionPlan: true,
    },
    orderBy: { startTime: 'desc' }
  });

  return result;
};

// ═══════════════════════════════════════════════════════════════
// UPDATE SESSION STATUS — Version-Locked, Transition-Guarded
// ═══════════════════════════════════════════════════════════════

const updateSessionStatus = async (
  id: string,
  userId: string,
  payload: ISessionUpdatePayload
): Promise<Session> => {
  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      mentor: { include: { user: true } },
      mentee: { include: { user: true } },
    }
  });

  if (!session) {
    throw new AppError(httpStatus.NOT_FOUND, "Session not found");
  }

  // Authorization check
  const isMentor = session.mentor.user.id === userId;
  const isMentee = session.mentee.user.id === userId;

  // Check admin role for admin overrides
  const actingUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { userRoles: { where: { revokedAt: null } } }
  });
  const isAdmin = actingUser?.userRoles.some(r => r.role === 'ADMIN') ?? false;

  if (!isMentor && !isMentee && !isAdmin) {
    throw new AppError(httpStatus.FORBIDDEN, "Unauthorized access to session");
  }

  // TRANSITION GUARD — enforce the state machine
  if (payload.status) {
    assertTransition(session.status, payload.status);
  }

  // VERSION CHECK — optimistic concurrency control
  if (payload.version !== session.version) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Concurrency conflict: expected version ${payload.version}, current is ${session.version}. Another update was applied first.`
    );
  }

  const { version: _v, ...updateData } = payload;

  const result = await prisma.$transaction(async (tx) => {
    // Atomic version-locked update
    const updateResult = await tx.session.updateMany({
      where: { id, version: payload.version },
      data: {
        ...updateData,
        version: { increment: 1 },
      }
    });

    if (updateResult.count === 0) {
      throw new AppError(httpStatus.CONFLICT, "Session was modified by another request. Please retry.");
    }

    const updatedSession = await tx.session.findUniqueOrThrow({ where: { id } });

    // Audit log for every transition
    await AuditService.log({
      actorId: userId,
      eventType: AuditEventType.SESSION_EVENT,
      action: AuditAction.UPDATE,
      entityType: "Session",
      entityId: id,
      stateBefore: { status: session.status, version: session.version },
      stateAfter: { status: updatedSession.status, version: updatedSession.version },
      reason: `Status transition: ${session.status} → ${updatedSession.status}`,
    }, tx);

    // ─── Side effects based on new status ───

    if (payload.status === SessionStatus.COMPLETED && session.status !== SessionStatus.COMPLETED) {
      await tx.mentorProfile.update({
        where: { id: session.mentorId },
        data: { completedSessions: { increment: 1 } }
      });

      // Schedule settlement (48h dispute window)
      const settleTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
      await tx.scheduledTask.create({
        data: {
          taskType: "SETTLE_SESSION",
          entityId: id,
          payload: { sessionId: id },
          runAt: settleTime,
        }
      });

      await NotificationService.dispatchBulk([
        {
          userId: session.mentor.user.id,
          type: NotificationType.SESSION_COMPLETED,
          title: "Session Completed",
          body: "Your session has been marked as completed.",
          entityType: "Session",
          entityId: id,
        },
        {
          userId: session.mentee.user.id,
          type: NotificationType.SESSION_COMPLETED,
          title: "Session Completed",
          body: "Your session has been marked as completed. You can file a dispute within 48 hours.",
          entityType: "Session",
          entityId: id,
        },
      ], tx);
    }

    // Handle cancellation side effects
    if (
      payload.status === SessionStatus.CANCELLED_BY_MENTEE ||
      payload.status === SessionStatus.CANCELLED_BY_MENTOR
    ) {
      // Release the slot back to AVAILABLE
      await tx.availabilitySlot.update({
        where: { id: session.availabilitySlotId },
        data: { status: SlotStatus.AVAILABLE, version: { increment: 1 } }
      });

      // Recalculate cancel rate
      const totalSessions = await tx.session.count({
        where: { mentorId: session.mentorId }
      });
      const cancelledSessions = await tx.session.count({
        where: {
          mentorId: session.mentorId,
          status: { in: [SessionStatus.CANCELLED_BY_MENTEE, SessionStatus.CANCELLED_BY_MENTOR] }
        }
      });

      const cancelRate = totalSessions > 0 ? (cancelledSessions / totalSessions) * 100 : 0;

      await tx.mentorProfile.update({
        where: { id: session.mentorId },
        data: { cancelRate: parseFloat(cancelRate.toFixed(2)) }
      });

      await NotificationService.dispatchBulk([
        {
          userId: session.mentor.user.id,
          type: NotificationType.SESSION_CANCELLED,
          title: "Session Cancelled",
          body: `A session has been cancelled by the ${payload.status === SessionStatus.CANCELLED_BY_MENTEE ? 'mentee' : 'mentor'}.`,
          entityType: "Session",
          entityId: id,
        },
        {
          userId: session.mentee.user.id,
          type: NotificationType.SESSION_CANCELLED,
          title: "Session Cancelled",
          body: "Your session has been cancelled.",
          entityType: "Session",
          entityId: id,
        },
      ], tx);
    }

    return updatedSession;
  });

  return result;
};

// ═══════════════════════════════════════════════════════════════
// SOFT DELETE (Admin only)
// ═══════════════════════════════════════════════════════════════

const deleteSession = async (id: string): Promise<Session> => {
  const session = await prisma.session.findUnique({ where: { id } });

  if (!session) {
    throw new AppError(httpStatus.NOT_FOUND, "Session not found");
  }

  const result = await prisma.session.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  return result;
};

export const SessionService = {
  bookSession,
  getMySessions,
  updateSessionStatus,
  deleteSession,
  SESSION_STATE_GRAPH,
};
