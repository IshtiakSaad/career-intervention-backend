import { Request, Response } from 'express';
import catchAsync from '../../middlewares/catchAsync';
import { AiService } from './ai.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';

const suggestMentors = catchAsync(async (req: Request, res: Response) => {
  const { query } = req.body;
  const result = await AiService.suggestMentors(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'AI successfully analyzed and recommended mentors!',
    data: result
  });
});

export const AiController = {
  suggestMentors
};
