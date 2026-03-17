import { Request, Response } from "express";
import catchAsync from "../../middlewares/catchAsync";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { MentorService } from "./mentor.service";
import pick from "../../utils/pick";
import { mentorFilterableFields } from "./mentor.constant";

const getAllMentors = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, mentorFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await MentorService.getAllMentors(filters, options);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Mentors fetched successfully!",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleMentor = catchAsync(async (req: Request, res: Response) => {
  const result = await MentorService.getSingleMentor(req.params.id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Mentor fetched successfully!",
    data: result,
  });
});

const verifyMentor = catchAsync(async (req: Request, res: Response) => {
  const { isVerified } = req.body;
  const result = await MentorService.verifyMentor(req.params.id as string, isVerified);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Mentor verification status updated!",
    data: result,
  });
});

export const MentorController = {
  getAllMentors,
  getSingleMentor,
  verifyMentor,
};
