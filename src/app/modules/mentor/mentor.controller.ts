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

const updateMentor = catchAsync(async (req: Request, res: Response) => {
  const result = await MentorService.updateMentor(req.params.id as string, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Mentor updated successfully!",
    data: result,
  });
});

const deleteMentor = catchAsync(async (req: Request, res: Response) => {
  const result = await MentorService.deleteMentor(req.params.id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Mentor deleted successfully!",
    data: result,
  });
});

const createMySlots = catchAsync(async (req: Request, res: Response) => {
  const email = (req.user as any).email as string;
  const result = await MentorService.createMySlots(email, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Availability slots created successfully!",
    data: result,
  });
});

const getMySlots = catchAsync(async (req: Request, res: Response) => {
  const email = (req.user as any).email as string;
  const result = await MentorService.getMySlots(email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My availability slots fetched successfully!",
    data: result,
  });
});

const deleteMySlot = catchAsync(async (req: Request, res: Response) => {
  const email = (req.user as any).email as string;
  const { id: slotId } = req.params;
  const result = await MentorService.deleteMySlot(email, slotId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Availability slot removed successfully!",
    data: result,
  });
});

const deleteMySlotsByDateRange = catchAsync(async (req: Request, res: Response) => {
  const email = (req.user as any).email as string;
  const { startIso, endIso } = req.body;
  const result = await MentorService.deleteMySlotsByDateRange(email, startIso, endIso);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Batch complete: ${result.deletedCount} available slots cleared.`,
    data: result,
  });
});

export const MentorController = {
  getAllMentors,
  getSingleMentor,
  verifyMentor,
  updateMentor,
  deleteMentor,
  createMySlots,
  getMySlots,
  deleteMySlot,
  deleteMySlotsByDateRange,
};

