import express from "express";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";
import { validateRequest } from "../../middlewares/validateRequest";
import { authMiddleware } from "../../middlewares/authMiddleware";
import { FileUploadMiddleware } from "../../middlewares/fileUpload";

const router = express.Router();

// Self-registration (open to anyone)
router.post(
  "/register",
  FileUploadMiddleware.single("file"),
  validateRequest(UserValidation.createUserValidationSchema),
  UserController.registerUser
);

// Admin creates new user (MENTOR or ADMIN)
router.post(
  "/",
  authMiddleware("ADMIN"), // only admin can create users with custom roles
  FileUploadMiddleware.single("file"),
  validateRequest(UserValidation.createUserByAdminValidationSchema),
  UserController.createUserByAdmin
);


// Fetch all users (admin only)
router.get("/", authMiddleware("ADMIN"), UserController.getAllUsers);

// Fetch single user (admin or self)
router.get(
  "/:id",
  authMiddleware("ADMIN", "MENTEE", "MENTOR"),
  UserController.getSingleUser
);

// Update user (admin or self)
router.patch(
  "/:id",
  authMiddleware("ADMIN", "MENTEE", "MENTOR"),
  validateRequest(UserValidation.updateUserValidationSchema),
  UserController.updateUser
);


// Soft delete user (admin only)
router.delete("/:id", authMiddleware("ADMIN"), UserController.deleteUser);

export const UserRoutes = router;