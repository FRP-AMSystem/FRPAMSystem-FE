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
  | "Admin"
  | "Manager"
  | "Researcher"
  | "Technician"
  | "Student";

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

/* =====================================================
   ADMIN MENU
===================================================== */

const adminMenuGroups: MenuGroup[] = [
  {
    id: "planning",
    title: "Planning",
    icon: FlaskConical,
    defaultOpen: true,
    items: [
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
    ],
  },
  {
    id: "human-resources",
    title: "Human Resources",
    icon: Users,
    items: [
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
    ],
  },
  {
    id: "equipment-resources",
    title: "Equipment & Resources",
    icon: Truck,
    items: [
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
    ],
  },
  {
    id: "operations",
    title: "Operations",
    icon: Calendar,
    items: [
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
  },
];

/* =====================================================
   MANAGER MENU
===================================================== */

const managerMenuGroups: MenuGroup[] = [
  {
    id: "planning",
    title: "Planning",
    icon: FlaskConical,
    defaultOpen: true,
    items: [
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
    ],
  },
  {
    id: "human-resources",
    title: "Human Resources",
    icon: Users,
    items: [
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
    ],
  },
  {
    id: "equipment-resources",
    title: "Equipment & Resources",
    icon: Truck,
    items: [
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
    ],
  },
  {
    id: "operations",
    title: "Operations",
    icon: Calendar,
    items: [
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
  },
];

/* =====================================================
   RESEARCHER MENU
===================================================== */

const researcherMenuGroups: MenuGroup[] = [
  {
    id: "planning",
    title: "Planning",
    icon: FlaskConical,
    defaultOpen: true,
    items: [
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
    ],
  },
  {
    id: "human-resources",
    title: "Human Resources",
    icon: Users,
    items: [
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
    ],
  },
  {
    id: "equipment-resources",
    title: "Equipment & Resources",
    icon: Truck,
    items: [
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
    ],
  },
  {
    id: "operations",
    title: "Operations",
    icon: Calendar,
    items: [
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
  },
];

/* =====================================================
   TECHNICIAN MENU
===================================================== */

const technicianMenuGroups: MenuGroup[] = [
  {
    id: "planning",
    title: "Planning Information",
    icon: FlaskConical,
    defaultOpen: true,
    items: [
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
    ],
  },
  {
    id: "human-resources",
    title: "Human Resources",
    icon: Users,
    items: [
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
    ],
  },
  {
    id: "equipment-resources",
    title: "Equipment & Resources",
    icon: Truck,
    items: [
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
    ],
  },
  {
    id: "operations",
    title: "Operations",
    icon: Calendar,
    items: [
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
  },
];

/* =====================================================
   STUDENT MENU
===================================================== */

const studentMenuGroups: MenuGroup[] = [
  {
    id: "planning",
    title: "Learning & Planning",
    icon: GraduationCap,
    defaultOpen: true,
    items: [
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
    ],
  },
  {
    id: "resources",
    title: "Resources",
    icon: Trees,
    items: [
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
        name: "Equipment Instances",
        path: "/equipment-instances",
        icon: Cpu,
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
    ],
  },
  {
    id: "operations",
    title: "Schedule & Notifications",
    icon: Calendar,
    items: [
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
  },
];

const roleMenuGroups: Record<
  Role,
  MenuGroup[]
> = {
  Admin: adminMenuGroups,
  Manager: managerMenuGroups,
  Researcher: researcherMenuGroups,
  Technician: technicianMenuGroups,
  Student: studentMenuGroups,
};

function getCurrentRole(): Role {
  const storedRole =
    localStorage.getItem("role");

  if (
    storedRole === "Admin" ||
    storedRole === "Manager" ||
    storedRole === "Researcher" ||
    storedRole === "Technician" ||
    storedRole === "Student"
  ) {
    return storedRole;
  }

  return "Student";
}

function isPathActive(
  currentPath: string,
  itemPath: string
): boolean {
  if (itemPath === "/dashboard") {
    return currentPath === itemPath;
  }

  return (
    currentPath === itemPath ||
    currentPath.startsWith(
      `${itemPath}/`
    )
  );
}

function clearAuthenticationStorage(): void {
  const authenticationKeys = [
    "token",
    "accessToken",
    "refreshToken",
    "role",
    "roleName",
    "userId",
    "fullName",
    "username",
    "email",
  ];

  authenticationKeys.forEach(
    (key) => {
      localStorage.removeItem(
        key
      );
    }
  );

  sessionStorage.clear();
}

function buildInitialOpenGroups(
  groups: MenuGroup[],
  currentPath: string
): Record<string, boolean> {
  const result:
    Record<string, boolean> = {};

  groups.forEach(
    (group) => {
      const containsActivePath =
        group.items.some(
          (item) =>
            isPathActive(
              currentPath,
              item.path
            )
        );

      result[group.id] =
        containsActivePath ||
        Boolean(
          group.defaultOpen
        );
    }
  );

  return result;
}

export default function Sidebar() {
  const location =
    useLocation();

  const navigate =
    useNavigate();

  const role =
    getCurrentRole();

  const fullName =
    localStorage
      .getItem("fullName")
      ?.trim() ||
    "User";

  const menuGroups =
    useMemo(
      () =>
        roleMenuGroups[role],
      [role]
    );

  const avatarLetter =
    fullName
      .charAt(0)
      .toUpperCase();

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    openGroups,
    setOpenGroups,
  ] = useState<
    Record<string, boolean>
  >(() =>
    buildInitialOpenGroups(
      roleMenuGroups[role],
      window.location.pathname
    )
  );

  const loadUnreadCount =
    useCallback(async () => {
      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {
        setUnreadCount(0);
        return;
      }

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

  useEffect(() => {
    setOpenGroups(
      (current) => {
        const nextState = {
          ...current,
        };

        menuGroups.forEach(
          (group) => {
            const containsActivePath =
              group.items.some(
                (item) =>
                  isPathActive(
                    location.pathname,
                    item.path
                  )
              );

            if (
              containsActivePath
            ) {
              nextState[
                group.id
              ] = true;
            }
          }
        );

        return nextState;
      }
    );
  }, [
    location.pathname,
    menuGroups,
  ]);

  useEffect(() => {
    setOpenGroups(
      buildInitialOpenGroups(
        menuGroups,
        location.pathname
      )
    );
  }, [
    role,
    menuGroups,
  ]);

  const toggleGroup = (
    groupId: string
  ) => {
    setOpenGroups(
      (current) => ({
        ...current,
        [groupId]:
          !current[groupId],
      })
    );
  };

  const handleLogout = () => {
    const confirmed =
      window.confirm(
        "Bạn có chắc chắn muốn đăng xuất để chuyển sang tài khoản khác không?"
      );

    if (!confirmed) {
      return;
    }

    clearAuthenticationStorage();

    navigate(
      "/login",
      {
        replace: true,
      }
    );
  };

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
        <NavLink
          to="/dashboard"
          className={({
            isActive,
          }) =>
            [
              "sidebar-item",
              "sidebar-dashboard-item",
              isActive
                ? "active"
                : "",
            ]
              .filter(Boolean)
              .join(" ")
          }
        >
          <LayoutDashboard className="sidebar-item-icon" />

          <span className="sidebar-item-label">
            Dashboard
          </span>
        </NavLink>

        <div className="sidebar-menu-groups">
          {menuGroups.map(
            (group) => {
              const GroupIcon =
                group.icon;

              const isOpen =
                Boolean(
                  openGroups[
                    group.id
                  ]
                );

              const hasActiveItem =
                group.items.some(
                  (item) =>
                    isPathActive(
                      location.pathname,
                      item.path
                    )
                );

              return (
                <div
                  key={group.id}
                  className={[
                    "sidebar-menu-group",
                    isOpen
                      ? "open"
                      : "",
                    hasActiveItem
                      ? "has-active-item"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <button
                    type="button"
                    className="sidebar-group-button"
                    onClick={() =>
                      toggleGroup(
                        group.id
                      )
                    }
                    aria-expanded={
                      isOpen
                    }
                    aria-controls={`sidebar-group-${group.id}`}
                  >
                    <div className="sidebar-group-title">
                      <GroupIcon
                        className="sidebar-group-icon"
                        size={18}
                      />

                      <span>
                        {
                          group.title
                        }
                      </span>
                    </div>

                    <ChevronDown
                      size={17}
                      className="sidebar-group-chevron"
                    />
                  </button>

                  <div
                    id={`sidebar-group-${group.id}`}
                    className="sidebar-group-content"
                  >
                    <div className="sidebar-group-content-inner">
                      {group.items.map(
                        (item) => {
                          const Icon =
                            item.icon;

                          const isNotificationItem =
                            item.path ===
                            "/notifications";

                          return (
                            <NavLink
                              key={
                                item.path
                              }
                              to={
                                item.path
                              }
                              className={({
                                isActive,
                              }) =>
                                [
                                  "sidebar-item",
                                  "sidebar-child-item",
                                  isActive
                                    ? "active"
                                    : "",
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(
                                    " "
                                  )
                              }
                            >
                              <Icon className="sidebar-item-icon" />

                              <span className="sidebar-item-label">
                                {
                                  item.name
                                }
                              </span>

                              {isNotificationItem &&
                                unreadCount >
                                  0 && (
                                  <span
                                    className="sidebar-notification-badge"
                                    title={`${unreadCount} unread notifications`}
                                  >
                                    {unreadCount >
                                    99
                                      ? "99+"
                                      : unreadCount}
                                  </span>
                                )}
                            </NavLink>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            <div className="sidebar-avatar-img">
              {
                avatarLetter
              }
            </div>
          </div>

          <div className="sidebar-user-info">
            <span className="sidebar-username">
              {
                fullName
              }
            </span>

            <span className="sidebar-user-role">
              {
                role
              }
            </span>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-logout-button"
          onClick={
            handleLogout
          }
          title="Đăng xuất"
          aria-label="Đăng xuất"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}