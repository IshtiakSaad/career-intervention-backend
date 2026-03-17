import { z } from "zod";

const createFeedbackValidationSchema = z.object({
  body: z.object({
    sessionId: z.string({ message: "Session ID is required" }),
    rating: z.number({ message: "Rating is required" }).min(1).max(5),
    comments: z.string().optional(),
  }),
});

export const FeedbackValidation = {
  createFeedbackValidationSchema,
};
