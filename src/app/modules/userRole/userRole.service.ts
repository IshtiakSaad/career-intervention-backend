import { UserRole, Role, AuditAction, AuditEventType } from "../../../generated/prisma";
import prisma from "../../utils/prisma";
import { AppError } from "../../errorHelpers/app-error";
import httpStatus from "http-status";
import AuditService from "../audit/audit.service";

/**
 * Grant a new role to a user.
 * @param adminId - The ID of the admin granting the role.
 * @param userId - The ID of the user receiving the role.
 * @param role - The Role enum value.
 * @param description - Optional reason for granting the role.
 */
const grantRole = async (
  adminId: string,
  userId: string,
  role: Role,
  description?: string
): Promise<UserRole> => {
  // 1. Check if user exists
  const isUserExist = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
  });

  if (!isUserExist) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  // 2. Resolve Admin Profile ID
  const admin = await prisma.admin.findUnique({
    where: { email: (await prisma.user.findUnique({ where: { id: adminId } }))?.email }
  });

  if (!admin) {
    throw new AppError(httpStatus.FORBIDDEN, "Only valid admins can grant roles");
  }

  // 3. Check if user already has this active role
  const existingRole = await prisma.userRole.findFirst({
    where: {
      userId,
      role,
      revokedAt: null,
    },
  });

  if (existingRole) {
    throw new AppError(httpStatus.BAD_REQUEST, `User already has the active role: ${role}`);
  }

  // 4. Create the role with Audit Log in transaction
  return await prisma.$transaction(async (tx) => {
    const newRole = await tx.userRole.create({
      data: {
        userId,
        role,
        grantedById: admin.id,
        description,
      },
    });

    await AuditService.log({
      actorId: adminId,
      eventType: AuditEventType.ROLE_CHANGE,
      action: AuditAction.GRANT,
      entityType: "UserRole",
      entityId: newRole.id,
      stateAfter: newRole,
      reason: description
    }, tx);

    return newRole;
  });
};

/**
 * Revoke an existing role from a user.
 * @param adminId - The ID of the admin performing the revocation.
 * @param userId - The ID of the user.
 * @param role - The Role enum to revoke.
 */
const revokeRole = async (
  adminId: string,
  userId: string,
  role: Role,
): Promise<UserRole> => {
  // 1. Find the active role
  const activeRole = await prisma.userRole.findFirst({
    where: {
      userId,
      role,
      revokedAt: null,
    },
  });

  if (!activeRole) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      `User does not have an active role of type: ${role}`
    );
  }

  // 2. Mark as revoked with Audit Log in transaction
  return await prisma.$transaction(async (tx) => {
    const updatedRole = await tx.userRole.update({
      where: { id: activeRole.id },
      data: { revokedAt: new Date() },
    });

    await AuditService.log({
      actorId: adminId,
      eventType: AuditEventType.ROLE_CHANGE,
      action: AuditAction.REVOKE,
      entityType: "UserRole",
      entityId: activeRole.id,
      stateBefore: activeRole,
      stateAfter: updatedRole
    }, tx);

    return updatedRole;
  });
};

/**
 * Get all roles for a user (history)
 */
const getUserRoles = async (userId: string): Promise<UserRole[]> => {
  return await prisma.userRole.findMany({
    where: { userId },
    include: {
      grantedBy: {
        include: { user: { select: { name: true, email: true } } }
      }
    },
    orderBy: { grantedAt: "desc" },
  });
};

export const UserRoleService = {
  grantRole,
  revokeRole,
  getUserRoles,
};
