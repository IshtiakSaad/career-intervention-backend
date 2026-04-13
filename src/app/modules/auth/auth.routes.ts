import express from "express";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";
import { validateRequest } from "../../middlewares/validateRequest";
import { authMiddleware } from "../../middlewares/authMiddleware";
import {
  authRateLimiter,
  refreshRateLimiter,
} from "../../middlewares/rateLimiter";

const router = express.Router();

router.post(
  "/login",
  authRateLimiter,
  validateRequest(AuthValidation.loginValidationSchema),
  AuthController.loginUser,
);

router.post("/refresh-token", refreshRateLimiter, AuthController.refreshToken);

router.post(
  "/change-password",
  authMiddleware("ADMIN", "MENTOR", "MENTEE"),
  authRateLimiter,
  validateRequest(AuthValidation.changePasswordValidationSchema),
  AuthController.changePassword,
);

router.post(
  "/forgot-password",
  authRateLimiter,
  validateRequest(AuthValidation.forgotPasswordValidationSchema),
  AuthController.forgotPassword,
);

router.post(
  "/reset-password",
  authRateLimiter,
  validateRequest(AuthValidation.resetPasswordValidationSchema),
  AuthController.resetPassword,
);

router.post(
  "/logout",
  authMiddleware("ADMIN", "MENTOR", "MENTEE"),
  AuthController.logout,
);

export const AuthRoutes = router;
