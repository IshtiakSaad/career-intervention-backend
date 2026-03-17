import { z } from "zod";

const loginValidationSchema = z.object({
  body: z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  }),
});

export const AuthValidation = {
  loginValidationSchema,
};
