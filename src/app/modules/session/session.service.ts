import { Session, SessionStatus, SlotStatus, AuditAction, AuditEventType } from '../../../generated/prisma';
import prisma from '../../utils/prisma';
import { ISessionBookPayload, ISessionUpdatePayload } from './session.interface';
import { AppError } from '../../errorHelpers/app-error';
import httpStatus from 'http-status';
import AuditService from '../audit/audit.service';

const bookSession = async (
  menteeId: string,
  payload: ISessionBookPayload
): Promise<Session> => {
  const { availabilitySlotId, serviceId, notes } = payload;

  return await prisma.$transaction(async (tx) => {
    // 1. Check if slot is available and valid
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

    // Security Check: Is the mentor still authorized to teach?
    if (!slot.mentor.user || slot.mentor.user.deletedAt || slot.mentor.user.userRoles.length === 0) {
      throw new AppError(httpStatus.FORBIDDEN, "This mentor is no longer authorized to accept bookings");
    }

    if (slot.status !== SlotStatus.AVAILABLE) {
      throw new AppError(httpStatus.BAD_REQUEST, "Slot is no longer available");
    }

    // 2. Check if service exists and belongs to the same mentor
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

    // 3. Create Session with snapshots
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
        status: SessionStatus.PENDING
      }
    });

    await AuditService.log({
        actorId: (await tx.menteeProfile.findUnique({ where: { id: menteeId } }))?.userId,
        eventType: AuditEventType.SESSION_EVENT,
        action: AuditAction.CREATE,
        entityType: "Session",
        entityId: session.id,
        stateAfter: session
    }, tx);

    // 4. Update Slot Status
    await tx.availabilitySlot.update({
      where: { id: availabilitySlotId },
      data: { status: SlotStatus.BOOKED }
    });

    // 5. Increment Mentor's Total Sessions
    await tx.mentorProfile.update({
      where: { id: slot.mentorId },
      data: { totalSessions: { increment: 1 } }
    });

    return session;
  });
};

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
    // If not admin and no matching profiles found, return empty
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
      paymentIntent: true
    },
    orderBy: { startTime: 'desc' }
  });

  return result;
};

const updateSessionStatus = async (
  id: string,
  userId: string,
  payload: ISessionUpdatePayload
): Promise<Session> => {
  const session = await prisma.session.findUnique({
    where: { id },
    include: { mentor: { include: { user: true } }, mentee: { include: { user: true } } }
  });

  if (!session) {
    throw new AppError(httpStatus.NOT_FOUND, "Session not found");
  }

  // Authorization check (only involved parties)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (session.mentor.user.id !== userId && session.mentee.user.id !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, "Unauthorized access to session");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedSession = await tx.session.update({
      where: { id },
      data: payload
    });

    // If status changed to COMPLETED, increment mentor's completedSessions
    if (payload.status === SessionStatus.COMPLETED && session.status !== SessionStatus.COMPLETED) {
      await tx.mentorProfile.update({
        where: { id: session.mentorId },
        data: { completedSessions: { increment: 1 } }
      });
    }

    // If status changed to CANCELLED, update cancelRate
    if (payload.status === SessionStatus.CANCELLED && session.status !== SessionStatus.CANCELLED) {
      const totalSessions = await tx.session.count({
        where: { mentorId: session.mentorId }
      });
      const cancelledSessions = await tx.session.count({
        where: { mentorId: session.mentorId, status: SessionStatus.CANCELLED }
      });

      const cancelRate = totalSessions > 0 ? (cancelledSessions / totalSessions) * 100 : 0;

      await tx.mentorProfile.update({
        where: { id: session.mentorId },
        data: { cancelRate: parseFloat(cancelRate.toFixed(2)) }
      });
    }

    return updatedSession;
  });

  return result;
};

const deleteSession = async (id: string): Promise<Session> => {
  const session = await prisma.session.findUnique({ where: { id } });

  if (!session) {
    throw new AppError(httpStatus.NOT_FOUND, "Session not found");
  }

  const result = await prisma.session.update({
    where: { id },
    data: { deletedAt: new Date(), status: SessionStatus.CANCELLED }
  });

  return result;
};

export const SessionService = {
  bookSession,
  getMySessions,
  updateSessionStatus,
  deleteSession
};
