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

const bulkCreateAvailabilitySlots = async (
  mentorId: string,
  payload: IAvailabilitySlotBulkCreatePayload
) => {
  const { startDate, endDate, startTime, endTime, slotDuration } = payload;

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
  
  const slots = [];

  const currentDay = new Date(startDate);
  const lastDay = new Date(endDate);

  while (currentDay <= lastDay) {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    let slotStart = new Date(currentDay);
    slotStart.setHours(startHour, startMin, 0, 0);

    const dayEnd = new Date(currentDay);
    dayEnd.setHours(endHour, endMin, 0, 0);

    while (slotStart < dayEnd) {
      let slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotStart.getMinutes() + slotDuration);

      if (slotEnd <= dayEnd) {
        slots.push({
          mentorId,
          startTime: new Date(slotStart),
          endTime: new Date(slotEnd),
          status: SlotStatus.AVAILABLE
        });
      }
      slotStart = new Date(slotEnd);
    }
    currentDay.setDate(currentDay.getDate() + 1);
  }

  // Use createMany for bulk insertion (Prisma transaction recommended if partial failure is an issue)
  const result = await prisma.availabilitySlot.createMany({
    data: slots,
    skipDuplicates: true
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
