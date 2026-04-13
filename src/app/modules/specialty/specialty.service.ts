import { Prisma, Specialty } from '../../../generated/prisma';
import prisma from '../../utils/prisma';
import { ISpecialtyCreatePayload } from './specialty.interface';
import { IPaginationOptions } from '../../interfaces/pagination';
import { paginationHelper } from '../../helpers/paginationHelper';

const createSpecialty = async (payload: ISpecialtyCreatePayload): Promise<Specialty> => {
  const result = await prisma.specialty.create({
    data: payload
  });
  return result;
};

const getAllSpecialties = async (filters: any, options: IPaginationOptions) => {
  const { searchTerm, ...filterData } = filters;
  const { limit, page, skip, sortBy, sortOrder } = paginationHelper.calculatePagination(options);

  const andConditions: Prisma.SpecialtyWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      name: { contains: searchTerm, mode: 'insensitive' }
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: { equals: (filterData as any)[key] }
      }))
    });
  }

  const whereConditions: Prisma.SpecialtyWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

  const [result, total] = await Promise.all([
    prisma.specialty.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder }
    }),
    prisma.specialty.count({ where: whereConditions })
  ]);

  return {
    meta: { page, limit, total },
    data: result
  };
};

const deleteSpecialty = async (id: string): Promise<Specialty> => {
  return await prisma.specialty.delete({
    where: { id }
  });
};

const updateSpecialty = async (id: string, payload: Partial<ISpecialtyCreatePayload>): Promise<Specialty> => {
  return await prisma.specialty.update({
    where: { id },
    data: payload
  });
};

export const SpecialtyService = {
  createSpecialty,
  getAllSpecialties,
  deleteSpecialty,
  updateSpecialty
};


