import { useState } from "react";
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
  icon: React.ComponentType<{ className?: string }>;
}

const menuItems: MenuItem[] = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Experiments", icon: FlaskConical },
  { name: "Resources", icon: Trees },
  { name: "Allocation Planner", icon: CalendarDays },
  { name: "Conflict Detection", icon: AlertTriangle },
  { name: "Schedules", icon: Calendar },
  { name: "Equipment Tracking", icon: Truck },
  { name: "Analytics", icon: BarChart3 },
  { name: "Notifications", icon: Bell },
  { name: "Settings", icon: Settings },
];

export default function Sidebar() {
  const [activeItem, setActiveItem] = useState("Dashboard");

  // TODO: Replace active user profile with context or API data
  const currentUser = {
    name: "Marcus Thorne",
    role: "Regional Overseer",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
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
              onClick={() => setActiveItem(item.name)}
            >
              <Icon className="sidebar-item-icon" />
              <span>{item.name}</span>
            </div>
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