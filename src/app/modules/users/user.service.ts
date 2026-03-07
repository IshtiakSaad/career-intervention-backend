import { User as PrismaUser, Role as PrismaRole } from '../../../generated/prisma/client';
import { hashPassword } from '../../utils/hashPassword';
import prisma from '../../utils/prisma';
import { IUserCreateByAdminPayload, IUserUpdatePayload } from './user.interface';


/**
 * Create a new user.
 */
const createUser = async (
  payload: IUserCreateByAdminPayload,
): Promise<PrismaUser> => {
  try {
    const hashedPassword = await hashPassword(payload.passwordHash!);

    const result = await prisma.$transaction(async (tx) => {
      // Destructure profile-specific fields from metadata
      const { 
        careerGoals, 
        bio, 
        experience, 
        designation, 
        currentWorkingPlace, 
        ...userData 
      } = payload;

      // 1. Create the base User (this will now only contain User fields)
      const newUser = await tx.user.create({
        data: {
          ...userData,
          passwordHash: hashedPassword,
        },
      });

      // 2. Create the corresponding profile based on role
      if (payload.role === PrismaRole.MENTEE) {
        await tx.menteeProfile.create({
          data: {
            email: newUser.email,
            careerGoals: careerGoals || null,
          },
        });
      } else if (payload.role === PrismaRole.MENTOR) {
        await tx.mentorProfile.create({
          data: {
            email: newUser.email,
            bio: bio || null,
            experience: experience || 0,
            designation: designation || null,
            currentWorkingPlace: currentWorkingPlace || null,
          },
        });
      } else if (payload.role === PrismaRole.ADMIN) {
        await tx.admin.create({
          data: {
            email: newUser.email,
          },
        });
      }

      return newUser;
    });


    return result;
  } catch (error) {
    console.error("Error in createUser:", error);
    throw error;
  }
};


import { paginationHelper } from '../../helpers/paginationHelper';
import { IGenericResponse } from '../../interfaces/common';
import { IPaginationOptions } from '../../interfaces/pagination';

import { Prisma } from '../../../generated/prisma/client';
import { userSearchableFields } from './user.constant';

/**
 * Get all users with pagination, sorting, searching, and filtering
 */
const getAllUsers = async (
  filters: any,
  options: IPaginationOptions,
): Promise<IGenericResponse<PrismaUser[]>> => {
  try {
    const { page, limit, skip, sortBy, sortOrder } =
      paginationHelper.calculatePagination(options);

    const { searchTerm, ...filterData } = filters;

    const andConditions = [];

    // 1. Searching (searchTerm)
    if (searchTerm) {
      andConditions.push({
        OR: userSearchableFields.map((field) => ({
          [field]: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        })),
      });
    }

    // 2. Filtering (exact matches)
    if (Object.keys(filterData).length > 0) {
      andConditions.push({
        AND: Object.keys(filterData).map((key) => ({
          [key]: {
            equals: (filterData as any)[key],
          },
        })),
      });
    }

    // 3. Exclude soft-deleted
    andConditions.push({
      deletedAt: null,
    });

    const whereConditions: Prisma.UserWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    const result = await prisma.user.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        menteeProfile: true,
        mentorProfile: true,
        adminProfile: true,
      },
    });

    const total = await prisma.user.count({
      where: whereConditions,
    });

    return {
      meta: {
        total,
        page,
        limit,
      },
      data: result,
    };
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    throw error;
  }
};



/**
 * Get a single user by ID (exclude soft-deleted)
 */
const getSingleUser = async (id: string): Promise<PrismaUser | null> => {
  try {
    return await prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        menteeProfile: true,
        mentorProfile: true,
        adminProfile: true,
      },
    });
  } catch (error) {
    console.error("Error in getSingleUser:", error);
    throw error;
  }
};

/**
 * Update a user by ID
 */
const updateUser = async (
  id: string,
  payload: IUserUpdatePayload,
): Promise<PrismaUser> => {

  try {
    return await prisma.user.update({
      where: { id },
      data: payload,
    });
  } catch (error) {
    console.error("Error in updateUser:", error);
    throw error;
  }
};

/**
 * Soft delete a user by ID
 */
const deleteUser = async (id: string): Promise<PrismaUser> => {
  try {
    return await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch (error) {
    console.error("Error in deleteUser:", error);
    throw error;
  }
};

/**
 * Fetch users by role (MENTEE, MENTOR, ADMIN)
 */
const getUsersByRole = async (role: PrismaRole): Promise<PrismaUser[]> => {
  try {
    return await prisma.user.findMany({
      where: { role, deletedAt: null },
      include: {
        menteeProfile: true,
        mentorProfile: true,
        adminProfile: true,
      },
    });
  } catch (error) {
    console.error("Error in getUsersByRole:", error);
    throw error;
  }
};


export const UserService = {
  createUser,
  getAllUsers,
  getSingleUser,
  updateUser,
  deleteUser,
  getUsersByRole,
};
