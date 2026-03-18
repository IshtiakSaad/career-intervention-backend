import { z } from "zod";
import { Role } from "../../../generated/prisma";

const grantRoleValidationSchema = z.object({
  body: z.object({
    userId: z.string({
      message: "User ID is required",
    }),
    role: z.nativeEnum(Role, {
      message: "Role is required",
    }),
    description: z.string().optional(),
  }),
});

const revokeRoleValidationSchema = z.object({
  body: z.object({
    userId: z.string({
      message: "User ID is required",
    }),
    role: z.nativeEnum(Role, {
      message: "Role is required",
    }),
  }),
});

export const UserRoleValidation = {
  grantRoleValidationSchema,
  revokeRoleValidationSchema,
};
