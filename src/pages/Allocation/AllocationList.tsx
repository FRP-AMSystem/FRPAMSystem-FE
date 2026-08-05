import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  approveAllocationPlan,
  cancelAllocationPlan,
  deleteAllocationPlan,
  getAllocationPlans,
  rejectAllocationPlan,
} from "../../services/allocationPlanService";
import type {
  AllocationPlan,
  AllocationPlanStatus,
} from "../../types/allocationPlan";

import "./AllocationList.css";

type Role = "Manager" | "Researcher" | "Technician" | "Student";
type StatusFilter = "All" | AllocationPlanStatus;

type RolePermission = {
  canCreate: boolean;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
};

const permissions: Record<Role, RolePermission> = {
  Manager: {
    canCreate: false,
    canView: true,
    canEdit: false,
    canDelete: false,
    canApprove: true,
    canReject: true,
    canCancel: true,
  },
  Researcher: {
    canCreate: true,
    canView: true,
    canEdit: true,
    canDelete: true,
    canApprove: false,
    canReject: false,
    canCancel: false,
  },
  Technician: {
    canCreate: false,
    canView: true,
    canEdit: false,
    canDelete: false,
    canApprove: false,
    canReject: false,
    canCancel: false,
  },
  Student: {
    canCreate: false,
    canView: true,
    canEdit: false,
    canDelete: false,
    canApprove: false,
    canReject: false,
    canCancel: false,
  },
};

const statusOptions: StatusFilter[] = [
  "All",
  "Draft",
  "Pending",
  "Approved",
  "Rejected",
  "Cancelled",
];

function getStoredRole(): Role {
  const storedRole = localStorage.getItem("role");

  if (
    storedRole === "Manager" ||
    storedRole === "Researcher" ||
    storedRole === "Technician" ||
    storedRole === "Student"
  ) {
    return storedRole;
  }

  return "Student";
}

function formatDate(date?: string | null): string {
  if (!date) return "-";

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "-";

  return parsedDate.toLocaleDateString("vi-VN");
}

function formatFitnessScore(score: number | null): string {
  if (score === null || !Number.isFinite(score)) return "-";
  return `${score}%`;
}

function getPageDescription(role: Role): string {
  switch (role) {
    case "Manager":
      return "Review pending allocation plans and approve, reject, or cancel them.";
    case "Researcher":
      return "Create draft allocation plans, add resources, and track approval status.";
    case "Technician":
      return "View allocation information related to equipment and schedules.";
    case "Student":
      return "View assigned experiments, schedules, and allocation results.";
  }
}

