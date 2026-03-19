import { Request, Response } from "express";
import catchAsync from "../../middlewares/catchAsync";
import { AuthService } from "./auth.service";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { envVars } from "../../config/env";

const COOKIE_NAME = "refreshToken";

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const context = {
    ip: req.ip!,
    ua: req.headers["user-agent"] || "unknown",
  };

  const result = await AuthService.loginUser(req.body, context);
  const { refreshToken, ...rest } = result;

  // Set refresh token into HTTP-Only cookie with Path scoping
  res.cookie(COOKIE_NAME, refreshToken, {
    secure: envVars.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "strict",
    path: "/api/v1/auth/refresh",
  });

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

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies[COOKIE_NAME];
  const context = {
    ip: req.ip!,
    ua: req.headers["user-agent"] || "unknown",
  };

  const result = await AuthService.refreshToken(token, context);
  const { refreshToken: newRefreshToken, accessToken } = result;

  res.cookie(COOKIE_NAME, newRefreshToken, {
    secure: envVars.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "strict",
    path: "/api/v1/auth/refresh",
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Access token refreshed successfully!",
    data: { accessToken },
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const context = {
    ip: req.ip!,
    ua: req.headers["user-agent"] || "unknown",
  };

  await AuthService.changePassword(user.id, req.body, context);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password changed successfully!",
    data: null,
  });
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const context = {
    ip: req.ip!,
    ua: req.headers["user-agent"] || "unknown",
  };

  await AuthService.forgotPassword(req.body.email, context);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "If account exists, reset link has been sent.",
    data: null,
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const context = {
    ip: req.ip!,
    ua: req.headers["user-agent"] || "unknown",
  };

  const { token, newPassword } = req.body;
  await AuthService.resetPassword(token, newPassword, context);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password reset successfully!",
    data: null,
  });
});

const logout = catchAsync(async (req: Request, res: Response) => {
    // Clear cookie
    res.clearCookie(COOKIE_NAME, {
        path: "/api/v1/auth/refresh",
        httpOnly: true,
        secure: envVars.NODE_ENV === "production",
        sameSite: "strict"
    });

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Logged out successfully!",
        data: null
    });
});

export const AuthController = {
  loginUser,
  refreshToken,
  changePassword,
  forgotPassword,
  resetPassword,
  logout
};

