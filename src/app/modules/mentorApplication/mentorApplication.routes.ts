import express from "express";
import { MentorApplicationController } from "./mentorApplication.controller";
import { MentorApplicationValidation } from "./mentorApplication.validation";
import { validateRequest } from "../../middlewares/validateRequest";
import { authMiddleware } from "../../middlewares/authMiddleware";

const router = express.Router();

/**
 * Submit Application (Mentee only)
 */
router.post(
  "/submit",
  authMiddleware("MENTEE"),
  validateRequest(MentorApplicationValidation.submitApplicationValidationSchema),
  MentorApplicationController.submitApplication
);

/**
 * Get My Applications (History)
 */
router.get(
  "/my-applications",
  authMiddleware("MENTEE", "MENTOR"),
  MentorApplicationController.getMyApplications
);

/**
 * Admin: Get All Applications (Queue)
 */
router.get(
  "/",
  authMiddleware("ADMIN"),
  MentorApplicationController.getAllApplications
);

/**
 * Admin: Review Application
 */
router.patch(
  "/:id/review",
  authMiddleware("ADMIN"),
  validateRequest(MentorApplicationValidation.reviewApplicationValidationSchema),
  MentorApplicationController.reviewApplication
);

/**
 * Resubmit Application (Mentee corrects based on feedback)
 */
router.patch(
  "/:id/resubmit",
  authMiddleware("MENTEE"),
  validateRequest(MentorApplicationValidation.resubmitApplicationValidationSchema),
  MentorApplicationController.resubmitApplication
);

/**
 * Get Single Application
 */
router.get(
  "/:id",
  authMiddleware("ADMIN", "MENTEE", "MENTOR"),
  MentorApplicationController.getSingleApplication
);

export const MentorApplicationRoutes = router;
