import { Request, Response } from 'express';
import catchAsync from '../../middlewares/catchAsync';
import { FeedbackService } from './feedback.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';

const createFeedback = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const result = await FeedbackService.createFeedback(user.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Feedback submitted successfully",
    data: result
  });
});

const getMentorFeedbacks = catchAsync(async (req: Request, res: Response) => {
  const result = await FeedbackService.getMentorFeedbacks(req.params.mentorId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Mentor feedbacks fetched successfully",
    data: result
  });
});

export const FeedbackController = {
  createFeedback,
  getMentorFeedbacks
};
