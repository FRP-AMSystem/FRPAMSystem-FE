import { useState, useEffect } from "react";
import type { User } from "../types/user";
import { getUserById } from "../services/userService";

interface UserDetailModalProps {
  user: User | null;
  onClose: () => void;
}

export default function UserDetailModal({ user, onClose }: UserDetailModalProps) {
  const [detailedUser, setDetailedUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && user.id) {
      setIsLoading(true);
      setError("");
      setDetailedUser(null);
      
      getUserById(user.id)
        .then((data) => {
          setDetailedUser(data);
        })
        .catch((err) => {
          console.error("Failed to fetch detailed user from database:", err);
          // Don't show critical error blocks if we still have the parent user prop list data to display
          setError("Could not sync latest details from server.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [user]);

  if (!user) return null;

  const displayUser = {
    id: user.id,
    fullName: detailedUser?.fullName || user.fullName || "—",
    username: detailedUser?.username || "—",
    email: detailedUser?.email || user.email || "—",
    role: detailedUser?.roleName || user.role || "User",
    status: user.status || "Active",
    phone: localStorage.getItem(`phone_${detailedUser?.email || user.email}`) || user.phone || "—",
    createdDate: user.createdDate,
  };

  const getAvatarFallback = (fullName: string) => {
    if (!fullName) return "U";
    return fullName.trim().charAt(0).toUpperCase();
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Get matching badge colors for the user role
  const getRoleBadgeStyles = (role: string) => {
    const normRole = (role || "").toLowerCase().trim();
    switch (normRole) {
      case "admin":
        return { backgroundColor: "#FCE7F3", color: "#9D174D" };
      case "manager":
        return { backgroundColor: "#DBEAFE", color: "#1E40AF" };
      case "researcher":
        return { backgroundColor: "#D1FAE5", color: "#065F46" };
      case "technician":
        return { backgroundColor: "#FEF3C7", color: "#92400E" };
      case "student":
        return { backgroundColor: "#CCFBF1", color: "#115E59" };
      default:
        return { backgroundColor: "#F3F4F6", color: "#374151" };
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container detail-modal" style={{ border: "1px solid var(--border)", background: "var(--card-bg)" }}>
        <div className="modal-header" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ color: "var(--text-h)" }}>User Profile Detail</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          {isLoading && !detailedUser && (
            <div className="detail-loading" style={{ color: "var(--text)" }}>
              <div className="spinner" style={{ borderTopColor: "var(--accent)" }}></div>
              <p>Fetching profile details...</p>
            </div>
          )}

          {error && !detailedUser && (
            <div className="detail-error" style={{ padding: "10px", textAlign: "center" }}>
              <p className="error-text" style={{ fontSize: "13px", color: "#DC2626" }}>{error}</p>
            </div>
          )}

          {/* Render details either loaded from server or fallback to prop data */}
          <div className="profile-detail-card">
            {/* Avatar section */}
            <div className="profile-header-section" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="profile-avatar-large" style={{ backgroundColor: "#E8F5E9", color: "#1B5E20" }}>
                {user.avatar ? (
                  <img src={user.avatar} alt={displayUser.fullName} />
                ) : (
                  getAvatarFallback(displayUser.fullName)
                )}
              </div>
              <div className="profile-title-section">
                <h4 style={{ color: "var(--text-h)", fontSize: "20px", fontWeight: 700, margin: "0 0 6px 0" }}>
                  {displayUser.fullName}
                </h4>
                <span
                  className="profile-role-tag"
                  style={{
                    display: "inline-flex",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    ...getRoleBadgeStyles(displayUser.role),
                  }}
                >
                  {displayUser.role}
                </span>
              </div>
            </div>

            {/* Data fields */}
            <div className="profile-fields-grid" style={{ marginTop: "16px" }}>
              <div className="profile-field">
                <span className="field-label" style={{ color: "var(--text)", fontSize: "11px", fontWeight: 600, opacity: 0.7 }}>
                  USER ID
                </span>
                <span className="field-value monospace" style={{ color: "var(--text-h)", backgroundColor: "var(--border)", padding: "4px 8px", borderRadius: "6px", fontSize: "13px", fontFamily: "monospace", width: "fit-content" }}>
                  {displayUser.id}
                </span>
              </div>

              <div className="profile-field">
                <span className="field-label" style={{ color: "var(--text)", fontSize: "11px", fontWeight: 600, opacity: 0.7 }}>
                  USERNAME
                </span>
                <span className="field-value" style={{ color: "var(--text-h)", fontSize: "14px", fontWeight: 550 }}>
                  {displayUser.username}
                </span>
              </div>

              <div className="profile-field">
                <span className="field-label" style={{ color: "var(--text)", fontSize: "11px", fontWeight: 600, opacity: 0.7 }}>
                  EMAIL ADDRESS
                </span>
                <span className="field-value" style={{ color: "var(--text-h)", fontSize: "14px", fontWeight: 550 }}>
                  {displayUser.email}
                </span>
              </div>

              <div className="profile-field">
                <span className="field-label" style={{ color: "var(--text)", fontSize: "11px", fontWeight: 600, opacity: 0.7 }}>
                  PHONE NUMBER
                </span>
                <span className="field-value" style={{ color: "var(--text-h)", fontSize: "14px", fontWeight: 550 }}>
                  {displayUser.phone}
                </span>
              </div>

              <div className="profile-field">
                <span className="field-label" style={{ color: "var(--text)", fontSize: "11px", fontWeight: 600, opacity: 0.7 }}>
                  ACCOUNT STATUS
                </span>
                <span className="field-value">
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: 600,
                      color: displayUser.status === "Active" ? "#0F9D58" : "#DC2626",
                      fontSize: "14px",
                    }}
                  >
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: displayUser.status === "Active" ? "#0F9D58" : "#DC2626",
                      }}
                    />
                    {displayUser.status}
                  </span>
                </span>
              </div>

              <div className="profile-field">
                <span className="field-label" style={{ color: "var(--text)", fontSize: "11px", fontWeight: 600, opacity: 0.7 }}>
                  CREATED DATE
                </span>
                <span className="field-value" style={{ color: "var(--text-h)", fontSize: "14px", fontWeight: 550 }}>
                  {formatDate(displayUser.createdDate)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: "1px solid var(--border)" }}>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ color: "var(--text-h)", border: "1px solid var(--border)", background: "transparent" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
