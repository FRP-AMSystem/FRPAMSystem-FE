import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import DashboardLayout from "../../layouts/DashboardLayout";

import AddEquipmentResourceForm from "./AddEquipmentResourceForm";
import AddHumanResourceForm from "./AddHumanResourceForm";
import AddLandResourceForm from "./AddLandResourceForm";

import type {
  AllocationPlan,
} from "../../types/allocationPlan";

import type {
  AllocationEquipmentDetail,
} from "../../types/allocationDetail";

import type {
  AllocationHumanDetail,
} from "../../types/allocationHumanDetail";

import type {
  AllocationLandDetail,
} from "../../types/allocationLand";

import {
  approveAllocationPlan,
  cancelAllocationPlan,
  getAllocationPlanById,
  rejectAllocationPlan,
  submitAllocationPlan,
} from "../../services/allocationPlanService";

import {
  deleteAllocationEquipmentDetail,
  deleteAllocationHumanDetail,
  deleteAllocationLandDetail,
  getAllocationEquipmentDetails,
  getAllocationHumanDetails,
  getAllocationLandDetails,
} from "../../services/allocationDetailService";

import {
  getPermissions,
  getStoredRole,
} from "../../config/rolePermissions";

import "./AllocationDetail.css";

type ResourceTab =
  | "equipment"
  | "human"
  | "land";

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
            errors?: Record<string, string[]>;
          };
        };
      }
    ).response;

    if (response?.data?.message) {
      return response.data.message;
    }

    if (response?.data?.title) {
      return response.data.title;
    }

    if (response?.data?.errors) {
      return Object.values(
        response.data.errors
      )
        .flat()
        .join(" ");
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

function formatDate(
  value?: string | null
): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("vi-VN");
}

function formatDateTime(
  value?: string | null
): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN");
}

function formatFitnessScore(
  value?: number | null
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "Not set";
  }

  return `${value}%`;
}

function formatEfficiencyRate(
  value?: number | null
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "-";
  }

  const percentage =
    value <= 1 ? value * 100 : value;

  return `${Number(
    percentage.toFixed(2)
  )}%`;
}

function getEquipmentDetailId(
  detail: AllocationEquipmentDetail
): number {
  return detail.allocationEquipmentDetailId;
}

function getHumanDetailId(
  detail: AllocationHumanDetail
): number {
  return detail.allocationHumanDetailId;
}

function getLandDetailId(
  detail: AllocationLandDetail
): number {
  return detail.allocationLandDetailId;
}

