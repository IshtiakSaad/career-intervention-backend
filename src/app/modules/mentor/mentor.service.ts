import { Prisma } from "../../../generated/prisma";
import { paginationHelper } from "../../helpers/paginationHelper";
import { IPaginationOptions } from "../../interfaces/pagination";
import { mentorSearchableFields } from "./mentor.constant";
import prisma from "../../utils/prisma";
import RedisService from "../../utils/redis";

const getAllMentors = async (filters: any, options: IPaginationOptions) => {
  const { searchTerm, specialties, ...filterData } = filters;
  const { limit, page, skip, sortBy, sortOrder } = paginationHelper.calculatePagination(options);

  // 1. Generate Cache Key
  const cacheKey = `mentors:search:${JSON.stringify(filters)}:${JSON.stringify(options)}`;

  // 2. Try Cache
  const cachedData = await RedisService.get<any>(cacheKey);
  if (cachedData) {
    console.log("⚡ Cache Hit: Mentors Search");
    return cachedData;
  }

  const andConditions: Prisma.MentorProfileWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: [
        ...mentorSearchableFields.map(field => ({
          [field]: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        })),
        {
          user: {
            name: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        }
      ]
    });
  }

  if (specialties) {
    const specialtyArray = Array.isArray(specialties) ? specialties : [specialties];
    andConditions.push({
      mentorSpecialties: {
        some: {
          specialty: {
            name: {
              in: specialtyArray
            }
          }
        }
      }
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: {
          equals: (filterData as any)[key]
        }
      }))
    });
  }

  // 3. Exclude soft-deleted users and ensure active Mentor role
  andConditions.push({
    user: {
      deletedAt: null,
      userRoles: {
        some: {
          role: 'MENTOR',
          revokedAt: null,
        },
      },
    },
  });

  const whereConditions: Prisma.MentorProfileWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

  const [result, total] = await Promise.all([
    prisma.mentorProfile.findMany({
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
            gender: true,
          },
        },
        mentorSpecialties: {
          include: {
            specialty: true
          }
        }
      },
    }),
    prisma.mentorProfile.count({ where: whereConditions })
  ]);

  const response = {
    meta: { page, limit, total },
    data: result
  };

  // 4. Set Cache (TTL: 10 minutes)
  await RedisService.set(cacheKey, response, 600);

  return response;
};

const getSingleMentor = async (id: string) => {
  return await prisma.mentorProfile.findFirst({
    where: { 
      id,
      user: {
        deletedAt: null,
        userRoles: {
          some: {
            role: 'MENTOR',
            revokedAt: null,
          },
        },
      },
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          profileImageUrl: true,
          gender: true,
          userRoles: true,
        },
      },
    },
  });
};

const verifyMentor = async (id: string, isVerified: boolean) => {
  const result = await prisma.mentorProfile.update({
    where: { id },
    data: { verificationBadge: isVerified },
  });

  // Invalidate search cache
  await RedisService.delByPattern("mentors:search:*");

  return result;
};


export const MentorService = {
  getAllMentors,
  getSingleMentor,
  verifyMentor,
};
