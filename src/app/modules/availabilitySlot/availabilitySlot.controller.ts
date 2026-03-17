import { Request, Response } from 'express';
import catchAsync from '../../middlewares/catchAsync';
import { AvailabilitySlotService } from './availabilitySlot.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { AppError } from '../../errorHelpers/app-error';
import prisma from '../../utils/prisma';

const createAvailabilitySlot = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const mentorProfile = await prisma.mentorProfile.findUnique({
    where: { email: user.email }
  });

  if (!mentorProfile) {
    throw new AppError(httpStatus.FORBIDDEN, "Only mentors can manage availability");
  }

  const result = await AvailabilitySlotService.createAvailabilitySlot(mentorProfile.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Availability slot created successfully",
    data: result
  });
});

const bulkCreateAvailabilitySlots = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const mentorProfile = await prisma.mentorProfile.findUnique({
    where: { email: user.email }
  });

  if (!mentorProfile) {
    throw new AppError(httpStatus.FORBIDDEN, "Only mentors can manage availability");
  }

  const result = await AvailabilitySlotService.bulkCreateAvailabilitySlots(mentorProfile.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Bulk availability slots created successfully",
    data: result
  });
});

const getAllAvailabilitySlots = catchAsync(async (req: Request, res: Response) => {
  const result = await AvailabilitySlotService.getAllAvailabilitySlots(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Availability slots fetched successfully",
    data: result
  });
});

const deleteAvailabilitySlot = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const mentorProfile = await prisma.mentorProfile.findUnique({
    where: { email: user.email }
  });

  if (!mentorProfile) {
    throw new AppError(httpStatus.FORBIDDEN, "Unauthorized");
  }

  const result = await AvailabilitySlotService.deleteAvailabilitySlot(req.params.id as string, mentorProfile.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Availability slot deleted successfully",
    data: result
  });
});

export const AvailabilitySlotController = {
  createAvailabilitySlot,
  bulkCreateAvailabilitySlots,
  getAllAvailabilitySlots,
  deleteAvailabilitySlot
};
