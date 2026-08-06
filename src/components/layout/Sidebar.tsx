import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";

import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  AlertTriangle,
  ArrowRightLeft,
  BadgeCheck,
  BarChart3,
  Bell,
  Calendar,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Cpu,
  FlaskConical,
  GraduationCap,
  LandPlot,
  Layers3,
  LayoutDashboard,
  LogOut,
  Map,
  Settings,
  ShieldCheck,
  Trees,
  Truck,
  UserRound,
  UserRoundCheck,
  Users,
} from "lucide-react";

import {
  getUnreadNotificationCount,
} from "../../services/notificationService";

import {
  getStoredRole,
  type Role,
} from "../../config/rolePermissions";

import "./Sidebar.css";

interface MenuIconProps {
  className?: string;
  size?: number;
}

interface MenuItem {
  name: string;
  path: string;
  icon: ComponentType<MenuIconProps>;
}

interface MenuGroup {
  id: string;
  title: string;
  icon: ComponentType<MenuIconProps>;
  items: MenuItem[];
  defaultOpen?: boolean;
}

const planningItems: MenuItem[] = [
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
];

const humanResourceItems: MenuItem[] = [
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
];

const resourceItems: MenuItem[] = [
  {
    name: "Resource Overview",
    path: "/resources",
    icon: Trees,
  },
  {
    name: "Equipment Types",
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

const standardOperations: MenuItem[] = [
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
];

const adminMenuGroups: MenuGroup[] = [
  {
    id: "administration",
    title: "Administration",
    icon: ShieldCheck,
    defaultOpen: true,
    items: [
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
  },
  {
    id: "coming-soon",
    title: "System Management",
    icon: Settings,
    items: [],
  },
];

const managerMenuGroups: MenuGroup[] = [
  {
    id: "planning",
    title: "Planning",
    icon: FlaskConical,
    defaultOpen: true,
    items: [
      ...planningItems,
      {
        name: "Allocation Analytics",
        path: "/allocation-analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    id: "human-resources",
    title: "Human Resources",
    icon: Users,
    items: humanResourceItems,
  },
  {
    id: "resources",
    title: "Equipment & Resources",
    icon: Truck,
    items: resourceItems,
  },
  {
    id: "operations",
    title: "Operations",
    icon: Calendar,
    items: standardOperations,
  },
];

const researcherMenuGroups: MenuGroup[] = [
  {
    id: "planning",
    title: "Planning",
    icon: FlaskConical,
    defaultOpen: true,
    items: [
      ...planningItems.map((item) =>
        item.path === "/allocation"
          ? { ...item, name: "My Allocations" }
          : item
      ),
      {
        name: "Allocation Analytics",
        path: "/allocation-analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    id: "human-resources",
    title: "Human Resources",
    icon: Users,
    items: humanResourceItems,
  },
  {
    id: "resources",
    title: "Equipment & Resources",
    icon: Truck,
    items: resourceItems,
  },
  {
    id: "operations",
    title: "Operations",
    icon: Calendar,
    items: standardOperations,
  },
];

const technicianMenuGroups: MenuGroup[] = [
  {
    id: "planning",
    title: "Planning Information",
    icon: FlaskConical,
    defaultOpen: true,
    items: planningItems,
  },
  {
    id: "human-resources",
    title: "Human Resources",
    icon: Users,
    items: humanResourceItems,
  },
  {
    id: "resources",
    title: "Equipment & Resources",
    icon: Truck,
    items: resourceItems,
  },
  {
    id: "operations",
    title: "Operations",
    icon: Calendar,
    items: standardOperations,
  },
];

const studentMenuGroups: MenuGroup[] = [
  {
    id: "planning",
    title: "Learning & Planning",
    icon: GraduationCap,
    defaultOpen: true,
    items: planningItems,
  },
  {
    id: "resources",
    title: "Resources",
    icon: Trees,
    items: resourceItems.filter((item) =>
      [
        "/resources",
        "/equipment",
        "/equipment-instances",
        "/areas",
        "/land-resources",
      ].includes(item.path)
    ),
  },
  {
    id: "operations",
    title: "Schedule & Notifications",
    icon: Calendar,
    items: standardOperations.filter((item) =>
      ["/schedules", "/notifications"].includes(item.path)
    ),
  },
];

const roleMenuGroups: Record<Role, MenuGroup[]> = {
  Admin: adminMenuGroups,
  Manager: managerMenuGroups,
  Researcher: researcherMenuGroups,
  Technician: technicianMenuGroups,
  Student: studentMenuGroups,
};

function isPathActive(
  currentPath: string,
  itemPath: string
): boolean {
  return (
    currentPath === itemPath ||
    currentPath.startsWith(`${itemPath}/`)
  );
}

function buildInitialOpenGroups(
  groups: MenuGroup[],
  currentPath: string
): Record<string, boolean> {
  return Object.fromEntries(
    groups.map((group) => [
      group.id,
      Boolean(group.defaultOpen) ||
        group.items.some((item) =>
          isPathActive(currentPath, item.path)
        ),
    ])
  );
}

function clearAuthenticationStorage(): void {
  [
    "token",
    "accessToken",
    "refreshToken",
    "role",
    "roleName",
    "userId",
    "fullName",
    "username",
    "email",
  ].forEach((key) => localStorage.removeItem(key));

  sessionStorage.clear();
}

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = getStoredRole();

  const fullName =
    localStorage.getItem("fullName")?.trim() || "User";

  const menuGroups = useMemo(
    () => roleMenuGroups[role],
    [role]
  );

  const [unreadCount, setUnreadCount] = useState(0);
  const [openGroups, setOpenGroups] = useState<
    Record<string, boolean>
  >(() =>
    buildInitialOpenGroups(
      roleMenuGroups[role],
      window.location.pathname
    )
  );

  const loadUnreadCount = useCallback(async () => {
    if (!localStorage.getItem("token")) {
      setUnreadCount(0);
      return;
    }

    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(
        Number.isFinite(count) ? Math.max(0, count) : 0
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

    const intervalId = window.setInterval(
      () => void loadUnreadCount(),
      60_000
    );

    const refresh = () => void loadUnreadCount();

    window.addEventListener("notification-updated", refresh);
    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(
        "notification-updated",
        refresh
      );
      window.removeEventListener("focus", refresh);
    };
  }, [loadUnreadCount]);

  useEffect(() => {
    setOpenGroups((current) => {
      const next = { ...current };

      menuGroups.forEach((group) => {
        if (
          group.items.some((item) =>
            isPathActive(location.pathname, item.path)
          )
        ) {
          next[group.id] = true;
        }
      });

      return next;
    });
  }, [location.pathname, menuGroups]);

  const handleLogout = () => {
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn đăng xuất để chuyển sang tài khoản khác không?"
    );

    if (!confirmed) return;

    clearAuthenticationStorage();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo-container">
          <Trees size={22} strokeWidth={2.5} />
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
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            [
              "sidebar-item",
              "sidebar-dashboard-item",
              isActive ? "active" : "",
            ]
              .filter(Boolean)
              .join(" ")
          }
        >
          <LayoutDashboard className="sidebar-item-icon" />
          <span className="sidebar-item-label">Dashboard</span>
        </NavLink>

        <div className="sidebar-menu-groups">
          {menuGroups.map((group) => {
            if (group.items.length === 0) {
              return null;
            }

            const GroupIcon = group.icon;
            const isOpen = Boolean(openGroups[group.id]);
            const hasActiveItem = group.items.some((item) =>
              isPathActive(location.pathname, item.path)
            );

            return (
              <div
                key={group.id}
                className={[
                  "sidebar-menu-group",
                  isOpen ? "open" : "",
                  hasActiveItem ? "has-active-item" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <button
                  type="button"
                  className="sidebar-group-button"
                  onClick={() =>
                    setOpenGroups((current) => ({
                      ...current,
                      [group.id]: !current[group.id],
                    }))
                  }
                  aria-expanded={isOpen}
                >
                  <div className="sidebar-group-title">
                    <GroupIcon
                      className="sidebar-group-icon"
                      size={18}
                    />
                    <span>{group.title}</span>
                  </div>

                  <ChevronDown
                    size={17}
                    className="sidebar-group-chevron"
                  />
                </button>

                <div className="sidebar-group-content">
                  <div className="sidebar-group-content-inner">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isNotification =
                        item.path === "/notifications";

                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={({ isActive }) =>
                            [
                              "sidebar-item",
                              "sidebar-child-item",
                              isActive ? "active" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")
                          }
                        >
                          <Icon className="sidebar-item-icon" />
                          <span className="sidebar-item-label">
                            {item.name}
                          </span>

                          {isNotification && unreadCount > 0 && (
                            <span className="sidebar-notification-badge">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
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

        <button
          type="button"
          className="sidebar-logout-button"
          onClick={handleLogout}
          title="Đăng xuất"
          aria-label="Đăng xuất"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
