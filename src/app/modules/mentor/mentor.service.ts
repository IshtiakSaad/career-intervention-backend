import { Prisma } from "../../../generated/prisma";
import { paginationHelper } from "../../helpers/paginationHelper";
import { IPaginationOptions } from "../../interfaces/pagination";
import { mentorSearchableFields } from "./mentor.constant";
import prisma from "../../utils/prisma";
import { AppError } from "../../errorHelpers/app-error";
import httpStatus from "http-status";


const getAllMentors = async (filters: any, options: IPaginationOptions) => {
  const { searchTerm, specialties, ...filterData } = filters;
  const { limit, page, skip, sortBy, sortOrder } = paginationHelper.calculatePagination(options);

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
      AND: Object.keys(filterData).map(key => {
        let val = (filterData as any)[key];
        if (val === 'true') val = true;
        if (val === 'false') val = false;
        
        return {
          [key]: {
            equals: val
          }
        };
      })
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
            phoneNumber: true,
          },
        },
        mentorSpecialties: {
          include: {
            specialty: true
          }
        },
        serviceOfferings: {
          where: {
            isActive: true,
            deletedAt: null
          },
          select: {
            id: true,
            title: true,
            price: true,
            currency: true,
            durationMinutes: true
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
          phoneNumber: true,
        },
      },
      mentorSpecialties: {
        include: {
          specialty: true
        }
      },
      serviceOfferings: {
        where: {
          isActive: true,
          deletedAt: null
        }
      }
    },
  });
};

const verifyMentor = async (id: string, isVerified: boolean) => {
  const result = await prisma.mentorProfile.update({
    where: { id },
    data: { verificationBadge: isVerified },
  });

  return result;
};

const updateMentor = async (id: string, payload: any) => {
  const { specialties, ...updateData } = payload;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update the basic profile fields
    const updatedProfile = await tx.mentorProfile.update({
      where: { id },
      data: updateData,
    });

    // 2. Sync specialties if provided in the payload
    if (specialties) {
      // Remove all existing associations
      await tx.mentorSpecialty.deleteMany({
        where: { mentorId: id },
      });

      // Create new associations
      if (specialties.length > 0) {
        await tx.mentorSpecialty.createMany({
          data: specialties.map((specialtyId: string) => ({
            mentorId: id,
            specialtyId,
          })),
        });
      }
    }

    return updatedProfile;
  });

  return result;
};

const deleteMentor = async (id: string) => {
  // We perform a soft delete on the User record associated with this MentorProfile
  const mentorProfile = await prisma.mentorProfile.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!mentorProfile) {
    throw new AppError(httpStatus.NOT_FOUND, "Mentor not found");
  }

  const result = await prisma.user.update({
    where: { id: mentorProfile.user.id },
    data: { deletedAt: new Date() },
  });

  return result;
};

// ─── Slot Management (Supply Lifecycle) ───

const createMySlots = async (email: string, payload: { serviceId: string, slots: Array<{ startTime: string; endTime: string; description?: string }> }) => {
  const mentor = await prisma.mentorProfile.findUnique({
    where: { email },
    include: {
      serviceOfferings: { where: { id: payload.serviceId } }
    }
  });

  if (!mentor) {
    throw new AppError(httpStatus.NOT_FOUND, "Mentor profile not found for the authenticated user");
  }

  const service = mentor.serviceOfferings[0];
  if (!service) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid or unauthorized service offering selected");
  }

  const bufferMinutes = service.bufferMinutes || 0;

  // Bulk creation with conflict handling
  const results = [];
  for (const slot of payload.slots) {
    try {
      const slotStart = new Date(slot.startTime);
      const slotEnd = new Date(slot.endTime);
      const slotBufferEnd = new Date(slotEnd.getTime() + bufferMinutes * 60000);

      // Check for strictly overlapping intervals combining buffer ends
      const hasOverlap = await prisma.availabilitySlot.findFirst({
        where: {
          mentorId: mentor.id,
          startTime: { lt: slotBufferEnd },
          OR: [
            { bufferEndTime: { gt: slotStart } },
            { bufferEndTime: null, endTime: { gt: slotStart } }
          ]
        }
      });

      if (hasOverlap) {
        // Format the existing slot boundaries for a professional error message
        const formatTime = (date: Date) => {
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka', timeZoneName: 'short' });
        };
        const existStart = formatTime(hasOverlap.startTime);
        const existEnd = formatTime(hasOverlap.endTime);
        
        throw new AppError(
          httpStatus.CONFLICT, 
          `Scheduling conflict: The requested window overlaps with an existing slot scheduled from ${existStart} to ${existEnd}. Please select a different time.`
        );
      }

      const created = await prisma.availabilitySlot.create({
        data: {
          mentorId: mentor.id,
          startTime: slotStart,
          endTime: slotEnd,
          bufferEndTime: slotBufferEnd,
          description: slot.description,
          status: "AVAILABLE",
          version: 1,
        },
      });
      results.push(created);
    } catch (error: any) {
      // Handle P2002 (Unique constraint violation) - skip or log
      if (error.code === 'P2002') {
        console.warn(`[SLOT_CREATION]: Skipping duplicate slot for mentor ${mentor.id}: ${slot.startTime}`);
      } else {
        throw error;
      }
    }
  }

  return results;
};

const getMySlots = async (email: string) => {
  const mentor = await prisma.mentorProfile.findUnique({
    where: { email },
    include: {
      availabilitySlots: {
        orderBy: { startTime: 'asc' },
      },
    },
  });

  if (!mentor) {
    throw new AppError(httpStatus.NOT_FOUND, "Mentor profile not found");
  }

  return mentor.availabilitySlots;
};

const deleteMySlot = async (email: string, slotId: string) => {
  const mentor = await prisma.mentorProfile.findUnique({
    where: { email },
  });

  if (!mentor) {
    throw new AppError(httpStatus.NOT_FOUND, "Mentor profile not found");
  }

  // Ensure slot belongs to mentor and IS NOT BOOKED
  const slot = await prisma.availabilitySlot.findUnique({
    where: { id: slotId },
  });

  if (!slot || slot.mentorId !== mentor.id) {
    throw new AppError(httpStatus.NOT_FOUND, "Slot not found or unauthorized");
  }

  if (slot.status === "BOOKED") {
    throw new AppError(httpStatus.CONFLICT, "Cannot delete a slot that has already been booked");
  }

  await prisma.availabilitySlot.delete({
    where: { id: slotId },
  });

  return { success: true };
};

const deleteMySlotsByDateRange = async (email: string, startIso: string, endIso: string) => {
  const mentor = await prisma.mentorProfile.findUnique({
    where: { email },
  });

  if (!mentor) {
    throw new AppError(httpStatus.NOT_FOUND, "Mentor profile not found");
  }

  const result = await prisma.availabilitySlot.deleteMany({
    where: { 
      mentorId: mentor.id,
      status: "AVAILABLE", // Explicitly protect booked slots
      startTime: { gte: new Date(startIso), lt: new Date(endIso) }
    },
  });

  return { success: true, deletedCount: result.count };
};

export const MentorService = {
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

