import type { Notification } from "../types/notification";

const STORAGE_PREFIX = "frpam.localNotifications.";
const SNAPSHOT_PREFIX = "frpam.equipmentRequestSnapshot.";

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getLocalNotifications(userId: number): Notification[] {
  if (!userId) return [];
  return readJson<Notification[]>(`${STORAGE_PREFIX}${userId}`, []).filter(
    (notification) => notification && notification.isLocal === true
  );
}

export function saveLocalNotifications(userId: number, notifications: Notification[]): void {
  if (!userId) return;
  localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(notifications));
}

export function addLocalNotification(
  userId: number,
  notification: Omit<Notification, "notificationId" | "userId" | "isRead" | "readAt" | "isDeleted" | "deletedAt" | "isLocal"> & {
    localKey?: string;
  }
): Notification | null {
  if (!userId) return null;
  const current = getLocalNotifications(userId);
  if (notification.localKey && current.some((item) => item.localKey === notification.localKey)) {
    return null;
  }

  const created: Notification = {
    ...notification,
    notificationId: -Date.now() - Math.floor(Math.random() * 1000),
    userId,
    isRead: false,
    readAt: null,
    isDeleted: false,
    deletedAt: null,
    isLocal: true,
  };
  saveLocalNotifications(userId, [created, ...current].slice(0, 200));
  return created;
}

export function updateLocalNotification(
  userId: number,
  notificationId: number,
  update: Partial<Notification> | null
): void {
  const current = getLocalNotifications(userId);
  const next = update === null
    ? current.filter((item) => item.notificationId !== notificationId)
    : current.map((item) => item.notificationId === notificationId ? { ...item, ...update } : item);
  saveLocalNotifications(userId, next);
}

export function getEquipmentRequestSnapshot(userId: number): Record<string, string> {
  if (!userId) return {};
  return readJson<Record<string, string>>(`${SNAPSHOT_PREFIX}${userId}`, {});
}

export function saveEquipmentRequestSnapshot(userId: number, snapshot: Record<string, string>): void {
  if (!userId) return;
  localStorage.setItem(`${SNAPSHOT_PREFIX}${userId}`, JSON.stringify(snapshot));
}
