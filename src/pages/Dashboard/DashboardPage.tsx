import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import DashboardLayout from "../../layouts/DashboardLayout";

import StatisticCard from "./components/StatisticCard";
import LineChartCard from "./components/LineChartCard";
import BreakdownCard from "./components/BreakdownCard";
import RequestTable from "./components/RequestTable";

import {
  getAllocationPlans,
} from "../../services/allocationPlanService";

import {
  getExperiments,
} from "../../services/experimentService";

import type {
  AllocationPlan,
} from "../../types/allocationPlan";

import "./DashboardPage.css";

type Role =
  | "Admin"
  | "Manager"
  | "Researcher"
  | "Technician"
  | "Student"
  | "Seasonal";

const validRoles: Role[] = [
  "Admin",
  "Manager",
  "Researcher",
  "Technician",
  "Student",
  "Seasonal",
];

type ApprovalStatus =
  AllocationPlan["approveStatus"];

type DashboardStatType =
  | "total-resources"
  | "utilization"
  | "active-experiments"
  | "conflicts";

interface DashboardStat {
  id: string;
  title: string;
  value: string;

  subtext?: string;

  trend?: {
    value: string;
    isUp: boolean;
  };

  type: DashboardStatType;

  percentage?: number;
  conflictCount?: number;
  avatars?: string[];

  actionLabel?: string;
  actionPath?: string;
}

interface AllocationTrendPoint {
  month: string;
  load: number;
}

interface ResourceBreakdownItem {
  name: string;
  value: number;
  color: string;
}

function getCurrentRole(): Role {
  const storedRole =
    localStorage.getItem("role");

  return validRoles.includes(
    storedRole as Role
  )
    ? (storedRole as Role)
    : "Student";
}

function getErrorMessage(
  error: unknown
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            error?: string;
            title?: string;
            errors?: Record<
              string,
              string[]
            >;
          };
        };
      }
    ).response;

    if (
      response?.status === 401
    ) {
      return "Your login session is invalid or expired. Please log out and sign in again.";
    }

    if (
      response?.status === 403
    ) {
      return "Your account does not have permission to load dashboard information.";
    }

    if (
      response?.data?.errors
    ) {
      return Object.values(
        response.data.errors
      )
        .flat()
        .join(" ");
    }

    return (
      response?.data?.message ||
      response?.data?.error ||
      response?.data?.title ||
      "Unable to load dashboard information."
    );
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return "Unable to load dashboard information.";
}

function normalizeFitnessScore(
  value?: number | null
): number {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  const percentage =
    value <= 1
      ? value * 100
      : value;

  return Math.min(
    100,
    Math.max(
      0,
      percentage
    )
  );
}

function countStatus(
  plans: AllocationPlan[],
  status: ApprovalStatus
): number {
  return plans.filter(
    (plan) =>
      plan.approveStatus === status
  ).length;
}

function getMonthKey(
  date: Date
): string {
  return [
    date.getFullYear(),

    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    ),
  ].join("-");
}

function getDateTime(
  value?: string | null
): number {
  if (!value) {
    return 0;
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? 0
    : date.getTime();
}

function buildAllocationTrend(
  plans: AllocationPlan[]
): AllocationTrendPoint[] {
  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        month: "short",
      }
    );

  const now =
    new Date();

  const months =
    Array.from(
      {
        length: 6,
      },
      (_, index) => {
        const date =
          new Date(
            now.getFullYear(),
            now.getMonth() -
            (5 - index),
            1
          );

        return {
          key:
            getMonthKey(date),

          month:
            formatter.format(
              date
            ),

          load: 0,
        };
      }
    );

  const monthMap =
    new Map(
      months.map(
        (item) => [
          item.key,
          item,
        ]
      )
    );

  plans.forEach(
    (plan) => {
      if (!plan.createdAt) {
        return;
      }

      const createdAt =
        new Date(
          plan.createdAt
        );

      if (
        Number.isNaN(
          createdAt.getTime()
        )
      ) {
        return;
      }

      const item =
        monthMap.get(
          getMonthKey(
            createdAt
          )
        );

      if (item) {
        item.load += 1;
      }
    }
  );

  return months.map(
    ({
      month,
      load,
    }) => ({
      month,
      load,
    })
  );
}

