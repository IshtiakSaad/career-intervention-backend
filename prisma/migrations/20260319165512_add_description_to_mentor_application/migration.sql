/*
  Warnings:

  - You are about to drop the column `rejectionReason` on the `mentor_applications` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,role]` on the table `user_roles` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'ACTION_NEEDED';

-- AlterTable
ALTER TABLE "mentor_applications" DROP COLUMN "rejectionReason",
ADD COLUMN     "feedback" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_role_key" ON "user_roles"("userId", "role");
