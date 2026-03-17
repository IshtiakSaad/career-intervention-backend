import { z } from "zod";

const createSpecialtyValidationSchema = z.object({
  body: z.object({
    name: z.string({ message: "Name is required" }),
    icon: z.string().optional(),
  }),
});

export const SpecialtyValidation = {
  createSpecialtyValidationSchema,
};