function buildResourceBreakdown(
  plans: AllocationPlan[]
): ResourceBreakdownItem[] {
  const equipment =
    plans.reduce(
      (sum, plan) =>
        sum +
        (
          plan.equipmentDetailCount ??
          0
        ),
      0
    );

  const human =
    plans.reduce(
      (sum, plan) =>
        sum +
        (
          plan.humanDetailCount ??
          0
        ),
      0
    );

  const land =
    plans.reduce(
      (sum, plan) =>
        sum +
        (
          plan.landDetailCount ??
          0
        ),
      0
    );

  return [
    {
      name: "Equipment",
      value: equipment,
      color: "#2563eb",
    },
    {
      name: "Human Resources",
      value: human,
      color: "#22c55e",
    },
    {
      name: "Land",
      value: land,
      color: "#f59e0b",
    },
  ];
}

function getRoleTitle(
  role: Role
): string {
  switch (role) {
    case "Admin":
      return "Admin Dashboard";

    case "Manager":
      return "Manager Dashboard";

    case "Researcher":
      return "Researcher Dashboard";

    case "Technician":
      return "Technician Dashboard";

    case "Student":
    case "Seasonal":
      return "Seasonal Dashboard";

    default:
      return "Dashboard";
  }
}

function getRoleDescription(
  role: Role
): string {
  switch (role) {
    case "Admin":
      return "Manage users, roles, system configuration, audit information, reports, and notifications.";

    case "Manager":
      return "Review allocation plans, approval requests and operational resource usage.";

    case "Researcher":
      return "Create experiments and monitor allocation plans through the approval workflow.";

    case "Technician":
      return "Review equipment assignments, schedules and operational resource information.";

    case "Student":
    case "Seasonal":
      return "View experiments, schedules and approved allocation information.";

    default:
      return "Welcome to the forestry resource planning system.";
  }
}

