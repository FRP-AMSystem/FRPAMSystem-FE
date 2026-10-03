import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";

// Child Components
import StatisticCard from "./components/StatisticCard";
import EquipmentOperatingHoursChart from "./components/EquipmentOperatingHoursChart";
import ResourceStatusDonutGroup from "./components/ResourceStatusDonutGroup";
import AllocationTrendComposedChart from "./components/AllocationTrendComposedChart";
import PersonnelWorkloadBarChart from "./components/PersonnelWorkloadBarChart";
import EquipmentLifespanTable from "./components/EquipmentLifespanTable";
import PendingApprovalsTable from "./components/PendingApprovalsTable";
import LandUtilizationCard from "./components/LandUtilizationCard";
import RequestTable from "./components/RequestTable";

// Services & Types
import { fetchLiveDashboardOverview } from "../../services/dashboardService";
import { getAllocationPlans } from "../../services/allocationPlanService";
import { getExperiments } from "../../services/experimentService";
import { getSchedules } from "../../services/scheduleService";
import { ResearcherDashboardView } from "./components/ResearcherDashboardView";

import type {
  DashboardOverviewData,
} from "../../types/dashboard";
import type { AllocationPlan } from "../../types/allocationPlan";
import type { ExperimentResponse } from "../../types/experiment";
import type { Schedule } from "../../types/schedule";

// Icons
import {
  RefreshCw,
  ShieldCheck,
  Wrench,
  Users,
  MapPin,
  Clock,
  FileText,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

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

function getCurrentRole(): Role {
  const storedRole = localStorage.getItem("role");
  return validRoles.includes(storedRole as Role)
    ? (storedRole as Role)
    : "Student";
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            error?: string;
            title?: string;
            errors?: Record<string, string[]>;
          };
        };
      }
    ).response;

    if (response?.status === 401) {
      return "Your login session is invalid or expired. Please log out and sign in again.";
    }
    if (response?.status === 403) {
      return "Your account does not have permission to load dashboard information.";
    }
    if (response?.data?.errors) {
      return Object.values(response.data.errors).flat().join(" ");
    }
    return (
      response?.data?.message ||
      response?.data?.error ||
      response?.data?.title ||
      "Unable to load dashboard information."
    );
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to load dashboard information.";
}

function getRoleTitle(role: Role): string {
  switch (role) {
    case "Admin":
      return "System Administration & Asset Intelligence";
    case "Manager":
      return "Resource Planning & Operational Command Dashboard";
    case "Researcher":
      return "Researcher Allocation & Experiment Hub";
    case "Technician":
      return "Field Operations & Machinery Maintenance";
    case "Student":
    case "Seasonal":
      return "Field Work & Schedule Assignments";
    default:
      return "Dashboard";
  }
}

