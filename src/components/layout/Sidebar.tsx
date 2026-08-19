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
  LandPlot,
  Layers3,
  LayoutDashboard,
  LogOut,
  Map,
  Settings,
  ShieldCheck,
  Sparkles,
  Trees,
  Truck,
  UserCheck,
  UserRound,
  UserRoundCheck,
  Users,
  RotateCcw,
} from "lucide-react";

import {
  getUnreadNotificationCount,
} from "../../services/notificationService";
import type { RealtimeNotificationPayload } from "../../types/notification";

import {
  getStoredRole,
  type Role,
} from "../../config/rolePermissions";

import {
  getToken,
  getUserData,
  isTokenExpired,
  logout as performLogout,
} from "../../utils/storage";

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
  {
    name: "AI Suggestions",
    path: "/experiments/ai-suggestions",
    icon: Sparkles,
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
    name: "Personnel & Skills",
    path: "/admin/personnel",
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
    name: "Equipment Return",
    path: "/equipment-return",
    icon: RotateCcw,
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
    id: "planning",
    title: "Planning",
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
  {
    id: "system-admin",
    title: "System Administration",
    icon: ShieldCheck,
    defaultOpen: true,
    items: [
      {
        name: "User & Role Management",
        path: "/admin/users",
        icon: UserCheck,
      },
      {
        name: "Audit Logs",
        path: "/admin/audit-logs",
        icon: FileText,
      },
      {
        name: "System Settings",
        path: "/admin/settings",
        icon: Settings,
      },
    ],
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
        name: "Experiment Analytics",
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
      ...planningItems.filter(
        (item) =>
          ![
            "/experiment-phases",
            "/equipment-requirements",
            "/human-requirements",
            "/land-requirements",
          ].includes(item.path)
      ),
      {
        name: "Experiment Analytics",
        path: "/allocation-analytics",
        icon: BarChart3,
      },
    ],
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
    id: "operations",
    title: "Schedule & Operations",
    icon: Calendar,
    defaultOpen: true,
    items: standardOperations.filter((item) =>
      [
        "/schedules",
        "/equipment-return",
        "/notifications",
      ].includes(item.path)
    ),
  },
];

const studentMenuGroups: MenuGroup[] = [
  {
    id: "operations",
    title: "Schedule & Operations",
    icon: Calendar,
    defaultOpen: true,
    items: standardOperations.filter((item) =>
      [
        "/schedules",
        "/equipment-return",
        "/notifications",
      ].includes(item.path)
    ),
  },
];

const seasonalMenuGroups: MenuGroup[] = studentMenuGroups;

const roleMenuGroups: Record<Role, MenuGroup[]> = {
  Admin: adminMenuGroups,
  Manager: managerMenuGroups,
  Researcher: researcherMenuGroups,
  Technician: technicianMenuGroups,
  Student: studentMenuGroups,
  Seasonal: seasonalMenuGroups,
};

