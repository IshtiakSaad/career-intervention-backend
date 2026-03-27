import { NotificationType } from "../../../generated/prisma";

export interface INotificationDispatchPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
}

export interface INotificationQueryParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}
