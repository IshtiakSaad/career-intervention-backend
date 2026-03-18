import { Request, Response } from "express";
import catchAsync from "../../middlewares/catchAsync";
import { UserRoleService } from "./userRole.service";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";

const grantRole = catchAsync(async (req: Request, res: Response) => {
  const adminId = (req as any).user.id; // User ID from auth middleware
  const { userId, role, description } = req.body;

  const result = await UserRoleService.grantRole(adminId, userId, role, description);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Role granted successfully",
    data: result,
  });
});

const revokeRole = catchAsync(async (req: Request, res: Response) => {
  const { userId, role } = req.body;

  const result = await UserRoleService.revokeRole(userId, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Role revoked successfully",
    data: result,
  });
});

const getUserRoles = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const result = await UserRoleService.getUserRoles(userId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User roles fetched successfully",
    data: result,
  });
});

export const UserRoleController = {
  grantRole,
  revokeRole,
  getUserRoles,
};
