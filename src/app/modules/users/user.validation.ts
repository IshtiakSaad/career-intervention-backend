import { z } from "zod";

// Self-registration (MENTEE only)
const createUserValidationSchema = z.object({
  body: z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    name: z.string().optional(),
    phoneNumber: z.string().optional(),
    profileImageUrl: z.string().url().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHERS"]),
    careerGoals: z.string().optional(),
  }),
});

// Admin creates user (MENTOR or ADMIN)
const createUserByAdminValidationSchema = z.object({
  body: z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    name: z.string().optional(),
    phoneNumber: z.string().optional(),
    profileImageUrl: z.string().url().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHERS"]),
    role: z.enum(["MENTEE", "MENTOR", "ADMIN"]),
    careerGoals: z.string().optional(),
    bio: z.string().optional(),
    experience: z.number().optional(),
    designation: z.string().optional(),
    currentWorkingPlace: z.string().optional(),
  }),
});


// Update user (self or admin)
const updateUserValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    phoneNumber: z.string().optional(),
    profileImageUrl: z.string().url().optional(),
    timezone: z.string().optional(),
  }),
});


export const UserValidation = {
  createUserValidationSchema,
  createUserByAdminValidationSchema,
  updateUserValidationSchema,
};