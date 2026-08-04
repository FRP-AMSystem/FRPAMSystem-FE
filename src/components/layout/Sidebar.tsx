import {
  useCallback,
  useEffect,
  useState,
  type ComponentType,
} from "react";

import {
  NavLink,
} from "react-router-dom";

import {
  AlertTriangle,
  ArrowRightLeft,
  BadgeCheck,
  BarChart3,
  Bell,
  Calendar,
  CalendarDays,
  ClipboardList,
  Cpu,
  FlaskConical,
  GraduationCap,
  LandPlot,
  Layers3,
  LayoutDashboard,
  Map,
  Trees,
  Truck,
  UserRound,
  UserRoundCheck,
  Users,
} from "lucide-react";

import {
  getUnreadNotificationCount,
} from "../../services/notificationService";

import "./Sidebar.css";

type Role =
  | "Manager"
  | "Researcher"
  | "Technician"
  | "Student";

interface MenuIconProps {
  className?: string;
}

interface MenuItem {
  name: string;
  path: string;
  icon: ComponentType<MenuIconProps>;
}

const commonResourceMenus: MenuItem[] = [
  {
    name: "Human Resources",
    path: "/human-resource-profiles",
    icon: UserRound,
  },
  {
    name: "Skills",
    path: "/skills",
    icon: BadgeCheck,
  },
  {
    name: "Human Resource Skills",
    path: "/human-resource-skills",
    icon: UserRoundCheck,
  },
  {
    name: "Resources",
    path: "/resources",
    icon: Trees,
  },
  {
    name: "Equipment",
    path: "/equipment",
    icon: Truck,
  },
  {
    name: "Equipment Categories",
    path: "/equipment-categories",
    icon: ClipboardList,
  },
  {
    name: "Equipment Instances",
    path: "/equipment-instances",
    icon: Cpu,
  },
  {
    name: "Equipment Substitutions",
    path: "/equipment-substitutions",
    icon: ArrowRightLeft,
  },
  {
    name: "Equipment Shortage Logs",
    path: "/equipment-shortage-logs",
    icon: AlertTriangle,
  },
  {
    name: "Areas",
    path: "/areas",
    icon: Map,
  },
  {
    name: "Land Resources",
    path: "/land-resources",
    icon: LandPlot,
  },
];

const roleMenus: Record<
  Role,
  MenuItem[]
> = {
  Manager: [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Experiments",
      path: "/experiments",
      icon: FlaskConical,
    },
    {
      name: "Experiment Phases",
      path: "/experiment-phases",
      icon: Layers3,
    },
    {
      name: "Equipment Requirements",
      path: "/equipment-requirements",
      icon: ClipboardList,
    },
    {
      name: "Human Requirements",
      path: "/human-requirements",
      icon: Users,
    },
    {
      name: "Land Requirements",
      path: "/land-requirements",
      icon: LandPlot,
    },
    {
      name: "Allocations",
      path: "/allocation",
      icon: CalendarDays,
    },
    {
      name: "Allocation Analytics",
      path: "/allocation-analytics",
      icon: BarChart3,
    },

    ...commonResourceMenus,

    {
      name: "Schedules",
      path: "/schedules",
      icon: Calendar,
    },
    {
      name: "Conflicts",
      path: "/conflicts",
      icon: AlertTriangle,
    },
    {
      name: "Reports",
      path: "/reports",
      icon: BarChart3,
    },
    {
      name: "Notifications",
      path: "/notifications",
      icon: Bell,
    },
  ],

  Researcher: [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Experiments",
      path: "/experiments",
      icon: FlaskConical,
    },
    {
      name: "Experiment Phases",
      path: "/experiment-phases",
      icon: Layers3,
    },
    {
      name: "Equipment Requirements",
      path: "/equipment-requirements",
      icon: ClipboardList,
    },
    {
      name: "Human Requirements",
      path: "/human-requirements",
      icon: Users,
    },
    {
      name: "Land Requirements",
      path: "/land-requirements",
      icon: LandPlot,
    },
    {
      name: "My Allocations",
      path: "/allocation",
      icon: CalendarDays,
    },
    {
      name: "Allocation Analytics",
      path: "/allocation-analytics",
      icon: BarChart3,
    },

    ...commonResourceMenus,

    {
      name: "Schedules",
      path: "/schedules",
      icon: Calendar,
    },
    {
      name: "Conflicts",
      path: "/conflicts",
      icon: AlertTriangle,
    },
    {
      name: "Reports",
      path: "/reports",
      icon: BarChart3,
    },
    {
      name: "Notifications",
      path: "/notifications",
      icon: Bell,
    },
  ],

  Technician: [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Experiments",
      path: "/experiments",
      icon: FlaskConical,
    },
    {
      name: "Experiment Phases",
      path: "/experiment-phases",
      icon: Layers3,
    },
    {
      name: "Equipment Requirements",
      path: "/equipment-requirements",
      icon: ClipboardList,
    },
    {
      name: "Human Requirements",
      path: "/human-requirements",
      icon: Users,
    },
    {
      name: "Land Requirements",
      path: "/land-requirements",
      icon: LandPlot,
    },
    {
      name: "Allocations",
      path: "/allocation",
      icon: CalendarDays,
    },

    ...commonResourceMenus,

    {
      name: "Schedules",
      path: "/schedules",
      icon: Calendar,
    },
    {
      name: "Conflicts",
      path: "/conflicts",
      icon: AlertTriangle,
    },
    {
      name: "Reports",
      path: "/reports",
      icon: BarChart3,
    },
    {
      name: "Notifications",
      path: "/notifications",
      icon: Bell,
    },
  ],

  Student: [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Experiments",
      path: "/experiments",
      icon: GraduationCap,
    },
    {
      name: "Experiment Phases",
      path: "/experiment-phases",
      icon: Layers3,
    },
    {
      name: "Equipment Requirements",
      path: "/equipment-requirements",
      icon: ClipboardList,
    },
    {
      name: "Human Requirements",
      path: "/human-requirements",
      icon: Users,
    },
    {
      name: "Land Requirements",
      path: "/land-requirements",
      icon: LandPlot,
    },
    {
      name: "Allocations",
      path: "/allocation",
      icon: CalendarDays,
    },

    ...commonResourceMenus,

    {
      name: "Schedules",
      path: "/schedules",
      icon: Calendar,
    },
    {
      name: "Notifications",
      path: "/notifications",
      icon: Bell,
    },
  ],
};

