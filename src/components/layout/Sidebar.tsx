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
  GraduationCap,
} from "lucide-react";
import "./Sidebar.css";

type Role = "Manager" | "Researcher" | "Technician" | "Student";

interface MenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const roleMenus: Record<Role, MenuItem[]> = {
  Manager: [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Allocation", path: "/allocation", icon: CalendarDays },
    { name: "Resources", path: "/resources", icon: Trees },
    { name: "Equipment", path: "/equipment", icon: Truck },
    { name: "Reports", path: "/reports", icon: BarChart3 },
    { name: "Notifications", path: "/notifications", icon: Bell },
  ],

  Researcher: [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Experiments", path: "/experiments", icon: FlaskConical },
    { name: "My Allocations", path: "/allocation", icon: CalendarDays },
    { name: "Schedules", path: "/schedules", icon: Calendar },
    { name: "Notifications", path: "/notifications", icon: Bell },
  ],

  Technician: [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Equipment", path: "/equipment", icon: Truck },
    { name: "Schedules", path: "/schedules", icon: Calendar },
    { name: "Conflicts", path: "/conflicts", icon: AlertTriangle },
    { name: "Notifications", path: "/notifications", icon: Bell },
  ],

  Student: [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Experiments", path: "/experiments", icon: GraduationCap },
    { name: "Schedules", path: "/schedules", icon: Calendar },
    { name: "Results", path: "/results", icon: BarChart3 },
    { name: "Notifications", path: "/notifications", icon: Bell },
  ],
};

export default function Sidebar() {
  const role = (localStorage.getItem("role") || "Student") as Role;
  const fullName = localStorage.getItem("fullName") || "User";

  const menuItems = roleMenus[role] || roleMenus.Student;

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
          <div className="sidebar-avatar-img">
            {fullName.charAt(0).toUpperCase()}
          </div>
        </div>

        <div className="sidebar-user-info">
          <span className="sidebar-username">{fullName}</span>
          <span className="sidebar-user-role">{role}</span>
        </div>
      </div>
    </aside>
  );
}