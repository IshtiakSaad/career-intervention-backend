import { NextFunction, Request, Response } from "express";
import { envVars } from "../config/env";
import { AppError } from "../errorHelpers/app-error";

export const globalErrorHandlers = (
  err: any | AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const statusCode = 500;

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  res.status(statusCode).json({
    success: false,
    message: err.message,
    err,
    stack: envVars.NODE_ENV === "development" ? err.stack : null,
  });
};
