import { Request, Response } from 'express';
import catchAsync from '../../middlewares/catchAsync';
import { SessionService } from './session.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { AppError } from '../../errorHelpers/app-error';
import prisma from '../../utils/prisma';

const bookSession = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  
  // Find menteeProfile
  const menteeProfile = await prisma.menteeProfile.findUnique({
    where: { email: user.email }
  });

  if (!menteeProfile) {
    throw new AppError(httpStatus.FORBIDDEN, "Only mentees can book sessions");
  }

  const result = await SessionService.bookSession(menteeProfile.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Session booked successfully",
    data: result
  });
});

const getMySessions = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const result = await SessionService.getMySessions(user.id, user.roles || []);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Sessions fetched successfully",
    data: result
  });
});

const updateSession = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const result = await SessionService.updateSessionStatus(req.params.id as string, user.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Session updated successfully",
    data: result
  });
});

const deleteSession = catchAsync(async (req: Request, res: Response) => {
  const result = await SessionService.deleteSession(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Session successfully deleted",
    data: result
  });
});

export const SessionController = {
  bookSession,
  getMySessions,
  updateSession,
  deleteSession
};
