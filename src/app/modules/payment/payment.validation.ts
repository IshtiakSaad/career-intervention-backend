import { z } from "zod/v4";

const initiatePaymentValidationSchema = z.object({
  body: z.object({
    sessionId: z.string().uuid("Invalid session ID"),
  }),
});

export const PaymentValidation = {
  initiatePaymentValidationSchema,
};
