import express from "express";
import { UserRoleController } from "./userRole.controller";
import { UserRoleValidation } from "./userRole.validation";
import { validateRequest } from "../../middlewares/validateRequest";
import { authMiddleware } from "../../middlewares/authMiddleware";

const router = express.Router();

/**
 * Admin Grant Role
 * POST /api/v1/user-roles/grant
 */
router.post(
  "/grant",
  authMiddleware("ADMIN"),
  validateRequest(UserRoleValidation.grantRoleValidationSchema),
  UserRoleController.grantRole
);

/**
 * Admin Revoke Role
 * PATCH /api/v1/user-roles/revoke
 */
router.patch(
  "/revoke",
  authMiddleware("ADMIN"),
  validateRequest(UserRoleValidation.revokeRoleValidationSchema),
  UserRoleController.revokeRole
);

/**
 * Get User Role History
 * GET /api/v1/user-roles/:userId
 */
router.get(
  "/:userId",
  authMiddleware("ADMIN"),
  UserRoleController.getUserRoles
);

export const UserRoleRoutes = router;
