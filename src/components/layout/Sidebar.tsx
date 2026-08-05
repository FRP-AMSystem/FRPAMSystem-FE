import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FlaskConical,
  Trees,
  Award,
  AlertTriangle,
  Calendar,
  Truck,
  BarChart3,
  Bell,
  Settings,
  Users,
  LogOut,
} from "lucide-react";
import { getCurrentProfile } from "../../services/userService";
import { getRole, getUserData, logout as performLogout } from "../../utils/storage";
import "./Sidebar.css";

interface MenuItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
}

const menuItems: MenuItem[] = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { name: "Users", icon: Users, path: "/admin/users" },
  { name: "Personnel", icon: Award, path: "/admin/personnel" },
  { name: "Experiments", icon: FlaskConical },
  { name: "Resources", icon: Trees, path: "/resources" },
  { name: "Conflict Detection", icon: AlertTriangle },
  { name: "Schedules", icon: Calendar },
  { name: "Equipment Tracking", icon: Truck },
  { name: "Analytics", icon: BarChart3 },
  { name: "Notifications", icon: Bell, path: "/admin/logs" },
  { name: "Settings", icon: Settings, path: "/admin/settings" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [profile, setProfile] = useState(() => {
    const savedRole = getRole() || "Admin";
    const savedUser = getUserData();
    const name = savedUser.userName || (savedUser.email ? savedUser.email.split("@")[0] : "Admin User");
    return {
      name,
      role: savedRole,
      avatarUrl: savedUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=E8F5E9&color=16A34A&font-size=0.45&bold=true`,
    };
  });

  useEffect(() => {
    getCurrentProfile()
      .then((data) => {
        if (data && data.fullName) {
          const savedRole = getRole() || data.role || "Admin";
          setProfile({
            name: data.fullName,
            role: savedRole,
            avatarUrl: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullName)}&background=E8F5E9&color=16A34A&font-size=0.45&bold=true`,
          });
        }
      })
      .catch(() => {
        // Fallback to active local storage session
        const savedRole = getRole() || "Admin";
        const savedUser = getUserData();
        const name = savedUser.userName || (savedUser.email ? savedUser.email.split("@")[0] : "Admin User");
        setProfile({
          name,
          role: savedRole,
          avatarUrl: savedUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=E8F5E9&color=16A34A&font-size=0.45&bold=true`,
        });
      });
  }, []);

  const getActiveItem = () => {
    if (location.pathname.startsWith("/admin/users")) return "Users";
    if (location.pathname.startsWith("/admin/personnel")) return "Personnel";
    if (location.pathname.startsWith("/admin/settings")) return "Settings";
    if (location.pathname.startsWith("/admin/logs") || location.pathname.startsWith("/notifications")) return "Notifications";
    if (location.pathname.startsWith("/dashboard")) return "Dashboard";
    if (location.pathname.startsWith("/resources")) return "Resources";
    return "Dashboard";
  };

  const activeItem = getActiveItem();

  const handleItemClick = (item: MenuItem) => {
    if (item.path) {
      navigate(item.path);
    }
  };

  const handleConfirmLogout = () => {
    performLogout();
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo-container">
          <Trees size={22} strokeWidth={2.5} />
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-title-main">PRRAM System</span>
          <span className="sidebar-title-sub">Forestry Planning</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.name}
              className={`sidebar-item ${activeItem === item.name ? "active" : ""}`}
              onClick={() => handleItemClick(item)}
            >
              <Icon className="sidebar-item-icon" />
              <span>{item.name}</span>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
          <div className="sidebar-avatar">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="sidebar-avatar-img"
              />
            ) : (
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
                }}
              >
                {(profile.name || "Marcus Thorne").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-username">{profile.name}</span>
            <span className="sidebar-user-role">{profile.role}</span>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-logout-btn"
          onClick={() => setShowLogoutConfirm(true)}
          title="Sign Out / Logout"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* Logout Confirmation Modal - Mounted via Portal to body to prevent CSS stacking context overlaps */}
      {showLogoutConfirm &&
        createPortal(
          <div
            className="modal-overlay"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 99999,
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              style={{
                backgroundColor: "var(--card-bg)",
                borderRadius: "16px",
                padding: "24px",
                width: "90%",
                maxWidth: "380px",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: "#FEF2F2",
                  color: "#DC2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                <LogOut size={24} />
              </div>

              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-h)", margin: "0 0 8px 0" }}>
                Sign Out Confirmation
              </h3>
              <p style={{ fontSize: "13.5px", color: "var(--text)", opacity: 0.8, margin: "0 0 24px 0", lineHeight: 1.5 }}>
                Are you sure you want to log out of PRRAM System? Your active session will be ended.
              </p>

              <div style={{ display: "flex", gap: "12px", width: "100%" }}>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg)",
                    color: "var(--text-h)",
                    fontWeight: 600,
                    fontSize: "13.5px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLogout}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#DC2626",
                    color: "#ffffff",
                    fontWeight: 600,
                    fontSize: "13.5px",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(220, 38, 38, 0.2)",
                    transition: "all 0.2s ease",
                  }}
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </aside>
  );
}