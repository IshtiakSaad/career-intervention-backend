import prisma from '../../utils/prisma';
import { AppError } from '../../errorHelpers/app-error';
import httpStatus from 'http-status';

const assignSpecialty = async (mentorId: string, specialtyId: string) => {
  // Check if mentor exists
  const mentor = await prisma.mentorProfile.findUnique({ where: { id: mentorId } });
  if (!mentor) throw new AppError(httpStatus.NOT_FOUND, "Mentor not found");

  // Check if specialty exists
  const specialty = await prisma.specialty.findUnique({ where: { id: specialtyId } });
  if (!specialty) throw new AppError(httpStatus.NOT_FOUND, "Specialty not found");

  const result = await prisma.mentorSpecialty.create({
    data: {
      mentorId,
      specialtyId
    }
  });
  return result;
};

const removeSpecialty = async (mentorId: string, specialtyId: string) => {
  const result = await prisma.mentorSpecialty.delete({
    where: {
      mentorId_specialtyId: {
        mentorId,
        specialtyId
      }
    }
  });
  return result;
};

const getMentorSpecialties = async (mentorId: string) => {
    return await prisma.mentorSpecialty.findMany({
        where: { mentorId },
        include: { specialty: true }
    });
};

export const MentorSpecialtyService = {
  assignSpecialty,
  removeSpecialty,
  getMentorSpecialties
};
