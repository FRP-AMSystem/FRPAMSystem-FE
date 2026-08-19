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
import { getRoles, normalizeRoleName } from "../../../services/roleService";
import { RotateCw, AlertCircle, Plus, UserCheck } from "lucide-react";
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
        roleName = normalizeRoleName(roleName);
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
            <p className="users-breadcrumb">Dashboard / System Administration</p>
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">Manage all system users, credentials, roles and account statuses.</p>
          </div>
          <button
            type="button"
            className="create-request-btn"
            onClick={() => {
              setSelectedEditUser(null);
              setIsAddOpen(true);
            }}
          >
            <Plus size={18} />
            <span>Add User</span>
          </button>
        </div>

        {/* Filters and Actions Bar */}
        <div className="control-bar-panel">
          <div className="filters-left">
            <UserSearch value={searchQuery} onChange={setSearchQuery} />
            <UserFilter value={selectedRole} onChange={setSelectedRole} roles={roles} />
          </div>
          <div className="actions-right">
            <button
              type="button"
              className="refresh-btn"
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
        <div className="users-card">
          <div className="users-card-title">
            <div>
              <h2>User List</h2>
              <p>{filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"}</p>
            </div>
            <UserCheck size={22} />
          </div>

          {isLoading && (
            <div className="skeleton-loading-wrapper" style={{ padding: "20px" }}>
              <div className="skeleton-row header"></div>
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
                <Plus size={18} />
                <span>Add First User</span>
              </button>
            </div>
          )}

          {!isLoading && !error && users.length > 0 && filteredUsers.length === 0 && (
            <div className="empty-state-box">
              <h4>No matches found</h4>
              <p>Try adjusting your search terms or role filters.</p>
              <button
                type="button"
                className="refresh-btn"
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

        {/* Modals */}
        {isAddOpen && (
          <UserModal
            isOpen={isAddOpen}
            onClose={() => {
              setIsAddOpen(false);
              setSelectedEditUser(null);
            }}
            roles={roles}
            editUser={selectedEditUser}
            onSuccess={(msg) => {
              showToast(msg, "success");
              fetchData(false);
            }}
            onError={(msg) => {
              showToast(msg, "error");
            }}
          />
        )}

        {selectedViewUser && (
          <UserDetailModal
            user={selectedViewUser}
            onClose={() => setSelectedViewUser(null)}
          />
        )}

        {/* Toast Notification */}
        {toast.visible && (
          <div className={`floating-toast ${toast.type}`}>
            <span className="toast-message">{toast.message}</span>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
