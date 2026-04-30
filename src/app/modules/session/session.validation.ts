import { z } from "zod";

const bookSessionValidationSchema = z.object({
  body: z.object({
    availabilitySlotId: z.string({ message: "Availability slot ID is required" }),
    serviceId: z.string({ message: "Service ID is required" }),
    notes: z.string().optional(),
    idempotencyKey: z.string({ message: "Idempotency key is required for booking safety" }),
  }),
});

const updateSessionValidationSchema = z.object({
  body: z.object({
    status: z.enum([
      "PENDING", "CONFIRMED", "ONGOING", "COMPLETED", "SETTLED",
      "CANCELLED_BY_MENTEE", "CANCELLED_BY_MENTOR",
      "EXPIRED", "NO_SHOW", "DISPUTED", "REFUNDED", "REJECTED"
    ]).optional(),
    meetingLink: z.string().url().optional().or(z.literal("")),
    notes: z.string().optional(),
    version: z.number({ message: "Version is required for concurrency safety" }),
  }),
});

const createActionPlanValidationSchema = z.object({
  body: z.object({
    sessionId: z.string({ message: "Session ID is required" }),
    summary: z.string().min(10, "Summary must be at least 10 characters"),
    tasks: z.array(z.object({
      title: z.string().min(1),
      deadline: z.string().optional(),
      isDone: z.boolean().default(false),
    })).min(1, "At least one task is required"),
    resources: z.array(z.object({
      label: z.string(),
      url: z.string().url(),
    })).optional(),
    notes: z.string().optional(),
  }),
});

const updateActionPlanValidationSchema = z.object({
  body: z.object({
    summary: z.string().min(10).optional(),
    tasks: z.array(z.object({
      title: z.string().min(1),
      deadline: z.string().optional(),
      isDone: z.boolean(),
    })).optional(),
    resources: z.array(z.object({
      label: z.string(),
      url: z.string().url(),
    })).optional(),
    notes: z.string().optional(),
    version: z.number({ message: "Version is required for concurrency safety" }),
  }),
});

export const SessionValidation = {
  bookSessionValidationSchema,
  updateSessionValidationSchema,
  createActionPlanValidationSchema,
  updateActionPlanValidationSchema,
};
