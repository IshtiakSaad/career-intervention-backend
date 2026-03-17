import { Request, Response } from 'express';
import catchAsync from '../../middlewares/catchAsync';
import { MentorSpecialtyService } from './mentorSpecialty.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import prisma from '../../utils/prisma';

const assignSpecialty = catchAsync(async (req: Request, res: Response) => {
  const { specialtyId } = req.body;
  
  // Get mentorId from logged in user
  const user = await prisma.user.findUnique({
    where: { id: (req as any).user.id },
    include: { mentorProfile: true }
  });

  const result = await MentorSpecialtyService.assignSpecialty(user?.mentorProfile?.id!, specialtyId);
  
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Specialty assigned to mentor successfully',
    data: result
  });
});

const removeSpecialty = catchAsync(async (req: Request, res: Response) => {
  const { specialtyId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: (req as any).user.id },
    include: { mentorProfile: true }
  });

  const result = await MentorSpecialtyService.removeSpecialty(user?.mentorProfile?.id!, specialtyId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Specialty removed from mentor successfully',
    data: result
  });
});

export const MentorSpecialtyController = {
  assignSpecialty,
  removeSpecialty
};
