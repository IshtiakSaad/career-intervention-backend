import { z } from "zod";

const createServiceOfferingValidationSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    durationMinutes: z.number().positive("Duration is required"),
    bufferMinutes: z.number().nonnegative().optional(),
    price: z.number().nonnegative("Price is required"),
    currency: z.string().optional(),
    serviceDescription: z.string().optional(),
  }),
});

const updateServiceOfferingValidationSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    durationMinutes: z.number().positive().optional(),
    bufferMinutes: z.number().nonnegative().optional(),
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
