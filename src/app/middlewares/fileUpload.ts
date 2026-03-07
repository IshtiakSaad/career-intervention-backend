import { NextFunction, Request, Response } from "express";
import { upload } from "../helpers/multer";

/**
 * Middleware to handle single file upload
 * @param fieldName Name of the field in the form-data
 */
const single = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.single(fieldName)(req, res, (err: any) => {
      if (err) {
        return next(err);
      }
      next();
    });
  };
};

export const FileUploadMiddleware = {
  single,
};
