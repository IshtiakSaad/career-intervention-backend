import { Request, Response } from "express";
import { UserService } from "./user.service";
import catchAsync from "../../middlewares/catchAsync";
import { IUserCreateByAdminPayload, IUserRegisterPayload, IUserUpdatePayload } from "./user.interface";
import { CloudinaryHelper } from "../../helpers/cloudinary";


/**
 * Self-registration endpoint for mentees.
 * Role is enforced as MENTEE
 */
const registerUser = catchAsync(async (req: Request, res: Response) => {
  const payload: IUserRegisterPayload = req.body;

  // Handle file upload if present
  if ((req as any).file) {
    const uploadResult = await CloudinaryHelper.uploadToCloudinary((req as any).file.path);
    payload.profileImageUrl = uploadResult?.secure_url;
  }

  const user = await UserService.createUser({ ...payload, role: "MENTEE" } as IUserCreateByAdminPayload);

  // Exclude passwordHash from response
  const { passwordHash, ...userResponse } = user as any;

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: userResponse,
  });
});


/**
 * Admin creates a user (MENTOR or ADMIN)
 */
const createUserByAdmin = catchAsync(async (req: Request, res: Response) => {
  const payload: IUserCreateByAdminPayload = req.body;

  // Handle file upload if present
  if ((req as any).file) {
    const uploadResult = await CloudinaryHelper.uploadToCloudinary((req as any).file.path);
    payload.profileImageUrl = uploadResult?.secure_url;
  }

  const user = await UserService.createUser(payload);

  const { passwordHash, ...userResponse } = user as any;

  res.status(201).json({
    success: true,
    message: "User created by admin successfully",
    data: userResponse,
  });
});


import pick from "../../utils/pick";
import { paginationFields } from "../../constants/pagination";
import { userFilterableFields } from "./user.constant";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";

// ------------------ GET ALL USERS --------------------- //

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, userFilterableFields);
  const options = pick(req.query, paginationFields);

  const result = await UserService.getAllUsers(filters, options);


  // Exclude passwordHash from each user
  const usersWithoutPasswords = result.data.map((user) => {
    const { passwordHash, ...userResponse } = user as any;
    return userResponse;
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users fetched successfully",
    meta: result.meta,
    data: usersWithoutPasswords,
  });
});



// ------------------ GET A SINGLE USER --------------------- //

const getSingleUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await UserService.getSingleUser(id as string);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const { passwordHash, ...userResponse } = user as any;

  res.status(200).json({
    success: true,
    data: userResponse,
  });
});


const updateUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const payload: IUserUpdatePayload = req.body;
  const updatedUser = await UserService.updateUser(id as string, payload);

  const { passwordHash, ...userResponse } = updatedUser as any;

  res.status(200).json({
    success: true,
    message: "User updated successfully",
    data: userResponse,
  });
});


const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const deletedUser = await UserService.deleteUser(id as string);

  const { passwordHash, ...userResponse } = deletedUser as any;

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
    data: userResponse,
  });
});



export const UserController = {
  registerUser,
  createUserByAdmin,
  getAllUsers,
  getSingleUser,
  updateUser,
  deleteUser,
};