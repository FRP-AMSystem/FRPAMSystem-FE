import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";

import { createPortal } from "react-dom";

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
  FileText,
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
  UserCheck,
  UserRound,
  UserRoundCheck,
  Users,
} from "lucide-react";

import {
  getUnreadNotificationCount,
} from "../../services/notificationService";

import { getRole, getUserData, logout as performLogout } from "../../utils/storage";

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
  {
    id: "system-admin",
    title: "System Administration",
    icon: ShieldCheck,
    items: [
      {
        name: "User & Role Management",
        path: "/admin/users",
        icon: UserCheck,
      },
      {
        name: "Personnel Directory",
        path: "/admin/personnel",
        icon: UserRound,
      },
      {
        name: "System Settings",
        path: "/admin/settings",
        icon: Settings,
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

const roleMenuGroups: Record<Role, MenuGroup[]> = {
  Admin: adminMenuGroups,
  Manager: managerMenuGroups,
  Researcher: researcherMenuGroups,
  Technician: technicianMenuGroups,
  Student: studentMenuGroups,
};

function getCurrentRole(): Role {
  const storedRole = getRole() || localStorage.getItem("role");

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

function isPathActive(currentPath: string, itemPath: string): boolean {
  if (itemPath === "/dashboard") {
    return currentPath === itemPath;
  }

  return (
    currentPath === itemPath ||
    currentPath.startsWith(`${itemPath}/`)
  );
}

function clearAuthenticationStorage(): void {
  performLogout();
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const role = getCurrentRole();
  const menuGroups = useMemo(() => roleMenuGroups[role] ?? studentMenuGroups, [role]);

  const savedUser = getUserData();
  const fullName =
    localStorage.getItem("fullName")?.trim() ||
    savedUser.userName ||
    localStorage.getItem("username")?.trim() ||
    "User";

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};

    menuGroups.forEach((group) => {
      const containsActiveItem = group.items.some((item) =>
        isPathActive(location.pathname, item.path)
      );

      initialState[group.id] = containsActiveItem || Boolean(group.defaultOpen);
    });

    return initialState;
  });

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadUnreadCount() {
      try {
        const count = await getUnreadNotificationCount();
        if (active) setUnreadCount(count);
      } catch {
        if (active) setUnreadCount(0);
      }
    }

    void loadUnreadCount();
    const intervalId = window.setInterval(() => void loadUnreadCount(), 60_000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    setOpenGroups((prev) => {
      const nextState = { ...prev };
      let changed = false;

      menuGroups.forEach((group) => {
        const containsActiveItem = group.items.some((item) =>
          isPathActive(location.pathname, item.path)
        );

        if (containsActiveItem && !nextState[group.id]) {
          nextState[group.id] = true;
          changed = true;
        }
      });

      return changed ? nextState : prev;
    });
  }, [location.pathname, menuGroups]);

  const navRef = useRef<HTMLElement | null>(null);

  const handleNavScroll = useCallback(() => {
    if (navRef.current) {
      sessionStorage.setItem("sidebar_scroll_pos", String(navRef.current.scrollTop));
    }
  }, []);

  useLayoutEffect(() => {
    const savedPos = sessionStorage.getItem("sidebar_scroll_pos");
    if (savedPos && navRef.current) {
      navRef.current.scrollTop = Number(savedPos);
    }
  }, [location.pathname, openGroups]);

  const toggleGroup = useCallback((groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  }, []);

  const handleConfirmLogout = useCallback(() => {
    clearAuthenticationStorage();
    navigate("/login");
  }, [navigate]);

  const avatarLetter = fullName.charAt(0).toUpperCase() || "U";

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

      <nav className="sidebar-nav" ref={navRef} onScroll={handleNavScroll}>
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            ["sidebar-item", "sidebar-dashboard-item", isActive ? "active" : ""]
              .filter(Boolean)
              .join(" ")
          }
        >
          <LayoutDashboard className="sidebar-item-icon" />
          <span className="sidebar-item-label">Dashboard</span>
        </NavLink>

        <div className="sidebar-menu-groups">
          {menuGroups.map((group) => {
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
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isOpen}
                  aria-controls={`sidebar-group-${group.id}`}
                >
                  <div className="sidebar-group-title">
                    <GroupIcon className="sidebar-group-icon" size={18} />
                    <span>{group.title}</span>
                  </div>

                  <ChevronDown size={17} className="sidebar-group-chevron" />
                </button>

                <div id={`sidebar-group-${group.id}`} className="sidebar-group-content">
                  <div className="sidebar-group-content-inner">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isNotificationItem = item.path === "/notifications";

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

                          <span className="sidebar-item-label">{item.name}</span>

                          {isNotificationItem && unreadCount > 0 && (
                            <span
                              className="sidebar-notification-badge"
                              title={`${unreadCount} unread notifications`}
                            >
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
            <div className="sidebar-avatar-img">{avatarLetter}</div>
          </div>

          <div className="sidebar-user-info">
            <span className="sidebar-username">{fullName}</span>
            <span className="sidebar-user-role">{role}</span>
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
                backgroundColor: "var(--card-bg, #ffffff)",
                borderRadius: "16px",
                padding: "24px",
                width: "90%",
                maxWidth: "380px",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
                border: "1px solid var(--border, #e2e8f0)",
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

              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", margin: "0 0 8px 0" }}>
                Sign Out Confirmation
              </h3>
              <p style={{ fontSize: "13.5px", color: "#64748b", opacity: 0.9, margin: "0 0 24px 0", lineHeight: 1.5 }}>
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
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#334155",
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