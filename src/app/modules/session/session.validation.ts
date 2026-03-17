import { z } from "zod";

const bookSessionValidationSchema = z.object({
  body: z.object({
    availabilitySlotId: z.string({ message: "Availability slot ID is required" }),
    serviceId: z.string({ message: "Service ID is required" }),
    notes: z.string().optional(),
  }),
});

const updateSessionValidationSchema = z.object({
  body: z.object({
    status: z.enum(["PENDING", "CONFIRMED", "ONGOING", "COMPLETED", "CANCELLED", "REJECTED"]).optional(),
    videoLink: z.string().url().optional().or(z.literal("")),
    notes: z.string().optional(),
  }),
});

export const SessionValidation = {
  bookSessionValidationSchema,
  updateSessionValidationSchema,
};