function getRoleDescription(role: Role): string {
  switch (role) {
    case "Admin":
      return "Real-time fleet health, workforce loading, land distribution, and system-wide approval telemetry.";
    case "Manager":
      return "Monitor multi-objective resource allocations, equipment wear thresholds, and pending experiment approvals.";
    case "Researcher":
      return "Create experiments and monitor allocation plans through the AI genetic matching workflow.";
    case "Technician":
      return "Review equipment assignments, operating hours, and schedule execution.";
    case "Student":
    case "Seasonal":
      return "View active tasks, field schedules, and assigned equipment.";
    default:
      return "Welcome to the Forestry Resource Planning & Asset Management System.";
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const role = getCurrentRole();
  const fullName = localStorage.getItem("fullName")?.trim() || "Manager";
  const userId = Number(localStorage.getItem("userId"));

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [overviewData, setOverviewData] = useState<DashboardOverviewData | null>(null);
  const [allocationPlans, setAllocationPlans] = useState<AllocationPlan[]>([]);
  const [myExperimentIds, setMyExperimentIds] = useState<number[]>([]);
  const [researcherExperiments, setResearcherExperiments] = useState<ExperimentResponse[]>([]);
  const [researcherSchedules, setResearcherSchedules] = useState<Schedule[]>([]);

  // Tab state for Bottom Operational Data Center
  const [activeBottomTab, setActiveBottomTab] = useState<
    "equipment-matrix" | "pending-queue" | "land-overview" | "recent-activity"
  >("equipment-matrix");

  // Time-range selector
  const [timeRange, setTimeRange] = useState<"30d" | "quarter" | "year" | "all">("30d");

  const loadData = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const [overview, plans] = await Promise.all([
        fetchLiveDashboardOverview(),
        getAllocationPlans({ page: 1, size: 500 }).catch((err) => {
          console.warn("Could not load plans for dashboard:", err);
          return [];
        }),
      ]);

      let expIds: number[] = [];
      let expList: ExperimentResponse[] = [];
      let schedList: Schedule[] = [];

      if (role === "Researcher") {
        const [expData, schedData] = await Promise.all([
          getExperiments({ size: 500 }).catch(() => []),
          getSchedules({ size: 500 }).catch(() => []),
        ]);

        if (Array.isArray(expData)) {
          expList =
            Number.isInteger(userId) && userId > 0
              ? expData.filter(
                  (e) => e.researcherId === userId || e.createdByUserId === userId
                )
              : expData;
          expIds = expList.map((e) => e.experimentId);
        }

        if (Array.isArray(schedData)) {
          const userPlanIds = (Array.isArray(plans) ? plans : [])
            .filter(
              (p) => p.createdBy === userId || expIds.includes(p.experimentId)
            )
            .map((p) => p.allocationPlanId);

          const filteredSched = schedData.filter(
            (s) =>
              s.createdBy === userId || userPlanIds.includes(s.allocationPlanId)
          );
          schedList =
            filteredSched.length > 0
              ? filteredSched
              : schedData.slice(0, 10);
        }
      }

      setOverviewData(overview);
      setAllocationPlans(Array.isArray(plans) ? plans : []);
      setMyExperimentIds(expIds);
      setResearcherExperiments(expList);
      setResearcherSchedules(schedList);
    } catch (loadError) {
      console.error("Dashboard overview load failed:", loadError);
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role, userId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visiblePlans = useMemo(() => {
    if (role === "Admin" || role === "Manager") {
      return allocationPlans.filter(
        (plan) => (plan.approveStatus || "").toLowerCase() !== "draft"
      );
    }
    if (role !== "Researcher" || !Number.isInteger(userId) || userId <= 0) {
      return allocationPlans;
    }
    return allocationPlans.filter(
      (plan) =>
        plan.createdBy === userId || myExperimentIds.includes(plan.experimentId)
    );
  }, [allocationPlans, role, userId, myExperimentIds]);

  const recentPlans = useMemo(() => {
    return [...visiblePlans]
      .sort((a, b) => {
        const t1 = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const t2 = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return t2 - t1;
      })
      .slice(0, 10);
  }, [visiblePlans]);

  const isExecutiveRole = role === "Admin" || role === "Manager";

  return (
    <DashboardLayout>
      <div className="dashboard-page-container">
        {/* ================================================================= */}
        {/* 1. HEADER SECTION                                                 */}
        {/* ================================================================= */}
        <div className="dashboard-header-container">
          <div className="dashboard-header-left">
            <div className="dashboard-role-badge">
              <ShieldCheck size={14} />
              <span>Role: {role} Portal</span>
            </div>
            <h1 className="dashboard-header-title">
              {getRoleTitle(role)}
            </h1>
            <p className="dashboard-header-desc">
              Welcome back, <strong>{fullName}</strong>. {getRoleDescription(role)}
            </p>
          </div>

          <div className="dashboard-header-controls">
            {/* Time range selector */}
            <div className="dashboard-range-pills">
              <button
                type="button"
                onClick={() => setTimeRange("30d")}
                className={`dashboard-range-btn ${timeRange === "30d" ? "active" : ""}`}
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => setTimeRange("quarter")}
                className={`dashboard-range-btn ${timeRange === "quarter" ? "active" : ""}`}
              >
                Quarter
              </button>
              <button
                type="button"
                onClick={() => setTimeRange("year")}
                className={`dashboard-range-btn ${timeRange === "year" ? "active" : ""}`}
              >
                Year
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => void loadData(true)}
              disabled={refreshing || loading}
              className="dashboard-btn-secondary"
            >
              <RefreshCw
                size={14}
                style={{
                  animation: refreshing ? "spin 1s linear infinite" : "none",
                }}
              />
              <span>{refreshing ? "Syncing..." : "Refresh"}</span>
            </button>

            {/* Quick action button */}
            {isExecutiveRole && (
              <button
                type="button"
                onClick={() => navigate("/allocation")}
                className="dashboard-btn-primary"
              >
                <span>Allocation Center</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="dashboard-error">
            <AlertTriangle size={18} style={{ marginRight: 8, verticalAlign: "middle" }} />
            <strong>Failed to load telemetry:</strong> {error}
          </div>
        )}

        {/* Loading State */}
        {loading && !overviewData ? (
          <div className="dashboard-loading">
            <RefreshCw size={24} style={{ animation: "spin 1s linear infinite", marginRight: 12 }} />
            <span>Aggregating Resource Telemetry & Health Analytics...</span>
          </div>
        ) : role === "Researcher" ? (
          <ResearcherDashboardView
            experiments={researcherExperiments}
            allocationPlans={visiblePlans}
            schedules={researcherSchedules}
            fullName={fullName}
          />
        ) : overviewData ? (
          <>
            {/* ============================================================= */}
            {/* TIER 1: 4 EXECUTIVE KPI SCORECARDS                             */}
            {/* ============================================================= */}
            <section className="stats-grid-4col">
              {overviewData.stats.map((stat) => (
                <StatisticCard key={stat.id} stat={stat} />
              ))}
            </section>

            {/* ============================================================= */}
            {/* TIER 2: EQUIPMENT OPERATING HOURS & 3-PILLAR DONUTS           */}
            {/* ============================================================= */}
            <section className="dashboard-grid-row-2col">
              <EquipmentOperatingHoursChart
                data={overviewData.equipmentOperatingMetrics}
                onSelectEquipment={(id) => navigate(`/equipment?equipmentInstanceId=${id}`)}
              />
              <ResourceStatusDonutGroup breakdowns={overviewData.resourceBreakdowns} />
            </section>

            {/* ============================================================= */}
            {/* TIER 3: ALLOCATION 6-MONTH TREND & ROLE WORKFORCE CAPACITY    */}
            {/* ============================================================= */}
            <section className="dashboard-grid-row-equal">
              <AllocationTrendComposedChart data={overviewData.allocationTrends} />
              <PersonnelWorkloadBarChart data={overviewData.roleWorkloads} />
            </section>

            {/* Admin Quick Management Banner */}
            {role === "Admin" && (
              <div
                style={{
                  background: "linear-gradient(90deg, rgba(22, 163, 74, 0.08) 0%, rgba(37, 99, 235, 0.08) 100%)",
                  border: "1px solid rgba(22, 163, 74, 0.2)",
                  borderRadius: 16,
                  padding: "16px 20px",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 750, color: "#0f172a" }}>
                    Admin Quick Management Center
                  </h4>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                    Fast access to personnel skill matrices, user privileges, system audit logs, and global reports.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => navigate("/admin/personnel")}
                    className="dashboard-btn-secondary"
                  >
                    Personnel & Skills
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/admin/users")}
                    className="dashboard-btn-secondary"
                  >
                    User Management
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/reports")}
                    className="dashboard-btn-primary"
                  >
                    System Reports
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TIER 4: COMPREHENSIVE OPERATIONAL DATA CENTER & TABS          */}
            {/* ============================================================= */}
            <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Tab Navigation */}
              <div className="dashboard-tab-bar">
                <button
                  type="button"
                  onClick={() => setActiveBottomTab("equipment-matrix")}
                  className={`dashboard-tab-item ${
                    activeBottomTab === "equipment-matrix" ? "active-equipment" : ""
                  }`}
                >
                  <Wrench size={15} />
                  <span>Equipment Operating Lifespan ({overviewData.equipmentOperatingMetrics.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveBottomTab("pending-queue")}
                  className={`dashboard-tab-item ${
                    activeBottomTab === "pending-queue" ? "active-pending" : ""
                  }`}
                >
                  <Clock size={15} />
                  <span>Pending Approvals Queue</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveBottomTab("land-overview")}
                  className={`dashboard-tab-item ${
                    activeBottomTab === "land-overview" ? "active-land" : ""
                  }`}
                >
                  <MapPin size={15} />
                  <span>Land & Soil Profiles</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveBottomTab("recent-activity")}
                  className={`dashboard-tab-item ${
                    activeBottomTab === "recent-activity" ? "active-recent" : ""
                  }`}
                >
                  <FileText size={15} />
                  <span>Recent Plans Table</span>
                </button>
              </div>

              {/* Tab Content Display */}
              <div>
                {activeBottomTab === "equipment-matrix" && (
                  <EquipmentLifespanTable data={overviewData.equipmentOperatingMetrics} />
                )}

                {activeBottomTab === "pending-queue" && (
                  <PendingApprovalsTable plans={visiblePlans} />
                )}

                {activeBottomTab === "land-overview" && (
                  <LandUtilizationCard data={overviewData.landUtilization} />
                )}

                {activeBottomTab === "recent-activity" && (
                  <div className="table-row-container">
                    <RequestTable requests={recentPlans} />
                  </div>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
