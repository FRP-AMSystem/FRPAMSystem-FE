import {
  LayoutDashboard,
  CalendarDays,
  FlaskConical,
  Trees,
  Truck,
  BarChart3,
} from "lucide-react";

export const roleMenus = {
  Manager: [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Allocation Planner", path: "/allocation", icon: CalendarDays },
    { name: "Resources", path: "/resources", icon: Trees },
    { name: "Equipment Tracking", path: "/equipment", icon: Truck },
    { name: "Analytics", path: "/analytics", icon: BarChart3 },
  ],

  Researcher: [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Experiments", path: "/experiments", icon: FlaskConical },
    { name: "My Allocations", path: "/allocation", icon: CalendarDays },
  ],

  Technician: [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Equipment Tracking", path: "/equipment", icon: Truck },
    { name: "Schedules", path: "/schedules", icon: CalendarDays },
  ],

  Student: [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Equipment Tracking", path: "/equipment", icon: Truck },
    { name: "Schedules", path: "/schedules", icon: CalendarDays },
  ],

  Seasonal: [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Equipment Tracking", path: "/equipment", icon: Truck },
    { name: "Schedules", path: "/schedules", icon: CalendarDays },
  ],
};