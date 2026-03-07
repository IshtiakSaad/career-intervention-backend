import { ZodObject } from "zod";
import { Request, Response, NextFunction } from "express";

export const validateRequest =
  (schema: ZodObject) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      next(result.error);
    } else {
      req.body = result.data.body;
      next();
    }
  };
