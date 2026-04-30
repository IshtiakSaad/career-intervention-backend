import { AvailabilitySlot, SlotStatus } from '../../../generated/prisma';
import prisma from '../../utils/prisma';
import { IAvailabilitySlotCreatePayload, IAvailabilitySlotBulkCreatePayload } from './availabilitySlot.interface';
import { AppError } from '../../errorHelpers/app-error';
import httpStatus from 'http-status';

const createAvailabilitySlot = async (
  mentorId: string,
  payload: IAvailabilitySlotCreatePayload
): Promise<AvailabilitySlot> => {
  const { startTime, endTime } = payload;

  if (new Date(startTime) >= new Date(endTime)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Start time must be before end time");
  }

  // Security Check: Is the mentor still authorized?
  const mentor = await prisma.mentorProfile.findUnique({
    where: { id: mentorId },
    include: { 
      user: { 
        include: { 
          userRoles: { 
            where: { role: 'MENTOR', revokedAt: null } 
          } 
        } 
      } 
    }
  });

  if (!mentor?.user || mentor.user.deletedAt || mentor.user.userRoles.length === 0) {
    throw new AppError(httpStatus.FORBIDDEN, "You are no longer authorized to create slots");
  }

  // Check for conflicts
  const isConflict = await prisma.availabilitySlot.findFirst({
    where: {
      mentorId,
      OR: [
        {
          startTime: { lte: new Date(startTime) },
          endTime: { gt: new Date(startTime) }
        },
        {
          startTime: { lt: new Date(endTime) },
          endTime: { gte: new Date(endTime) }
        }
      ]
    }
  });

  if (isConflict) {
    throw new AppError(httpStatus.CONFLICT, "Time slot overlaps with an existing slot");
  }

  const result = await prisma.availabilitySlot.create({
    data: {
      ...payload,
      mentorId
    }
  });

  return result;
};

import { fromZonedTime } from "date-fns-tz";

const bulkCreateAvailabilitySlots = async (
  mentorId: string,
  payload: IAvailabilitySlotBulkCreatePayload,
  idempotencyKey: string
) => {
  const { serviceId, startDate, endDate, weekdays, dailyStartTime, dailyEndTime, timezone } = payload;

  // Security Check & Duration Extraction
  const mentor = await prisma.mentorProfile.findUnique({
    where: { id: mentorId },
    include: {
      serviceOfferings: { where: { id: serviceId } }
    }
  });

  if (!mentor) {
    throw new AppError(httpStatus.FORBIDDEN, "You are no longer authorized to create slots");
  }

  const service = mentor.serviceOfferings[0];
  if (!service) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid or unauthorized service offering selected");
  }

  const serviceDurationMinutes = service.durationMinutes;
  const bufferMinutes = service.bufferMinutes || 0;

  // 1. Idempotency Check
  const existingIdempotency = await prisma.idempotencyKey.findUnique({
    where: { key: idempotencyKey }
  });

  if (existingIdempotency) {
    return existingIdempotency.response; // Return cached response
  }

  // 2. Slot Generation Logic
  const slots: { startTime: Date; endTime: Date; bufferEndTime: Date }[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  const [startHour, startMin] = dailyStartTime.split(":").map(Number);
  const [endHour, endMin] = dailyEndTime.split(":").map(Number);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (!weekdays.includes(d.getDay())) continue;

    let current = new Date(d);
    current.setHours(startHour, startMin, 0, 0);

    const dayEnd = new Date(d);
    dayEnd.setHours(endHour, endMin, 0, 0);

    while (current < dayEnd) {
      const slotStartLocal = new Date(current);
      const slotEndLocal = new Date(current.getTime() + serviceDurationMinutes * 60000);
      const slotBufferEndLocal = new Date(slotEndLocal.getTime() + bufferMinutes * 60000);

      // Session must fit inside working hours
      if (slotEndLocal > dayEnd) break;

      // Convert to UTC
      const startUTC = fromZonedTime(slotStartLocal, timezone);
      const endUTC = fromZonedTime(slotEndLocal, timezone);
      const bufferEndUTC = fromZonedTime(slotBufferEndLocal, timezone);

      // Reject past slots
      if (startUTC <= new Date()) {
        current = slotBufferEndLocal;
        continue;
      }

      slots.push({ startTime: startUTC, endTime: endUTC, bufferEndTime: bufferEndUTC });
      
      // Advance to after the buffer concludes
      current = slotBufferEndLocal;
    }
  }

  // HARD LIMIT
  if (slots.length > 500) {
    throw new AppError(httpStatus.BAD_REQUEST, "Slot generation limit exceeded (max 500)");
  }

  // 3. Database Insertion (Atomic Loop with Deduplication)
  const result = await prisma.$transaction(async (tx) => {
    let created = 0;
    let skipped = 0;

    for (const slot of slots) {
      try {
        const hasOverlap = await tx.availabilitySlot.findFirst({
          where: {
            mentorId,
            startTime: { lt: slot.bufferEndTime },
            OR: [
              { bufferEndTime: { gt: slot.startTime } },
              { bufferEndTime: null, endTime: { gt: slot.startTime } }
            ]
          }
        });

        if (hasOverlap) {
          skipped++;
          continue;
        }

        await tx.availabilitySlot.create({
          data: {
            mentorId,
            startTime: slot.startTime,
            endTime: slot.endTime,
            bufferEndTime: slot.bufferEndTime,
            status: SlotStatus.AVAILABLE,
            batchId: idempotencyKey
          }
        });
        created++;
      } catch (e) {
        // Fallback for strict database constraints
        skipped++; 
      }
    }

    return { created, skipped, totalAttempted: slots.length };
  }, {
    timeout: 10000 // give transaction time for bulk iterations
  });

  // 4. Trace Idempotency
  await prisma.idempotencyKey.create({
    data: {
      key: idempotencyKey,
      userId: mentorId,
      response: result
    }
  });

  return result;
};

const getAllAvailabilitySlots = async (filters: any) => {
  const { mentorId, status, startDate, endDate } = filters;
  const whereConditions: any = {};

  if (mentorId) whereConditions.mentorId = mentorId;
  if (status) whereConditions.status = status;
  
  if (startDate || endDate) {
    whereConditions.startTime = {};
    if (startDate) whereConditions.startTime.gte = new Date(startDate);
    if (endDate) whereConditions.startTime.lte = new Date(endDate);
  }

  const result = await prisma.availabilitySlot.findMany({
    where: whereConditions,
    include: {
        mentor: {
            include: {
                user: true
            }
        }
    },
    orderBy: { startTime: 'asc' }
  });

  return result;
};

const deleteAvailabilitySlot = async (id: string, mentorId: string): Promise<AvailabilitySlot> => {
  const isExist = await prisma.availabilitySlot.findUnique({
    where: { id, mentorId }
  });

  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, "Slot not found or unauthorized");
  }

  if (isExist.status === SlotStatus.BOOKED) {
    throw new AppError(httpStatus.BAD_REQUEST, "Cannot delete a booked slot");
  }

  const result = await prisma.availabilitySlot.delete({
    where: { id }
  });

  return result;
};

export const AvailabilitySlotService = {
  createAvailabilitySlot,
  bulkCreateAvailabilitySlots,
  getAllAvailabilitySlots,
  deleteAvailabilitySlot
};
