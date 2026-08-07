import {
  Eye,
  ListChecks,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import type {
  AllocationPlan,
  AllocationPlanStatus,
} from "../../../types/allocationPlan";

import "./RequestTable.css";

interface RequestTableProps {
  requests: AllocationPlan[];
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("vi-VN");
}

function formatFitnessScore(value?: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  const percentage = value <= 1 ? value * 100 : value;

  return `${Math.min(100, Math.max(0, percentage)).toFixed(
    percentage % 1 === 0 ? 0 : 1
  )}%`;
}

function getStatusLabel(status: AllocationPlanStatus): string {
  return status;
}

function getStatusClassName(status: AllocationPlanStatus): string {
  return [
    "request-status-badge",
    `request-status-${status.toLowerCase()}`,
  ].join(" ");
}

function getResourceTotal(plan: AllocationPlan): number {
  return (
    (plan.equipmentDetailCount ?? 0) +
    (plan.humanDetailCount ?? 0) +
    (plan.landDetailCount ?? 0)
  );
}

export default function RequestTable({ requests }: RequestTableProps) {
  const navigate = useNavigate();

  const openDetail = (allocationPlanId: number) => {
    navigate(`/allocation/${allocationPlanId}`);
  };

  return (
    <section className="request-table-card">
      <div className="request-table-header">
        <div>
          <h3>Recent Allocation Plans</h3>
          <p>Latest allocation plans and approval status</p>
        </div>

        <div className="request-table-summary">
          <ListChecks size={18} />
          <span>
            {requests.length} {requests.length === 1 ? "plan" : "plans"}
          </span>
        </div>
      </div>

      <div className="request-table-wrapper">
        <table className="request-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Experiment</th>
              <th>Fitness</th>
              <th>Created By</th>
              <th>Status</th>
              <th>Created</th>
              <th>Resources</th>
              <th>Schedules</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={9} className="request-table-empty">
                  No allocation plans found.
                </td>
              </tr>
            ) : (
              requests.map((plan) => {
                const resourceTotal = getResourceTotal(plan);

                return (
                  <tr key={plan.allocationPlanId}>
                    <td>
                      <button
                        type="button"
                        className="request-id-button"
                        onClick={() => openDetail(plan.allocationPlanId)}
                      >
                        #{plan.allocationPlanId}
                      </button>
                    </td>

                    <td>
                      <div className="request-experiment-cell">
                        <strong>
                          {plan.experimentName ||
                            `Experiment #${plan.experimentId}`}
                        </strong>
                        <span>Experiment #{plan.experimentId}</span>
                      </div>
                    </td>

                    <td>
                      <span className="request-fitness">
                        {formatFitnessScore(plan.fitnessScore)}
                      </span>
                    </td>

                    <td>
                      <div className="request-user-cell">
                        <span>
                          {plan.createdByName ||
                            `User #${plan.createdBy ?? "-"}`}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className={getStatusClassName(plan.approveStatus)}>
                        {getStatusLabel(plan.approveStatus)}
                      </span>
                    </td>

                    <td>{formatDate(plan.createdAt)}</td>

                    <td>
                      <span className="request-count-badge">
                        {resourceTotal} items
                      </span>
                    </td>

                    <td>
                      <span className="request-count-badge">
                        {plan.scheduleCount ?? 0} schedules
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="action-btn-pill view"
                        onClick={() => openDetail(plan.allocationPlanId)}
                        title="View Details"
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}