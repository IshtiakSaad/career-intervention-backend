import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware";
import { MentorController } from "./mentor.controller";
import { validateRequest } from "../../middlewares/validateRequest";
import { MentorValidation } from "./mentor.validation";

const router = express.Router();

// ─── Mentor-Specific Slot Management (Place BEFORE parameterized routes) ───

router.get(
  "/my-slots",
  authMiddleware("MENTOR"),
  MentorController.getMySlots
);

router.post(
  "/my-slots",
  authMiddleware("MENTOR"),
  validateRequest(MentorValidation.createMySlotsValidationSchema),
  MentorController.createMySlots
);

router.post(
  "/my-slots/batch-delete",
  authMiddleware("MENTOR"),
  MentorController.deleteMySlotsByDateRange
);

router.delete(
  "/my-slots/:id",
  authMiddleware("MENTOR"),
  MentorController.deleteMySlot
);

// ─── Public/General Routes ───

router.get("/", MentorController.getAllMentors);
router.get("/:id", MentorController.getSingleMentor);

// ─── Admin only operations ───
router.patch(
  "/verify/:id",
  authMiddleware("ADMIN"),
  MentorController.verifyMentor
);

router.patch(
  "/:id",
  authMiddleware("ADMIN"),
  validateRequest(MentorValidation.updateMentorValidationSchema),
  MentorController.updateMentor
);

router.delete(
  "/:id",
  authMiddleware("ADMIN"),
  MentorController.deleteMentor
);

export const MentorRoutes = router;

