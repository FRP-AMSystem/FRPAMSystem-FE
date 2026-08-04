import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  Layers3,
  RefreshCw,
  XCircle,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getExperiments,
} from "../../services/experimentService";

import {
  getAllocationPlans,
} from "../../services/allocationPlanService";

import {
  getExperimentPhases,
} from "../../services/experimentPhaseService";

import {
  getSchedules,
} from "../../services/scheduleService";

import {
  getScheduleConflicts,
} from "../../services/scheduleConflictService";

import type {
  ExperimentResponse,
} from "../../types/experiment";

import type {
  AllocationPlan,
} from "../../types/allocationPlan";

import type {
  ExperimentPhase,
} from "../../types/experimentPhase";

import type {
  Schedule,
} from "../../types/schedule";

import type {
  ScheduleConflict,
} from "../../types/scheduleConflict";

import "./ReportOverview.css";

interface ReportData {
  experiments: ExperimentResponse[];
  allocations: AllocationPlan[];
  phases: ExperimentPhase[];
  schedules: Schedule[];
  conflicts: ScheduleConflict[];
}

const initialReportData: ReportData = {
  experiments: [],
  allocations: [],
  phases: [],
  schedules: [],
  conflicts: [],
};

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
            title?: string;
            error?: string;
            errors?: Record<
              string,
              string[]
            >;
          };
        };
      }
    ).response;

    if (response?.data?.message) {
      return response.data.message;
    }

    if (response?.data?.error) {
      return response.data.error;
    }

    if (response?.data?.errors) {
      return Object.values(
        response.data.errors
      )
        .flat()
        .join(" ");
    }

    if (response?.data?.title) {
      return response.data.title;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Cannot load report data.";
}

function normalizeStatus(
  value?: string | null
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "")
    .replaceAll("_", "");
}

function getPercentage(
  value: number,
  total: number
): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round(
    (value / total) * 100
  );
}

function getAllocationStatus(
  allocation: AllocationPlan
): string {
  return normalizeStatus(
    allocation.approveStatus
  );
}

