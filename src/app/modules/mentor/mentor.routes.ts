import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware";
import { MentorController } from "./mentor.controller";

const router = express.Router();

router.get("/", MentorController.getAllMentors);
router.get("/:id", MentorController.getSingleMentor);

// Admin only operations
router.patch(
  "/verify/:id",
  authMiddleware("ADMIN"),
  MentorController.verifyMentor
);

export const MentorRoutes = router;
