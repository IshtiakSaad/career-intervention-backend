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
    include: { userRoles: true }
  });

  if (!user) {
    throw new Error("User not found");
  }

  // 2. Security Check: Suspended Status or Max Retries
  if (user.accountStatus === Status.SUSPENDED) {
    throw new Error('Account is suspended. Please contact admin.');
  }

  if (user.failedLoginAttempts >= 5) {
    // Automatically block the account after 5 failed attempts
    await prisma.user.update({
      where: { id: user.id },
      data: { accountStatus: Status.SUSPENDED },
    });
    
    throw new Error('Account is locked due to too many failed login attempts.');
  }

  // 3. Verify password
  const isPasswordMatched = await comparePassword(password, user.passwordHash);

  if (!isPasswordMatched) {
    // Increment failed login attempt
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: user.failedLoginAttempts + 1 },
    });
    throw new Error('Invalid credentials');
  }

  // 4. Successful Login: Reset failed attempts & Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lastLoginAt: new Date(),
    },
  });

  // 5. Extract Roles Array
  const roles = user.userRoles.map(ur => ur.role);

  if (roles.length === 0) {
    throw new Error('User has no assigned roles. Please contact admin.');
  }

  // 6. Generate Tokens
  const accessToken = JwtHelpers.generateToken(
    { id: user.id, email: user.email, roles },
    envVars.JWT_ACCESS_SECRET,
    envVars.JWT_ACCESS_EXPIRES_IN
  );

  const refreshToken = JwtHelpers.generateToken(
    { id: user.id, email: user.email, roles },
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
