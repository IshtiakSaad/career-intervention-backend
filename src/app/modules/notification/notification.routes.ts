import express from "express";
import { NotificationController } from "./notification.controller";
import { authMiddleware } from "../../middlewares/authMiddleware";

const router = express.Router();

// All notification routes require authentication (any role)
router.get(
  "/",
  authMiddleware(),
  NotificationController.getMyNotifications
);

router.get(
  "/unread-count",
  authMiddleware(),
  NotificationController.getUnreadCount
);

router.patch(
  "/read-all",
  authMiddleware(),
  NotificationController.markAllAsRead
);

router.patch(
  "/:id/read",
  authMiddleware(),
  NotificationController.markAsRead
);

export const NotificationRoutes = router;
