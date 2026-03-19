import { z } from "zod";
import { ApplicationStatus, DocumentType } from "../../../generated/prisma";

const submitApplicationValidationSchema = z.object({
  body: z.object({
    bioDraft: z.string({
      message: "Bio is required",
    }),
    expertiseAreas: z.array(z.string()).min(1, "At least one expertise area is required"),
    description: z.string().optional(),
    documents: z.array(
      z.object({
        type: z.nativeEnum(DocumentType),
        storageUrl: z.string().url("Valid Cloudinary URL is required"),
      })
    ).min(1, "At least one document is required"),
  }),
});

const reviewApplicationValidationSchema = z.object({
  body: z.object({
    status: z.nativeEnum(ApplicationStatus),
    feedback: z.string().optional(),
  }),
});

const resubmitApplicationValidationSchema = z.object({
  body: z.object({
    bioDraft: z.string().optional(),
    expertiseAreas: z.array(z.string()).min(1).optional(),
    description: z.string().optional(),
    documents: z.array(
      z.object({
        type: z.nativeEnum(DocumentType),
        storageUrl: z.string().url("Valid Cloudinary URL is required"),
      })
    ).optional(),
  }),
});

export const MentorApplicationValidation = {
  submitApplicationValidationSchema,
  reviewApplicationValidationSchema,
  resubmitApplicationValidationSchema,
};