function getCurrentRole(): Role {
  const storedRole =
    localStorage.getItem("role");

  if (
    storedRole === "Manager" ||
    storedRole === "Researcher" ||
    storedRole === "Technician" ||
    storedRole === "Student"
  ) {
    return storedRole;
  }

  return "Student";
}

export default function Sidebar() {
  const role =
    getCurrentRole();

  const fullName =
    localStorage
      .getItem("fullName")
      ?.trim() ||
    "User";

  const menuItems =
    roleMenus[role];

  const avatarLetter =
    fullName
      .charAt(0)
      .toUpperCase();

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const loadUnreadCount =
    useCallback(async () => {
      try {
        const count =
          await getUnreadNotificationCount();

        setUnreadCount(
          Number.isFinite(count)
            ? Math.max(
                0,
                count
              )
            : 0
        );
      } catch (error) {
        console.error(
          "Load unread notification count failed:",
          error
        );

        setUnreadCount(0);
      }
    }, []);

  useEffect(() => {
    void loadUnreadCount();

    const intervalId =
      window.setInterval(
        () => {
          void loadUnreadCount();
        },
        60_000
      );

    const handleNotificationUpdated =
      () => {
        void loadUnreadCount();
      };

    window.addEventListener(
      "notification-updated",
      handleNotificationUpdated
    );

    window.addEventListener(
      "focus",
      handleNotificationUpdated
    );

    return () => {
      window.clearInterval(
        intervalId
      );

      window.removeEventListener(
        "notification-updated",
        handleNotificationUpdated
      );

      window.removeEventListener(
        "focus",
        handleNotificationUpdated
      );
    };
  }, [loadUnreadCount]);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo-container">
          <Trees
            size={22}
            strokeWidth={2.5}
          />
        </div>

        <div className="sidebar-brand-text">
          <span className="sidebar-title-main">
            FRPAM System
          </span>

          <span className="sidebar-title-sub">
            Forestry Planning
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map(
          (item) => {
            const Icon =
              item.icon;

            const isNotificationItem =
              item.path ===
              "/notifications";

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({
                  isActive,
                }) =>
                  [
                    "sidebar-item",
                    isActive
                      ? "active"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
              >
                <Icon className="sidebar-item-icon" />

                <span className="sidebar-item-label">
                  {item.name}
                </span>

                {isNotificationItem &&
                  unreadCount > 0 && (
                    <span
                      className="sidebar-notification-badge"
                      title={`${unreadCount} unread notifications`}
                    >
                      {unreadCount > 99
                        ? "99+"
                        : unreadCount}
                    </span>
                  )}
              </NavLink>
            );
          }
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-avatar">
          <div className="sidebar-avatar-img">
            {avatarLetter}
          </div>
        </div>

        <div className="sidebar-user-info">
          <span className="sidebar-username">
            {fullName}
          </span>

          <span className="sidebar-user-role">
            {role}
          </span>
        </div>
      </div>
    </aside>
  );
}