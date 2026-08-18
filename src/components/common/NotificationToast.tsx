import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../../context/NotificationContext";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import "./NotificationToast.css";

export default function NotificationToast() {
  const { latestToast, dismissToast, markAsRead } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    if (latestToast) {
      const timer = setTimeout(() => {
        dismissToast();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [latestToast, dismissToast]);

  if (!latestToast) return null;

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "warning":
      case "error":
      case "rejected":
        return <AlertTriangle className="toast-icon warning" />;
      case "success":
      case "approved":
        return <CheckCircle2 className="toast-icon success" />;
      case "info":
      case "general":
      default:
        return <Info className="toast-icon info" />;
    }
  };

  const handleToastClick = async () => {
    if (latestToast.notificationId) {
      try {
        await markAsRead(latestToast.notificationId);
      } catch (err) {
        console.warn("Error marking notification read from toast:", err);
      }
    }
    dismissToast();

    // Navigate to notification page or target detail
    if (latestToast.referenceType && latestToast.referenceId) {
      const refType = latestToast.referenceType.toLowerCase();
      if (refType.includes("experiment")) {
        navigate(`/experiments/${latestToast.referenceId}`);
        return;
      }
      if (refType.includes("allocation")) {
        navigate(`/allocation/${latestToast.referenceId}`);
        return;
      }
    }
    navigate("/notifications");
  };

  return (
    <div className="notification-toast-container">
      <div className="notification-toast" onClick={handleToastClick}>
        <div className="toast-header">
          <div className="toast-title-group">
            {getTypeIcon(latestToast.notificationType)}
            <span className="toast-title">
              {latestToast.title || "Notification"}
            </span>
          </div>
          <button
            type="button"
            className="toast-close-btn"
            onClick={(e) => {
              e.stopPropagation();
              dismissToast();
            }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="toast-body">{latestToast.message}</div>
        <div className="toast-footer">
          <span className="toast-time">Just now</span>
          <span className="toast-action-hint">Click to view →</span>
        </div>
      </div>
    </div>
  );
}
