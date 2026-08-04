import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  AlertTriangle,
  Bell,
  BellRing,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  Eye,
  FileText,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  deleteNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../services/notificationService";

import type {
  Notification,
} from "../../types/notification";

import "./NotificationList.css";

type ReadFilter =
  | "all"
  | "unread"
  | "read";

const PAGE_SIZE = 10;

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
            title?: string;
            error?: string;

            errors?: Record<
              string,
              string[]
            >;
          };
        };
      }
    ).response;

    if (
      response?.data?.message
    ) {
      return response.data.message;
    }

    if (
      response?.data?.error
    ) {
      return response.data.error;
    }

    if (
      response?.data?.errors
    ) {
      return Object.values(
        response.data.errors
      )
        .flat()
        .join(" ");
    }

    if (
      response?.data?.title
    ) {
      return response.data.title;
    }
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return "Unable to load notifications.";
}

function formatDateTime(
  value?: string | null
): string {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function formatRelativeTime(
  value?: string | null
): string {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const difference =
    Date.now() -
    date.getTime();

  const minute =
    60 * 1000;

  const hour =
    60 * minute;

  const day =
    24 * hour;

  if (
    difference < minute
  ) {
    return "Just now";
  }

  if (
    difference < hour
  ) {
    const minutes =
      Math.floor(
        difference / minute
      );

    return `${minutes} minute${
      minutes === 1
        ? ""
        : "s"
    } ago`;
  }

  if (
    difference < day
  ) {
    const hours =
      Math.floor(
        difference / hour
      );

    return `${hours} hour${
      hours === 1
        ? ""
        : "s"
    } ago`;
  }

  const days =
    Math.floor(
      difference / day
    );

  return `${days} day${
    days === 1
      ? ""
      : "s"
  } ago`;
}

function normalizeText(
  value?: string | null
): string {
  return String(
    value ?? ""
  )
    .trim()
    .toLowerCase()
    .replaceAll(" ", "")
    .replaceAll("_", "")
    .replaceAll("-", "");
}

function getNotificationIcon(
  notification: Notification
) {
  const type =
    normalizeText(
      notification.notificationType
    );

  if (
    type.includes("approved") ||
    type.includes("completed") ||
    type.includes("success")
  ) {
    return CircleCheck;
  }

  if (
    type.includes("conflict") ||
    type.includes("rejected") ||
    type.includes("cancelled") ||
    type.includes("shortage")
  ) {
    return AlertTriangle;
  }

  if (
    type.includes("schedule") ||
    type.includes("assigned")
  ) {
    return CalendarDays;
  }

  if (
    type.includes("pending") ||
    type.includes("deadline") ||
    type.includes("upcoming")
  ) {
    return Clock3;
  }

  return Bell;
}

function getNotificationTone(
  notification: Notification
): string {
  const type =
    normalizeText(
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

function getNotificationTypeLabel(
  value?: string | null
): string {
  if (!value) {
    return "General";
  }

  return value
    .replace(
      /([a-z])([A-Z])/g,
      "$1 $2"
    )
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim();
}

function getNotificationTargetPath(
  notification: Notification
): string | null {
  const referenceId =
    notification.referenceId;

  if (
    !referenceId ||
    referenceId <= 0
  ) {
    return null;
  }

  const referenceType =
    normalizeText(
      notification.referenceType
    );

  if (
    referenceType.includes(
      "allocation"
    )
  ) {
    return `/allocation/${referenceId}`;
  }

  if (
    referenceType.includes(
      "experimentphase"
    ) ||
    referenceType === "phase"
  ) {
    return `/experiment-phases/${referenceId}`;
  }

  if (
    referenceType.includes(
      "experiment"
    )
  ) {
    return `/experiments/${referenceId}`;
  }

  if (
    referenceType.includes(
      "schedule"
    )
  ) {
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
  window.dispatchEvent(new Event("notification-updated"));
}

export default function NotificationList() {
  const navigate =
    useNavigate();

  const [
    notifications,
    setNotifications,
  ] = useState<
    Notification[]
  >([]);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    keyword,
    setKeyword,
  ] = useState("");

  const [
    readFilter,
    setReadFilter,
  ] = useState<ReadFilter>(
    "all"
  );

  const [
    notificationType,
    setNotificationType,
  ] = useState("");

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    total,
    setTotal,
  ] = useState(0);

  const [
    totalPages,
    setTotalPages,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    markingAll,
    setMarkingAll,
  ] = useState(false);

  const [
    processingId,
    setProcessingId,
  ] = useState<
    number | null
  >(null);

  const [
    error,
    setError,
  ] = useState("");

  const isReadQuery =
    readFilter === "all"
      ? undefined
      : readFilter === "read";

  const loadNotifications =
    useCallback(
      async (
        showMainLoading = true
      ) => {
        try {
          if (
            showMainLoading
          ) {
            setLoading(true);
          } else {
            setRefreshing(true);
          }

          setError("");

          const [
            notificationResult,
            unreadResult,
          ] = await Promise.all([
            getNotifications({
              isRead:
                isReadQuery,

              includeDeleted:
                false,

              notificationType:
                notificationType ||
                undefined,

              page,
              size:
                PAGE_SIZE,
            }),

            getUnreadNotificationCount(),
          ]);

          setNotifications(
            notificationResult.items
          );

          setTotal(
            notificationResult.total
          );

          setTotalPages(
            notificationResult.totalPages
          );

          setUnreadCount(
            unreadResult
          );
        } catch (loadError) {
          console.error(
            "Load notifications failed:",
            loadError
          );

          setNotifications([]);
          setTotal(0);
          setTotalPages(0);

          setError(
            getErrorMessage(
              loadError
            )
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
    [
      isReadQuery,
      notificationType,
      page,
    ]
  );

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    setPage(1);
  }, [
    readFilter,
    notificationType,
  ]);

  const filteredNotifications =
    useMemo(() => {
      const normalizedKeyword =
        keyword
          .trim()
          .toLowerCase();

      if (
        !normalizedKeyword
      ) {
        return notifications;
      }

      return notifications.filter(
        (notification) => {
          const searchableText = [
            notification.title,
            notification.message,
            notification.notificationType,
            notification.referenceType,
            notification.referenceId,
          ]
            .filter(
              (
                value
              ): value is
                | string
                | number =>
                value !== null &&
                value !== undefined
            )
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            normalizedKeyword
          );
        }
      );
    }, [
      keyword,
      notifications,
    ]);

  const notificationTypes =
    useMemo(() => {
      return Array.from(
        new Set(
          notifications
            .map(
              (notification) =>
                notification.notificationType
            )
            .filter(Boolean)
        )
      ).sort();
    }, [notifications]);

  const handleReadFilterChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    setReadFilter(
      event.target.value as ReadFilter
    );
  };

  const handleNotificationTypeChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    setNotificationType(
      event.target.value
    );
  };

  const handleMarkAsRead =
    async (
      notification: Notification
    ) => {
      if (
        notification.isRead
      ) {
        return;
      }

      try {
        setProcessingId(
          notification.notificationId
        );

        setError("");

        await markNotificationAsRead(
          notification.notificationId
        );

        notifyNotificationChanged();

        setNotifications(
          (current) =>
            current.map(
              (item) =>
                item.notificationId ===
                notification.notificationId
                  ? {
                      ...item,
                      isRead: true,
                      readAt:
                        new Date().toISOString(),
                    }
                  : item
            )
        );

        setUnreadCount(
          (current) =>
            Math.max(
              0,
              current - 1
            )
        );

        if (
          readFilter ===
          "unread"
        ) {
          setNotifications(
            (current) =>
              current.filter(
                (item) =>
                  item.notificationId !==
                  notification.notificationId
              )
          );

          setTotal(
            (current) =>
              Math.max(
                0,
                current - 1
              )
          );
        }
      } catch (markError) {
        console.error(
          "Mark notification as read failed:",
          markError
        );

        setError(
          getErrorMessage(
            markError
          )
        );
      } finally {
        setProcessingId(
          null
        );
      }
    };

  const handleMarkAllAsRead =
    async () => {
      if (
        unreadCount <= 0
      ) {
        return;
      }

      try {
        setMarkingAll(true);
        setError("");

        await markAllNotificationsAsRead();

        notifyNotificationChanged();

        setNotifications(
          (current) =>
            readFilter ===
            "unread"
              ? []
              : current.map(
                  (item) => ({
                    ...item,
                    isRead: true,
                    readAt:
                      item.readAt ||
                      new Date().toISOString(),
                  })
                )
        );

        if (
          readFilter ===
          "unread"
        ) {
          setTotal(0);
          setTotalPages(0);
        }

        setUnreadCount(0);
      } catch (markError) {
        console.error(
          "Mark all notifications as read failed:",
          markError
        );

        setError(
          getErrorMessage(
            markError
          )
        );
      } finally {
        setMarkingAll(false);
      }
    };

  const handleDelete =
    async (
      notification: Notification
    ) => {
      const confirmed =
        window.confirm(
          `Delete notification "${notification.title}"?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setProcessingId(
          notification.notificationId
        );

        setError("");

        await deleteNotification(
          notification.notificationId
        );

        notifyNotificationChanged();

        setNotifications(
          (current) =>
            current.filter(
              (item) =>
                item.notificationId !==
                notification.notificationId
            )
        );

        setTotal(
          (current) =>
            Math.max(
              0,
              current - 1
            )
        );

        if (
          !notification.isRead
        ) {
          setUnreadCount(
            (current) =>
              Math.max(
                0,
                current - 1
              )
          );
        }
      } catch (deleteError) {
        console.error(
          "Delete notification failed:",
          deleteError
        );

        setError(
          getErrorMessage(
            deleteError
          )
        );
      } finally {
        setProcessingId(
          null
        );
      }
    };

  const handleOpenNotification =
    async (
      notification: Notification
    ) => {
      if (
        !notification.isRead
      ) {
        await handleMarkAsRead(
          notification
        );
      }

      const targetPath =
        getNotificationTargetPath(
          notification
        );

      if (targetPath) {
        navigate(targetPath);
      }
    };

  const firstItemNumber =
    total === 0
      ? 0
      : (
          page - 1
        ) *
          PAGE_SIZE +
        1;

  const lastItemNumber =
    Math.min(
      page * PAGE_SIZE,
      total
    );

  return (
    <DashboardLayout>
      <div className="notification-list-page">
        <header className="notification-list-header">
          <div>
            <p className="notification-list-breadcrumb">
              Dashboard / Notifications
            </p>

            <h1>
              Notifications
            </h1>

            <p className="notification-list-description">
              Review system messages,
              assignments, approvals and
              schedule updates.
            </p>
          </div>

          <div className="notification-list-header-actions">
            <button
              type="button"
              className="notification-refresh-button"
              disabled={
                refreshing
              }
              onClick={() =>
                void loadNotifications(
                  false
                )
              }
            >
              <RefreshCw
                size={18}
                className={
                  refreshing
                    ? "notification-spin"
                    : ""
                }
              />

              Refresh
            </button>

            <button
              type="button"
              className="notification-read-all-button"
              disabled={
                markingAll ||
                unreadCount <= 0
              }
              onClick={() =>
                void handleMarkAllAsRead()
              }
            >
              <CheckCheck
                size={18}
              />

              {markingAll
                ? "Marking..."
                : "Mark All Read"}
            </button>
          </div>
        </header>

        <section className="notification-summary-grid">
          <article className="notification-summary-card">
            <div className="notification-summary-icon notification-summary-icon-total">
              <Bell size={22} />
            </div>

            <div>
              <span>
                Total Notifications
              </span>

              <strong>
                {total}
              </strong>
            </div>
          </article>

          <article className="notification-summary-card">
            <div className="notification-summary-icon notification-summary-icon-unread">
              <BellRing size={22} />
            </div>

            <div>
              <span>
                Unread
              </span>

              <strong>
                {unreadCount}
              </strong>
            </div>
          </article>

          <article className="notification-summary-card">
            <div className="notification-summary-icon notification-summary-icon-read">
              <CheckCheck
                size={22}
              />
            </div>

            <div>
              <span>
                Read
              </span>

              <strong>
                {Math.max(
                  0,
                  total -
                    unreadCount
                )}
              </strong>
            </div>
          </article>
        </section>

        <section className="notification-filter-card">
          <div className="notification-search-wrapper">
            <Search
              size={18}
              className="notification-search-icon"
            />

            <input
              type="text"
              value={keyword}
              onChange={(
                event
              ) =>
                setKeyword(
                  event.target.value
                )
              }
              placeholder="Search notifications on this page..."
            />
          </div>

          <select
            value={readFilter}
            onChange={
              handleReadFilterChange
            }
          >
            <option value="all">
              All notifications
            </option>

            <option value="unread">
              Unread only
            </option>

            <option value="read">
              Read only
            </option>
          </select>

          <select
            value={
              notificationType
            }
            onChange={
              handleNotificationTypeChange
            }
          >
            <option value="">
              All types
            </option>

            {notificationTypes.map(
              (type) => (
                <option
                  key={type}
                  value={type}
                >
                  {getNotificationTypeLabel(
                    type
                  )}
                </option>
              )
            )}
          </select>

          {(keyword ||
            readFilter !==
              "all" ||
            notificationType) && (
            <button
              type="button"
              className="notification-clear-button"
              onClick={() => {
                setKeyword("");
                setReadFilter(
                  "all"
                );
                setNotificationType(
                  ""
                );
                setPage(1);
              }}
            >
              Clear
            </button>
          )}
        </section>

        {error && (
          <div className="notification-list-error">
            {error}
          </div>
        )}

        <section className="notification-list-card">
          <div className="notification-list-card-header">
            <div>
              <h2>
                Notification List
              </h2>

              <p>
                Showing{" "}
                {firstItemNumber}
                {" - "}
                {lastItemNumber}
                {" of "}
                {total}
              </p>
            </div>

            <BellRing size={22} />
          </div>

          {loading ? (
            <div className="notification-list-state">
              Loading notifications...
            </div>
          ) : filteredNotifications.length ===
            0 ? (
            <div className="notification-empty-state">
              <Bell size={48} />

              <h3>
                No notifications found
              </h3>

              <p>
                {keyword
                  ? "No notification on this page matches your search."
                  : readFilter ===
                      "unread"
                    ? "You have no unread notifications."
                    : "There are no notifications to display."}
              </p>
            </div>
          ) : (
            <div className="notification-items">
              {filteredNotifications.map(
                (
                  notification
                ) => {
                  const Icon =
                    getNotificationIcon(
                      notification
                    );

                  const tone =
                    getNotificationTone(
                      notification
                    );

                  const targetPath =
                    getNotificationTargetPath(
                      notification
                    );

                  const isProcessing =
                    processingId ===
                    notification.notificationId;

                  return (
                    <article
                      key={
                        notification.notificationId
                      }
                      className={[
                        "notification-item",
                        notification.isRead
                          ? "notification-item-read"
                          : "notification-item-unread",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "notification-item-icon",
                          `notification-item-icon-${tone}`,
                        ].join(" ")}
                      >
                        <Icon
                          size={22}
                        />
                      </div>

                      <div className="notification-item-content">
                        <div className="notification-item-heading">
                          <div>
                            <div className="notification-item-title-row">
                              <h3>
                                {notification.title ||
                                  "Notification"}
                              </h3>

                              {!notification.isRead && (
                                <span className="notification-unread-dot" />
                              )}
                            </div>

                            <span
                              className={[
                                "notification-type-badge",
                                `notification-type-badge-${tone}`,
                              ].join(" ")}
                            >
                              {getNotificationTypeLabel(
                                notification.notificationType
                              )}
                            </span>
                          </div>

                          <div className="notification-item-time">
                            <Clock3
                              size={14}
                            />

                            <span>
                              {formatRelativeTime(
                                notification.createdAt
                              )}
                            </span>
                          </div>
                        </div>

                        <p className="notification-item-message">
                          {notification.message ||
                            "No message content."}
                        </p>

                        <div className="notification-item-meta">
                          <span>
                            <CalendarDays
                              size={14}
                            />

                            {formatDateTime(
                              notification.createdAt
                            )}
                          </span>

                          {notification.referenceType && (
                            <span>
                              <FileText
                                size={14}
                              />

                              {
                                notification.referenceType
                              }

                              {notification.referenceId
                                ? ` #${notification.referenceId}`
                                : ""}
                            </span>
                          )}

                          <span>
                            {notification.isRead
                              ? `Read ${
                                  notification.readAt
                                    ? `at ${formatDateTime(
                                        notification.readAt
                                      )}`
                                    : ""
                                }`
                              : "Unread"}
                          </span>
                        </div>
                      </div>

                      <div className="notification-item-actions">
                        {!notification.isRead && (
                          <button
                            type="button"
                            className="notification-action-button notification-mark-button"
                            title="Mark as read"
                            disabled={
                              isProcessing
                            }
                            onClick={() =>
                              void handleMarkAsRead(
                                notification
                              )
                            }
                          >
                            <Check
                              size={17}
                            />
                          </button>
                        )}

                        {targetPath && (
                          <button
                            type="button"
                            className="notification-action-button notification-view-button"
                            title="Open related item"
                            disabled={
                              isProcessing
                            }
                            onClick={() =>
                              void handleOpenNotification(
                                notification
                              )
                            }
                          >
                            <Eye
                              size={17}
                            />
                          </button>
                        )}

                        <button
                          type="button"
                          className="notification-action-button notification-delete-button"
                          title="Delete notification"
                          disabled={
                            isProcessing
                          }
                          onClick={() =>
                            void handleDelete(
                              notification
                            )
                          }
                        >
                          <Trash2
                            size={17}
                          />
                        </button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}

          {!loading &&
            totalPages > 1 && (
              <div className="notification-pagination">
                <button
                  type="button"
                  disabled={
                    page <= 1
                  }
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.max(
                          1,
                          current - 1
                        )
                    )
                  }
                >
                  <ChevronLeft
                    size={17}
                  />

                  Previous
                </button>

                <span>
                  Page {page} of{" "}
                  {totalPages}
                </span>

                <button
                  type="button"
                  disabled={
                    page >=
                    totalPages
                  }
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.min(
                          totalPages,
                          current + 1
                        )
                    )
                  }
                >
                  Next

                  <ChevronRight
                    size={17}
                  />
                </button>
              </div>
            )}
        </section>
      </div>
    </DashboardLayout>
  );
}