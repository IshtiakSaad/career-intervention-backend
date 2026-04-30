import { z } from "zod";

const updateMentorValidationSchema = z.object({
  body: z.object({
    headline: z.string().min(10).max(100).optional(),
    designation: z.string().min(2).optional(),
    experience: z.number().min(0).optional(),
    currentWorkingPlace: z.string().min(2).optional(),
    location: z.string().min(2).optional(),
    bio: z.string().min(50).optional(),
    linkedinUrl: z.string().url().optional().or(z.literal("")),
    portfolioUrl: z.string().url().optional().or(z.literal("")),
    specialties: z.array(z.string()).min(1).optional(),
  }),
});

const createMySlotsValidationSchema = z.object({
  body: z.object({
    slots: z.array(
      z.object({
        startTime: z.string().min(1, "startTime is required"),
        endTime: z.string().min(1, "endTime is required"),
        description: z.string().optional(),
      })
    ).min(1, "At least one slot is required"),
  }),
});

export const MentorValidation = {
  updateMentorValidationSchema,
  createMySlotsValidationSchema,
};
