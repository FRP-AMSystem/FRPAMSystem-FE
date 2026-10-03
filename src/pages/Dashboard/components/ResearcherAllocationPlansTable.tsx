import React, { useState } from "react";
import { Eye, Sparkles, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { AllocationPlan, AllocationPlanStatus } from "../../../types/allocationPlan";
import Pagination from "../../../components/Pagination";

interface ResearcherAllocationPlansTableProps {
  plans: AllocationPlan[];
}

function formatFitnessScore(value?: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "0/100";
  }
  const score = value <= 1 ? value * 100 : value;
  const formattedScore = Math.min(100, Math.max(0, score)).toFixed(score % 1 === 0 ? 0 : 1);
  return `${formattedScore}/100`;
}

function formatDate(val?: string | null): string {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
}

function getStatusBadge(status: AllocationPlanStatus) {
  const s = String(status || "").toLowerCase();
  switch (s) {
    case "approved":
      return (
        <span className="plan-status-pill plan-status-approved">
          <CheckCircle2 size={11} style={{ marginRight: 4 }} />
          Approved
        </span>
      );
    case "pending":
    case "submitted":
      return (
        <span className="plan-status-pill plan-status-pending">
          <Clock size={11} style={{ marginRight: 4 }} />
          Pending Approval
        </span>
      );
    case "rejected":
      return (
        <span className="plan-status-pill plan-status-rejected">
          <AlertCircle size={11} style={{ marginRight: 4 }} />
          Rejected
        </span>
      );
    case "planning":
      return <span className="plan-status-pill plan-status-planning">Planning</span>;
    case "running":
    case "inprogress":
      return <span className="plan-status-pill plan-status-running">Running</span>;
    case "completed":
      return <span className="plan-status-pill plan-status-completed">Completed</span>;
    default:
      return <span className="plan-status-pill plan-status-draft">Draft</span>;
  }
}

export const ResearcherAllocationPlansTable: React.FC<ResearcherAllocationPlansTableProps> = ({
  plans,
}) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(8);

  const sortedPlans = [...plans].sort((a, b) => {
    const t1 = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const t2 = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return t2 - t1;
  });

  const paginatedPlans = sortedPlans.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="request-table-card">
      <div className="request-table-header">
        <div>
          <h3>My Allocation Plans & Approvals</h3>
          <p>Real-time status of resource allocation requests and manager approvals</p>
        </div>
        <div className="request-table-summary">
          <span>{plans.length} {plans.length === 1 ? "Plan" : "Plans"}</span>
        </div>
      </div>

      <div className="request-table-wrapper">
        <table className="request-table">
          <thead>
            <tr>
              <th>Plan / Experiment</th>
              <th>Fitness Match</th>
              <th>Approval Status</th>
              <th>Created Date</th>
              <th>Resources Allocated</th>
              <th>Schedules</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPlans.length === 0 ? (
              <tr>
                <td colSpan={7} className="request-table-empty">
                  No allocation plans found for your experiments.
                </td>
              </tr>
            ) : (
              paginatedPlans.map((plan) => {
                const isRejected = (plan.approveStatus || "").toLowerCase() === "rejected";
                const resourceTotal =
                  (plan.equipmentDetailCount ?? 0) +
                  (plan.humanDetailCount ?? 0) +
                  (plan.landDetailCount ?? 0);

                return (
                  <tr
                    key={plan.allocationPlanId}
                    style={{ background: isRejected ? "#fffdfd" : undefined }}
                  >
                    <td>
                      <div className="request-experiment-cell">
                        <strong
                          style={{ cursor: "pointer", color: "#16a34a" }}
                          onClick={() => navigate(`/allocation/${plan.allocationPlanId}`)}
                        >
                          {plan.experimentName || `Experiment #${plan.experimentId}`}
                        </strong>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>
                          Plan #{plan.allocationPlanId}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className="request-fitness">
                        {formatFitnessScore(plan.fitnessScore)}
                      </span>
                    </td>

                    <td>
                      {getStatusBadge(plan.approveStatus)}
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
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          type="button"
                          className="action-btn-pill view"
                          onClick={() => navigate(`/allocation/${plan.allocationPlanId}`)}
                          title="View Details"
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>

                        {isRejected && (
                          <button
                            type="button"
                            className="action-btn-pill"
                            style={{ background: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca" }}
                            onClick={() => navigate(`/experiments/${plan.experimentId}/ai-suggestions`)}
                            title="Re-optimize Allocation"
                          >
                            <Sparkles size={12} />
                            <span>Re-optimize</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {sortedPlans.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={sortedPlans.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[8, 15, 30]}
        />
      )}
    </div>
  );
};