function isPathActive(
  currentPath: string,
  itemPath: string
): boolean {
  if (itemPath === "/dashboard") {
    return currentPath === itemPath;
  }

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
  try {
    performLogout();
  } catch (error) {
    console.error(
      "Storage logout helper failed:",
      error
    );
  }

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
  ].forEach((key) => {
    localStorage.removeItem(key);
  });

  sessionStorage.clear();
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const role = getStoredRole();

  const menuGroups = useMemo(
    () =>
      roleMenuGroups[role] ??
      studentMenuGroups,
    [role]
  );

  const savedUser = getUserData();

  const fullName =
    localStorage
      .getItem("fullName")
      ?.trim() ||
    savedUser.userName ||
    localStorage
      .getItem("username")
      ?.trim() ||
    "User";

  const avatarLetter =
    fullName.charAt(0).toUpperCase() ||
    "U";

  const navRef =
    useRef<HTMLElement | null>(null);

  const [
    openGroups,
    setOpenGroups,
  ] = useState<Record<string, boolean>>(
    () =>
      buildInitialOpenGroups(
        menuGroups,
        window.location.pathname
      )
  );

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    showLogoutConfirm,
    setShowLogoutConfirm,
  ] = useState(false);

  const loadUnreadCount =
    useCallback(async () => {
      const token = getToken();

      if (!token || isTokenExpired(token)) {
        setUnreadCount(0);
        return;
      }

      try {
        const count =
          await getUnreadNotificationCount();

        setUnreadCount(
          Number.isFinite(count)
            ? Math.max(0, count)
            : 0
        );
      } catch (error: unknown) {
        if (
          !(
            typeof error === "object" &&
            error !== null &&
            "response" in error &&
            (error as { response?: { status?: number } }).response?.status === 401
          )
        ) {
          console.error(
            "Load unread notification count failed:",
            error
          );
        }

        setUnreadCount(0);
      }
    }, []);

  const [
    realtimeToast,
    setRealtimeToast,
  ] = useState<RealtimeNotificationPayload | null>(null);

  useEffect(() => {
    let timer: number | null = null;
    if (realtimeToast) {
      timer = window.setTimeout(() => {
        setRealtimeToast(null);
      }, 5000);
    }
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [realtimeToast]);

  useEffect(() => {
    void loadUnreadCount();

    const intervalId =
      window.setInterval(
        () =>
          void loadUnreadCount(),
        60_000
      );

    const refresh = () =>
      void loadUnreadCount();

    const handleCountUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ unreadCount?: number }>;
      if (typeof customEvent.detail?.unreadCount === "number") {
        setUnreadCount(Math.max(0, customEvent.detail.unreadCount));
      } else {
        void loadUnreadCount();
      }
    };

    const handleNotificationReceived = (e: Event) => {
      const customEvent = e as CustomEvent<RealtimeNotificationPayload>;
      if (customEvent.detail) {
        setRealtimeToast(customEvent.detail);
        void loadUnreadCount();
      }
    };

    window.addEventListener(
      "notification-updated",
      refresh
    );

    window.addEventListener(
      "notification-count-updated",
      handleCountUpdated
    );

    window.addEventListener(
      "notification-received",
      handleNotificationReceived
    );

    window.addEventListener(
      "focus",
      refresh
    );

    return () => {
      window.clearInterval(
        intervalId
      );

      window.removeEventListener(
        "notification-updated",
        refresh
      );

      window.removeEventListener(
        "notification-count-updated",
        handleCountUpdated
      );

      window.removeEventListener(
        "notification-received",
        handleNotificationReceived
      );

      window.removeEventListener(
        "focus",
        refresh
      );
    };
  }, [loadUnreadCount]);

  useEffect(() => {
    setOpenGroups((current) => {
      const next = {
        ...current,
      };

      menuGroups.forEach((group) => {
        if (
          group.items.some((item) =>
            isPathActive(
              location.pathname,
              item.path
            )
          )
        ) {
          next[group.id] = true;
        }
      });

      return next;
    });
  }, [
    location.pathname,
    menuGroups,
  ]);

  const handleNavScroll =
    useCallback(() => {
      if (navRef.current) {
        sessionStorage.setItem(
          "sidebar_scroll_pos",
          String(
            navRef.current.scrollTop
          )
        );
      }
    }, []);

  useLayoutEffect(() => {
    const savedPosition =
      sessionStorage.getItem(
        "sidebar_scroll_pos"
      );

    if (
      savedPosition &&
      navRef.current
    ) {
      navRef.current.scrollTop =
        Number(savedPosition);
    }
  }, [
    location.pathname,
    openGroups,
  ]);

  const toggleGroup =
    useCallback(
      (groupId: string) => {
        setOpenGroups(
          (current) => ({
            ...current,
            [groupId]:
              !current[groupId],
          })
        );
      },
      []
    );

  const handleConfirmLogout =
    useCallback(() => {
      clearAuthenticationStorage();

      navigate(
        "/login",
        {
          replace: true,
        }
      );
    }, [navigate]);

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

      <nav
        ref={navRef}
        className="sidebar-nav"
        onScroll={handleNavScroll}
      >
        {role !== "Student" && role !== "Technician" && (
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
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
        )}

        <div className="sidebar-menu-groups">
          {menuGroups.map(
            (group) => {
              if (
                group.items.length === 0
              ) {
                return null;
              }

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
                        {group.title}
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

        <button
          type="button"
          className="sidebar-logout-btn"
          onClick={() =>
            setShowLogoutConfirm(
              true
            )
          }
          title="Sign Out / Logout"
          aria-label="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>

      {showLogoutConfirm &&
        createPortal(
          <div
            className="modal-overlay"
            role="presentation"
            onMouseDown={(
              event
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setShowLogoutConfirm(
                  false
                );
              }
            }}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor:
                "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              zIndex: 99999,
              backdropFilter:
                "blur(4px)",
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="logout-dialog-title"
              style={{
                backgroundColor:
                  "var(--card-bg, #ffffff)",
                borderRadius:
                  "16px",
                padding: "24px",
                width: "90%",
                maxWidth: "380px",
                boxShadow:
                  "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
                border:
                  "1px solid var(--border, #e2e8f0)",
                display: "flex",
                flexDirection:
                  "column",
                alignItems:
                  "center",
                textAlign:
                  "center",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius:
                    "50%",
                  backgroundColor:
                    "#fef2f2",
                  color: "#dc2626",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  marginBottom:
                    "16px",
                }}
              >
                <LogOut size={24} />
              </div>

              <h3
                id="logout-dialog-title"
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color:
                    "var(--text-primary, #1e293b)",
                  margin:
                    "0 0 8px",
                }}
              >
                Sign Out Confirmation
              </h3>

              <p
                style={{
                  fontSize:
                    "13.5px",
                  color:
                    "var(--text-secondary, #64748b)",
                  margin:
                    "0 0 24px",
                  lineHeight: 1.5,
                }}
              >
                Are you sure you want
                to log out of FRPAM
                System? Your active
                session will be ended.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  width: "100%",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setShowLogoutConfirm(
                      false
                    )
                  }
                  style={{
                    flex: 1,
                    padding:
                      "10px 16px",
                    borderRadius:
                      "8px",
                    border:
                      "1px solid #cbd5e1",
                    backgroundColor:
                      "#ffffff",
                    color:
                      "#334155",
                    fontWeight: 600,
                    fontSize:
                      "13.5px",
                    cursor:
                      "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleConfirmLogout
                  }
                  style={{
                    flex: 1,
                    padding:
                      "10px 16px",
                    borderRadius:
                      "8px",
                    border: "none",
                    backgroundColor:
                      "#dc2626",
                    color:
                      "#ffffff",
                    fontWeight: 600,
                    fontSize:
                      "13.5px",
                    cursor:
                      "pointer",
                    boxShadow:
                      "0 2px 4px rgba(220, 38, 38, 0.2)",
                  }}
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {realtimeToast &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: "20px",
              right: "20px",
              zIndex: 10000,
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "16px 20px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15), 0 0 0 1px rgba(22, 163, 74, 0.25)",
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              maxWidth: "400px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                backgroundColor: "rgba(22, 163, 74, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#16a34a",
                flexShrink: 0,
              }}
            >
              <Bell size={20} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {realtimeToast.notificationType || "Real-time Alert"}
                </span>
                <button
                  type="button"
                  onClick={() => setRealtimeToast(null)}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "0 4px", fontSize: "14px" }}
                >
                  ✕
                </button>
              </div>
              <h4 style={{ margin: "4px 0 2px", fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                {realtimeToast.title || "New Notification"}
              </h4>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: 1.4 }}>
                {realtimeToast.message || "You have received a new update in FRPAM System."}
              </p>
            </div>
          </div>,
          document.body
        )}
    </aside>
  );
}
