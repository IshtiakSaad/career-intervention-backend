import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware";
import { AdminController } from "./admin.controller";

const router = express.Router();

router.get("/", authMiddleware("ADMIN"), AdminController.getAllAdmins);
router.get("/me", authMiddleware("ADMIN"), AdminController.getMyProfile);

export const AdminRoutes = router;
