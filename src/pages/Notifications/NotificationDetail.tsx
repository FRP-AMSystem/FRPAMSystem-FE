import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CalendarDays,
  Check,
  CircleCheck,
  Clock3,
  ExternalLink,
  FileText,
  Trash2,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  deleteNotification,
  getNotificationById,
  markNotificationAsRead,
} from "../../services/notificationService";

import type {
  Notification,
} from "../../types/notification";

import "./NotificationDetail.css";

function getErrorMessage(
  error: unknown
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            error?: string;
            title?: string;
            errors?: Record<
              string,
              string[]
            >;
          };
        };
      }
    ).response;

    if (response?.status === 401) {
      return "Your login session is invalid or expired.";
    }

    if (response?.status === 403) {
      return "You do not have permission to view this notification.";
    }

    if (response?.status === 404) {
      return "Notification was not found.";
    }

    if (response?.data?.errors) {
      return Object.values(
        response.data.errors
      )
        .flat()
        .join(" ");
    }

    return (
      response?.data?.message ||
      response?.data?.error ||
      response?.data?.title ||
      "Unable to complete the request."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to complete the request.";
}

function formatDateTime(
  value?: string | null
): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function normalizeText(
  value?: string | null
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "")
    .replaceAll("_", "")
    .replaceAll("-", "");
}

function formatTypeLabel(
  value?: string | null
): string {
  if (!value) {
    return "General";
  }

  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim();
}

function getNotificationTone(
  notification: Notification
): "info" | "success" | "warning" | "danger" {
  const type = normalizeText(
    notification.notificationType
  );

  if (
    type.includes("approved") ||
    type.includes("completed") ||
    type.includes("success")
  ) {
    return "success";
  }

  if (
    type.includes("conflict") ||
    type.includes("rejected") ||
    type.includes("cancelled") ||
    type.includes("shortage")
  ) {
    return "danger";
  }

  if (
    type.includes("pending") ||
    type.includes("deadline") ||
    type.includes("upcoming")
  ) {
    return "warning";
  }

  return "info";
}

function getNotificationIcon(
  notification: Notification
) {
  const tone = getNotificationTone(notification);

  if (tone === "success") {
    return CircleCheck;
  }

  if (
    tone === "danger" ||
    tone === "warning"
  ) {
    return AlertTriangle;
  }

  return Bell;
}

function getNotificationTargetPath(
  notification: Notification
): string | null {
  const referenceId = notification.referenceId;

  if (
    !referenceId ||
    referenceId <= 0
  ) {
    return null;
  }

  const referenceType = normalizeText(
    notification.referenceType
  );

  if (referenceType.includes("allocation")) {
    return `/allocation/${referenceId}`;
  }

  if (
    referenceType.includes("experimentphase") ||
    referenceType === "phase"
  ) {
    return `/experiment-phases/${referenceId}`;
  }

  if (referenceType.includes("experiment")) {
    return `/experiments/${referenceId}`;
  }

  if (referenceType.includes("schedule")) {
    return `/schedules/${referenceId}`;
  }

  if (
    referenceType.includes(
      "equipmentrequirement"
    )
  ) {
    return `/equipment-requirements/${referenceId}`;
  }

  if (
    referenceType.includes(
      "humanrequirement"
    )
  ) {
    return `/human-requirements/${referenceId}`;
  }

  if (
    referenceType.includes(
      "landrequirement"
    )
  ) {
    return `/land-requirements/${referenceId}`;
  }

  return null;
}

function notifyNotificationChanged(): void {
  window.dispatchEvent(
    new Event("notification-updated")
  );
}

