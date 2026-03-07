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
    const isSuperAdminExists = await prisma.user.findFirst({
      where: {
        role: Role.ADMIN,
        email: envVars.SUPER_ADMIN_EMAIL,
      },
    });

    if (isSuperAdminExists) {
      console.log("✅ Super Admin already exists.");
      return;
    }

    const hashedPassword = await hashPassword(envVars.SUPER_ADMIN_PASSWORD);

    await prisma.$transaction(async (tx) => {
      const superAdmin = await tx.user.create({
        data: {
          email: envVars.SUPER_ADMIN_EMAIL,
          passwordHash: hashedPassword,
          role: Role.ADMIN,
          name: "Super Admin",
          gender: "MALE", // Default or you can make it configurable
        },
      });

      await tx.admin.create({
        data: {
          email: superAdmin.email,
        },
      });
    });

    console.log("🚀 Super Admin created successfully!");
  } catch (error) {
    console.error("❌ Error seeding Super Admin:", error);
  }
};
