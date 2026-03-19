import { Request, Response } from "express";
import catchAsync from "../../middlewares/catchAsync";
import { MentorApplicationService } from "./mentorApplication.service";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";

const submitApplication = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const result = await MentorApplicationService.submitApplication(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Application submitted successfully",
    data: result,
  });
});

const reviewApplication = catchAsync(async (req: Request, res: Response) => {
  const adminId = (req as any).user.id;
  const { status, feedback } = req.body;
  const { id } = req.params;

  const result = await MentorApplicationService.reviewApplication(adminId, id as string, status, feedback);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Application ${status.toLowerCase()} successfully`,
    data: result,
  });
});

const getMyApplications = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const result = await MentorApplicationService.getMyApplications(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your applications fetched successfully",
    data: result,
  });
});

const getAllApplications = catchAsync(async (req: Request, res: Response) => {
  const result = await MentorApplicationService.getAllApplications(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All applications fetched successfully",
    data: result,
  });
});

const getSingleApplication = catchAsync(async (req: Request, res: Response) => {
  const result = await MentorApplicationService.getSingleApplication(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Application details fetched successfully",
    data: result,
  });
});

const resubmitApplication = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { id } = req.params;
  
  const result = await MentorApplicationService.resubmitApplication(userId, id as string, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Application resubmitted successfully!",
    data: result,
  });
});

export const MentorApplicationController = {
  submitApplication,
  reviewApplication,
  getMyApplications,
  getAllApplications,
  getSingleApplication,
  resubmitApplication
};
