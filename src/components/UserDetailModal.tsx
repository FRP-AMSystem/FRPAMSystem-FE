import { useState, useEffect } from "react";
import type { User } from "../types/user";
import { getUserById } from "../services/userService";

interface UserDetailModalProps {
  user: User | null;
  onClose: () => void;
}

function getRoleBadgeClass(role: string): string {
  const normRole = (role || "").toLowerCase().trim();
  const knownRoles = ["admin", "manager", "researcher", "technician", "student"];
  return knownRoles.includes(normRole)
    ? `role-badge role-${normRole}`
    : "role-badge";
}

function getAvatarFallback(fullName: string): string {
  if (!fullName) return "U";
  return fullName.trim().charAt(0).toUpperCase();
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "-";

  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime()) || date.getFullYear() < 1970) {
      return "-";
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
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
          setError("Could not sync latest details from server.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [user]);

  if (!user) return null;

  const nameForAvatar = detailedUser?.fullName || user.fullName || "User";
  const avatarUrl =
    detailedUser?.avatar ||
    detailedUser?.avatarUrl ||
    user.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&background=E8F5E9&color=16A34A&font-size=0.45&bold=true`;

  const displayUser = {
    id: user.id,
    fullName: detailedUser?.fullName || user.fullName || "—",
    username: detailedUser?.username || user.username || "—",
    email: detailedUser?.email || user.email || "—",
    role: detailedUser?.roleName || user.role || "User",
    status: user.status || "Active",
    avatar: avatarUrl,
    createdDate: user.createdDate,
  };

  const isActive = displayUser.status === "Active";

  return (
    <div className="modal-overlay">
      <div className="modal-container detail-modal">
        <div className="modal-header">
          <h3>User Profile Detail</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          {isLoading && !detailedUser && (
            <div className="detail-loading">
              <div className="spinner" />
              <p>Fetching profile details...</p>
            </div>
          )}

          {error && (
            <div className="detail-error">
              <p className="error-text">{error}</p>
            </div>
          )}

          <div className="profile-detail-card">
            <div className="profile-header-section">
              <div className="profile-avatar-large">
                {displayUser.avatar ? (
                  <img src={displayUser.avatar} alt={displayUser.fullName} />
                ) : (
                  getAvatarFallback(displayUser.fullName)
                )}
              </div>

              <div className="profile-title-section">
                <h4>{displayUser.fullName}</h4>
                <span className={getRoleBadgeClass(displayUser.role)}>
                  {displayUser.role}
                </span>
              </div>
            </div>

            <div className="profile-fields-grid">
              <div className="profile-field">
                <span className="field-label">User ID</span>
                <span className="field-value monospace">{displayUser.id}</span>
              </div>

              <div className="profile-field">
                <span className="field-label">Username</span>
                <span className="field-value">{displayUser.username}</span>
              </div>

              <div className="profile-field">
                <span className="field-label">Email Address</span>
                <span className="field-value">{displayUser.email}</span>
              </div>

              <div className="profile-field">
                <span className="field-label">Account Status</span>
                <span className="field-value">
                  <span
                    className={`status-indicator ${isActive ? "active" : "inactive"}`}
                  >
                    <span className="status-dot" />
                    {displayUser.status}
                  </span>
                </span>
              </div>

              <div className="profile-field">
                <span className="field-label">Created Date</span>
                <span className="field-value">
                  {formatDate(displayUser.createdDate)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
