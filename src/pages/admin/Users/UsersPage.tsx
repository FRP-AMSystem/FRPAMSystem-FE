import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../../../layouts/DashboardLayout";
import UserTable from "../../../components/UserTable";
import UserModal from "../../../components/UserModal";
import UserDetailModal from "../../../components/UserDetailModal";
import UserSearch from "../../../components/UserSearch";
import UserFilter from "../../../components/UserFilter";
import type { User } from "../../../types/user";
import type { Role } from "../../../types/role";
import { getUsers } from "../../../services/userService";
import { getRoles } from "../../../services/roleService";
import { RotateCw, AlertCircle, CheckCircle2 } from "lucide-react";
import "./UsersPage.css";

interface ToastState {
  message: string;
  type: "success" | "error";
  visible: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedViewUser, setSelectedViewUser] = useState<User | null>(null);
  const [selectedEditUser, setSelectedEditUser] = useState<User | null>(null);

  // Toast state
  const [toast, setToast] = useState<ToastState>({
    message: "",
    type: "success",
    visible: false,
  });

  // Show toast notification helper
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type, visible: true });
  }, []);

  // Dismiss toast after 3 seconds
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // Fetch users & roles
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setError("");
    try {
      const [userData, roleData] = await Promise.all([getUsers(), getRoles()]);
      
      if (!Array.isArray(userData)) {
        throw new Error("Invalid users format received from backend.");
      }
      if (!Array.isArray(roleData)) {
        throw new Error("Invalid roles format received from backend.");
      }

      // Map backend users to frontend expectations
      const mappedUsers = userData.map((u: any) => {
        let roleName = "User";
        if (u.role?.roleName) {
          roleName = u.role.roleName;
        } else if (u.roleName) {
          roleName = u.roleName;
        } else if (u.roleId) {
          const matchedRole = roleData.find((r) => r.id === u.roleId.toString());
          if (matchedRole) roleName = matchedRole.name;
        }
        const rawBackendDate = u.createdDate || u.createdAt || u.created_at || u.createDate || u.createAt || u.createdTime || u.dateCreated;

        let finalCreatedDate = rawBackendDate;
        if (!finalCreatedDate) {
          const storedDate = localStorage.getItem(`createdDate_${u.email}`);
          if (storedDate) {
            finalCreatedDate = storedDate;
          } else {
            finalCreatedDate = new Date().toISOString();
            if (u.email) {
              localStorage.setItem(`createdDate_${u.email}`, finalCreatedDate);
            }
          }
        }

        const userFullName = u.fullName || u.username || "User";
        const avatarUrl = u.avatar || u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userFullName)}&background=E8F5E9&color=16A34A&font-size=0.45&bold=true`;

        return {
          id: (u.userId ?? u.id)?.toString() || "",
          fullName: u.fullName || "",
          username: u.username || "",
          email: u.email || "",
          role: roleName,
          status: localStorage.getItem(`status_${u.email}`) || u.status || "Active",
          avatar: avatarUrl,
          createdDate: finalCreatedDate,
        };
      });

      setUsers(mappedUsers);
      setRoles(roleData);
    } catch (err: any) {
      console.error(err);
      setError("Failed to retrieve user data. Please ensure the backend service is running.");
      showToast("Error retrieving user records.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter users based on query and role selection
  const filteredUsers = Array.isArray(users)
    ? users.filter((user) => {
        const matchesSearch =
          (user.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (user.email || "").toLowerCase().includes(searchQuery.toLowerCase());
          
        const matchesRole = selectedRole === "" || user.role === selectedRole;

        return matchesSearch && matchesRole;
      })
    : [];

  return (
    <DashboardLayout>
      <div className="users-page-container">
        
        {/* Top Header */}
        <div className="page-header-row">
          <div>
            <h2 className="page-title">User Management</h2>
            <p className="page-subtitle">Manage all system users.</p>
          </div>
          <button
            type="button"
            className="create-request-btn"
            onClick={() => {
              setSelectedEditUser(null);
              setIsAddOpen(true);
            }}
          >
            + Add User
          </button>
        </div>

        {/* Filters and Actions Bar */}
        <div className="control-bar-panel dashboard-panel">
          <div className="filters-left">
            <UserSearch value={searchQuery} onChange={setSearchQuery} />
            <UserFilter value={selectedRole} onChange={setSelectedRole} roles={roles} />
          </div>
          <div className="actions-right">
            <button
              type="button"
              className="pill-dropdown-btn refresh-btn"
              onClick={() => fetchData(true)}
              title="Refresh User Data"
              disabled={isLoading}
            >
              <RotateCw size={14} className={isLoading ? "spin-icon" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Main Users Table Content */}
        <div className="users-table-panel dashboard-panel">
          {isLoading && (
            <div className="skeleton-loading-wrapper">
              <div className="skeleton-row header"></div>
              <div className="skeleton-row"></div>
              <div className="skeleton-row"></div>
              <div className="skeleton-row"></div>
              <div className="skeleton-row"></div>
              <div className="skeleton-row"></div>
            </div>
          )}

          {!isLoading && error && (
            <div className="error-state-box">
              <AlertCircle size={40} className="error-icon" />
              <h4>Oops, something went wrong</h4>
              <p>{error}</p>
              <button
                type="button"
                className="create-request-btn"
                onClick={() => fetchData(true)}
                style={{ marginTop: "16px" }}
              >
                Try Again
              </button>
            </div>
          )}

          {!isLoading && !error && users.length === 0 && (
            <div className="empty-state-box">
              <svg
                width="120"
                height="120"
                viewBox="0 0 120 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="60" cy="60" r="50" fill="#E8F5E9" />
                <path
                  d="M60 35C48.95 35 40 43.95 40 55C40 66.05 48.95 75 60 75C71.05 75 80 66.05 80 55C80 43.95 71.05 35 60 35ZM60 43C64.42 43 68 46.58 68 51C68 55.42 64.42 59 60 59C55.58 59 52 55.42 52 51C52 46.58 55.58 43 60 43ZM60 67C52.03 67 45.18 62.88 41.24 56.68C45.38 52.41 52.28 49.5 60 49.5C67.72 49.5 74.62 52.41 78.76 56.68C74.82 62.88 67.97 67 60 67Z"
                  fill="#1B5E20"
                  opacity="0.8"
                />
              </svg>
              <h4>No users registered yet</h4>
              <p>Get started by adding the first system planning operator.</p>
              <button
                type="button"
                className="create-request-btn"
                onClick={() => {
                  setSelectedEditUser(null);
                  setIsAddOpen(true);
                }}
              >
                + Add First User
              </button>
            </div>
          )}

          {!isLoading && !error && users.length > 0 && filteredUsers.length === 0 && (
            <div className="empty-state-box">
              <svg
                width="100"
                height="100"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="50" cy="50" r="40" fill="#F3F4F6" />
                <path
                  d="M50 30C38.95 30 30 38.95 30 50C30 61.05 38.95 70 50 70C61.05 70 70 61.05 70 50C70 38.95 61.05 30 50 30ZM50 38C52.76 38 55 40.24 55 43C55 45.76 52.76 48 50 48C47.24 48 45 45.76 45 43C45 40.24 47.24 38 50 38ZM50 62C42.03 62 35.18 57.88 31.24 51.68C35.38 47.41 42.28 44.5 50 44.5C57.72 44.5 64.62 47.41 68.76 51.68C64.82 57.88 57.97 62 50 62Z"
                  fill="#9CA3AF"
                />
                <circle cx="68" cy="68" r="10" fill="#DC2626" />
                <path d="M68 64V69M68 71H68.01" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <h4>No matches found</h4>
              <p>Try adjusting your search terms or role filters.</p>
              <button
                type="button"
                className="pill-dropdown-btn"
                style={{ marginTop: "12px" }}
                onClick={() => {
                  setSearchQuery("");
                  setSelectedRole("");
                }}
              >
                Clear Filters
              </button>
            </div>
          )}

          {!isLoading && !error && filteredUsers.length > 0 && (
            <UserTable
              users={filteredUsers}
              onViewUser={(user) => setSelectedViewUser(user)}
              onEditUser={(user) => {
                setSelectedEditUser(user);
                setIsAddOpen(true);
              }}
            />
          )}
        </div>

        {/* Modal Dialogs */}
        <UserModal
          isOpen={isAddOpen}
          roles={roles}
          editUser={selectedEditUser}
          onClose={() => {
            setIsAddOpen(false);
            setSelectedEditUser(null);
          }}
          onSuccess={(msg) => {
            showToast(msg, "success");
            fetchData(false); // reload table quietly
          }}
          onError={(msg) => {
            showToast(msg, "error");
          }}
        />

        <UserDetailModal
          user={selectedViewUser}
          onClose={() => setSelectedViewUser(null)}
        />

        {/* Floating Toast Notification */}
        {toast.visible && (
          <div className={`floating-toast ${toast.type}`}>
            {toast.type === "success" ? (
              <CheckCircle2 size={18} className="toast-icon" />
            ) : (
              <AlertCircle size={18} className="toast-icon" />
            )}
            <span className="toast-message">{toast.message}</span>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
