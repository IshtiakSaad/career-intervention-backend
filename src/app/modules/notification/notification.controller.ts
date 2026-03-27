import { Request, Response } from "express";
import catchAsync from "../../middlewares/catchAsync";
import NotificationService from "./notification.service";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const unreadOnly = req.query.unreadOnly === "true";

  const result = await NotificationService.getMyNotifications(user.id, {
    page,
    limit,
    unreadOnly,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notifications fetched successfully",
    meta: result.meta,
    data: result.notifications,
  });
});

const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const result = await NotificationService.getUnreadCount(user.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Unread count fetched successfully",
    data: result,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const result = await NotificationService.markAsRead(
    user.id,
    req.params.id as string
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification marked as read",
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const result = await NotificationService.markAllAsRead(user.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All notifications marked as read",
    data: result,
  });
});

export const NotificationController = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
