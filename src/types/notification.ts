export interface Notification {
  notificationId: number;
  userId: number;
  title: string;
  message: string;
  notificationType: string;
  referenceType: string | null;
  referenceId: number | null;
  isRead: boolean;
  readAt: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
}

export interface NotificationQuery {
  isRead?: boolean;
  includeDeleted?: boolean;
  notificationType?: string;
  page?: number;
  size?: number;
}

export interface NotificationListResult {
  items: Notification[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface RealtimeNotificationPayload {
  notificationId?: number;
  title?: string;
  message?: string;
  notificationType?: string;
  referenceType?: string | null;
  referenceId?: number | null;
  createdAt?: string;
}
