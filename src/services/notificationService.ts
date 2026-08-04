import api from "./api";
import type {
  Notification,
  NotificationListResult,
  NotificationQuery,
} from "../types/notification";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unwrap(payload: unknown): unknown {
  if (!isRecord(payload)) return payload;
  if ("data" in payload) return unwrap(payload.data);
  if ("result" in payload) return unwrap(payload.result);
  return payload;
}

function normalizeNotification(value: unknown): Notification {
  const item = isRecord(value) ? value : {};

  return {
    notificationId: Number(item.notificationId ?? item.id ?? 0),
    userId: Number(item.userId ?? 0),
    title: typeof item.title === "string" ? item.title : "",
    message: typeof item.message === "string" ? item.message : "",
    notificationType:
      typeof item.notificationType === "string"
        ? item.notificationType
        : "General",
    referenceType:
      typeof item.referenceType === "string" ? item.referenceType : null,
    referenceId:
      item.referenceId === null || item.referenceId === undefined
        ? null
        : Number(item.referenceId),
    isRead: Boolean(item.isRead),
    readAt: typeof item.readAt === "string" ? item.readAt : null,
    isDeleted: Boolean(item.isDeleted),
    deletedAt: typeof item.deletedAt === "string" ? item.deletedAt : null,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
  };
}

function normalizeList(payload: unknown): NotificationListResult {
  const data = unwrap(payload);

  if (Array.isArray(data)) {
    const items = data.map(normalizeNotification);
    return {
      items,
      page: 1,
      size: items.length,
      total: items.length,
      totalPages: items.length > 0 ? 1 : 0,
    };
  }

  const value = isRecord(data) ? data : {};
  const rawItems = Array.isArray(value.items) ? value.items : [];
  const items = rawItems.map(normalizeNotification);

  return {
    items,
    page: Number(value.page ?? value.currentPage ?? 1),
    size: Number(value.size ?? value.pageSize ?? items.length),
    total: Number(value.total ?? value.totalCount ?? items.length),
    totalPages: Number(
      value.totalPages ??
        (Number(value.total ?? items.length) > 0 ? 1 : 0),
    ),
  };
}

function validateId(id: number): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Notification ID is invalid.");
  }
}

export async function getNotifications(
  query: NotificationQuery = {},
): Promise<NotificationListResult> {
  const response = await api.get("/Notifications", {
    params: {
      IsRead: query.isRead,
      IncludeDeleted: query.includeDeleted,
      NotificationType: query.notificationType,
      Page: query.page,
      Size: query.size,
    },
  });

  return normalizeList(response.data);
}

export async function getNotificationById(id: number): Promise<Notification> {
  validateId(id);
  const response = await api.get(`/Notifications/${id}`);
  return normalizeNotification(unwrap(response.data));
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await api.get("/Notifications/unread-count");
  const data = unwrap(response.data);

  return isRecord(data) ? Number(data.unreadCount ?? 0) : 0;
}

export async function markNotificationAsRead(id: number): Promise<void> {
  validateId(id);
  await api.patch(`/Notifications/${id}/read`);
}

export async function markAllNotificationsAsRead(): Promise<number> {
  const response = await api.patch("/Notifications/read-all");
  const data = unwrap(response.data);

  return isRecord(data) ? Number(data.updatedCount ?? 0) : 0;
}

export async function deleteNotification(id: number): Promise<void> {
  validateId(id);
  await api.delete(`/Notifications/${id}`);
}
