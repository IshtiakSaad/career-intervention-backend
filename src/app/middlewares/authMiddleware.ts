import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { Secret } from "jsonwebtoken";
import { envVars } from "../config/env";
import { JwtHelpers } from "../utils/jwtHelpers";
import prisma from "../utils/prisma";

/**
 * Role-based authorization middleware
 * @param roles - string or array of strings indicating allowed roles
 */
export const authMiddleware = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Get token from header
      const token = req.headers.authorization;

      if (!token) {
        return res
          .status(httpStatus.UNAUTHORIZED)
          .json({ success: false, message: "You are not authorized" });
      }

      // 2. Verify token
      let verifiedUser = null;
      try {
        verifiedUser = JwtHelpers.verifyToken(token, envVars.JWT_ACCESS_SECRET as Secret);
      } catch (err) {
        return res
          .status(httpStatus.UNAUTHORIZED)
          .json({ success: false, message: "Invalid or expired token" });
      }

      // 3. Attach user to request
      req.user = verifiedUser;

      // 4. Check if user exists in DB (in case of deletion or password change)
      const user = await prisma.user.findUnique({
        where: { id: verifiedUser.id, deletedAt: null },
      });

      if (!user) {
        return res
          .status(httpStatus.NOT_FOUND)
          .json({ success: false, message: "User not found" });
      }

      // 5. Check role-based authorization
      if (roles.length && !roles.includes(verifiedUser.role)) {
        return res
          .status(httpStatus.FORBIDDEN)
          .json({ success: false, message: "Forbidden: Insufficient permissions" });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
