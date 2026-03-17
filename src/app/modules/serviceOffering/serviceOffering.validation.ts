import { z } from "zod";

const createServiceOfferingValidationSchema = z.object({
  body: z.object({
    title: z.string({ required_error: "Title is required" }),
    description: z.string().optional(),
    durationMinutes: z.number({ required_error: "Duration is required" }).positive(),
    price: z.number({ required_error: "Price is required" }).nonnegative(),
    currency: z.string().optional(),
    serviceDescription: z.string().optional(),
  }),
});

const updateServiceOfferingValidationSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    durationMinutes: z.number().positive().optional(),
    price: z.number().nonnegative().optional(),
    currency: z.string().optional(),
    isActive: z.boolean().optional(),
    serviceDescription: z.string().optional(),
  }),
});

export const ServiceOfferingValidation = {
  createServiceOfferingValidationSchema,
  updateServiceOfferingValidationSchema,
};
