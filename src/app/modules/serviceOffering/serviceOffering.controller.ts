import { Request, Response } from 'express';
import catchAsync from '../../middlewares/catchAsync';
import { ServiceOfferingService } from './serviceOffering.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { AppError } from '../../errorHelpers/app-error';

const createServiceOffering = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  
  // We need to find the mentorProfile ID for this user
  const mentorProfile = await import('../../utils/prisma').then(m => m.default.mentorProfile.findUnique({
    where: { email: user.email }
  }));

  if (!mentorProfile) {
    throw new AppError(httpStatus.FORBIDDEN, "Only mentors can create service offerings");
  }

  const result = await ServiceOfferingService.createServiceOffering(mentorProfile.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Service offering created successfully",
    data: result
  });
});

const getAllServiceOfferings = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceOfferingService.getAllServiceOfferings(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service offerings fetched successfully",
    data: result
  });
});

const getSingleServiceOffering = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceOfferingService.getSingleServiceOffering(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service offering fetched successfully",
    data: result
  });
});

const updateServiceOffering = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const mentorProfile = await import('../../utils/prisma').then(m => m.default.mentorProfile.findUnique({
    where: { email: user.email }
  }));

  if (!mentorProfile) {
    throw new AppError(httpStatus.FORBIDDEN, "Unauthorized");
  }

  const result = await ServiceOfferingService.updateServiceOffering(req.params.id as string, mentorProfile.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service offering updated successfully",
    data: result
  });
});

const deleteServiceOffering = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const mentorProfile = await import('../../utils/prisma').then(m => m.default.mentorProfile.findUnique({
    where: { email: user.email }
  }));

  if (!mentorProfile) {
    throw new AppError(httpStatus.FORBIDDEN, "Unauthorized");
  }

  const result = await ServiceOfferingService.deleteServiceOffering(req.params.id as string, mentorProfile.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service offering deleted successfully",
    data: result
  });
});

export const ServiceOfferingController = {
  createServiceOffering,
  getAllServiceOfferings,
  getSingleServiceOffering,
  updateServiceOffering,
  deleteServiceOffering
};
