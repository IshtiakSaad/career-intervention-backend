import { z } from "zod";

const suggestMentorValidationSchema = z.object({
  body: z.object({
    query: z.string({ message: "Query string is required" }),
  }),
});

export const AiValidation = {
  suggestMentorValidationSchema,
};
