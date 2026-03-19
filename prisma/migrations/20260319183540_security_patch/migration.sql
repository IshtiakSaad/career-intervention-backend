/*
  Warnings:

  - You are about to drop the column `videoLink` on the `sessions` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SecurityEvent" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'REFRESH_SUCCESS', 'REFRESH_REUSE_DETECTED', 'PASSWORD_CHANGE_SUCCESS', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_SUCCESS', 'MFA_ENABLED', 'MFA_DISABLED', 'MFA_VERIFY_SUCCESS', 'MFA_VERIFY_FAILURE', 'ACCOUNT_SUSPENDED', 'ACCOUNT_DELETED');

-- CreateEnum
CREATE TYPE "RevocationReason" AS ENUM ('LOGOUT', 'ROTATED', 'REUSE_DETECTED', 'ADMIN_REVOKED', 'SEC_PASSWORD_CHANGE');

-- AlterTable
ALTER TABLE "sessions" DROP COLUMN "videoLink",
ADD COLUMN     "meetingLink" TEXT;

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_info" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "twoFactorSecret" TEXT,
    "backupCodes" JSONB,
    "securityVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "event" "SecurityEvent" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT,
    "parentSessionId" TEXT,
    "rootSessionId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revocationReason" "RevocationReason",
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "absoluteExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "security_info_userId_key" ON "security_info"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refreshTokenHash_key" ON "auth_sessions"("refreshTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_parentSessionId_key" ON "auth_sessions"("parentSessionId");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_info" ADD CONSTRAINT "security_info_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_logs" ADD CONSTRAINT "security_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
