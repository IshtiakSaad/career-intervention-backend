import { Request, Response } from "express";
import catchAsync from "../../middlewares/catchAsync";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { AdminService } from "./admin.service";

import pick from "../../utils/pick";

const adminFilterableFields = ['searchTerm', 'activeStatus'];

const getAllAdmins = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, adminFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await AdminService.getAllAdmins(filters, options);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admins fetched successfully!",
    meta: result.meta,
    data: result.data,
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
