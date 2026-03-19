import { Status, RevocationReason, AuditAction, AuditEventType } from "../../../generated/prisma";
import { envVars } from "../../config/env";
import { JwtHelpers } from "../../utils/jwtHelpers";
import prisma from "../../utils/prisma";
import HashService from "../../utils/crypto/hash";
import SessionProvider from "./session.provider";
import { AppError } from "../../errorHelpers/app-error";
import httpStatus from "http-status";
import AuditService from "../audit/audit.service";
import { sendEmail } from "../../utils/sendEmail";

/**
 * Login User (Stateful)
 */
const loginUser = async (
  payload: any,
  context: { ip: string; ua: string }
) => {
  const { email, password } = payload;

  const user = await prisma.user.findUnique({
    where: { email, deletedAt: null },
    include: { userRoles: true }
  });

  if (!user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid credentials");
  }

  if (user.accountStatus === Status.SUSPENDED) {
    throw new AppError(httpStatus.FORBIDDEN, "Account is suspended.");
  }

  if (user.failedLoginAttempts >= 5) {
     await AuditService.log({
        actorId: user.id,
        eventType: AuditEventType.SECURITY_EVENT,
        action: AuditAction.UPDATE,
        entityType: "User",
        entityId: user.id,
        ipAddress: context.ip,
        userAgent: context.ua,
        riskScore: 90,
        reason: "Brute-force lockout"
     });
     throw new AppError(httpStatus.FORBIDDEN, "Account locked.");
  }

  const isMatch = await HashService.verifyBcrypt(password, user.passwordHash);
  if (!isMatch) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: user.failedLoginAttempts + 1 }
    });
    
    await AuditService.log({
        actorId: user.id,
        eventType: AuditEventType.AUTH_EVENT,
        action: AuditAction.LOGIN,
        entityType: "User",
        entityId: user.id,
        riskScore: 40,
        ipAddress: context.ip,
        userAgent: context.ua,
        reason: "Invalid credentials"
    });

    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid credentials");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lastLoginAt: new Date() }
  });

  const { session, rawToken } = await SessionProvider.createSession({
    userId: user.id,
    ipAddress: context.ip,
    userAgent: context.ua
  });

  const roles = user.userRoles.map(ur => ur.role);
  const accessToken = JwtHelpers.generateToken(
    { id: user.id, email: user.email, roles, sid: session.id },
    envVars.JWT_ACCESS_SECRET,
    envVars.JWT_ACCESS_EXPIRES_IN
  );

  await AuditService.log({
    actorId: user.id,
    sessionId: session.id,
    eventType: AuditEventType.AUTH_EVENT,
    action: AuditAction.LOGIN,
    entityType: "AuthSession",
    entityId: session.id,
    ipAddress: context.ip,
    userAgent: context.ua,
    riskScore: 10
  });

  return {
    accessToken,
    refreshToken: `${session.id}:${rawToken}`,
    needsPasswordChange: user.needPasswordChange,
  };
};

/**
 * Token Rotation Handler
 */
const refreshToken = async (
  tokenPayload: string,
  context: { ip: string; ua: string }
) => {
  const [sessionId, rawSecret] = tokenPayload.split(":");
  const { session, rawToken } = await SessionProvider.rotateSession(sessionId, rawSecret, context);

  const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { userRoles: true }
  });

  const roles = user?.userRoles.map(ur => ur.role) || [];
  const accessToken = JwtHelpers.generateToken(
    { id: user!.id, email: user!.email, roles, sid: session.id },
    envVars.JWT_ACCESS_SECRET,
    envVars.JWT_ACCESS_EXPIRES_IN
  );

  await AuditService.log({
    actorId: user!.id,
    sessionId: session.id,
    eventType: AuditEventType.AUTH_EVENT,
    action: AuditAction.UPDATE,
    entityType: "AuthSession",
    entityId: session.id,
    ipAddress: context.ip,
    userAgent: context.ua,
    reason: "Token Refresh"
  });

  return {
    accessToken,
    refreshToken: `${session.id}:${rawToken}`
  };
};

/**
 * Change Password (Authenticated)
 */
const changePassword = async (
  userId: string,
  payload: any,
  context: { ip: string; ua: string }
) => {
  const { oldPassword, newPassword } = payload;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found.");

  const isMatch = await HashService.verifyBcrypt(oldPassword, user.passwordHash);
  if (!isMatch) throw new AppError(httpStatus.UNAUTHORIZED, "Current password incorrect.");

  const passwordHash = await HashService.hashBcrypt(newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash, needPasswordChange: false }
    });

    await tx.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date(), revocationReason: RevocationReason.SEC_PASSWORD_CHANGE }
    });

    await AuditService.log({
        actorId: userId,
        eventType: AuditEventType.SECURITY_EVENT,
        action: AuditAction.UPDATE,
        entityType: "User",
        entityId: userId,
        ipAddress: context.ip,
        userAgent: context.ua,
        riskScore: 60,
        reason: "Password change"
    }, tx);
  });
};

/**
 * Forgot Password (Public)
 */
const forgotPassword = async (
  email: string,
  context: { ip: string; ua: string }
) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const rawToken = HashService.generateSecureToken(32);
  const tokenHash = HashService.hashSHA256(rawToken);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    }
  });

  await AuditService.log({
    actorId: user.id,
    eventType: AuditEventType.SECURITY_EVENT,
    action: AuditAction.UPDATE,
    entityType: "User",
    entityId: user.id,
    ipAddress: context.ip,
    userAgent: context.ua,
    reason: "Password reset requested"
  });

  const resetLink = `${envVars.CLIENT_URL}/reset-password?token=${rawToken}`;

  await sendEmail({
    to: email,
    subject: "Reset your password - Career Platform",
    html: `
      <div>
        <h2>Password Reset Request</h2>
        <p>Hi ${user.name || 'User'},</p>
        <p>We received a request to reset your password. Click the link below to set a new password:</p>
        <a href="${resetLink}" style="display:inline-block; padding:10px 20px; background-color:#007bff; color:white; text-decoration:none; border-radius:5px;">Reset Password</a>
        <p>This link will expire in 15 minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `
  });

  console.log(`[SEC_AUDIT] Password reset token for ${email}: ${rawToken}`);
};

/**
 * Reset Password (Public)
 */
const resetPassword = async (
  rawToken: string,
  newPassword: string,
  context: { ip: string; ua: string }
) => {
  const tokenHash = HashService.hashSHA256(rawToken);

  const resetToken = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    include: { user: true }
  });

  if (!resetToken) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid token.");
  }

  const passwordHash = await HashService.hashBcrypt(newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash, needPasswordChange: false }
    });

    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() }
    });

    await tx.authSession.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date(), revocationReason: RevocationReason.SEC_PASSWORD_CHANGE }
    });

    await AuditService.log({
        actorId: resetToken.userId,
        eventType: AuditEventType.SECURITY_EVENT,
        action: AuditAction.UPDATE,
        entityType: "User",
        entityId: resetToken.userId,
        ipAddress: context.ip,
        userAgent: context.ua,
        riskScore: 70,
        reason: "Password reset completed"
    }, tx);
  });
};

export const AuthService = {
  loginUser,
  refreshToken,
  changePassword,
  forgotPassword,
  resetPassword,
};

