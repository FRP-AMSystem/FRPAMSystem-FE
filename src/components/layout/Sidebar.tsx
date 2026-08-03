import { useEffect, useState } from "react";
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
} from "lucide-react";
import { getCurrentProfile } from "../../services/userService";
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

  const [profile, setProfile] = useState({
    name: "Marcus Thorne",
    role: "Regional Overseer",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  });

  useEffect(() => {
    getCurrentProfile()
      .then((data) => {
        if (data) {
          setProfile({
            name: data.fullName || "Marcus Thorne",
            role: data.role || "Regional Overseer",
            avatarUrl: data.avatar || "",
          });
        }
      })
      .catch((err) => {
        console.warn("Could not retrieve current profile session, falling back to mock profile.", err);
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
    </aside>
  );
}