export default function ReportOverview() {
  const [
    reportData,
    setReportData,
  ] = useState<ReportData>(
    initialReportData
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const loadReportData =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const [
          experimentData,
          allocationData,
          phaseData,
          scheduleData,
          conflictData,
        ] = await Promise.all([
          getExperiments({
            page: 1,
            size: 500,
          }),

          getAllocationPlans(),

          getExperimentPhases({
            page: 1,
            size: 500,
          }),

          getSchedules({
            page: 1,
            size: 500,
          }),

          getScheduleConflicts(),
        ]);

        setReportData({
          experiments:
            Array.isArray(
              experimentData
            )
              ? experimentData
              : [],

          allocations:
            Array.isArray(
              allocationData
            )
              ? allocationData
              : [],

          phases:
            Array.isArray(
              phaseData
            )
              ? phaseData
              : [],

          schedules:
            Array.isArray(
              scheduleData
            )
              ? scheduleData
              : [],

          conflicts:
            Array.isArray(
              conflictData
            )
              ? conflictData
              : [],
        });
      } catch (loadError) {
        console.error(
          "Load report data failed:",
          loadError
        );

        setError(
          getErrorMessage(
            loadError
          )
        );

        setReportData(
          initialReportData
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadReportData();
  }, [loadReportData]);

  const summary =
    useMemo(() => {
      const {
        experiments,
        allocations,
        phases,
        schedules,
        conflicts,
      } = reportData;

      const approvedAllocations =
        allocations.filter(
          (allocation) =>
            getAllocationStatus(
              allocation
            ) === "approved"
        ).length;

      const pendingAllocations =
        allocations.filter(
          (allocation) =>
            getAllocationStatus(
              allocation
            ) === "pending"
        ).length;

      const rejectedAllocations =
        allocations.filter(
          (allocation) =>
            getAllocationStatus(
              allocation
            ) === "rejected"
        ).length;

      const completedPhases =
        phases.filter(
          (phase) =>
            normalizeStatus(
              phase.status
            ) === "completed"
        ).length;

      const inProgressPhases =
        phases.filter(
          (phase) =>
            normalizeStatus(
              phase.status
            ) === "inprogress"
        ).length;

      const plannedPhases =
        phases.filter(
          (phase) =>
            normalizeStatus(
              phase.status
            ) === "planned"
        ).length;

      const completedSchedules =
        schedules.filter(
          (schedule) =>
            normalizeStatus(
              schedule.status
            ) === "completed"
        ).length;

      const inProgressSchedules =
        schedules.filter(
          (schedule) =>
            normalizeStatus(
              schedule.status
            ) === "inprogress"
        ).length;

      const plannedSchedules =
        schedules.filter(
          (schedule) =>
            normalizeStatus(
              schedule.status
            ) === "planned"
        ).length;

      const cancelledSchedules =
        schedules.filter(
          (schedule) =>
            normalizeStatus(
              schedule.status
            ) === "cancelled"
        ).length;

      const highConflicts =
        conflicts.filter(
          (conflict) =>
            conflict.severity ===
            "High"
        ).length;

      const mediumConflicts =
        conflicts.filter(
          (conflict) =>
            conflict.severity ===
            "Medium"
        ).length;

      const lowConflicts =
        conflicts.filter(
          (conflict) =>
            conflict.severity ===
            "Low"
        ).length;

      return {
        experimentCount:
          experiments.length,

        allocationCount:
          allocations.length,

        phaseCount:
          phases.length,

        scheduleCount:
          schedules.length,

        conflictCount:
          conflicts.length,

        approvedAllocations,
        pendingAllocations,
        rejectedAllocations,

        completedPhases,
        inProgressPhases,
        plannedPhases,

        completedSchedules,
        inProgressSchedules,
        plannedSchedules,
        cancelledSchedules,

        highConflicts,
        mediumConflicts,
        lowConflicts,

        allocationApprovalRate:
          getPercentage(
            approvedAllocations,
            allocations.length
          ),

        phaseCompletionRate:
          getPercentage(
            completedPhases,
            phases.length
          ),

        scheduleCompletionRate:
          getPercentage(
            completedSchedules,
            schedules.length
          ),
      };
    }, [reportData]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="report-overview-page">
          <div className="report-overview-state">
            Loading report data...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="report-overview-page">
        <header className="report-overview-header">
          <div>
            <p className="report-overview-breadcrumb">
              Dashboard / Reports
            </p>

            <h1>
              System Reports
            </h1>

            <p className="report-overview-description">
              Review experiments,
              allocations, phases,
              schedules and detected
              resource conflicts.
            </p>
          </div>

          <button
            type="button"
            className="report-refresh-button"
            onClick={() =>
              void loadReportData()
            }
          >
            <RefreshCw size={18} />

            Refresh Report
          </button>
        </header>

        {error && (
          <div className="report-overview-error">
            {error}
          </div>
        )}

        <section className="report-summary-grid">
          <article className="report-summary-card">
            <div className="report-summary-icon report-summary-icon-experiment">
              <FlaskConical
                size={23}
              />
            </div>

            <div>
              <span>
                Experiments
              </span>

              <strong>
                {summary.experimentCount}
              </strong>
            </div>
          </article>

          <article className="report-summary-card">
            <div className="report-summary-icon report-summary-icon-allocation">
              <ClipboardList
                size={23}
              />
            </div>

            <div>
              <span>
                Allocation Plans
              </span>

              <strong>
                {summary.allocationCount}
              </strong>
            </div>
          </article>

          <article className="report-summary-card">
            <div className="report-summary-icon report-summary-icon-phase">
              <Layers3 size={23} />
            </div>

            <div>
              <span>
                Experiment Phases
              </span>

              <strong>
                {summary.phaseCount}
              </strong>
            </div>
          </article>

          <article className="report-summary-card">
            <div className="report-summary-icon report-summary-icon-schedule">
              <CalendarDays
                size={23}
              />
            </div>

            <div>
              <span>
                Schedules
              </span>

              <strong>
                {summary.scheduleCount}
              </strong>
            </div>
          </article>

          <article className="report-summary-card">
            <div className="report-summary-icon report-summary-icon-conflict">
              <AlertTriangle
                size={23}
              />
            </div>

            <div>
              <span>
                Conflicts
              </span>

              <strong>
                {summary.conflictCount}
              </strong>
            </div>
          </article>
        </section>

        <section className="report-section">
          <div className="report-section-heading">
            <div className="report-section-heading-icon">
              <ClipboardList
                size={21}
              />
            </div>

            <div>
              <h2>
                Allocation Report
              </h2>

              <p>
                Approval status of resource
                allocation plans.
              </p>
            </div>
          </div>

          <div className="report-status-grid">
            <article className="report-status-card">
              <CheckCircle2
                size={21}
                className="report-status-approved"
              />

              <div>
                <span>
                  Approved
                </span>

                <strong>
                  {summary.approvedAllocations}
                </strong>
              </div>
            </article>

            <article className="report-status-card">
              <CalendarDays
                size={21}
                className="report-status-pending"
              />

              <div>
                <span>
                  Pending
                </span>

                <strong>
                  {summary.pendingAllocations}
                </strong>
              </div>
            </article>

            <article className="report-status-card">
              <XCircle
                size={21}
                className="report-status-rejected"
              />

              <div>
                <span>
                  Rejected
                </span>

                <strong>
                  {summary.rejectedAllocations}
                </strong>
              </div>
            </article>
          </div>

          <div className="report-progress-block">
            <div className="report-progress-heading">
              <span>
                Allocation approval rate
              </span>

              <strong>
                {summary.allocationApprovalRate}%
              </strong>
            </div>

            <div className="report-progress-track">
              <div
                className="report-progress-value"
                style={{
                  width: `${summary.allocationApprovalRate}%`,
                }}
              />
            </div>
          </div>
        </section>

        <div className="report-two-column-grid">
          <section className="report-section">
            <div className="report-section-heading">
              <div className="report-section-heading-icon">
                <Layers3 size={21} />
              </div>

              <div>
                <h2>
                  Phase Progress
                </h2>

                <p>
                  Current progress of
                  experiment phases.
                </p>
              </div>
            </div>

            <div className="report-breakdown-list">
              <div>
                <span>
                  Planned
                </span>

                <strong>
                  {summary.plannedPhases}
                </strong>
              </div>

              <div>
                <span>
                  In Progress
                </span>

                <strong>
                  {summary.inProgressPhases}
                </strong>
              </div>

              <div>
                <span>
                  Completed
                </span>

                <strong>
                  {summary.completedPhases}
                </strong>
              </div>
            </div>

            <div className="report-progress-block">
              <div className="report-progress-heading">
                <span>
                  Phase completion rate
                </span>

                <strong>
                  {summary.phaseCompletionRate}%
                </strong>
              </div>

              <div className="report-progress-track">
                <div
                  className="report-progress-value"
                  style={{
                    width: `${summary.phaseCompletionRate}%`,
                  }}
                />
              </div>
            </div>
          </section>

          <section className="report-section">
            <div className="report-section-heading">
              <div className="report-section-heading-icon">
                <CalendarDays
                  size={21}
                />
              </div>

              <div>
                <h2>
                  Schedule Progress
                </h2>

                <p>
                  Current schedule status
                  distribution.
                </p>
              </div>
            </div>

            <div className="report-breakdown-list">
              <div>
                <span>
                  Planned
                </span>

                <strong>
                  {summary.plannedSchedules}
                </strong>
              </div>

              <div>
                <span>
                  In Progress
                </span>

                <strong>
                  {summary.inProgressSchedules}
                </strong>
              </div>

              <div>
                <span>
                  Completed
                </span>

                <strong>
                  {summary.completedSchedules}
                </strong>
              </div>

              <div>
                <span>
                  Cancelled
                </span>

                <strong>
                  {summary.cancelledSchedules}
                </strong>
              </div>
            </div>

            <div className="report-progress-block">
              <div className="report-progress-heading">
                <span>
                  Schedule completion rate
                </span>

                <strong>
                  {summary.scheduleCompletionRate}%
                </strong>
              </div>

              <div className="report-progress-track">
                <div
                  className="report-progress-value"
                  style={{
                    width: `${summary.scheduleCompletionRate}%`,
                  }}
                />
              </div>
            </div>
          </section>
        </div>

        <section className="report-section">
          <div className="report-section-heading">
            <div className="report-section-heading-icon report-section-conflict-icon">
              <AlertTriangle
                size={21}
              />
            </div>

            <div>
              <h2>
                Conflict Report
              </h2>

              <p>
                Severity distribution of
                detected schedule conflicts.
              </p>
            </div>
          </div>

          <div className="report-conflict-grid">
            <article className="report-conflict-card report-conflict-high">
              <span>
                High Severity
              </span>

              <strong>
                {summary.highConflicts}
              </strong>
            </article>

            <article className="report-conflict-card report-conflict-medium">
              <span>
                Medium Severity
              </span>

              <strong>
                {summary.mediumConflicts}
              </strong>
            </article>

            <article className="report-conflict-card report-conflict-low">
              <span>
                Low Severity
              </span>

              <strong>
                {summary.lowConflicts}
              </strong>
            </article>
          </div>
        </section>

        <section className="report-notice">
          <BarChart3 size={21} />

          <div>
            <h3>
              Report calculation
            </h3>

            <p>
              This report is calculated
              from the latest data returned
              by the Experiment, Allocation,
              Experiment Phase and Schedule
              APIs. Conflict statistics are
              calculated from overlapping
              active schedules.
            </p>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}