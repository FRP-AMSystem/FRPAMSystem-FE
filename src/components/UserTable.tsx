import type { User } from "../types/user";
import { Eye, Edit2 } from "lucide-react";

interface UserTableProps {
  users: User[];
  onViewUser: (user: User) => void;
  onEditUser: (user: User) => void;
}

export default function UserTable({ users, onViewUser, onEditUser }: UserTableProps) {
  // Generate a fallback avatar letter
  const getAvatarFallback = (fullName: string) => {
    if (!fullName) return "U";
    return fullName.trim().charAt(0).toUpperCase();
  };

  // Format date utility
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Dynamic colors for each role badge
  const getRoleBadgeStyles = (role: string) => {
    const normRole = (role || "").toLowerCase().trim();
    switch (normRole) {
      case "admin":
        return {
          backgroundColor: "#FCE7F3", // Pink light
          color: "#9D174D",           // Pink dark
        };
      case "manager":
        return {
          backgroundColor: "#DBEAFE", // Blue light
          color: "#1E40AF",           // Blue dark
        };
      case "researcher":
        return {
          backgroundColor: "#D1FAE5", // Green light
          color: "#065F46",           // Green dark
        };
      case "technician":
        return {
          backgroundColor: "#FEF3C7", // Amber light
          color: "#92400E",           // Amber dark
        };
      case "student":
        return {
          backgroundColor: "#CCFBF1", // Teal light
          color: "#115E59",           // Teal dark
        };
      default:
        return {
          backgroundColor: "#F3F4F6",
          color: "#374151",
        };
    }
  };

  return (
    <div className="table-responsive">
      <table className="custom-table">
        <thead>
          <tr>
            <th style={{ width: "60px" }}>AVATAR</th>
            <th>FULL NAME</th>
            <th>EMAIL</th>
            <th>ROLE</th>
            <th>STATUS</th>
            <th>CREATED DATE</th>
            <th style={{ textAlign: "right" }}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "#E8F5E9",
                    color: "#1B5E20",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "14px",
                    overflow: "hidden",
                  }}
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.fullName}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    getAvatarFallback(user.fullName)
                  )}
                </div>
              </td>
              <td style={{ fontWeight: 600, color: "var(--text-h)" }}>
                {user.fullName}
              </td>
              <td style={{ color: "var(--text)" }}>
                {user.email}
              </td>
              <td>
                <span
                  style={{
                    display: "inline-flex",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    ...getRoleBadgeStyles(user.role),
                  }}
                >
                  {user.role}
                </span>
              </td>
              <td>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: user.status === "Active" ? "#0F9D58" : "var(--text)",
                  }}
                >
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      backgroundColor: user.status === "Active" ? "#0F9D58" : "#9CA3AF",
                      display: "inline-block",
                    }}
                  />
                  {user.status}
                </span>
              </td>
              <td style={{ color: "var(--text)" }}>
                {formatDate(user.createdDate)}
              </td>
              <td style={{ textAlign: "right" }}>
                <div className="table-actions-cell">
                  <button
                    type="button"
                    className="action-btn-pill view"
                    onClick={() => onViewUser(user)}
                  >
                    <Eye size={12} />
                    <span>View</span>
                  </button>
                  <button
                    type="button"
                    className="action-btn-pill edit"
                    onClick={() => onEditUser(user)}
                  >
                    <Edit2 size={12} />
                    <span>Edit</span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
