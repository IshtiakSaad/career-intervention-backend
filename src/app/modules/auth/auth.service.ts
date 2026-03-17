import { Status } from "../../../generated/prisma";
import { envVars } from "../../config/env";
import { JwtHelpers } from "../../utils/jwtHelpers";
import { comparePassword } from "../../utils/hashPassword";
import prisma from "../../utils/prisma";

import { ILoginPayload, ILoginResponse } from "./auth.interface";

const loginUser = async (payload: ILoginPayload): Promise<ILoginResponse> => {
  const { email, password } = payload;

  // 1. Check if user exists
  const user = await prisma.user.findUnique({
    where: { email, deletedAt: null },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // 2. Check if account is active
  if (user.accountStatus === Status.SUSPENDED) {
    throw new Error("Account is suspended");
  }


  // 3. Verify password
  const isPasswordMatched = await comparePassword(password, user.passwordHash);

  if (!isPasswordMatched) {
    throw new Error("Invalid password");
  }

  // 4. Generate Tokens
  const accessToken = JwtHelpers.generateToken(
    { id: user.id, email: user.email, role: user.role },
    envVars.JWT_ACCESS_SECRET,
    envVars.JWT_ACCESS_EXPIRES_IN
  );

  const refreshToken = JwtHelpers.generateToken(
    { id: user.id, email: user.email, role: user.role },
    envVars.JWT_REFRESH_SECRET,
    envVars.JWT_REFRESH_EXPIRES_IN
  );

  return {
    accessToken,
    refreshToken,
    needsPasswordChange: user.needPasswordChange,
  };
};

export const AuthService = {
  loginUser,
};