export default function NotificationDetail() {
  const navigate = useNavigate();

  const { id } = useParams<{
    id: string;
  }>();

  const notificationId = Number(id);

  const [
    notification,
    setNotification,
  ] = useState<Notification | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    markingRead,
    setMarkingRead,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const loadNotification =
    useCallback(async () => {
      if (
        !Number.isInteger(notificationId) ||
        notificationId <= 0
      ) {
        setError("Notification ID is invalid.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data =
          await getNotificationById(
            notificationId
          );

        setNotification(data);
      } catch (loadError) {
        console.error(
          "Load notification detail failed:",
          loadError
        );

        setNotification(null);
        setError(
          getErrorMessage(loadError)
        );
      } finally {
        setLoading(false);
      }
    }, [notificationId]);

  useEffect(() => {
    void loadNotification();
  }, [loadNotification]);

  const targetPath =
    useMemo(
      () =>
        notification
          ? getNotificationTargetPath(
              notification
            )
          : null,
      [notification]
    );

  const tone =
    notification
      ? getNotificationTone(notification)
      : "info";

  const Icon =
    notification
      ? getNotificationIcon(notification)
      : Bell;

  const handleMarkAsRead =
    async () => {
      if (
        !notification ||
        notification.isRead ||
        markingRead
      ) {
        return;
      }

      try {
        setMarkingRead(true);
        setError("");

        await markNotificationAsRead(
          notification.notificationId
        );

        setNotification(
          (current) =>
            current
              ? {
                  ...current,
                  isRead: true,
                  readAt:
                    new Date().toISOString(),
                }
              : current
        );

        notifyNotificationChanged();
      } catch (markError) {
        console.error(
          "Mark notification as read failed:",
          markError
        );

        setError(
          getErrorMessage(markError)
        );
      } finally {
        setMarkingRead(false);
      }
    };

  const handleDelete =
    async () => {
      if (!notification || deleting) {
        return;
      }

      const confirmed =
        window.confirm(
          `Delete notification "${notification.title}"?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setDeleting(true);
        setError("");

        await deleteNotification(
          notification.notificationId
        );

        notifyNotificationChanged();

        navigate("/notifications", {
          replace: true,
        });
      } catch (deleteError) {
        console.error(
          "Delete notification failed:",
          deleteError
        );

        setError(
          getErrorMessage(deleteError)
        );
      } finally {
        setDeleting(false);
      }
    };

  const handleOpenRelatedItem =
    async () => {
      if (!notification || !targetPath) {
        return;
      }

      if (!notification.isRead) {
        await handleMarkAsRead();
      }

      navigate(targetPath);
    };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="notification-detail-page">
          <div className="notification-detail-state">
            Loading notification...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!notification) {
    return (
      <DashboardLayout>
        <div className="notification-detail-page">
          <header className="notification-detail-header">
            <div>
              <p>
                Dashboard / Notifications / Detail
              </p>

              <h1>
                Notification Detail
              </h1>
            </div>

            <button
              type="button"
              className="notification-detail-back"
              onClick={() =>
                navigate("/notifications")
              }
            >
              <ArrowLeft size={18} />
              Back
            </button>
          </header>

          <div className="notification-detail-error">
            {error ||
              "Notification was not found."}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="notification-detail-page">
        <header className="notification-detail-header">
          <div>
            <p>
              Dashboard / Notifications / #
              {notification.notificationId}
            </p>

            <h1>
              Notification Detail
            </h1>

            <span>
              View notification content and
              open its related system record.
            </span>
          </div>

          <button
            type="button"
            className="notification-detail-back"
            onClick={() =>
              navigate("/notifications")
            }
          >
            <ArrowLeft size={18} />
            Back
          </button>
        </header>

        {error && (
          <div className="notification-detail-error">
            {error}
          </div>
        )}

        <article
          className={[
            "notification-detail-card",
            `notification-detail-card-${tone}`,
            notification.isRead
              ? "notification-detail-card-read"
              : "notification-detail-card-unread",
          ].join(" ")}
        >
          <div
            className={[
              "notification-detail-icon",
              `notification-detail-icon-${tone}`,
            ].join(" ")}
          >
            <Icon size={30} />
          </div>

          <div className="notification-detail-main">
            <div className="notification-detail-title-row">
              <div>
                <div className="notification-detail-title">
                  <h2>
                    {notification.title ||
                      "Notification"}
                  </h2>

                  {!notification.isRead && (
                    <span className="notification-detail-unread-dot" />
                  )}
                </div>

                <span
                  className={[
                    "notification-detail-type",
                    `notification-detail-type-${tone}`,
                  ].join(" ")}
                >
                  {formatTypeLabel(
                    notification.notificationType
                  )}
                </span>
              </div>

              <span
                className={[
                  "notification-detail-read-status",
                  notification.isRead
                    ? "notification-detail-read"
                    : "notification-detail-unread",
                ].join(" ")}
              >
                {notification.isRead
                  ? "Read"
                  : "Unread"}
              </span>
            </div>

            <div className="notification-detail-message">
              {notification.message ||
                "No message content."}
            </div>

            <div className="notification-detail-information">
              <div>
                <span>
                  <CalendarDays size={16} />
                  Created at
                </span>

                <strong>
                  {formatDateTime(
                    notification.createdAt
                  )}
                </strong>
              </div>

              <div>
                <span>
                  <Clock3 size={16} />
                  Read at
                </span>

                <strong>
                  {formatDateTime(
                    notification.readAt
                  )}
                </strong>
              </div>

              <div>
                <span>
                  <FileText size={16} />
                  Reference type
                </span>

                <strong>
                  {notification.referenceType ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>
                  <FileText size={16} />
                  Reference ID
                </span>

                <strong>
                  {notification.referenceId
                    ? `#${notification.referenceId}`
                    : "-"}
                </strong>
              </div>
            </div>
          </div>
        </article>

        <section className="notification-detail-actions">
          {!notification.isRead && (
            <button
              type="button"
              className="notification-detail-read-button"
              disabled={markingRead}
              onClick={() =>
                void handleMarkAsRead()
              }
            >
              <Check size={18} />

              {markingRead
                ? "Marking..."
                : "Mark as Read"}
            </button>
          )}

          {targetPath && (
            <button
              type="button"
              className="notification-detail-related-button"
              disabled={markingRead}
              onClick={() =>
                void handleOpenRelatedItem()
              }
            >
              <ExternalLink size={18} />
              Open Related Item
            </button>
          )}

          <button
            type="button"
            className="notification-detail-delete-button"
            disabled={deleting}
            onClick={() =>
              void handleDelete()
            }
          >
            <Trash2 size={18} />

            {deleting
              ? "Deleting..."
              : "Delete Notification"}
          </button>
        </section>
      </div>
    </DashboardLayout>
  );
}