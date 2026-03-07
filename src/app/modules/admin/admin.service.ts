import prisma from "../../utils/prisma";

const getAllAdmins = async () => {
  return await prisma.admin.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
          profileImageUrl: true,
        },
      },
    },
  });
};

const getMyAdminProfile = async (email: string) => {
  return await prisma.admin.findUnique({
    where: { email },
    include: {
      user: true,
    },
  });
};

export const AdminService = {
  getAllAdmins,
  getMyAdminProfile,
};
