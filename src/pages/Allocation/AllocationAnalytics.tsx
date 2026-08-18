import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock3,
  Eye,
  RefreshCw,
  XCircle,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getAllocationPlans,
} from "../../services/allocationPlanService";

import type {
  AllocationPlan,
} from "../../types/allocationPlan";

import "./AllocationAnalytics.css";

type Role =
  | "Manager"
  | "Researcher"
  | "Technician" | "Student" | "Seasonal";

interface StatusChartItem {
  name: string;
  value: number;
  color: string;
}

interface ResourceChartItem {
  name: string;
  Equipment: number;
  Human: number;
  Land: number;
}

const STATUS_COLORS: Record<string, string> = {
  Draft: "#64748b",
  Pending: "#f59e0b",
  Approved: "#22c55e",
  Rejected: "#ef4444",
  Cancelled: "#94a3b8",
};

function getCurrentRole(): Role {
  const storedRole =
    localStorage.getItem("role");

  if (
    storedRole === "Manager" ||
    storedRole === "Researcher" ||
    storedRole === "Technician" ||
    (storedRole === "Student" || storedRole === "Seasonal")
  ) {
    return storedRole;
  }

  return "Seasonal";
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

    if (response?.data?.errors) {
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
      "Unable to load allocation analytics."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load allocation analytics.";
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
    Math.max(0, percentage)
  );
}

function formatDate(
  value?: string | null
): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return date.toLocaleDateString(
    "vi-VN"
  );
}

function getStatusClassName(
  status: string
): string {
  return [
    "allocation-analytics-status",
    `allocation-analytics-status-${status.toLowerCase()}`,
  ].join(" ");
}