export default function DashboardPage() {
  const navigate =
    useNavigate();

  const role =
    getCurrentRole();

  const fullName =
    localStorage
      .getItem("fullName")
      ?.trim() ||
    "User";

  const userId =
    Number(
      localStorage.getItem(
        "userId"
      )
    );

  const [
    allocationPlans,
    setAllocationPlans,
  ] = useState<
    AllocationPlan[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    myExperimentIds,
    setMyExperimentIds,
  ] = useState<number[]>([]);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const data =
          await getAllocationPlans({
            page: 1,
            size: 500,
          });

        let expIds: number[] = [];
        if (role === "Researcher" && Number.isInteger(userId) && userId > 0) {
          const expData = await getExperiments({
            researcherId: userId,
            page: 1,
            size: 500,
          });
          if (Array.isArray(expData)) {
            expIds = expData
              .filter(
                (e) =>
                  e.researcherId === userId ||
                  e.createdByUserId === userId
              )
              .map((e) => e.experimentId);
          }
        }

        if (active) {
          setAllocationPlans(
            Array.isArray(data)
              ? data
              : []
          );
          setMyExperimentIds(expIds);
        }
      } catch (loadError) {
        console.error(
          "Load dashboard failed:",
          loadError
        );

        if (active) {
          setAllocationPlans([]);
          setMyExperimentIds([]);

          setError(
            getErrorMessage(
              loadError
            )
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [role, userId]);

  const visiblePlans =
    useMemo(() => {
      if (
        role !== "Researcher" ||
        !Number.isInteger(userId) ||
        userId <= 0
      ) {
        return allocationPlans;
      }

      return allocationPlans.filter(
        (plan) =>
          plan.createdBy === userId ||
          myExperimentIds.includes(plan.experimentId)
      );
    }, [
      allocationPlans,
      role,
      userId,
      myExperimentIds,
    ]);

  const dashboardData =
    useMemo(() => {
      const totalPlans =
        visiblePlans.length;

      const draftPlans =
        countStatus(
          visiblePlans,
          "Draft"
        );

      const pendingPlans =
        countStatus(
          visiblePlans,
          "Pending"
        );

      const approvedPlans =
        countStatus(
          visiblePlans,
          "Approved"
        );

      const rejectedPlans =
        countStatus(
          visiblePlans,
          "Rejected"
        );

      const cancelledPlans =
        countStatus(
          visiblePlans,
          "Cancelled"
        );

      const fitnessValues =
        visiblePlans
          .map(
            (plan) =>
              normalizeFitnessScore(
                plan.fitnessScore
              )
          )
          .filter(
            (value) =>
              value > 0
          );

      const averageFitness =
        fitnessValues.length > 0
          ? Number(
            (
              fitnessValues.reduce(
                (
                  sum,
                  value
                ) =>
                  sum +
                  value,
                0
              ) /
              fitnessValues.length
            ).toFixed(1)
          )
          : 0;

      const equipmentCount =
        visiblePlans.reduce(
          (sum, plan) =>
            sum +
            (
              plan.equipmentDetailCount ??
              0
            ),
          0
        );

      const humanCount =
        visiblePlans.reduce(
          (sum, plan) =>
            sum +
            (
              plan.humanDetailCount ??
              0
            ),
          0
        );

      const landCount =
        visiblePlans.reduce(
          (sum, plan) =>
            sum +
            (
              plan.landDetailCount ??
              0
            ),
          0
        );

      const scheduleCount =
        visiblePlans.reduce(
          (sum, plan) =>
            sum +
            (
              plan.scheduleCount ??
              0
            ),
          0
        );

      const totalResourceDetails =
        equipmentCount +
        humanCount +
        landCount;

      return {
        totalPlans,
        draftPlans,
        pendingPlans,
        approvedPlans,
        rejectedPlans,
        cancelledPlans,
        averageFitness,
        equipmentCount,
        humanCount,
        landCount,
        scheduleCount,
        totalResourceDetails,
      };
    }, [visiblePlans]);

  const stats =
    useMemo<
      DashboardStat[]
    >(() => {
      switch (role) {
        case "Admin":
        case "Manager":
          return [
            {
              id: "manager-total",

              title:
                "Total Allocation Plans",

              value:
                String(
                  dashboardData.totalPlans
                ),

              trend: {
                value:
                  `${dashboardData.draftPlans} draft · ${dashboardData.cancelledPlans} cancelled`,

                isUp: true,
              },

              type:
                "total-resources",
            },
            {
              id:
                "manager-fitness",

              title:
                "Average Fitness",

              value:
                String(dashboardData.averageFitness),

              subtext:
                "Average allocation fitness score",

              percentage:
                dashboardData.averageFitness,

              type:
                "utilization",
            },
            {
              id:
                "manager-approved",

              title:
                "Approved Plans",

              value:
                String(
                  dashboardData.approvedPlans
                ),

              avatars: [
                "",
                "",
                `+${dashboardData.approvedPlans}`,
              ],

              type:
                "active-experiments",
            },
            {
              id:
                "manager-pending",

              title:
                "Pending Approval",

              value:
                String(
                  dashboardData.pendingPlans
                ),

              conflictCount:
                dashboardData.pendingPlans,

              type:
                "conflicts",

              actionLabel:
                "Review Plans",

              actionPath:
                "/allocation",
            },
          ];

        case "Researcher":
          return [
            {
              id:
                "researcher-total",

              title:
                "My Allocation Plans",

              value:
                String(
                  dashboardData.totalPlans
                ),

              trend: {
                value:
                  `${dashboardData.draftPlans} draft · ${dashboardData.rejectedPlans} rejected`,

                isUp: true,
              },

              type:
                "total-resources",
            },
            {
              id:
                "researcher-approved",

              title:
                "Approved Plans",

              value:
                String(
                  dashboardData.approvedPlans
                ),

              avatars: [
                "",
                "",
                `+${dashboardData.approvedPlans}`,
              ],

              type:
                "active-experiments",
            },
            {
              id:
                "researcher-pending",

              title:
                "Pending Review",

              value:
                String(
                  dashboardData.pendingPlans
                ),

              conflictCount:
                dashboardData.pendingPlans,

              type:
                "conflicts",

              actionLabel:
                "View Plans",

              actionPath:
                "/allocation",
            },
          ];

        case "Technician":
          return [
            {
              id:
                "technician-plans",

              title:
                "Approved Plans",

              value:
                String(
                  dashboardData.approvedPlans
                ),

              trend: {
                value:
                  `${dashboardData.totalResourceDetails} assigned resource records`,

                isUp: true,
              },

              type:
                "total-resources",
            },
            {
              id:
                "technician-equipment",

              title:
                "Equipment Assignments",

              value:
                String(
                  dashboardData.equipmentCount
                ),

              subtext:
                "Allocated equipment records",

              percentage:
                dashboardData.totalResourceDetails >
                  0
                  ? Number(
                    (
                      (
                        dashboardData.equipmentCount /
                        dashboardData.totalResourceDetails
                      ) *
                      100
                    ).toFixed(1)
                  )
                  : 0,

              type:
                "utilization",
            },
            {
              id:
                "technician-schedules",

              title:
                "Schedules",

              value:
                String(
                  dashboardData.scheduleCount
                ),

              avatars: [
                "",
                "",
                `+${dashboardData.scheduleCount}`,
              ],

              type:
                "active-experiments",
            },
            {
              id:
                "technician-pending",

              title:
                "Pending Plans",

              value:
                String(
                  dashboardData.pendingPlans
                ),

              conflictCount:
                dashboardData.pendingPlans,

              type:
                "conflicts",

              actionLabel:
                "View Allocation",

              actionPath:
                "/allocation",
            },
          ];

        case "Student":
        case "Seasonal":
          return [
            {
              id:
                "student-plans",

              title:
                "Visible Plans",

              value:
                String(
                  dashboardData.totalPlans
                ),

              trend: {
                value:
                  `${dashboardData.approvedPlans} approved plans`,

                isUp: true,
              },

              type:
                "total-resources",
            },
            {
              id:
                "student-fitness",

              title:
                "Average Fitness",

              value:
                String(dashboardData.averageFitness),

              subtext:
                "Average allocation result",

              percentage:
                dashboardData.averageFitness,

              type:
                "utilization",
            },
            {
              id:
                "student-approved",

              title:
                "Approved Plans",

              value:
                String(
                  dashboardData.approvedPlans
                ),

              avatars: [
                "",
                "",
                `+${dashboardData.approvedPlans}`,
              ],

              type:
                "active-experiments",
            },
            {
              id:
                "student-schedules",

              title:
                "Schedules",

              value:
                String(
                  dashboardData.scheduleCount
                ),

              conflictCount:
                dashboardData.scheduleCount,

              type:
                "conflicts",

              actionLabel:
                "View Schedules",

              actionPath:
                "/schedules",
            },
          ];

        default:
          return [];
      }
    }, [
      dashboardData,
      role,
    ]);

  const allocationTrend =
    useMemo(
      () =>
        buildAllocationTrend(
          visiblePlans
        ),
      [visiblePlans]
    );

  const resourceBreakdown =
    useMemo(
      () =>
        buildResourceBreakdown(
          visiblePlans
        ),
      [visiblePlans]
    );

  const recentPlans =
    useMemo(
      () =>
        [...visiblePlans]
          .sort(
            (
              first,
              second
            ) =>
              getDateTime(
                second.createdAt
              ) -
              getDateTime(
                first.createdAt
              )
          )
          .slice(
            0,
            10
          ),
      [visiblePlans]
    );

  const canViewAnalytics =
    role === "Manager" ||
    role === "Researcher";

  const canCreateAllocation =
    role === "Researcher";

  const isLimitedDashboardRole =
    role === "Student" ||
    role === "Technician";

  return (
    <DashboardLayout>
      <div className="dashboard-page-container">
        <div className="dashboard-header">
          <div>
            <h1>
              {getRoleTitle(role)}
            </h1>

            <p>
              Welcome back, {fullName}.{" "}
              {getRoleDescription(role)}
            </p>
          </div>

          <div className="dashboard-header-actions">
            {canViewAnalytics && (
              <button
                type="button"
                className="dashboard-analytics-btn"
                onClick={() =>
                  navigate(
                    "/allocation-analytics"
                  )
                }
              >
                View Analytics
              </button>
            )}

            {canCreateAllocation && (
              <button
                type="button"
                className="dashboard-create-btn"
                onClick={() =>
                  navigate(
                    "/allocation/create"
                  )
                }
              >
                + Create Allocation
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="dashboard-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="dashboard-loading">
            Loading dashboard data...
          </div>
        ) : (
          <>
            {!isLimitedDashboardRole && (
              <div className="stats-grid">
                {stats.map((stat) => {
                  const actionPath = stat.actionPath;

                  return (
                    <StatisticCard
                      key={stat.id}
                      stat={stat}
                      onAction={
                        actionPath
                          ? () => {
                            navigate(actionPath);
                          }
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            )}

            {!isLimitedDashboardRole && (
              <div className="charts-grid">
                <LineChartCard data={allocationTrend} />
                <BreakdownCard data={resourceBreakdown} />
              </div>
            )}

            {role === "Admin" && (
              <div className="role-section-card">
                <h3>Admin Workspace</h3>
                <p>
                  Manage users, roles, personnel profiles, system settings, audit logs, and reports.
                </p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
                  <button type="button" onClick={() => navigate("/admin/personnel")}>
                    Personnel & Skills
                  </button>
                  <button type="button" onClick={() => navigate("/admin/users")}>
                    User Management
                  </button>
                  <button type="button" onClick={() => navigate("/reports")}>
                    System Reports
                  </button>
                </div>
              </div>
            )}

            {role ===
              "Researcher" && (
                <div className="role-section-card">
                  <h3>
                    Researcher Workspace
                  </h3>

                  <p>
                    Create experiments,
                    requirements, and phases, then
                    track their execution and
                    progress.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/experiments"
                      )
                    }
                  >
                    View Experiments
                  </button>
                </div>
              )}

            {role === "Technician" && (
              <div className="role-section-card">
                <h3>Technician Workspace</h3>
                <p>
                  Review assigned tasks, update execution progress & notes, and confirm receipt of assigned equipment.
                </p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
                  <button
                    type="button"
                    onClick={() => navigate("/schedules")}
                  >
                    View & Update Tasks
                  </button>
                  <button
                    type="button"
                    style={{ background: "#16a34a", borderColor: "#16a34a" }}
                    onClick={() => navigate("/equipment-instances")}
                  >
                    Confirm Equipment Receipt
                  </button>
                </div>
              </div>
            )}

            {(role === "Seasonal" || role === "Student") && (
              <div className="role-section-card">
                <h3>Seasonal Workspace</h3>
                <p>
                  View assigned tasks, update task execution notes, and confirm receipt of assigned equipment.
                </p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
                  <button
                    type="button"
                    onClick={() => navigate("/schedules")}
                  >
                    View My Schedules
                  </button>
                  <button
                    type="button"
                    style={{ background: "#16a34a", borderColor: "#16a34a" }}
                    onClick={() => navigate("/equipment-instances")}
                  >
                    Confirm Equipment Receipt
                  </button>
                </div>
              </div>
            )}

            {!isLimitedDashboardRole && (
              <div className="table-row-container">
                <RequestTable
                  requests={
                    recentPlans
                  }
                />
              </div>
            )}

            {canViewAnalytics && (
              <div className="dashboard-action-row">
                <button
                  type="button"
                  className="dashboard-outline-btn"
                  onClick={() =>
                    navigate(
                      "/allocation-analytics"
                    )
                  }
                >
                  View Experiment Analytics
                </button>
              </div>
            )}

            {canCreateAllocation && (
              <button
                type="button"
                className="dashboard-fab"
                title="Create Allocation"
                aria-label="Create allocation"
                onClick={() =>
                  navigate(
                    "/allocation/create"
                  )
                }
              >
                +
              </button>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
