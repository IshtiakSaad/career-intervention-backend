import express from "express";
import { UserRoutes } from "../modules/users/user.routes";
import { AuthRoutes } from "../modules/auth/auth.routes";
import { MentorRoutes } from "../modules/mentor/mentor.routes";
import { AdminRoutes } from "../modules/admin/admin.routes";

const router = express.Router();


// Mount module routes
router.use("/users", UserRoutes);                // /api/v1/users
router.use("/auth", AuthRoutes);                  // /api/v1/auth
router.use("/mentors", MentorRoutes);              // /api/v1/mentors
router.use("/admins", AdminRoutes);                // /api/v1/admins


// Optional root route
router.get("/", (req, res) => {
  res.json({
    message: "API v1 is running",
  });
});

export default router;