export default function AllocationAnalytics() {
  const navigate =
    useNavigate();

  const role =
    getCurrentRole();

  const currentUserId =
    Number(
      localStorage.getItem("userId")
    );

  const [
    plans,
    setPlans,
  ] = useState<AllocationPlan[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const loadData =
    useCallback(
      async (
        initialLoad = true
      ) => {
        try {
          if (initialLoad) {
            setLoading(true);
          } else {
            setRefreshing(true);
          }

          setError("");

          const data =
            await getAllocationPlans({
              page: 1,
              size: 500,
            });

          setPlans(
            Array.isArray(data)
              ? data
              : []
          );
        } catch (loadError) {
          console.error(
            "Load allocation analytics failed:",
            loadError
          );

          setPlans([]);
          setError(
            getErrorMessage(
              loadError
            )
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visiblePlans =
    useMemo(() => {
      if (
        role !== "Researcher" ||
        !Number.isInteger(
          currentUserId
        ) ||
        currentUserId <= 0
      ) {
        return plans;
      }

      return plans.filter(
        (plan) =>
          plan.createdBy ===
          currentUserId
      );
    }, [
      plans,
      role,
      currentUserId,
    ]);

  const analytics =
    useMemo(() => {
      const total =
        visiblePlans.length;

      const draft =
        visiblePlans.filter(
          (plan) =>
            plan.approveStatus ===
            "Draft"
        ).length;

      const pending =
        visiblePlans.filter(
          (plan) =>
            plan.approveStatus ===
            "Pending"
        ).length;

      const approved =
        visiblePlans.filter(
          (plan) =>
            plan.approveStatus ===
            "Approved"
        ).length;

      const rejected =
        visiblePlans.filter(
          (plan) =>
            plan.approveStatus ===
            "Rejected"
        ).length;

      const cancelled =
        visiblePlans.filter(
          (plan) =>
            plan.approveStatus ===
            "Cancelled"
        ).length;

      const scores =
        visiblePlans
          .map((plan) =>
            normalizeFitnessScore(
              plan.fitnessScore
            )
          )
          .filter(
            (score) =>
              score > 0
          );

      const averageFitness =
        scores.length > 0
          ? Number(
            (
              scores.reduce(
                (
                  sum,
                  score
                ) =>
                  sum + score,
                0
              ) /
              scores.length
            ).toFixed(1)
          )
          : 0;

      const equipment =
        visiblePlans.reduce(
          (sum, plan) =>
            sum +
            (
              plan.equipmentDetailCount ??
              0
            ),
          0
        );

      const human =
        visiblePlans.reduce(
          (sum, plan) =>
            sum +
            (
              plan.humanDetailCount ??
              0
            ),
          0
        );

      const land =
        visiblePlans.reduce(
          (sum, plan) =>
            sum +
            (
              plan.landDetailCount ??
              0
            ),
          0
        );

      const schedules =
        visiblePlans.reduce(
          (sum, plan) =>
            sum +
            (
              plan.scheduleCount ??
              0
            ),
          0
        );

      const approvalRate =
        total > 0
          ? Number(
            (
              approved /
              total *
              100
            ).toFixed(1)
          )
          : 0;

      return {
        total,
        draft,
        pending,
        approved,
        rejected,
        cancelled,
        averageFitness,
        equipment,
        human,
        land,
        schedules,
        approvalRate,
      };
    }, [visiblePlans]);

  const statusChartData =
    useMemo<
      StatusChartItem[]
    >(
      () => [
        {
          name: "Draft",
          value:
            analytics.draft,
          color:
            STATUS_COLORS.Draft,
        },
        {
          name: "Pending",
          value:
            analytics.pending,
          color:
            STATUS_COLORS.Pending,
        },
        {
          name: "Approved",
          value:
            analytics.approved,
          color:
            STATUS_COLORS.Approved,
        },
        {
          name: "Rejected",
          value:
            analytics.rejected,
          color:
            STATUS_COLORS.Rejected,
        },
        {
          name: "Cancelled",
          value:
            analytics.cancelled,
          color:
            STATUS_COLORS.Cancelled,
        },
      ],
      [analytics]
    );

  const resourceChartData =
    useMemo<
      ResourceChartItem[]
    >(
      () =>
        [...visiblePlans]
          .sort(
            (
              first,
              second
            ) =>
              (
                (
                  second.equipmentDetailCount ??
                  0
                ) +
                (
                  second.humanDetailCount ??
                  0
                ) +
                (
                  second.landDetailCount ??
                  0
                )
              ) -
              (
                (
                  first.equipmentDetailCount ??
                  0
                ) +
                (
                  first.humanDetailCount ??
                  0
                ) +
                (
                  first.landDetailCount ??
                  0
                )
              )
          )
          .slice(0, 10)
          .map((plan) => ({
            name:
              plan.experimentName ||
              `Plan #${plan.allocationPlanId}`,

            Equipment:
              plan.equipmentDetailCount ??
              0,

            Human:
              plan.humanDetailCount ??
              0,

            Land:
              plan.landDetailCount ??
              0,
          })),
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
              new Date(
                second.createdAt
              ).getTime() -
              new Date(
                first.createdAt
              ).getTime()
          )
          .slice(0, 10),
      [visiblePlans]
    );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="allocation-analytics-page">
          <div className="allocation-analytics-loading">
            Loading allocation analytics...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="allocation-analytics-page">
        <header className="allocation-analytics-header">
          <div>
            <p>
              Dashboard / Reports /
              Allocation Analytics
            </p>

            <h1>
              Allocation Analytics
            </h1>

            <span>
              Review allocation status,
              fitness scores and resource
              distribution.
            </span>
          </div>

          <div className="allocation-analytics-header-actions">
            <button
              type="button"
              className="secondary"
              onClick={() =>
                navigate("/allocation")
              }
            >
              View Allocations
            </button>

            <button
              type="button"
              disabled={refreshing}
              onClick={() =>
                void loadData(false)
              }
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "allocation-analytics-spin"
                    : ""
                }
              />

              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </header>

        {error && (
          <div className="allocation-analytics-error">
            {error}
          </div>
        )}

        <section className="allocation-analytics-summary-grid">
          <article>
            <div className="allocation-analytics-summary-icon blue">
              <BarChart3 size={21} />
            </div>

            <div>
              <span>
                Total Plans
              </span>

              <strong>
                {analytics.total}
              </strong>

              <small>
                {analytics.draft} draft
              </small>
            </div>
          </article>

          <article>
            <div className="allocation-analytics-summary-icon orange">
              <Clock3 size={21} />
            </div>

            <div>
              <span>
                Pending
              </span>

              <strong>
                {analytics.pending}
              </strong>

              <small>
                Awaiting review
              </small>
            </div>
          </article>

          <article>
            <div className="allocation-analytics-summary-icon green">
              <CheckCircle2
                size={21}
              />
            </div>

            <div>
              <span>
                Approved
              </span>

              <strong>
                {analytics.approved}
              </strong>

              <small>
                {analytics.approvalRate}%
                approval rate
              </small>
            </div>
          </article>

          <article>
            <div className="allocation-analytics-summary-icon red">
              <XCircle size={21} />
            </div>

            <div>
              <span>
                Rejected
              </span>

              <strong>
                {analytics.rejected}
              </strong>

              <small>
                {analytics.cancelled}
                {" "}cancelled
              </small>
            </div>
          </article>

          <article>
            <div className="allocation-analytics-summary-icon purple">
              <Activity size={21} />
            </div>

            <div>
              <span>
                Average Fitness
              </span>

              <strong>
                {analytics.averageFitness}
              </strong>

              <small>
                Allocation quality score
              </small>
            </div>
          </article>
        </section>

        <section className="allocation-analytics-chart-grid">
          <article className="allocation-analytics-card">
            <div className="allocation-analytics-card-header">
              <div>
                <h2>
                  Status Distribution
                </h2>

                <p>
                  Allocation plans grouped
                  by approval status.
                </p>
              </div>
            </div>

            <div className="allocation-analytics-pie-wrap">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={
                      statusChartData
                    }
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={3}
                  >
                    {statusChartData.map(
                      (item) => (
                        <Cell
                          key={
                            item.name
                          }
                          fill={
                            item.color
                          }
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip />

                  <Legend />
                </PieChart>
              </ResponsiveContainer>

              <div className="allocation-analytics-pie-total">
                <strong>
                  {analytics.total}
                </strong>

                <span>
                  Plans
                </span>
              </div>
            </div>
          </article>

          <article className="allocation-analytics-card">
            <div className="allocation-analytics-card-header">
              <div>
                <h2>
                  Resource Totals
                </h2>

                <p>
                  Resource records allocated
                  across all visible plans.
                </p>
              </div>
            </div>

            <div className="allocation-analytics-resource-summary">
              <div>
                <span>
                  Equipment
                </span>

                <strong>
                  {analytics.equipment}
                </strong>
              </div>

              <div>
                <span>
                  Human
                </span>

                <strong>
                  {analytics.human}
                </strong>
              </div>

              <div>
                <span>
                  Land
                </span>

                <strong>
                  {analytics.land}
                </strong>
              </div>

              <div>
                <span>
                  Schedules
                </span>

                <strong>
                  {analytics.schedules}
                </strong>
              </div>
            </div>
          </article>
        </section>

        <section className="allocation-analytics-card">
          <div className="allocation-analytics-card-header">
            <div>
              <h2>
                Resource Distribution by Plan
              </h2>

              <p>
                Ten plans with the highest
                number of assigned resource
                records.
              </p>
            </div>
          </div>

          <div className="allocation-analytics-bar-wrap">
            {resourceChartData.length ===
              0 ? (
              <div className="allocation-analytics-empty">
                No resource allocation
                information is available.
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={
                    resourceChartData
                  }
                  margin={{
                    top: 10,
                    right: 20,
                    left: 0,
                    bottom: 70,
                  }}
                >
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={90}
                    tick={{
                      fontSize: 11,
                    }}
                  />

                  <YAxis
                    allowDecimals={false}
                  />

                  <Tooltip />

                  <Legend />

                  <Bar
                    dataKey="Equipment"
                    stackId="resources"
                    fill="#2563eb"
                  />

                  <Bar
                    dataKey="Human"
                    stackId="resources"
                    fill="#22c55e"
                  />

                  <Bar
                    dataKey="Land"
                    stackId="resources"
                    fill="#f59e0b"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="allocation-analytics-card">
          <div className="allocation-analytics-card-header">
            <div>
              <h2>
                Recent Allocation Plans
              </h2>

              <p>
                Latest plans included in
                the analytics report.
              </p>
            </div>
          </div>

          <div className="allocation-analytics-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Experiment</th>
                  <th>Status</th>
                  <th>Fitness</th>
                  <th>Equipment</th>
                  <th>Human</th>
                  <th>Land</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {recentPlans.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="allocation-analytics-empty-cell"
                    >
                      No allocation plans
                      found.
                    </td>
                  </tr>
                ) : (
                  recentPlans.map(
                    (plan) => (
                      <tr
                        key={
                          plan.allocationPlanId
                        }
                      >
                        <td>
                          <strong>
                            {plan.experimentName ||
                              `Experiment #${plan.experimentId}`}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={getStatusClassName(
                              plan.approveStatus
                            )}
                          >
                            {
                              plan.approveStatus
                            }
                          </span>
                        </td>

                        <td>
                          {normalizeFitnessScore(
                            plan.fitnessScore
                          )}
                          %
                        </td>

                        <td>
                          {plan.equipmentDetailCount ??
                            0}
                        </td>

                        <td>
                          {plan.humanDetailCount ??
                            0}
                        </td>

                        <td>
                          {plan.landDetailCount ??
                            0}
                        </td>

                        <td>
                          {formatDate(
                            plan.createdAt
                          )}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="action-btn-pill view"
                            title="View"
                            onClick={() =>
                              navigate(
                                `/allocation/${plan.allocationPlanId}`
                              )
                            }
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}