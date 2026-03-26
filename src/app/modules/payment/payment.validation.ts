import { z } from "zod/v4";

const initiatePaymentValidationSchema = z.object({
  body: z.object({
    sessionId: z.string().uuid("Invalid session ID"),
  }),
});

const processPayoutValidationSchema = z.object({
  body: z.object({
    payoutMethod: z.string().min(1, "Payout method is required"),
    payoutRef: z.string().min(1, "Payout reference is required"),
  }),
});

const fileDisputeValidationSchema = z.object({
  body: z.object({
    sessionId: z.string().uuid("Invalid session ID"),
    reason: z.string().min(10, "Reason must be at least 10 characters"),
  }),
});

const resolveDisputeValidationSchema = z.object({
  body: z.object({
    resolution: z.string().min(5, "Resolution note is required"),
    outcome: z.enum(["REFUND", "DENY"]),
  }),
});

export const PaymentValidation = {
  initiatePaymentValidationSchema,
  processPayoutValidationSchema,
  fileDisputeValidationSchema,
  resolveDisputeValidationSchema,
};
