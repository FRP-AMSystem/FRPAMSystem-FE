import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  LogLevel,
} from "@microsoft/signalr";
import { getToken } from "../utils/storage";

const HUB_URL =
  (import.meta.env.VITE_SIGNALR_HUB_URL as string) ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "/hubs/notification"
    : "http://forestryresourceplanning.runasp.net/hubs/notification");

let connection: HubConnection | null = null;
let isInitializing = false;

export interface RealtimeNotificationPayload {
  notificationId?: number;
  id?: number;
  userId?: number;
  title?: string;
  message?: string;
  notificationType?: string;
  referenceType?: string | null;
  referenceId?: number | null;
  isRead?: boolean;
  createdAt?: string;
  unreadCount?: number;
}

export async function startSignalRConnection(): Promise<HubConnection | null> {
  const token =
    getToken() ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken");

  if (!token) {
    if (connection) {
      await stopSignalRConnection();
    }
    return null;
  }

  if (connection?.state === HubConnectionState.Connected) {
    return connection;
  }

  if (isInitializing) {
    return connection;
  }

  try {
    isInitializing = true;

    if (!connection) {
      connection = new HubConnectionBuilder()
        .withUrl(HUB_URL, {
          skipNegotiation: true,
          transport: HttpTransportType.WebSockets,
          accessTokenFactory: () => {
            const currentToken =
              getToken() ||
              localStorage.getItem("token") ||
              localStorage.getItem("accessToken");
            return currentToken || "";
          },
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(LogLevel.Warning)
        .build();

      connection.on("ReceiveNotification", (data: RealtimeNotificationPayload) => {
        console.log("🔔 [SignalR] Real-time notification received (ReceiveNotification):", data);
        handleIncomingNotification(data);
      });

      connection.on("NotificationReceived", (data: RealtimeNotificationPayload) => {
        console.log("🔔 [SignalR] Real-time notification received (NotificationReceived):", data);
        handleIncomingNotification(data);
      });

      connection.on("NewNotification", (data: RealtimeNotificationPayload) => {
        console.log("🔔 [SignalR] Real-time notification received (NewNotification):", data);
        handleIncomingNotification(data);
      });

      connection.on("UpdateUnreadCount", (count: number) => {
        console.log("🔔 [SignalR] Real-time unread count updated:", count);
        window.dispatchEvent(
          new CustomEvent("notification-count-updated", { detail: { unreadCount: count } })
        );
        window.dispatchEvent(new CustomEvent("notification-updated"));
      });
    }

    if (connection.state === HubConnectionState.Disconnected) {
      await connection.start();
      console.log("✅ [SignalR] Successfully connected to Notification Hub:", HUB_URL);
    }

    return connection;
  } catch (error) {
    console.error("❌ [SignalR] Connection to Notification Hub failed:", error);
    return null;
  } finally {
    isInitializing = false;
  }
}

export async function stopSignalRConnection(): Promise<void> {
  if (connection) {
    try {
      await connection.stop();
      console.log("ℹ️ [SignalR] Connection stopped.");
    } catch (err) {
      console.error("❌ [SignalR] Error stopping connection:", err);
    } finally {
      connection = null;
    }
  }
}

export function getSignalRConnection(): HubConnection | null {
  return connection;
}

function handleIncomingNotification(data: RealtimeNotificationPayload) {
  window.dispatchEvent(
    new CustomEvent<RealtimeNotificationPayload>("signalr-notification-received", {
      detail: data,
    })
  );

  window.dispatchEvent(new CustomEvent("notification-updated"));
}
