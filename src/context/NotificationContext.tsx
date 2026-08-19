import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  Notification,
  NotificationListResult,
  NotificationQuery,
} from "../types/notification";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead as apiMarkAsRead,
  markAllNotificationsAsRead as apiMarkAllAsRead,
  deleteNotification as apiDeleteNotification,
} from "../services/notificationService";
import { getToken, isTokenExpired } from "../utils/storage";

interface NotificationContextType {
  unreadCount: number;
  notifications: Notification[];
  latestToast: Notification | null;
  isLoading: boolean;
  dismissToast: () => void;
  fetchUnreadCount: () => Promise<number>;
  fetchNotifications: (
    query?: NotificationQuery
  ) => Promise<NotificationListResult>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<number>;
  deleteNotif: (id: number) => Promise<void>;
  sendLocalNotification: (
    notification: Partial<Notification> & { title: string; message: string }
  ) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [latestToast, setLatestToast] = useState<Notification | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchUnreadCount = useCallback(async (): Promise<number> => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      setUnreadCount(0);
      return 0;
    }

    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
      return count;
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        (err as { response?: { status?: number } }).response?.status === 401
      ) {
        setUnreadCount(0);
        return 0;
      }
      console.warn("Failed to fetch unread notification count:", err);
      return 0;
    }
  }, []);

  const fetchNotifications = useCallback(
    async (query: NotificationQuery = {}): Promise<NotificationListResult> => {
      setIsLoading(true);
      try {
        const result = await getNotifications(query);
        setNotifications(result.items);
        return result;
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const markAsRead = useCallback(async (id: number): Promise<void> => {
    try {
      await apiMarkAsRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notificationId === id
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(new Event("notification-updated"));
    } catch (err) {
      console.error(`Failed to mark notification #${id} as read:`, err);
      throw err;
    }
  }, []);

  const markAllAsRead = useCallback(async (): Promise<number> => {
    try {
      const updatedCount = await apiMarkAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
      window.dispatchEvent(new Event("notification-updated"));
      return updatedCount;
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      throw err;
    }
  }, []);

  const deleteNotif = useCallback(async (id: number): Promise<void> => {
    try {
      await apiDeleteNotification(id);
      setNotifications((prev) => {
        const target = prev.find((n) => n.notificationId === id);
        if (target && !target.isRead) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.notificationId === id);
      });
      window.dispatchEvent(new Event("notification-updated"));
    } catch (err) {
      console.error(`Failed to delete notification #${id}:`, err);
      throw err;
    }
  }, []);

  const dismissToast = useCallback(() => {
    setLatestToast(null);
  }, []);

  const sendLocalNotification = useCallback(
    (
      notifData: Partial<Notification> & { title: string; message: string }
    ) => {
      const newNotif: Notification = {
        notificationId: notifData.notificationId || Date.now(),
        userId: notifData.userId || 0,
        title: notifData.title,
        message: notifData.message,
        notificationType: notifData.notificationType || "General",
        referenceType: notifData.referenceType || null,
        referenceId: notifData.referenceId || null,
        isRead: false,
        readAt: null,
        isDeleted: false,
        deletedAt: null,
        createdAt: notifData.createdAt || new Date().toISOString(),
      };

      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);
      setLatestToast(newNotif);
      window.dispatchEvent(new Event("notification-updated"));
    },
    []
  );

  // Initialize Unread Count & Periodic Sync when authenticated
  useEffect(() => {
    const token = getToken();
    if (!token || isTokenExpired(token)) return;

    // Fetch initial unread count
    void fetchUnreadCount();

    // Poll unread count every 30 seconds
    const interval = setInterval(() => {
      const currentToken = getToken();
      if (currentToken && !isTokenExpired(currentToken)) {
        void fetchUnreadCount();
      }
    }, 30000);

    const handleSync = () => {
      const currentToken = getToken();
      if (currentToken && !isTokenExpired(currentToken)) {
        void fetchUnreadCount();
      }
    };

    window.addEventListener("notification-updated", handleSync);
    window.addEventListener("focus", handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener("notification-updated", handleSync);
      window.removeEventListener("focus", handleSync);
    };
  }, [fetchUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        latestToast,
        isLoading,
        dismissToast,
        fetchUnreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotif,
        sendLocalNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
}
