import prisma from "../../utils/prisma";

import { Prisma } from "../../../generated/prisma";
import { paginationHelper } from "../../helpers/paginationHelper";
import { IPaginationOptions } from "../../interfaces/pagination";

const getAllAdmins = async (filters: any, options: IPaginationOptions) => {
  const { searchTerm, ...filterData } = filters;
  const { limit, page, skip, sortBy, sortOrder } = paginationHelper.calculatePagination(options);

  const andConditions: Prisma.AdminWhereInput[] = [];

  // Parse searchTerm against the related User model
  if (searchTerm) {
    andConditions.push({
      user: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } }
        ]
      }
    });
  }

  // Parse generic filters (like activeStatus)
  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => {
        // Cast string booleans from URL params
        let val = (filterData as any)[key];
        if (val === 'true') val = true;
        if (val === 'false') val = false;

        return {
           [key]: { equals: val }
        };
      })
    });
  }

  // Ensure soft-deletion isolation and correct user roles
  andConditions.push({
    user: {
      deletedAt: null,
      userRoles: { some: { role: 'ADMIN', revokedAt: null } }
    }
  });

  const whereConditions: Prisma.AdminWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

  const [result, total] = await Promise.all([
    prisma.admin.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            profileImageUrl: true,
          },
        },
      },
    }),
    prisma.admin.count({ where: whereConditions })
  ]);

  return {
    meta: { page, limit, total },
    data: result
  };
};

const getMyAdminProfile = async (email: string) => {
  return await prisma.admin.findFirst({
    where: {
      email,
      user: {
        deletedAt: null,
        userRoles: { some: { role: 'ADMIN', revokedAt: null } }
      }
    },
    include: {
      user: true,
    },
  });
};

export const AdminService = {
  getAllAdmins,
  getMyAdminProfile,
};
