import { AuthSession, RevocationReason } from "../../../generated/prisma";
import prisma from "../../utils/prisma";
import HashService from "../../utils/crypto/hash";
import { AppError } from "../../errorHelpers/app-error";
import httpStatus from "http-status";

const IDLE_EXPIRY_DAYS = 15;
const ABSOLUTE_EXPIRY_DAYS = 90;

interface ICreateSession {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  parentSessionId?: string;
  rootSessionId?: string;
}

class SessionProvider {
  /**
   * Create a new session (Login or Rotation).
   */
  public static async createSession(data: ICreateSession): Promise<{ session: AuthSession; rawToken: string }> {
    const { userId, ipAddress, userAgent, parentSessionId, rootSessionId } = data;

    const rawToken = HashService.generateSecureToken(32);
    const refreshTokenHash = HashService.hashSHA256(rawToken);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + IDLE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const absoluteExpiresAt = rootSessionId 
      ? (await prisma.authSession.findUnique({ where: { id: rootSessionId } }))?.absoluteExpiresAt || new Date(now.getTime() + ABSOLUTE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + ABSOLUTE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const session = await prisma.authSession.create({
      data: {
        userId,
        refreshTokenHash,
        parentSessionId,
        rootSessionId: rootSessionId || undefined,
        ipAddress,
        userAgent,
        expiresAt,
        absoluteExpiresAt,
      },
    });

    // If this is a rotation, we should mark the rootSessionId if it wasn't provided
    if (!rootSessionId && !parentSessionId) {
        await prisma.authSession.update({
            where: { id: session.id },
            data: { rootSessionId: session.id }
        });
        session.rootSessionId = session.id;
    }

    return { session, rawToken };
  }

  /**
   * Rotate a session using a refresh token.
   * Includes reuse detection logic.
   */
  public static async rotateSession(
    sessionId: string,
    rawRefreshToken: string,
    context: { ip: string; ua: string }
  ): Promise<{ session: AuthSession; rawToken: string }> {
    const session = await prisma.authSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Session not found");
    }

    // 1. Reuse Detection: If session is already revoked
    if (session.revokedAt) {
      if (session.revocationReason === RevocationReason.ROTATED) {
        // TOKEN REUSE DETECTED! Blow up all sessions for this user.
        await this.revokeAllUserSessions(session.userId, RevocationReason.REUSE_DETECTED);
        throw new AppError(httpStatus.UNAUTHORIZED, "Security breach detected. All sessions invalidated.");
      }
      throw new AppError(httpStatus.UNAUTHORIZED, "Session has been revoked.");
    }

    // 2. Expiry Checks
    const now = new Date();
    if (now > session.expiresAt || now > session.absoluteExpiresAt) {
        await prisma.authSession.update({
            where: { id: sessionId },
            data: { revokedAt: now, revocationReason: RevocationReason.LOGOUT }
        });
        throw new AppError(httpStatus.UNAUTHORIZED, "Session expired.");
    }

    // 3. Verify Token Hash
    const isTokenValid = HashService.verifySHA256(session.refreshTokenHash!, rawRefreshToken);
    if (!isTokenValid) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Invalid refresh token.");
    }

    // 4. Atomic Rotation
    return await prisma.$transaction(async (tx) => {
      // Revoke current
      await tx.authSession.update({
        where: { id: sessionId },
        data: {
          revokedAt: new Date(),
          revocationReason: RevocationReason.ROTATED,
        },
      });

      // Create new in chain
      return await this.createSession({
        userId: session.userId,
        ipAddress: context.ip,
        userAgent: context.ua,
        parentSessionId: session.id,
        rootSessionId: session.rootSessionId || session.id,
      });
    });
  }

  /**
   * Revoke all sessions for a user.
   */
  public static async revokeAllUserSessions(userId: string, reason: RevocationReason): Promise<void> {
    await prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revocationReason: reason,
      },
    });
  }

  /**
   * Revoke a single session (Logout).
   */
  public static async revokeSession(sessionId: string, reason: RevocationReason = RevocationReason.LOGOUT): Promise<void> {
    await prisma.authSession.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
        revocationReason: reason,
      },
    });
  }
}

export default SessionProvider;
