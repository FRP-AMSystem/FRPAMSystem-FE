import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

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

import {
  getPermissions,
  getStoredRole,
  type Role,
} from "../../config/rolePermissions";

type StatusFilter =
  | "All"
  | AllocationPlanStatus;

const statusOptions: StatusFilter[] = [
  "All",
  "Draft",
  "Pending",
  "Approved",
  "Rejected",
  "Cancelled",
];

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
      return "Review pending allocation plans and approve or reject them.";
    case "Researcher":
      return "Create draft allocation plans, add resources, submit them for approval, and cancel pending plans when necessary.";
    case "Technician":
      return "View allocation information related to equipment and schedules.";
    case "Seasonal":
      return "View assigned experiments, schedules, and allocation results.";

    default:
      return "View allocation plans.";
  }
}

export default function AllocationList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const role = getStoredRole();
  const permission = getPermissions(role);

  const experimentIdFromUrl =
    searchParams.get("experimentId");

  const selectedExperimentId = useMemo(() => {
    if (!experimentIdFromUrl) {
      return undefined;
    }

    const parsedId = Number(experimentIdFromUrl);

    return Number.isInteger(parsedId) && parsedId > 0
      ? parsedId
      : undefined;
  }, [experimentIdFromUrl]);

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

      const data = await getAllocationPlans({
        experimentId: selectedExperimentId,
        page: 1,
        size: 100,
      });

      setPlans(data);
    } catch (fetchError) {
      console.error("Failed to fetch allocation plans:", fetchError);
      setPlans([]);
      setError("Unable to load allocation plans. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedExperimentId]);

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
      permission.canDeleteAllocation && plan.approveStatus === "Draft";

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
    if (!permission.canApproveAllocation || plan.approveStatus !== "Pending") return;

    await runPlanAction(
      plan.allocationPlanId,
      () => approveAllocationPlan(plan.allocationPlanId),
      "Unable to approve the allocation plan."
    );
  };

  const handleReject = async (plan: AllocationPlan) => {
    if (!permission.canRejectAllocation || plan.approveStatus !== "Pending") return;

    await runPlanAction(
      plan.allocationPlanId,
      () => rejectAllocationPlan(plan.allocationPlanId),
      "Unable to reject the allocation plan."
    );
  };

  const handleCancel = async (plan: AllocationPlan) => {
    if (!permission.canCancelAllocation || plan.approveStatus !== "Pending") return;

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
            <h1>
              {selectedExperimentId
                ? "Experiment Allocation"
                : "Allocation Plans"}
            </h1>

            <p>
              {selectedExperimentId
                ? `Allocation plans for Experiment #${selectedExperimentId}. ${getPageDescription(role)}`
                : getPageDescription(role)}
            </p>
          </div>

          {permission.canCreateAllocation && (
            <button
              type="button"
              className="primary-btn"
              onClick={() =>
                navigate(
                  selectedExperimentId
                    ? `/allocation/create?experimentId=${selectedExperimentId}`
                    : "/allocation/create"
                )
              }
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

                    const canEditPlan = permission.canEditAllocation && isDraft;
                    const canDeletePlan = permission.canDeleteAllocation && isDraft;
                    const canApprovePlan = permission.canApproveAllocation && isPending;
                    const canRejectPlan = permission.canRejectAllocation && isPending;
                    const canCancelPlan = permission.canCancelAllocation && isPending;

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
                            {permission.canViewAllocations && (
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
