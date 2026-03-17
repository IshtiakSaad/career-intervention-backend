import { ServiceOffering } from '../../../generated/prisma';
import prisma from '../../utils/prisma';
import { IServiceOfferingCreatePayload, IServiceOfferingUpdatePayload } from './serviceOffering.interface';
import { AppError } from '../../errorHelpers/app-error';
import httpStatus from 'http-status';

const createServiceOffering = async (
  mentorId: string,
  payload: IServiceOfferingCreatePayload
): Promise<ServiceOffering> => {
  // Verify mentor exists
  const mentor = await prisma.mentorProfile.findUnique({
    where: { id: mentorId }
  });

  if (!mentor) {
    throw new AppError(httpStatus.NOT_FOUND, "Mentor profile not found");
  }

  const result = await prisma.serviceOffering.create({
    data: {
      ...payload,
      mentorId
    }
  });

  return result;
};

const getAllServiceOfferings = async (filters: any) => {
  const { mentorId, ...filterData } = filters;
  const whereConditions: any = { deletedAt: null };

  if (mentorId) {
    whereConditions.mentorId = mentorId;
  }

  const result = await prisma.serviceOffering.findMany({
    where: whereConditions,
    orderBy: { createdAt: 'desc' }
  });

  return result;
};

const getSingleServiceOffering = async (id: string): Promise<ServiceOffering | null> => {
  return await prisma.serviceOffering.findUnique({
    where: { id, deletedAt: null }
  });
};

const updateServiceOffering = async (
  id: string,
  mentorId: string,
  payload: IServiceOfferingUpdatePayload
): Promise<ServiceOffering> => {
  const isExist = await prisma.serviceOffering.findUnique({
    where: { id, mentorId }
  });

  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, "Service offering not found or you are not authorized");
  }

  const result = await prisma.serviceOffering.update({
    where: { id },
    data: payload
  });

  return result;
};

const deleteServiceOffering = async (id: string, mentorId: string): Promise<ServiceOffering> => {
  const isExist = await prisma.serviceOffering.findUnique({
    where: { id, mentorId }
  });

  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, "Service offering not found or you are not authorized");
  }

  const result = await prisma.serviceOffering.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false }
  });

  return result;
};

export const ServiceOfferingService = {
  createServiceOffering,
  getAllServiceOfferings,
  getSingleServiceOffering,
  updateServiceOffering,
  deleteServiceOffering
};
