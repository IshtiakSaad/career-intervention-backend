import express from "express";
import { DashboardController } from "./dashboard.controller";
import { authMiddleware } from "../../middlewares/authMiddleware";

const router = express.Router();

router.get(
  "/admin-stats",
  authMiddleware("ADMIN"),
  DashboardController.getAdminStats
);

router.get(
  "/mentor-stats",
  authMiddleware("MENTOR"),
  DashboardController.getMentorStats
);

export const DashboardRoutes = router;
