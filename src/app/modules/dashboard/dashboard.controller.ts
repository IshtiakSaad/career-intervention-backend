import { Request, Response } from "express";
import catchAsync from "../../middlewares/catchAsync";
import DashboardService from "./dashboard.service";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import prisma from "../../utils/prisma";
import { AppError } from "../../errorHelpers/app-error";

const getAdminStats = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getAdminStats();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin dashboard stats fetched successfully",
    data: result,
  });
});

const getMentorStats = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  
  // 1. Resolve MentorProfile from User email
  const mentorProfile = await prisma.mentorProfile.findUnique({
    where: { email: user.email },
    select: { id: true }
  });

  if (!mentorProfile) {
    throw new AppError(httpStatus.NOT_FOUND, "Mentor profile not found");
  }
  
  const result = await DashboardService.getMentorStats(mentorProfile.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Mentor dashboard stats fetched successfully",
    data: result,
  });
});

export const DashboardController = {
  getAdminStats,
  getMentorStats,
};
