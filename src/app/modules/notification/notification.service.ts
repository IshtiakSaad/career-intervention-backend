import { NotificationType } from "../../../generated/prisma";
import prisma from "../../utils/prisma";
import { AppError } from "../../errorHelpers/app-error";
import httpStatus from "http-status";
import { INotificationDispatchPayload } from "./notification.interface";

class NotificationService {
  /**
   * Dispatch a single notification.
   * Accepts optional Prisma transaction client to ensure atomicity
   * with the business action that triggered it.
   */
  public static async dispatch(
    payload: INotificationDispatchPayload,
    tx?: any
  ) {
    const db = tx || prisma;

    return await db.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        entityType: payload.entityType,
        entityId: payload.entityId,
      },
    });
  }

  /**
   * Dispatch multiple notifications atomically.
   * Used when an event notifies multiple parties (e.g., both mentor and mentee).
   */
  public static async dispatchBulk(
    payloads: INotificationDispatchPayload[],
    tx?: any
  ) {
    const db = tx || prisma;

    // createMany doesn't return records in all adapters, so use Promise.all
    return await Promise.all(
      payloads.map((payload) =>
        db.notification.create({
          data: {
            userId: payload.userId,
            type: payload.type,
            title: payload.title,
            body: payload.body,
            entityType: payload.entityType,
            entityId: payload.entityId,
          },
        })
      )
    );
  }

  /**
   * Get paginated notification feed for a user.
   * Returns notifications and metadata.
   */
  public static async getMyNotifications(
    userId: string,
    options: { page: number; limit: number; unreadOnly: boolean }
  ) {
    const { page, limit, unreadOnly } = options;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      notifications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  /**
   * Mark a single notification as read.
   * Verifies ownership to prevent cross-user tampering.
   */
  public static async markAsRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
    }

    if (notification.userId !== userId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You can only mark your own notifications as read"
      );
    }

    if (notification.isRead) {
      return notification; // Already read — idempotent
    }

    return await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark all unread notifications as read for a user.
   */
  public static async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { markedCount: result.count };
  }

  /**
   * Get unread notification count for badge display.
   */
  public static async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { count };
  }
}

export default NotificationService;
