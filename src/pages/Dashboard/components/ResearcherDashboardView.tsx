import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FlaskConical,
  Plus,
  Calendar,
  FileCheck,
  Eye,
  Edit,
} from "lucide-react";
import type { ExperimentResponse } from "../../../types/experiment";
import type { AllocationPlan } from "../../../types/allocationPlan";
import type { Schedule } from "../../../types/schedule";

import { ResearcherKpiCards } from "./ResearcherKpiCards";
import { ResearcherExperimentPipeline } from "./ResearcherExperimentPipeline";
import { ResearcherAiMatchingCard } from "./ResearcherAiMatchingCard";
import { ResearcherUpcomingSchedules } from "./ResearcherUpcomingSchedules";
import { ResearcherAllocationPlansTable } from "./ResearcherAllocationPlansTable";
import Pagination from "../../../components/Pagination";

import "./ResearcherDashboard.css";

interface ResearcherDashboardViewProps {
  experiments: ExperimentResponse[];
  allocationPlans: AllocationPlan[];
  schedules: Schedule[];
  fullName: string;
}

export const ResearcherDashboardView: React.FC<ResearcherDashboardViewProps> = ({
  experiments,
  allocationPlans,
  schedules,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"plans" | "experiments" | "schedules">("plans");

  // Pagination for Tab 2 (Experiments)
  const [expCurrentPage, setExpCurrentPage] = useState<number>(1);
  const [expPageSize, setExpPageSize] = useState<number>(8);

  // Pagination for Tab 3 (Schedules)
  const [schedCurrentPage, setSchedCurrentPage] = useState<number>(1);
  const [schedPageSize, setSchedPageSize] = useState<number>(8);

  // Metrics computation
  const metrics = useMemo(() => {
    const running = experiments.filter(
      (e) => (e.status || "").toLowerCase() === "running"
    ).length;
    const planning = experiments.filter((e) => {
      const s = (e.status || "").toLowerCase();
      return s === "planning" || s === "ready";
    }).length;
    const draft = experiments.filter(
      (e) => (e.status || "Draft").toLowerCase() === "draft"
    ).length;

    const pending = allocationPlans.filter((p) => {
      const s = (p.approveStatus || "").toLowerCase();
      return s === "pending" || s === "submitted";
    }).length;

    const approved = allocationPlans.filter(
      (p) => (p.approveStatus || "").toLowerCase() === "approved"
    ).length;

    const rejected = allocationPlans.filter(
      (p) => (p.approveStatus || "").toLowerCase() === "rejected"
    ).length;

    // Avg fitness score
    const scoredPlans = allocationPlans.filter(
      (p) => p.fitnessScore !== null && p.fitnessScore !== undefined
    );
    let avgFitness = 0;
    if (scoredPlans.length > 0) {
      const sum = scoredPlans.reduce((acc, p) => {
        const val = p.fitnessScore!;
        const sc = val <= 1 ? val * 100 : val;
        return acc + Math.min(100, Math.max(0, sc));
      }, 0);
      avgFitness = sum / scoredPlans.length;
    }

    // Upcoming schedules in next 14 days (from today)
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const future14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    future14Days.setHours(23, 59, 59, 999);

    const upcomingTasks = schedules.filter((s) => {
      const startDate = new Date(s.startDate);
      const endDate = new Date(s.endDate || s.startDate);
      if (isNaN(startDate.getTime())) return false;
      return (
        endDate >= now &&
        startDate <= future14Days &&
        s.status !== "Completed" &&
        s.status !== "Cancelled"
      );
    }).length;

    return {
      running,
      planning,
      draft,
      totalExperiments: experiments.length,
      pending,
      approved,
      rejected,
      avgFitness,
      upcomingTasks,
    };
  }, [experiments, allocationPlans, schedules]);

  const latestExpId = experiments[0]?.experimentId;

  const handleTabChange = (tab: "plans" | "experiments" | "schedules") => {
    setActiveTab(tab);
    setTimeout(() => {
      const el = document.getElementById("researcher-workspace-tabs");
      el?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  // Paginated experiments
  const paginatedExperiments = useMemo(() => {
    const start = (expCurrentPage - 1) * expPageSize;
    return experiments.slice(start, start + expPageSize);
  }, [experiments, expCurrentPage, expPageSize]);

  // Paginated schedules
  const paginatedSchedules = useMemo(() => {
    const start = (schedCurrentPage - 1) * schedPageSize;
    return schedules.slice(start, start + schedPageSize);
  }, [schedules, schedCurrentPage, schedPageSize]);

  return (
    <div className="researcher-dashboard">
      {/* ================================================================= */}
      {/* 1. TIER 1: 4 KPI SCORECARDS                                       */}
      {/* ================================================================= */}
      <ResearcherKpiCards
        runningExperiments={metrics.running}
        planningExperiments={metrics.planning}
        draftExperiments={metrics.draft}
        totalExperiments={metrics.totalExperiments}
        pendingPlans={metrics.pending}
        approvedPlans={metrics.approved}
        rejectedPlans={metrics.rejected}
        avgFitnessScore={metrics.avgFitness}
        upcomingTasksCount={metrics.upcomingTasks}
        onSelectTab={handleTabChange}
      />

      {/* ================================================================= */}
      {/* 2. TIER 2: EXPERIMENT PIPELINE & AI RESOURCE MATCHING             */}
      {/* ================================================================= */}
      <div className="dashboard-grid-row-2col">
        <ResearcherExperimentPipeline experiments={experiments} />
        <ResearcherAiMatchingCard
          avgFitnessScore={metrics.avgFitness}
          totalPlansCount={allocationPlans.length}
          latestExperimentId={latestExpId}
        />
      </div>

      {/* ================================================================= */}
      {/* 3. TIER 3: UPCOMING FIELD SCHEDULES TIMELINE                      */}
      {/* ================================================================= */}
      <ResearcherUpcomingSchedules schedules={schedules} />

      {/* ================================================================= */}
      {/* 4. TIER 4: RESEARCHER WORKSPACE TABS                              */}
      {/* ================================================================= */}
      <section id="researcher-workspace-tabs" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="dashboard-tab-bar">
          <button
            type="button"
            onClick={() => setActiveTab("plans")}
            className={`dashboard-tab-item ${activeTab === "plans" ? "active" : ""}`}
          >
            <FileCheck size={15} />
            <span>My Allocation Plans ({allocationPlans.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("experiments")}
            className={`dashboard-tab-item ${activeTab === "experiments" ? "active" : ""}`}
          >
            <FlaskConical size={15} />
            <span>My Experiments Master List ({experiments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("schedules")}
            className={`dashboard-tab-item ${activeTab === "schedules" ? "active" : ""}`}
          >
            <Calendar size={15} />
            <span>Field Schedules ({schedules.length})</span>
          </button>
        </div>

        <div>
          {/* Tab 1: Allocation Plans */}
          {activeTab === "plans" && (
            <ResearcherAllocationPlansTable plans={allocationPlans} />
          )}

          {/* Tab 2: Experiments Repository */}
          {activeTab === "experiments" && (
            <div className="request-table-card">
              <div className="request-table-header">
                <div>
                  <h3>Experiments Repository</h3>
                  <p>All research experiments created by your account</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/experiments/create")}
                  className="researcher-btn-light"
                  style={{ background: "#059669", color: "#ffffff", padding: "6px 14px", fontSize: 12.5 }}
                >
                  <Plus size={14} />
                  <span>New Experiment</span>
                </button>
              </div>

              <div className="request-table-wrapper">
                <table className="request-table">
                  <thead>
                    <tr>
                      <th>Experiment</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Expected Start</th>
                      <th>Expected End</th>
                      <th>Deadline</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedExperiments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="request-table-empty">
                          No experiments found. Click "New Experiment" to create one.
                        </td>
                      </tr>
                    ) : (
                      paginatedExperiments.map((exp) => (
                        <tr key={exp.experimentId}>
                          <td>
                            <strong
                              style={{ cursor: "pointer", color: "#16a34a" }}
                              onClick={() => navigate(`/experiments/${exp.experimentId}`)}
                            >
                              {exp.experimentName}
                            </strong>
                          </td>
                          <td>
                            <span
                              style={{
                                display: "inline-flex",
                                padding: "3px 8px",
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 700,
                                background: "#f1f5f9",
                                color: "#334155",
                              }}
                            >
                              {exp.status || "Draft"}
                            </span>
                          </td>
                          <td>
                            {(exp.priority ?? 1) >= 3 ? (
                              <span style={{ color: "#dc2626", fontWeight: 700 }}>High</span>
                            ) : (exp.priority ?? 1) === 2 ? (
                              <span style={{ color: "#d97706", fontWeight: 700 }}>Medium</span>
                            ) : (
                              <span style={{ color: "#64748b" }}>Normal</span>
                            )}
                          </td>
                          <td>
                            {exp.expectStartDate ? new Date(exp.expectStartDate).toLocaleDateString("vi-VN") : "—"}
                          </td>
                          <td>
                            {exp.expectEndDate ? new Date(exp.expectEndDate).toLocaleDateString("vi-VN") : "—"}
                          </td>
                          <td>
                            {exp.deadline ? new Date(exp.deadline).toLocaleDateString("vi-VN") : "—"}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                type="button"
                                className="action-btn-pill view"
                                onClick={() => navigate(`/experiments/${exp.experimentId}`)}
                              >
                                <Eye size={12} />
                                <span>View</span>
                              </button>
                              <button
                                type="button"
                                className="action-btn-pill"
                                onClick={() => navigate(`/experiments/${exp.experimentId}/edit`)}
                              >
                                <Edit size={12} />
                                <span>Edit</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {experiments.length > 0 && (
                <Pagination
                  currentPage={expCurrentPage}
                  totalItems={experiments.length}
                  pageSize={expPageSize}
                  onPageChange={setExpCurrentPage}
                  onPageSizeChange={(sz) => {
                    setExpPageSize(sz);
                    setExpCurrentPage(1);
                  }}
                  pageSizeOptions={[8, 15, 30]}
                />
              )}
            </div>
          )}

          {/* Tab 3: Schedules */}
          {activeTab === "schedules" && (
            <div className="request-table-card">
              <div className="request-table-header">
                <div>
                  <h3>All Assigned Field Schedules</h3>
                  <p>Comprehensive list of phase execution schedules</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/schedules")}
                  className="dashboard-btn-secondary"
                  style={{ padding: "6px 12px", fontSize: 12 }}
                >
                  <span>Go to Schedules Hub</span>
                </button>
              </div>

              <div className="request-table-wrapper">
                <table className="request-table">
                  <thead>
                    <tr>
                      <th>Schedule / Phase</th>
                      <th>Allocation Plan</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Assigned Resource</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSchedules.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="request-table-empty">
                          No schedules currently assigned.
                        </td>
                      </tr>
                    ) : (
                      paginatedSchedules.map((s) => (
                        <tr key={s.scheduleId}>
                          <td>
                            <strong>{s.title || s.phaseName || `Schedule #${s.scheduleId}`}</strong>
                          </td>
                          <td>
                            <span style={{ color: "#2563eb", fontWeight: 600 }}>
                              {s.allocationPlanName || `Plan #${s.allocationPlanId}`}
                            </span>
                          </td>
                          <td>{new Date(s.startDate).toLocaleDateString("vi-VN")}</td>
                          <td>{new Date(s.endDate).toLocaleDateString("vi-VN")}</td>
                          <td>{s.assignedHumanResourceName || "Unassigned"}</td>
                          <td>
                            <span
                              style={{
                                display: "inline-flex",
                                padding: "3px 8px",
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 700,
                                background: s.status === "Completed" ? "#ecfdf5" : "#eff6ff",
                                color: s.status === "Completed" ? "#059669" : "#1d4ed8",
                              }}
                            >
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {schedules.length > 0 && (
                <Pagination
                  currentPage={schedCurrentPage}
                  totalItems={schedules.length}
                  pageSize={schedPageSize}
                  onPageChange={setSchedCurrentPage}
                  onPageSizeChange={(sz) => {
                    setSchedPageSize(sz);
                    setSchedCurrentPage(1);
                  }}
                  pageSizeOptions={[8, 15, 30]}
                />
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
