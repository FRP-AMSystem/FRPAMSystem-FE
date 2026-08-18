import type { User } from "../types/user";
import { Eye, Pencil } from "lucide-react";

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
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime()) || date.getFullYear() <= 1970) return "-";
      return date.toLocaleDateString("vi-VN");
    } catch {
      return "-";
    }
  };

  // Dynamic colors for each role badge
  const getRoleBadgeClass = (role: string) => {
    const normRole = (role || "").toLowerCase().trim();
    switch (normRole) {
      case "admin":
        return "role-badge role-admin";
      case "manager":
        return "role-badge role-manager";
      case "researcher":
        return "role-badge role-researcher";
      case "technician":
        return "role-badge role-technician";
      case "student":
      case "seasonal":
        return "role-badge role-seasonal";
      default:
        return "role-badge";
    }
  };

  return (
    <div className="table-responsive">
      <table className="custom-table">
        <thead>
          <tr>
            <th style={{ width: "50px" }}>AVATAR</th>
            <th>USER & FULL NAME</th>
            <th>USERNAME</th>
            <th>ROLE</th>
            <th>STATUS</th>
            <th>CREATED DATE</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(22, 163, 74, 0.12)",
                    color: "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "13px",
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
              <td>
                <div style={{ fontWeight: 650, color: "#0f172a" }}>
                  {user.fullName || "User"}
                </div>
                {user.email && (
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    {user.email}
                  </div>
                )}
              </td>
              <td style={{ fontWeight: 600, color: "#16a34a" }}>
                {user.username || "-"}
              </td>
              <td>
                <span className={getRoleBadgeClass(user.role)}>
                  {((user.role || "").toLowerCase() === "student" ? "Seasonal" : user.role || "User").toUpperCase()}
                </span>
              </td>
              <td>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: user.status === "Active" ? "#16a34a" : "#64748b",
                  }}
                >
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      backgroundColor: user.status === "Active" ? "#16a34a" : "#94a3b8",
                      display: "inline-block",
                    }}
                  />
                  {user.status || "Active"}
                </span>
              </td>
              <td style={{ color: "#475569" }}>
                {formatDate(user.createdDate)}
              </td>
              <td>
                <div className="table-actions-cell" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
                    <Pencil size={12} />
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
