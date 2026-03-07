import prisma from "../../utils/prisma";

const getAllMentors = async () => {
  return await prisma.mentorProfile.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
          profileImageUrl: true,
          gender: true,
        },
      },
    },
  });
};

const getSingleMentor = async (id: string) => {
  return await prisma.mentorProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          profileImageUrl: true,
          gender: true,
        },
      },
    },
  });
};

const verifyMentor = async (id: string, isVerified: boolean) => {
  return await prisma.mentorProfile.update({
    where: { id },
    data: { verificationBadge: isVerified },
  });
};


export const MentorService = {
  getAllMentors,
  getSingleMentor,
  verifyMentor,
};
