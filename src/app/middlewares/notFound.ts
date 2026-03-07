import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../errorHelpers/app-error";

export const notFound = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  next(
    new AppError(
      StatusCodes.NOT_FOUND,
      `Route not found: ${req.originalUrl}`
    )
  );
};