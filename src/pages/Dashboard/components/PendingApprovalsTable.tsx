import { useNavigate } from "react-router-dom";
import { Sparkles, Clock, CheckCircle, ArrowRight, FileText } from "lucide-react";
import type { AllocationPlan } from "../../../types/allocationPlan";

interface PendingApprovalsTableProps {
  plans: AllocationPlan[];
}

export default function PendingApprovalsTable({
  plans,
}: PendingApprovalsTableProps) {
  const navigate = useNavigate();
  const pendingPlans = plans.filter((p) => p.approveStatus === "Pending");

  const normalizeFitnessScore = (score?: number | null) => {
    if (score === null || score === undefined || !Number.isFinite(score)) return 0;
    const p = score <= 1 ? score * 100 : score;
    return Math.min(100, Math.max(0, Math.round(p)));
  };

  return (
    <div className="dashboard-card">
      {/* Header */}
      <div className="dashboard-card-header">
        <div className="card-title-group">
          <div className="card-title-icon icon-purple-soft">
            <Clock size={18} />
          </div>
          <div>
            <h3 className="dashboard-card-title">
              Pending Allocation Approval Queue
            </h3>
            <p className="dashboard-card-subtitle">
              Plans submitted by researchers awaiting Manager evaluation and sign-off
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/allocation?status=Pending")}
          style={{
            border: "none",
            background: "none",
            color: "#16a34a",
            fontWeight: 700,
            fontSize: "12px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span>View All Pending ({pendingPlans.length})</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table className="dashboard-data-table">
          <thead>
            <tr>
              <th>Plan / Experiment</th>
              <th>Submitted By</th>
              <th>Submission Date</th>
              <th>AI Fitness Score</th>
              <th>Requested Resources</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {pendingPlans.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <CheckCircle size={32} style={{ color: "#16a34a" }} />
                    <strong style={{ color: "#0f172a" }}>All Caught Up!</strong>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      No pending allocation plans currently require approval.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              pendingPlans.slice(0, 5).map((plan) => {
                const score = normalizeFitnessScore(plan.fitnessScore);
                const createdDate = plan.createdAt
                  ? new Date(plan.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—";

                return (
                  <tr key={plan.allocationPlanId}>
                    {/* Plan Name */}
                    <td>
                      <div style={{ fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
                        <FileText size={14} style={{ color: "#2563eb" }} />
                        <span>Plan #{plan.allocationPlanId}</span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        {plan.experimentName || `Experiment #${plan.experimentId}`}
                      </div>
                    </td>

                    {/* Submitted By */}
                    <td style={{ fontWeight: 600, color: "#334155" }}>
                      {plan.createdByName || `User #${plan.createdBy}`}
                    </td>

                    {/* Date */}
                    <td style={{ color: "#64748b" }}>
                      {createdDate}
                    </td>

                    {/* AI Score */}
                    <td>
                      <span
                        className="kpi-badge badge-info"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: "11px",
                          padding: "3px 8px",
                          background: "#faf5ff",
                          color: "#7e22ce",
                          borderColor: "#e9d5ff",
                        }}
                      >
                        <Sparkles size={12} />
                        {score}% Match
                      </span>
                    </td>

                    {/* Resource Counts */}
                    <td>
                      <div style={{ display: "flex", gap: 6, fontSize: "11px" }}>
                        <span style={{ padding: "2px 6px", background: "#eff6ff", color: "#2563eb", borderRadius: 4, fontWeight: 600 }}>
                          {plan.equipmentDetailCount ?? 0} Mach
                        </span>
                        <span style={{ padding: "2px 6px", background: "#f0fdf4", color: "#16a34a", borderRadius: 4, fontWeight: 600 }}>
                          {plan.humanDetailCount ?? 0} Staff
                        </span>
                        <span style={{ padding: "2px 6px", background: "#fffbeb", color: "#d97706", borderRadius: 4, fontWeight: 600 }}>
                          {plan.landDetailCount ?? 0} Plots
                        </span>
                      </div>
                    </td>

                    {/* Action */}
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => navigate(`/allocation?highlightPlanId=${plan.allocationPlanId}`)}
                        className="dashboard-btn-primary"
                        style={{ padding: "5px 12px", fontSize: "11px" }}
                      >
                        Review Plan
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
