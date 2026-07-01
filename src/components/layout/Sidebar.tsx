import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FlaskConical,
  Trees,
  CalendarDays,
  AlertTriangle,
  Calendar,
  Truck,
  BarChart3,
  Bell,
  Settings,
} from "lucide-react";
import "./Sidebar.css";

interface MenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const menuItems: MenuItem[] = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Experiments", path: "/dashboard", icon: FlaskConical },
  { name: "Resources", path: "/dashboard", icon: Trees },
  { name: "Allocation Planner", path: "/allocation", icon: CalendarDays },
  { name: "Conflict Detection", path: "/dashboard", icon: AlertTriangle },
  { name: "Schedules", path: "/dashboard", icon: Calendar },
  { name: "Equipment Tracking", path: "/dashboard", icon: Truck },
  { name: "Analytics", path: "/dashboard", icon: BarChart3 },
  { name: "Notifications", path: "/dashboard", icon: Bell },
  { name: "Settings", path: "/dashboard", icon: Settings },
];

export default function Sidebar() {
  const currentUser = {
    name: "Tran Thi Manager",
    role: "Manager",
    avatarUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo-container">
          <Trees size={22} strokeWidth={2.5} />
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-title-main">FRPAM System</span>
          <span className="sidebar-title-sub">Forestry Planning</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? "active" : ""}`
              }
            >
              <Icon className="sidebar-item-icon" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-avatar">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.name}
            className="sidebar-avatar-img"
          />
        </div>
        <div className="sidebar-user-info">
          <span className="sidebar-username">{currentUser.name}</span>
          <span className="sidebar-user-role">{currentUser.role}</span>
        </div>
      </div>
    </aside>
  );
}