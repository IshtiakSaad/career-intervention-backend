import { Specialty } from '../../../generated/prisma';
import prisma from '../../utils/prisma';
import { ISpecialtyCreatePayload } from './specialty.interface';

const createSpecialty = async (payload: ISpecialtyCreatePayload): Promise<Specialty> => {
  const result = await prisma.specialty.create({
    data: payload
  });
  return result;
};

const getAllSpecialties = async () => {
  return await prisma.specialty.findMany({
    orderBy: { name: 'asc' }
  });
};

const deleteSpecialty = async (id: string): Promise<Specialty> => {
  return await prisma.specialty.delete({
    where: { id }
  });
};

export const SpecialtyService = {
  createSpecialty,
  getAllSpecialties,
  deleteSpecialty
};
