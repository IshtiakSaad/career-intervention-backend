import { Request, Response } from 'express';
import catchAsync from '../../middlewares/catchAsync';
import { SpecialtyService } from './specialty.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';

const createSpecialty = catchAsync(async (req: Request, res: Response) => {
  const result = await SpecialtyService.createSpecialty(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Specialty created successfully',
    data: result
  });
});

const getAllSpecialties = catchAsync(async (req: Request, res: Response) => {
  const result = await SpecialtyService.getAllSpecialties();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Specialties fetched successfully',
    data: result
  });
});

const deleteSpecialty = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SpecialtyService.deleteSpecialty(id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Specialty deleted successfully',
    data: result
  });
});

export const SpecialtyController = {
  createSpecialty,
  getAllSpecialties,
  deleteSpecialty
};
