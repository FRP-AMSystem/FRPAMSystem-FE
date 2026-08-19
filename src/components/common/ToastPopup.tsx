import React, { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from "lucide-react";
import "./ToastPopup.css";

export type ToastType = "error" | "success" | "warning" | "info";

export interface ToastPopupProps {
  visible: boolean;
  type?: ToastType;
  title?: string;
  message: string;
  onClose: () => void;
  autoCloseMs?: number;
}

export default function ToastPopup({
  visible,
  type = "error",
  title,
  message,
  onClose,
  autoCloseMs = 6000,
}: ToastPopupProps) {
  useEffect(() => {
    if (visible && autoCloseMs > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseMs);
      return () => clearTimeout(timer);
    }
  }, [visible, autoCloseMs, onClose]);

  if (!visible || !message) return null;

  const defaultTitle =
    type === "error"
      ? "Lỗi dữ liệu (Error)"
      : type === "warning"
      ? "Cảnh báo (Warning)"
      : type === "success"
      ? "Thành công (Success)"
      : "Thông báo (Notice)";

  const getIcon = () => {
    switch (type) {
      case "error":
        return <XCircle size={22} className="toast-popup-icon error" />;
      case "warning":
        return <AlertTriangle size={22} className="toast-popup-icon warning" />;
      case "success":
        return <CheckCircle2 size={22} className="toast-popup-icon success" />;
      case "info":
      default:
        return <Info size={22} className="toast-popup-icon info" />;
    }
  };

  return (
    <div className="toast-popup-backdrop" onClick={onClose}>
      <div
        className={`toast-popup-card toast-popup-${type}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="toast-popup-content">
          <div className="toast-popup-icon-box">{getIcon()}</div>

          <div className="toast-popup-text-box">
            <h4 className="toast-popup-title">{title || defaultTitle}</h4>
            <p className="toast-popup-message">{message}</p>
          </div>

          <button
            type="button"
            className="toast-popup-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress Countdown Bar */}
        {autoCloseMs > 0 && (
          <div
            className={`toast-popup-progress toast-popup-progress-${type}`}
            style={{ animationDuration: `${autoCloseMs}ms` }}
          />
        )}
      </div>
    </div>
  );
}
