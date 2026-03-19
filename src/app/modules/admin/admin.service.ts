import prisma from "../../utils/prisma";

const getAllAdmins = async () => {
  return await prisma.admin.findMany({
    where: {
      user: {
        deletedAt: null,
        userRoles: { some: { role: 'ADMIN', revokedAt: null } }
      }
    },
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
