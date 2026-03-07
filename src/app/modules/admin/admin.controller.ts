import { Request, Response } from "express";
import catchAsync from "../../middlewares/catchAsync";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { AdminService } from "./admin.service";

const getAllAdmins = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllAdmins();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admins fetched successfully!",
    data: result,
  });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await AdminService.getMyAdminProfile(user?.email);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin profile fetched successfully!",
    data: result,
  });
});

export const AdminController = {
  getAllAdmins,
  getMyProfile,
};
