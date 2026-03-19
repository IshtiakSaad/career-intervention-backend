import { Role } from "../../generated/prisma/client";
import { envVars } from "../config/env";
import { hashPassword } from "./hashPassword";
import prisma from "./prisma";

/**
 * Automatically creates a Super Admin user if one doesn't exist
 * based on environment variables.
 */
export const seedSuperAdmin = async () => {
  try {
    const isSuperAdminExists = await prisma.user.findUnique({
      where: {
        email: envVars.SUPER_ADMIN_EMAIL,
      },
      include: {
        userRoles: {
          where: { role: Role.ADMIN }
        }
      }
    });

    if (isSuperAdminExists && isSuperAdminExists.userRoles.length > 0) {
      console.log("✅ Super Admin already exists.");
      return;
    }

    const hashedPassword = await hashPassword(envVars.SUPER_ADMIN_PASSWORD);

    await prisma.$transaction(async (tx) => {
      // 1. Create or find the user
      const superAdminUser = await tx.user.upsert({
        where: { email: envVars.SUPER_ADMIN_EMAIL },
        create: {
          email: envVars.SUPER_ADMIN_EMAIL,
          passwordHash: hashedPassword,
          name: "Super Admin",
          gender: "MALE",
        },
        update: {},
      });

      // 2. Assign the ADMIN role if they don't have it
      const existingRole = await tx.userRole.findFirst({
        where: { userId: superAdminUser.id, role: Role.ADMIN }
      });

      if (!existingRole) {
        await tx.userRole.create({
          data: {
            userId: superAdminUser.id,
            role: Role.ADMIN,
            description: "System Generated Super Admin"
          }
        });
      }

      // 3. Ensure Admin profile exists
      await tx.admin.upsert({
        where: { email: envVars.SUPER_ADMIN_EMAIL },
        create: {
          email: envVars.SUPER_ADMIN_EMAIL,
        },
        update: {},
      });
    });

    console.log("🚀 Super Admin created successfully!");
  } catch (error) {
    console.error("❌ Error seeding Super Admin:", error);
  }
};
