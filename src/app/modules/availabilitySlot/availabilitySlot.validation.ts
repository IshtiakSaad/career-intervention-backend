import { z } from "zod";

const createAvailabilitySlotValidationSchema = z.object({
  body: z.object({
    startTime: z.string({ message: "Start time is required" }),
    endTime: z.string({ message: "End time is required" }),
    description: z.string().optional(),
  }),
});

const bulkCreateAvailabilitySlotValidationSchema = z.object({
  body: z.object({
    startDate: z.string({ message: "Start date is required" }),
    endDate: z.string({ message: "End date is required" }),
    startTime: z.string({ message: "Start time is required" }), // HH:mm
    endTime: z.string({ message: "End time is required" }),     // HH:mm
    slotDuration: z.number().int().positive().default(30),
  }),
});

export const AvailabilitySlotValidation = {
  createAvailabilitySlotValidationSchema,
  bulkCreateAvailabilitySlotValidationSchema,
};
