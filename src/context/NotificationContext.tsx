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
import { getCurrentUserTokenInfo } from "../utils/storage";
import { getStoredRole } from "../config/rolePermissions";
import {
  getEquipmentChangeRequests,
  getEquipmentExtensionRequests,
} from "../services/equipmentRequestService";
import {
  addLocalNotification,
  getEquipmentRequestSnapshot,
  getLocalNotifications,
  saveEquipmentRequestSnapshot,
  updateLocalNotification,
} from "../services/localNotificationStore";

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
      const [serverCount, userId] = [
        await getUnreadNotificationCount(),
        getCurrentUserTokenInfo().userId,
      ];
      const count = serverCount + getLocalNotifications(userId).filter((item) => !item.isRead).length;
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
        const local = getLocalNotifications(getCurrentUserTokenInfo().userId);
        const merged = [...local, ...result.items].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setNotifications(merged);
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
      const userId = getCurrentUserTokenInfo().userId;
      const localNotification = getLocalNotifications(userId).find((item) => item.notificationId === id);
      if (localNotification) {
        updateLocalNotification(userId, id, { isRead: true, readAt: new Date().toISOString() });
      } else {
        await apiMarkAsRead(id);
      }
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
      const userId = getCurrentUserTokenInfo().userId;
      const localItems = getLocalNotifications(userId);
      const updatedLocalCount = localItems.filter((item) => !item.isRead).length;
      localItems.forEach((item) => updateLocalNotification(userId, item.notificationId, {
        isRead: true,
        readAt: item.readAt || new Date().toISOString(),
      }));
      const updatedCount = (await apiMarkAllAsRead()) + updatedLocalCount;
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
      const userId = getCurrentUserTokenInfo().userId;
      const localNotification = getLocalNotifications(userId).find((item) => item.notificationId === id);
      if (localNotification) updateLocalNotification(userId, id, null);
      else await apiDeleteNotification(id);
      setNotifications((prev) => {
        const target = prev.find((n) => n.notificationId === id);
        if (target && !target.isRead) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.notificationId !== id);
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
        notificationId: notifData.notificationId || -Date.now(),
        userId: notifData.userId || getCurrentUserTokenInfo().userId,
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
        isLocal: true,
        localKey: notifData.localKey,
      };

      if (newNotif.localKey) {
        const stored = addLocalNotification(newNotif.userId, {
          title: newNotif.title,
          message: newNotif.message,
          notificationType: newNotif.notificationType,
          referenceType: newNotif.referenceType,
          referenceId: newNotif.referenceId,
          createdAt: newNotif.createdAt,
          localKey: newNotif.localKey,
        });
        if (!stored) return;
        Object.assign(newNotif, stored);
      } else if (newNotif.userId) {
        const local = getLocalNotifications(newNotif.userId);
        if (!local.some((item) => item.notificationId === newNotif.notificationId)) {
          localStorage.setItem(
            `frpam.localNotifications.${newNotif.userId}`,
            JSON.stringify([newNotif, ...local].slice(0, 200))
          );
        }
      }

      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);
      setLatestToast(newNotif);
      window.dispatchEvent(new Event("notification-updated"));
    },
    []
  );

  // The API currently exposes notification read/list endpoints but no create
  // endpoint. Watch equipment request state and persist per-user workflow
  // notifications locally so both sides can see the events in Notification List.
  useEffect(() => {
    let stopped = false;
    let inFlight = false;

    const syncEquipmentRequestNotifications = async () => {
      if (stopped || inFlight) return;
      const token = getToken();
      const { userId } = getCurrentUserTokenInfo();
      const role = getStoredRole();
      if (!token || isTokenExpired(token) || !userId || !["Manager", "Admin", "Researcher"].includes(role)) {
        return;
      }
      inFlight = true;
      try {
        const isManager = role === "Manager" || role === "Admin";
        const [extensions, changes] = await Promise.all([
          getEquipmentExtensionRequests({
            requestedBy: isManager ? undefined : userId,
            size: 400,
          }),
          getEquipmentChangeRequests({
            requestedBy: isManager ? undefined : userId,
            size: 400,
          }),
        ]);

        if (stopped) return;
        const previous = getEquipmentRequestSnapshot(userId);
        const next: Record<string, string> = {};
        const discovered: Notification[] = [];

        const inspectRequests = (
          kind: "extension" | "change",
          requests: Array<{ id: number; status?: string | null }>
        ) => {
          for (const request of requests) {
            if (!Number.isInteger(request.id) || request.id <= 0) continue;
            const key = `${kind}:${request.id}`;
            const status = String(request.status || "pending").trim().toLowerCase();
            const previousStatus = previous[key];
            next[key] = status;

            const isNewPending = isManager && !previousStatus && status === "pending";
            const wasUpdated = Boolean(previousStatus && previousStatus !== status);
            const researcherGotDecision = !isManager &&
              (status === "approved" || status === "rejected") &&
              (!previousStatus || previousStatus === "pending") &&
              (!previousStatus || previousStatus !== status);

            if (!isNewPending && !wasUpdated && !researcherGotDecision) continue;

            let title: string;
            let message: string;
            let notificationType: string;
            if (isManager && isNewPending) {
              title = kind === "extension" ? "Equipment Extension Request" : "Equipment Change Request";
              message = `A researcher submitted an equipment ${kind} request. Open Equipment Return to review it.`;
              notificationType = "EquipmentRequestPending";
            } else if (!isManager && (status === "approved" || status === "rejected")) {
              title = kind === "extension" ? "Equipment Extension Request Updated" : "Equipment Change Request Updated";
              message = `Your equipment ${kind} request was ${status}.`;
              notificationType = status === "approved" ? "EquipmentRequestApproved" : "EquipmentRequestRejected";
            } else {
              title = kind === "extension" ? "Equipment Extension Request Updated" : "Equipment Change Request Updated";
              message = `An equipment ${kind} request status changed to ${status}.`;
              notificationType = `EquipmentRequest${status}`;
            }

            const notification = addLocalNotification(userId, {
              title,
              message,
              notificationType,
              referenceType: kind === "extension" ? "EquipmentExtensionRequest" : "EquipmentChangeRequest",
              referenceId: request.id,
              createdAt: new Date().toISOString(),
              localKey: `equipment-request:${userId}:${key}:${status}:${isManager ? "manager" : "researcher"}`,
            });
            if (notification) discovered.push(notification);
          }
        };

        inspectRequests("extension", extensions);
        inspectRequests("change", changes);
        saveEquipmentRequestSnapshot(userId, next);

        if (discovered.length) {
          setNotifications((current) => [...discovered, ...current]);
          setUnreadCount((current) => current + discovered.length);
          setLatestToast(discovered[0]);
          window.dispatchEvent(new Event("notification-updated"));
        }
      } catch (error) {
        console.warn("Unable to sync equipment request notifications:", error);
      } finally {
        inFlight = false;
      }
    };

    void syncEquipmentRequestNotifications();
    const interval = window.setInterval(() => void syncEquipmentRequestNotifications(), 20000);
    const handleFocus = () => void syncEquipmentRequestNotifications();
    window.addEventListener("focus", handleFocus);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Initialize Unread Count & Periodic Sync when authenticated
  useEffect(() => {
    const syncIfAuthenticated = () => {
      const token = getToken();
      if (token && !isTokenExpired(token)) {
        void fetchUnreadCount();
      } else {
        setUnreadCount(0);
      }
    };

    syncIfAuthenticated();

    // Poll unread count every 30 seconds
    const interval = setInterval(() => {
      syncIfAuthenticated();
    }, 30000);

    const handleSync = () => {
      syncIfAuthenticated();
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
