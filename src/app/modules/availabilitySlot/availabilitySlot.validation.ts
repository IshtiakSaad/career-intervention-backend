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
    serviceId: z.string({ message: "Service ID is required" }),
    startDate: z.string({ message: "Start date is required" }),
    endDate: z.string({ message: "End date is required" }),
    weekdays: z.array(z.number().min(0).max(6)),
    dailyStartTime: z.string({ message: "Daily start time is required" }), 
    dailyEndTime: z.string({ message: "Daily end time is required" }),     
    timezone: z.string({ message: "Timezone identifier is required" }),
  }),
});

export const AvailabilitySlotValidation = {
  createAvailabilitySlotValidationSchema,
  bulkCreateAvailabilitySlotValidationSchema,
};