export default function AllocationList() {
  const navigate = useNavigate();

  const role = getStoredRole();
  const permission = permissions[role];

  const [plans, setPlans] = useState<AllocationPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAllocationPlans();
      setPlans(data);
    } catch (fetchError) {
      console.error("Failed to fetch allocation plans:", fetchError);
      setPlans([]);
      setError("Unable to load allocation plans. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPlans();
  }, [fetchPlans]);

  const filteredPlans = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return plans.filter((plan) => {
      const matchesSearch =
        !normalizedSearchTerm ||
        plan.experimentName?.toLowerCase().includes(normalizedSearchTerm);

      const matchesStatus =
        statusFilter === "All" || plan.approveStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [plans, searchTerm, statusFilter]);

  const runPlanAction = async (
    id: number,
    action: () => Promise<unknown>,
    fallbackMessage: string
  ) => {
    try {
      setProcessingId(id);
      setError("");
      await action();
      await fetchPlans();
    } catch (actionError) {
      console.error(fallbackMessage, actionError);
      setError(fallbackMessage);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (plan: AllocationPlan) => {
    const canDeletePlan =
      permission.canDelete && plan.approveStatus === "Draft";

    if (!canDeletePlan) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this draft allocation plan?"
    );

    if (!confirmed) return;

    await runPlanAction(
      plan.allocationPlanId,
      () => deleteAllocationPlan(plan.allocationPlanId),
      "Unable to delete the allocation plan."
    );
  };

  const handleApprove = async (plan: AllocationPlan) => {
    if (!permission.canApprove || plan.approveStatus !== "Pending") return;

    await runPlanAction(
      plan.allocationPlanId,
      () => approveAllocationPlan(plan.allocationPlanId),
      "Unable to approve the allocation plan."
    );
  };

  const handleReject = async (plan: AllocationPlan) => {
    if (!permission.canReject || plan.approveStatus !== "Pending") return;

    await runPlanAction(
      plan.allocationPlanId,
      () => rejectAllocationPlan(plan.allocationPlanId),
      "Unable to reject the allocation plan."
    );
  };

  const handleCancel = async (plan: AllocationPlan) => {
    if (!permission.canCancel || plan.approveStatus !== "Pending") return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this allocation plan?"
    );

    if (!confirmed) return;

    await runPlanAction(
      plan.allocationPlanId,
      () => cancelAllocationPlan(plan.allocationPlanId),
      "Unable to cancel the allocation plan."
    );
  };

  return (
    <DashboardLayout>
      <div className="allocation-page">
        <div className="allocation-header">
          <div>
            <h1>Allocation Plans</h1>
            <p>{getPageDescription(role)}</p>
          </div>

          {permission.canCreate && (
            <button
              type="button"
              className="primary-btn"
              onClick={() => navigate("/allocation/create")}
            >
              + Create Plan
            </button>
          )}
        </div>

        <div className="allocation-toolbar">
          <input
            type="text"
            placeholder="Search experiment name..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status === "All" ? "All Status" : status}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="table-message">{error}</p>}

        <div className="allocation-table-card">
          {loading ? (
            <p className="table-message">Loading allocation plans...</p>
          ) : (
            <table className="allocation-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Experiment</th>
                  <th>Fitness</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th>Created Date</th>
                  <th>Resources</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-table">
                      No allocation plans found.
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map((plan) => {
                    const isProcessing = processingId === plan.allocationPlanId;
                    const isDraft = plan.approveStatus === "Draft";
                    const isPending = plan.approveStatus === "Pending";

                    const canEditPlan = permission.canEdit && isDraft;
                    const canDeletePlan = permission.canDelete && isDraft;
                    const canApprovePlan = permission.canApprove && isPending;
                    const canRejectPlan = permission.canReject && isPending;
                    const canCancelPlan = permission.canCancel && isPending;

                    return (
                      <tr key={plan.allocationPlanId}>
                        <td>#{plan.allocationPlanId}</td>
                        <td>{plan.experimentName || "-"}</td>
                        <td>{formatFitnessScore(plan.fitnessScore)}</td>
                        <td>
                          <span
                            className={`status-badge status-${plan.approveStatus.toLowerCase()}`}
                          >
                            {plan.approveStatus}
                          </span>
                        </td>
                        <td>{plan.createdByName || "-"}</td>
                        <td>{formatDate(plan.createdAt)}</td>
                        <td>
                          Land: {plan.landDetailCount ?? 0} | Equipment:{" "}
                          {plan.equipmentDetailCount ?? 0} | Human:{" "}
                          {plan.humanDetailCount ?? 0} | Schedule:{" "}
                          {plan.scheduleCount ?? 0}
                        </td>
                        <td>
                          <div className="action-group">
                            {permission.canView && (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() =>
                                  navigate(`/allocation/${plan.allocationPlanId}`)
                                }
                              >
                                View
                              </button>
                            )}

                            {canEditPlan && (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() =>
                                  navigate(
                                    `/allocation/${plan.allocationPlanId}/edit`
                                  )
                                }
                              >
                                Edit
                              </button>
                            )}

                            {canApprovePlan && (
                              <button
                                type="button"
                                className="success-btn"
                                disabled={isProcessing}
                                onClick={() => void handleApprove(plan)}
                              >
                                {isProcessing ? "Processing..." : "Approve"}
                              </button>
                            )}

                            {canRejectPlan && (
                              <button
                                type="button"
                                className="warning-btn"
                                disabled={isProcessing}
                                onClick={() => void handleReject(plan)}
                              >
                                {isProcessing ? "Processing..." : "Reject"}
                              </button>
                            )}

                            {canCancelPlan && (
                              <button
                                type="button"
                                className="secondary-btn"
                                disabled={isProcessing}
                                onClick={() => void handleCancel(plan)}
                              >
                                {isProcessing ? "Processing..." : "Cancel"}
                              </button>
                            )}

                            {canDeletePlan && (
                              <button
                                type="button"
                                className="danger-btn"
                                disabled={isProcessing}
                                onClick={() => void handleDelete(plan)}
                              >
                                {isProcessing ? "Deleting..." : "Delete"}
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
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
