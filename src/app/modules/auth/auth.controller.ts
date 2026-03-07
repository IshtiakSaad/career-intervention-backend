import { Request, Response } from "express";
import catchAsync from "../../middlewares/catchAsync";
import { AuthService } from "./auth.service";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginUser(req.body);

  const { refreshToken, ...rest } = result;

  // set refresh token into cookie
  const cookieOptions = {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  };

  res.cookie("refreshToken", refreshToken, cookieOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User logged in successfully!",
    data: {
      accessToken: rest.accessToken,
      needsPasswordChange: rest.needsPasswordChange,
    },
  });
});

export const AuthController = {
  loginUser,
};
