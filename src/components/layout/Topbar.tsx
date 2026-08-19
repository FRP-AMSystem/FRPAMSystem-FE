import React, { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, ChevronRight, Clock, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../../context/NotificationContext";
import type { Notification } from "../../types/notification";
import "./Topbar.css";

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return "Just now";
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (diffMs < 60000) return "Just now";
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return dateStr.slice(0, 10);
  }
}

export default function Topbar() {
  const {
    unreadCount,
    notifications,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotification();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = async () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      setDropdownLoading(true);
      try {
        await Promise.all([
          fetchNotifications({ size: 6 }),
          fetchUnreadCount(),
        ]);
      } catch (err) {
        console.warn("Could not refresh notifications on dropdown open:", err);
      } finally {
        setDropdownLoading(false);
      }
    }
  };

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead && notif.notificationId) {
      try {
        await markAsRead(notif.notificationId);
      } catch (err) {
        console.warn("Mark read error:", err);
      }
    }
    setIsOpen(false);

    if (notif.referenceType && notif.referenceId) {
      const ref = notif.referenceType.toLowerCase();
      if (ref.includes("experiment")) {
        navigate(`/experiments/${notif.referenceId}`);
        return;
      }
      if (ref.includes("allocation")) {
        navigate(`/allocation/${notif.referenceId}`);
        return;
      }
      if (ref.includes("schedule")) {
        navigate(`/schedules`);
        return;
      }
    }
    navigate("/notifications");
  };

  const handleMarkAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markAllAsRead();
    } catch (err) {
      console.warn("Mark all read failed:", err);
    }
  };

  const displayList = notifications.slice(0, 5);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-header-title">Forestry Resource Planning</h1>
      </div>

      <div className="topbar-right" ref={dropdownRef}>
        {/* Real-time Notification Bell */}
        <button
          type="button"
          className={`topbar-action-btn topbar-bell-btn ${unreadCount > 0 ? "has-unread" : ""} ${isOpen ? "is-open" : ""}`}
          onClick={toggleDropdown}
          title="Notifications"
          aria-label="View notifications"
        >
          <Bell className="topbar-action-btn-icon" />
          {unreadCount > 0 && (
            <span className="topbar-notif-badge">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <div className="topbar-dropdown-panel">
            <div className="topbar-dropdown-header">
              <div className="topbar-dropdown-title-group">
                <span className="topbar-dropdown-title">Notifications</span>
                {unreadCount > 0 && (
                  <span className="topbar-dropdown-unread-pill">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="topbar-mark-all-btn"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
            </div>

            <div className="topbar-dropdown-body">
              {dropdownLoading ? (
                <div className="topbar-dropdown-empty">
                  <p>Loading notifications...</p>
                </div>
              ) : displayList.length === 0 ? (
                <div className="topbar-dropdown-empty">
                  <Sparkles size={28} color="#94a3b8" />
                  <p>You're all caught up!</p>
                  <span>No notifications to show.</span>
                </div>
              ) : (
                <div className="topbar-dropdown-list">
                  {displayList.map((n) => (
                    <div
                      key={n.notificationId}
                      className={`topbar-dropdown-item ${!n.isRead ? "unread" : ""}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className="topbar-item-indicator">
                        {!n.isRead && <span className="topbar-item-dot" />}
                      </div>
                      <div className="topbar-item-content">
                        <div className="topbar-item-title">{n.title || "Notification"}</div>
                        <div className="topbar-item-msg">{n.message}</div>
                        <div className="topbar-item-meta">
                          <Clock size={11} />
                          <span>{formatRelativeTime(n.createdAt)}</span>
                          {n.referenceType && (
                            <span className="topbar-item-tag">{n.referenceType}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="topbar-dropdown-footer">
              <button
                type="button"
                className="topbar-view-all-link"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/notifications");
                }}
              >
                <span>View all notifications</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}