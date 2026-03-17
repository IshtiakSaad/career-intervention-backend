import { z } from "zod";

const createMentorSpecialtyValidationSchema = z.object({
  body: z.object({
    specialtyId: z.string({ message: "Specialty ID is required" }),
  }),
});

export const MentorSpecialtyValidation = {
  createMentorSpecialtyValidationSchema,
};
