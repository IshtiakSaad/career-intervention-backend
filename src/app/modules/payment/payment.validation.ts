import { z } from "zod";

const createPaymentValidationSchema = z.object({
  body: z.object({
    sessionId: z.string({ message: "Session ID is required" }),
    amount: z.number({ message: "Amount is required" }).positive(),
    currency: z.string().optional(),
  }),
});

export const PaymentValidation = {
  createPaymentValidationSchema,
};