export default function AllocationDetail() {
  const navigate = useNavigate();

  const { id } = useParams<{
    id: string;
  }>();

  const allocationPlanId = Number(id);

  const role =
    getStoredRole();

  const permission =
    getPermissions(role);

  const [plan, setPlan] =
    useState<AllocationPlan | null>(null);

  const [
    equipmentDetails,
    setEquipmentDetails,
  ] = useState<
    AllocationEquipmentDetail[]
  >([]);

  const [
    humanDetails,
    setHumanDetails,
  ] = useState<
    AllocationHumanDetail[]
  >([]);

  const [
    landDetails,
    setLandDetails,
  ] = useState<
    AllocationLandDetail[]
  >([]);

  const [
    activeTab,
    setActiveTab,
  ] = useState<ResourceTab>(
    "equipment"
  );

  const [
    showEquipmentForm,
    setShowEquipmentForm,
  ] = useState(false);

  const [
    showHumanForm,
    setShowHumanForm,
  ] = useState(false);

  const [
    showLandForm,
    setShowLandForm,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const [
    deletingResourceId,
    setDeletingResourceId,
  ] = useState<string | null>(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadAllocationDetail =
    useCallback(async () => {
      if (
        !Number.isInteger(allocationPlanId) ||
        allocationPlanId <= 0
      ) {
        setError(
          "Allocation plan ID is invalid."
        );

        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [
          allocationPlan,
          equipmentData,
          humanData,
          landData,
        ] = await Promise.all([
          getAllocationPlanById(
            allocationPlanId
          ),

          getAllocationEquipmentDetails({
            allocationPlanId,
            page: 1,
            size: 100,
          }),

          getAllocationHumanDetails({
            allocationPlanId,
            page: 1,
            size: 100,
          }),

          getAllocationLandDetails({
            allocationPlanId,
            page: 1,
            size: 100,
          }),
        ]);

        setPlan(allocationPlan);

        setEquipmentDetails(
          Array.isArray(equipmentData)
            ? equipmentData
            : []
        );

        setHumanDetails(
          Array.isArray(humanData)
            ? humanData
            : []
        );

        setLandDetails(
          Array.isArray(landData)
            ? landData
            : []
        );
      } catch (loadError) {
        console.error(
          "Failed to load allocation detail:",
          loadError
        );

        setError(
          getErrorMessage(loadError)
        );
      } finally {
        setLoading(false);
      }
    }, [allocationPlanId]);

  useEffect(() => {
    void loadAllocationDetail();
  }, [loadAllocationDetail]);

  const isDraft =
    plan?.approveStatus === "Draft";

  const isPending =
    plan?.approveStatus === "Pending";

  const isApproved =
    plan?.approveStatus === "Approved";

  const isRejected =
    plan?.approveStatus === "Rejected";

  const isCancelled =
    plan?.approveStatus === "Cancelled";

  const actualEquipmentCount =
    equipmentDetails.length;

  const actualHumanCount =
    humanDetails.length;

  const actualLandCount =
    landDetails.length;

  const totalResources = useMemo(
    () =>
      actualEquipmentCount +
      actualHumanCount +
      actualLandCount,
    [
      actualEquipmentCount,
      actualHumanCount,
      actualLandCount,
    ]
  );

  const canEditPlan =
    permission.canEditAllocation &&
    Boolean(isDraft);

  const canManageResources =
    permission.canEditAllocation &&
    Boolean(isDraft);

  const canSubmit =
    permission.canSubmitAllocation &&
    Boolean(isDraft) &&
    totalResources > 0;

  const canApprove =
    permission.canApproveAllocation &&
    Boolean(isPending);

  const canReject =
    permission.canRejectAllocation &&
    Boolean(isPending);

  const canCancel =
    permission.canCancelAllocation &&
    Boolean(
      isDraft ||
      isPending
    );

  const clearMessages = () => {
    setError("");
    setSuccessMessage("");
  };

  const closeAllResourceForms = () => {
    setShowEquipmentForm(false);
    setShowHumanForm(false);
    setShowLandForm(false);
  };

  const handleEquipmentFormToggle = () => {
    clearMessages();

    setShowHumanForm(false);
    setShowLandForm(false);

    setShowEquipmentForm(
      (current) => !current
    );
  };

  const handleHumanFormToggle = () => {
    clearMessages();

    setShowEquipmentForm(false);
    setShowLandForm(false);

    setShowHumanForm(
      (current) => !current
    );
  };

  const handleLandFormToggle = () => {
    clearMessages();

    setShowEquipmentForm(false);
    setShowHumanForm(false);

    setShowLandForm(
      (current) => !current
    );
  };

  const handleTabChange = (
    tab: ResourceTab
  ) => {
    setActiveTab(tab);
    closeAllResourceForms();
    clearMessages();
  };

  const handleEquipmentCreated =
    async () => {
      setShowEquipmentForm(false);

      setSuccessMessage(
        "Equipment resource added successfully."
      );

      await loadAllocationDetail();
    };

  const handleHumanCreated =
    async () => {
      setShowHumanForm(false);

      setSuccessMessage(
        "Human resource added successfully."
      );

      await loadAllocationDetail();
    };

  const handleLandCreated =
    async () => {
      setShowLandForm(false);

      setSuccessMessage(
        "Land resource added successfully."
      );

      await loadAllocationDetail();
    };

  const handleSubmitAllocation =
    async () => {
      if (
        !plan ||
        !canSubmit ||
        actionLoading
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "Submit this allocation plan for manager approval?"
        );

      if (!confirmed) {
        return;
      }

      try {
        clearMessages();
        setActionLoading(true);

        await submitAllocationPlan(
          plan.allocationPlanId
        );

        setSuccessMessage(
          "Allocation submitted successfully."
        );

        await loadAllocationDetail();
      } catch (submitError) {
        console.error(
          "Submit allocation failed:",
          submitError
        );

        setError(
          getErrorMessage(submitError)
        );
      } finally {
        setActionLoading(false);
      }
    };

  const handleApprove = async () => {
    if (
      !plan ||
      !canApprove ||
      actionLoading
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Approve this allocation plan?"
      );

    if (!confirmed) {
      return;
    }

    try {
      clearMessages();
      setActionLoading(true);

      await approveAllocationPlan(
        plan.allocationPlanId
      );

      setSuccessMessage(
        "Allocation plan approved successfully."
      );

      await loadAllocationDetail();
    } catch (approveError) {
      console.error(
        "Approve allocation failed:",
        approveError
      );

      setError(
        getErrorMessage(approveError)
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (
      !plan ||
      !canReject ||
      actionLoading
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Reject this allocation plan?"
      );

    if (!confirmed) {
      return;
    }

    try {
      clearMessages();
      setActionLoading(true);

      await rejectAllocationPlan(
        plan.allocationPlanId
      );

      setSuccessMessage(
        "Allocation plan rejected successfully."
      );

      await loadAllocationDetail();
    } catch (rejectError) {
      console.error(
        "Reject allocation failed:",
        rejectError
      );

      setError(
        getErrorMessage(rejectError)
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (
      !plan ||
      !canCancel ||
      actionLoading
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Cancel this allocation plan? This action may not be reversible."
      );

    if (!confirmed) {
      return;
    }

    try {
      clearMessages();
      setActionLoading(true);

      await cancelAllocationPlan(
        plan.allocationPlanId
      );

      setSuccessMessage(
        "Allocation plan cancelled successfully."
      );

      await loadAllocationDetail();
    } catch (cancelError) {
      console.error(
        "Cancel allocation failed:",
        cancelError
      );

      setError(
        getErrorMessage(cancelError)
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEquipment =
    async (
      detail: AllocationEquipmentDetail
    ) => {
      if (
        !canManageResources ||
        deletingResourceId
      ) {
        return;
      }

      const detailId =
        getEquipmentDetailId(detail);

      if (
        !Number.isInteger(detailId) ||
        detailId <= 0
      ) {
        setError(
          "Equipment allocation detail ID is invalid."
        );
        return;
      }

      const confirmed =
        window.confirm(
          "Remove this equipment from the allocation plan?"
        );

      if (!confirmed) {
        return;
      }

      try {
        clearMessages();

        setDeletingResourceId(
          `equipment-${detailId}`
        );

        await deleteAllocationEquipmentDetail(
          detailId
        );

        setSuccessMessage(
          "Equipment allocation removed successfully."
        );

        await loadAllocationDetail();
      } catch (deleteError) {
        console.error(
          "Delete equipment allocation failed:",
          deleteError
        );

        setError(
          getErrorMessage(deleteError)
        );
      } finally {
        setDeletingResourceId(null);
      }
    };

  const handleDeleteHuman =
    async (
      detail: AllocationHumanDetail
    ) => {
      if (
        !canManageResources ||
        deletingResourceId
      ) {
        return;
      }

      const detailId =
        getHumanDetailId(detail);

      if (
        !Number.isInteger(detailId) ||
        detailId <= 0
      ) {
        setError(
          "Human allocation detail ID is invalid."
        );
        return;
      }

      const confirmed =
        window.confirm(
          "Remove this human resource from the allocation plan?"
        );

      if (!confirmed) {
        return;
      }

      try {
        clearMessages();

        setDeletingResourceId(
          `human-${detailId}`
        );

        await deleteAllocationHumanDetail(
          detailId
        );

        setSuccessMessage(
          "Human allocation removed successfully."
        );

        await loadAllocationDetail();
      } catch (deleteError) {
        console.error(
          "Delete human allocation failed:",
          deleteError
        );

        setError(
          getErrorMessage(deleteError)
        );
      } finally {
        setDeletingResourceId(null);
      }
    };

  const handleDeleteLand =
    async (
      detail: AllocationLandDetail
    ) => {
      if (
        !canManageResources ||
        deletingResourceId
      ) {
        return;
      }

      const detailId =
        getLandDetailId(detail);

      if (
        !Number.isInteger(detailId) ||
        detailId <= 0
      ) {
        setError(
          "Land allocation detail ID is invalid."
        );
        return;
      }

      const confirmed =
        window.confirm(
          "Remove this land resource from the allocation plan?"
        );

      if (!confirmed) {
        return;
      }

      try {
        clearMessages();

        setDeletingResourceId(
          `land-${detailId}`
        );

        await deleteAllocationLandDetail(
          detailId
        );

        setSuccessMessage(
          "Land allocation removed successfully."
        );

        await loadAllocationDetail();
      } catch (deleteError) {
        console.error(
          "Delete land allocation failed:",
          deleteError
        );

        setError(
          getErrorMessage(deleteError)
        );
      } finally {
        setDeletingResourceId(null);
      }
    };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="allocation-detail-page">
          <div className="allocation-loading-card">
            Loading allocation information...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!plan) {
    return (
      <DashboardLayout>
        <div className="allocation-detail-page">
          <div className="allocation-empty-state">
            <h1>
              Allocation Plan Not Found
            </h1>

            <p>
              The requested allocation plan
              could not be loaded.
            </p>

            {error && (
              <div className="allocation-alert error">
                {error}
              </div>
            )}

            <button
              type="button"
              className="allocation-button secondary"
              onClick={() =>
                navigate("/allocation")
              }
            >
              Back to Allocation List
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="allocation-detail-page">
        <div className="allocation-detail-header">
          <div>
            <button
              type="button"
              className="allocation-back-button"
              onClick={() =>
                navigate("/allocation")
              }
            >
              ← Back to Allocation List
            </button>

            <p className="allocation-breadcrumb">
              Dashboard / Allocation / Detail
            </p>

            <h1>
              Allocation Plan #
              {plan.allocationPlanId}
            </h1>

            <p className="allocation-subtitle">
              {plan.experimentName ||
                "Unknown experiment"}
            </p>
          </div>

          <span
            className={`allocation-status allocation-status-${plan.approveStatus.toLowerCase()}`}
          >
            {plan.approveStatus}
          </span>
        </div>

        {error && (
          <div className="allocation-alert error">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="allocation-alert success">
            {successMessage}
          </div>
        )}

        <section className="allocation-overview-grid">
          <article className="allocation-info-card">
            <div className="card-heading">
              <div>
                <span className="card-eyebrow">
                  Experiment
                </span>

                <h2>
                  Experiment Information
                </h2>
              </div>
            </div>

            <div className="allocation-info-list">
              <div className="allocation-info-row">
                <span>Experiment ID</span>

                <strong>
                  #{plan.experimentId}
                </strong>
              </div>

              <div className="allocation-info-row">
                <span>
                  Experiment Name
                </span>

                <strong>
                  {plan.experimentName ||
                    "-"}
                </strong>
              </div>

              <div className="allocation-info-row">
                <span>
                  Fitness Score
                </span>

                <strong>
                  {formatFitnessScore(
                    plan.fitnessScore
                  )}
                </strong>
              </div>

              <div className="allocation-info-row">
                <span>Created By</span>

                <strong>
                  {plan.createdByName || "-"}
                </strong>
              </div>
            </div>
          </article>

          <article className="allocation-info-card">
            <div className="card-heading">
              <div>
                <span className="card-eyebrow">
                  Resources
                </span>

                <h2>Resource Summary</h2>
              </div>

              <span className="resource-total">
                {totalResources} total
              </span>
            </div>

            <div className="allocation-resource-summary">
              <div>
                <span>Equipment</span>

                <strong>
                  {actualEquipmentCount}
                </strong>
              </div>

              <div>
                <span>Human</span>

                <strong>
                  {actualHumanCount}
                </strong>
              </div>

              <div>
                <span>Land</span>

                <strong>
                  {actualLandCount}
                </strong>
              </div>

              <div>
                <span>Schedule</span>

                <strong>
                  {plan.scheduleCount ?? 0}
                </strong>
              </div>
            </div>
          </article>

          <article className="allocation-info-card">
            <div className="card-heading">
              <div>
                <span className="card-eyebrow">
                  Approval
                </span>

                <h2>
                  Approval Information
                </h2>
              </div>
            </div>

            <div className="allocation-info-list">
              <div className="allocation-info-row">
                <span>Status</span>

                <strong>
                  {plan.approveStatus}
                </strong>
              </div>

              <div className="allocation-info-row">
                <span>
                  Approved By
                </span>

                <strong>
                  {plan.approveByName || "-"}
                </strong>
              </div>

              <div className="allocation-info-row">
                <span>
                  Approved At
                </span>

                <strong>
                  {formatDateTime(
                    plan.approvedAt
                  )}
                </strong>
              </div>
            </div>
          </article>

          <article className="allocation-info-card">
            <div className="card-heading">
              <div>
                <span className="card-eyebrow">
                  History
                </span>

                <h2>Timestamps</h2>
              </div>
            </div>

            <div className="allocation-info-list">
              <div className="allocation-info-row">
                <span>
                  Created At
                </span>

                <strong>
                  {formatDateTime(
                    plan.createdAt
                  )}
                </strong>
              </div>

              <div className="allocation-info-row">
                <span>
                  Updated At
                </span>

                <strong>
                  {formatDateTime(
                    plan.updatedAt
                  )}
                </strong>
              </div>
            </div>
          </article>
        </section>

        <section className="allocation-actions-card">
          <div>
            <span className="card-eyebrow">
              Workflow
            </span>

            <h2>Allocation Actions</h2>

            <p>
              Actions are displayed according
              to your role and the current
              allocation status.
            </p>
          </div>

          <div className="allocation-action-buttons">
            {canEditPlan && (
              <button
                type="button"
                className="allocation-button secondary"
                disabled={actionLoading}
                onClick={() =>
                  navigate(
                    `/allocation/${plan.allocationPlanId}/edit`
                  )
                }
              >
                Edit Plan
              </button>
            )}

            {canSubmit && (
              <button
                type="button"
                className="allocation-button approve"
                disabled={actionLoading}
                onClick={
                  handleSubmitAllocation
                }
              >
                {actionLoading
                  ? "Submitting..."
                  : "Submit Allocation"}
              </button>
            )}

            {canApprove && (
              <button
                type="button"
                className="allocation-button approve"
                disabled={actionLoading}
                onClick={handleApprove}
              >
                {actionLoading
                  ? "Processing..."
                  : "Approve"}
              </button>
            )}

            {canReject && (
              <button
                type="button"
                className="allocation-button reject"
                disabled={actionLoading}
                onClick={handleReject}
              >
                {actionLoading
                  ? "Processing..."
                  : "Reject"}
              </button>
            )}

            {canCancel && (
              <button
                type="button"
                className="allocation-button cancel"
                disabled={actionLoading}
                onClick={handleCancel}
              >
                {actionLoading
                  ? "Processing..."
                  : "Cancel"}
              </button>
            )}

            {!canEditPlan &&
              !canSubmit &&
              !canApprove &&
              !canReject &&
              !canCancel && (
                <p className="allocation-readonly-note">
                  You have view-only permission
                  for this allocation plan.
                </p>
              )}

            {role === "Researcher" &&
              isDraft &&
              totalResources === 0 && (
                <p className="allocation-readonly-note">
                  Add at least one resource
                  before submitting this
                  allocation plan.
                </p>
              )}
          </div>
        </section>

        <section className="allocation-resource-card">
          <div className="allocation-resource-header">
            <div>
              <span className="card-eyebrow">
                Allocation Details
              </span>

              <h2>Allocated Resources</h2>

              <p>
                View the equipment, human
                resources and land assigned to
                this experiment.
              </p>
            </div>

            {canManageResources && (
              <div className="resource-header-actions">
                <div className="resource-management-note">
                  Resources can be changed while
                  the plan is Draft.
                </div>
              </div>
            )}
          </div>

          <div className="allocation-tabs">
            <button
              type="button"
              className={
                activeTab === "equipment"
                  ? "active"
                  : ""
              }
              onClick={() =>
                handleTabChange("equipment")
              }
            >
              Equipment

              <span>
                {actualEquipmentCount}
              </span>
            </button>

            <button
              type="button"
              className={
                activeTab === "human"
                  ? "active"
                  : ""
              }
              onClick={() =>
                handleTabChange("human")
              }
            >
              Human

              <span>
                {actualHumanCount}
              </span>
            </button>

            <button
              type="button"
              className={
                activeTab === "land"
                  ? "active"
                  : ""
              }
              onClick={() =>
                handleTabChange("land")
              }
            >
              Land

              <span>
                {actualLandCount}
              </span>
            </button>
          </div>

          {activeTab === "equipment" && (
            <div className="allocation-equipment-section">
              {showEquipmentForm &&
                canManageResources && (
                  <AddEquipmentResourceForm
                    allocationPlanId={
                      plan.allocationPlanId
                    }
                    experimentId={
                      plan.experimentId
                    }
                    onCreated={
                      handleEquipmentCreated
                    }
                    onCancel={() =>
                      setShowEquipmentForm(false)
                    }
                  />
                )}

              <div className="allocation-table-wrapper">
                {equipmentDetails.length ===
                0 ? (
                  <div className="allocation-resource-empty">
                    <h3>
                      No equipment allocated
                    </h3>

                    <p>
                      This allocation plan does
                      not have any equipment
                      details yet.
                    </p>
                  </div>
                ) : (
                  <table className="allocation-resource-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Equipment</th>
                        <th>Instance</th>
                        <th>Quantity</th>
                        <th>Efficiency</th>
                        <th>Substitute</th>
                        <th>Period</th>
                        <th>Status</th>

                        {canManageResources && (
                          <th>Action</th>
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {equipmentDetails.map(
                        (detail) => {
                          const detailId =
                            getEquipmentDetailId(
                              detail
                            );

                          const deleting =
                            deletingResourceId ===
                            `equipment-${detailId}`;

                          return (
                            <tr key={detailId}>
                              <td>
                                #{detailId}
                              </td>

                              <td>
                                <strong>
                                  {detail.allocatedEquipmentTypeName ||
                                    `Equipment type #${detail.allocatedEquipmentTypeId}`}
                                </strong>
                              </td>

                              <td>
                                {detail.equipmentInstanceName ||
                                  detail.assetCode ||
                                  (detail.equipmentInstanceId
                                    ? `#${detail.equipmentInstanceId}`
                                    : "Not assigned")}
                              </td>

                              <td>
                                {detail.quantity}
                              </td>

                              <td>
                                {formatEfficiencyRate(
                                  detail.efficiencyRate
                                )}
                              </td>

                              <td>
                                {detail.isSubstitute
                                  ? "Yes"
                                  : "No"}
                              </td>

                              <td>
                                <div className="resource-date-range">
                                  <span>
                                    {formatDate(
                                      detail.startDate
                                    )}
                                  </span>

                                  <small>to</small>

                                  <span>
                                    {formatDate(
                                      detail.endDate
                                    )}
                                  </span>
                                </div>
                              </td>

                              <td>
                                <span
                                  className={`resource-status resource-status-${detail.status.toLowerCase()}`}
                                >
                                  {detail.status}
                                </span>
                              </td>

                              {canManageResources && (
                                <td>
                                  <button
                                    type="button"
                                    className="resource-delete-button"
                                    disabled={Boolean(
                                      deletingResourceId
                                    )}
                                    onClick={() =>
                                      void handleDeleteEquipment(
                                        detail
                                      )
                                    }
                                  >
                                    {deleting
                                      ? "Removing..."
                                      : "Remove"}
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {canManageResources && (
                <div className="resource-bottom-actions">
                  <button
                    type="button"
                    className={
                      showEquipmentForm
                        ? "allocation-button secondary"
                        : "allocation-button approve"
                    }
                    disabled={
                      actionLoading ||
                      Boolean(
                        deletingResourceId
                      )
                    }
                    onClick={
                      handleEquipmentFormToggle
                    }
                  >
                    {showEquipmentForm
                      ? "Close Equipment Form"
                      : "+ Add Equipment Resource"}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "human" && (
            <div className="allocation-human-section">
              {showHumanForm &&
                canManageResources && (
                  <AddHumanResourceForm
                    allocationPlanId={
                      plan.allocationPlanId
                    }
                    onCreated={
                      handleHumanCreated
                    }
                    onCancel={() =>
                      setShowHumanForm(false)
                    }
                  />
                )}

              <div className="allocation-table-wrapper">
                {humanDetails.length === 0 ? (
                  <div className="allocation-resource-empty">
                    <h3>
                      No human resources allocated
                    </h3>

                    <p>
                      This allocation plan does
                      not have any human
                      allocation details yet.
                    </p>
                  </div>
                ) : (
                  <table className="allocation-resource-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>
                          Human Resource
                        </th>
                        <th>Role</th>
                        <th>Skill</th>
                        <th>
                          Working Hours
                        </th>
                        <th>Period</th>
                        <th>Status</th>

                        {canManageResources && (
                          <th>Action</th>
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {humanDetails.map(
                        (detail) => {
                          const detailId =
                            getHumanDetailId(
                              detail
                            );

                          const deleting =
                            deletingResourceId ===
                            `human-${detailId}`;

                          return (
                            <tr key={detailId}>
                              <td>
                                #{detailId}
                              </td>

                              <td>
                                <strong>
                                  {detail.humanResourceName ||
                                    detail.fullName ||
                                    `Human resource #${detail.humanResourceId}`}
                                </strong>
                              </td>

                              <td>
                                {detail.roleName ||
                                  "-"}
                              </td>

                              <td>
                                {detail.requiredSkillName ||
                                  "-"}
                              </td>

                              <td>
                                {detail.workingHours ??
                                  0}{" "}
                                hours
                              </td>

                              <td>
                                <div className="resource-date-range">
                                  <span>
                                    {formatDate(
                                      detail.startDate
                                    )}
                                  </span>

                                  <small>to</small>

                                  <span>
                                    {formatDate(
                                      detail.endDate
                                    )}
                                  </span>
                                </div>
                              </td>

                              <td>
                                <span
                                  className={`resource-status resource-status-${detail.status.toLowerCase()}`}
                                >
                                  {detail.status}
                                </span>
                              </td>

                              {canManageResources && (
                                <td>
                                  <button
                                    type="button"
                                    className="resource-delete-button"
                                    disabled={Boolean(
                                      deletingResourceId
                                    )}
                                    onClick={() =>
                                      void handleDeleteHuman(
                                        detail
                                      )
                                    }
                                  >
                                    {deleting
                                      ? "Removing..."
                                      : "Remove"}
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {canManageResources && (
                <div className="resource-bottom-actions">
                  <button
                    type="button"
                    className={
                      showHumanForm
                        ? "allocation-button secondary"
                        : "allocation-button approve"
                    }
                    disabled={
                      actionLoading ||
                      Boolean(
                        deletingResourceId
                      )
                    }
                    onClick={
                      handleHumanFormToggle
                    }
                  >
                    {showHumanForm
                      ? "Close Human Form"
                      : "+ Add Human Resource"}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "land" && (
            <div className="allocation-land-section">
              {showLandForm &&
                canManageResources && (
                  <AddLandResourceForm
                    allocationPlanId={
                      plan.allocationPlanId
                    }
                    experimentId={
                      plan.experimentId
                    }
                    onCreated={
                      handleLandCreated
                    }
                    onCancel={() =>
                      setShowLandForm(false)
                    }
                  />
                )}

              <div className="allocation-table-wrapper">
                {landDetails.length === 0 ? (
                  <div className="allocation-resource-empty">
                    <h3>
                      No land allocated
                    </h3>

                    <p>
                      This allocation plan does
                      not have any land allocation
                      details yet.
                    </p>
                  </div>
                ) : (
                  <table className="allocation-resource-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Land</th>
                        <th>Code</th>
                        <th>Area</th>
                        <th>
                          Requirement
                        </th>
                        <th>Period</th>
                        <th>Status</th>

                        {canManageResources && (
                          <th>Action</th>
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {landDetails.map(
                        (detail) => {
                          const detailId =
                            getLandDetailId(
                              detail
                            );

                          const deleting =
                            deletingResourceId ===
                            `land-${detailId}`;

                          return (
                            <tr key={detailId}>
                              <td>
                                #{detailId}
                              </td>

                              <td>
                                <strong>
                                  {detail.landName ||
                                    `Land #${detail.landId}`}
                                </strong>
                              </td>

                              <td>
                                {detail.landCode ||
                                  "-"}
                              </td>

                              <td>
                                {detail.areaName ||
                                  (detail.areaId
                                    ? `Area #${detail.areaId}`
                                    : "-")}
                              </td>

                              <td>
                                #
                                {
                                  detail.expLandReqId
                                }
                              </td>

                              <td>
                                <div className="resource-date-range">
                                  <span>
                                    {formatDate(
                                      detail.startDate
                                    )}
                                  </span>

                                  <small>to</small>

                                  <span>
                                    {formatDate(
                                      detail.endDate
                                    )}
                                  </span>
                                </div>
                              </td>

                              <td>
                                <span
                                  className={`resource-status resource-status-${detail.status.toLowerCase()}`}
                                >
                                  {detail.status}
                                </span>
                              </td>

                              {canManageResources && (
                                <td>
                                  <button
                                    type="button"
                                    className="resource-delete-button"
                                    disabled={Boolean(
                                      deletingResourceId
                                    )}
                                    onClick={() =>
                                      void handleDeleteLand(
                                        detail
                                      )
                                    }
                                  >
                                    {deleting
                                      ? "Removing..."
                                      : "Remove"}
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {canManageResources && (
                <div className="resource-bottom-actions">
                  <button
                    type="button"
                    className={
                      showLandForm
                        ? "allocation-button secondary"
                        : "allocation-button approve"
                    }
                    disabled={
                      actionLoading ||
                      Boolean(
                        deletingResourceId
                      )
                    }
                    onClick={
                      handleLandFormToggle
                    }
                  >
                    {showLandForm
                      ? "Close Land Form"
                      : "+ Add Land Resource"}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {isPending && (
          <div className="allocation-locked-note">
            This allocation plan has been
            submitted and is waiting for
            manager approval. Its resources can
            no longer be modified.
          </div>
        )}

        {isApproved && (
          <div className="allocation-locked-note">
            This allocation plan has been{" "}
            <strong>Approved</strong>. Its
            resources can no longer be modified.
          </div>
        )}

        {(isRejected || isCancelled) && (
          <div className="allocation-locked-note">
            This allocation plan is{" "}
            <strong>
              {plan.approveStatus}
            </strong>
            . Its resources can no longer be
            modified.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}