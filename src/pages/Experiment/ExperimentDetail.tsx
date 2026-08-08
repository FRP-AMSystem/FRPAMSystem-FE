import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import axios from "axios";

import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
  LandPlot,
  Layers3,
  Pencil,
  Plus,
  Send,
  Trash2,
  Users,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getExperimentById,
  submitExperiment,
} from "../../services/experimentService";

import {
  deleteExperimentPhase,
  getExperimentPhases,
} from "../../services/experimentPhaseService";

import {
  getExperimentEquipmentRequirements,
} from "../../services/experimentEquipmentRequirementService";

import {
  getExperimentHumanRequirements,
} from "../../services/experimentHumanRequirementService";

import {
  getExperimentLandRequirements,
} from "../../services/experimentLandRequirementService";

import {
  getAllocationPlans,
} from "../../services/allocationPlanService";

import {
  getPermissions,
  getStoredRole,
} from "../../config/rolePermissions";

import type {
  ExperimentResponse,
  ExperimentStatus,
} from "../../types/experiment";

import type {
  ExperimentPhase,
  ExperimentPhaseStatus,
} from "../../types/experimentPhase";

import "./ExperimentDetail.css";
import "./ExperimentPhaseSection.css";

const priorityLabels: Record<
  number,
  string
> = {
  0: "Low",
  1: "Medium",
  2: "High",
  3: "Urgent",
};

function formatDate(
  value?: string | null
): string {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

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

function formatDateTime(
  value?: string | null
): string {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return date.toLocaleString(
    "vi-VN"
  );
}

function getErrorMessage(
  error: unknown
): string {
  if (
    axios.isAxiosError(
      error
    )
  ) {
    const responseData =
      error.response?.data as
        | {
            message?: string;
            error?: string;
            title?: string;
            errors?: Record<
              string,
              string[]
            >;
          }
        | undefined;

    if (
      responseData?.errors
    ) {
      return Object.values(
        responseData.errors
      )
        .flat()
        .join(" ");
    }

    if (
      error.response?.status ===
      401
    ) {
      return "Your login session is invalid or expired. Please sign in again.";
    }

    if (
      error.response?.status ===
      403
    ) {
      return "You do not have permission to perform this action.";
    }

    return (
      responseData?.message ||
      responseData?.error ||
      responseData?.title ||
      error.message ||
      "Unable to complete the request."
    );
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return "Unable to complete the request.";
}

function getExperimentStatusLabel(
  status?: ExperimentStatus | string | null
): string {
  switch (status) {
    case "Draft":
      return "Draft";

    case "Submitted":
      return "Submitted";

    case "Planning":
      return "Planning";

    case "Ready":
      return "Ready";

    case "Running":
      return "Running";

    case "Completed":
      return "Completed";

    case "Cancelled":
      return "Cancelled";

    default:
      return status || "-";
  }
}

function getExperimentStatusClassName(
  status?: ExperimentStatus | string | null
): string {
  switch (status) {
    case "Submitted":
      return "experiment-status experiment-status-submitted";

    case "Planning":
      return "experiment-status experiment-status-planning";

    case "Ready":
      return "experiment-status experiment-status-ready";

    case "Running":
      return "experiment-status experiment-status-running";

    case "Completed":
      return "experiment-status experiment-status-completed";

    case "Cancelled":
      return "experiment-status experiment-status-cancelled";

    case "Draft":
    default:
      return "experiment-status experiment-status-draft";
  }
}

function getStatusLabel(
  status?: ExperimentPhaseStatus | string | null
): string {
  switch (status) {
    case "InProgress":
      return "In Progress";

    case "Completed":
      return "Completed";

    case "Cancelled":
      return "Cancelled";

    case "Planned":
      return "Planned";

    default:
      return status || "-";
  }
}

function getStatusClassName(
  status?: ExperimentPhaseStatus | string | null
): string {
  switch (status) {
    case "InProgress":
      return "experiment-phase-status experiment-phase-status-progress";

    case "Completed":
      return "experiment-phase-status experiment-phase-status-completed";

    case "Cancelled":
      return "experiment-phase-status experiment-phase-status-cancelled";

    case "Planned":
    default:
      return "experiment-phase-status experiment-phase-status-planned";
  }
}

function normalizePhaseList(
  response: unknown
): ExperimentPhase[] {
  if (
    Array.isArray(response)
  ) {
    return response as ExperimentPhase[];
  }

  if (
    typeof response ===
      "object" &&
    response !== null
  ) {
    const objectResponse =
      response as {
        items?: unknown;
        data?: unknown;
      };

    if (
      Array.isArray(
        objectResponse.items
      )
    ) {
      return objectResponse.items as ExperimentPhase[];
    }

    if (
      Array.isArray(
        objectResponse.data
      )
    ) {
      return objectResponse.data as ExperimentPhase[];
    }

    if (
      typeof objectResponse.data ===
        "object" &&
      objectResponse.data !== null
    ) {
      const nestedData =
        objectResponse.data as {
          items?: unknown;
        };

      if (
        Array.isArray(
          nestedData.items
        )
      ) {
        return nestedData.items as ExperimentPhase[];
      }
    }
  }

  return [];
}

function canSubmitExperimentStatus(
  status?: string | null
): boolean {
  if (!status) {
    return true;
  }

  return (
    status === "Draft" ||
    status === "Created"
  );
}

function canCreateAllocationForExperimentStatus(
  status?: string | null
): boolean {
  return (
    status === "Submitted" ||
    status === "Planning"
  );
}

export default function ExperimentDetail() {
  const {
    id,
  } = useParams<{
    id: string;
  }>();

  const navigate =
    useNavigate();

  const experimentId =
    Number(id);

  const role =
    getStoredRole();

  const permission =
    getPermissions(role);

  const canManageExperiment =
    permission.canEditExperiment;

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    experiment,
    setExperiment,
  ] = useState<ExperimentResponse | null>(
    null
  );

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    phases,
    setPhases,
  ] = useState<
    ExperimentPhase[]
  >([]);

  const [
    loadingPhases,
    setLoadingPhases,
  ] = useState(true);

  const [
    phaseError,
    setPhaseError,
  ] = useState("");

  const [
    deletingPhaseId,
    setDeletingPhaseId,
  ] = useState<
    number | null
  >(null);

  const [
    equipmentRequirementCount,
    setEquipmentRequirementCount,
  ] = useState(0);

  const [
    humanRequirementCount,
    setHumanRequirementCount,
  ] = useState(0);

  const [
    landRequirementCount,
    setLandRequirementCount,
  ] = useState(0);

  const [
    allocationCount,
    setAllocationCount,
  ] = useState(0);

  const [
    approvedAllocationCount,
    setApprovedAllocationCount,
  ] = useState(0);

  const [
    scheduleCount,
    setScheduleCount,
  ] = useState(0);

  const [
    loadingWorkflow,
    setLoadingWorkflow,
  ] = useState(true);

  const [
    workflowError,
    setWorkflowError,
  ] = useState("");

  const loadExperiment =
    useCallback(async () => {
      if (
        !id ||
        !Number.isInteger(
          experimentId
        ) ||
        experimentId <= 0
      ) {
        setError(
          "Invalid experiment ID."
        );

        setLoading(false);

        return;
      }

      try {
        setLoading(true);
        setError("");

        const data =
          await getExperimentById(
            experimentId
          );

        setExperiment(data);
      } catch (loadError) {
        console.error(
          "Load experiment failed:",
          loadError
        );

        setExperiment(null);

        setError(
          getErrorMessage(
            loadError
          )
        );
      } finally {
        setLoading(false);
      }
    }, [
      id,
      experimentId,
    ]);

  const loadExperimentPhases =
    useCallback(async () => {
      if (
        !Number.isInteger(
          experimentId
        ) ||
        experimentId <= 0
      ) {
        setLoadingPhases(false);

        return;
      }

      try {
        setLoadingPhases(true);
        setPhaseError("");

        const response =
          await getExperimentPhases({
            experimentId,
            page: 1,
            size: 100,
          });

        const normalizedPhases =
          normalizePhaseList(
            response
          )
            .filter(
              (phase) =>
                Number(
                  phase.experimentId
                ) ===
                experimentId
            )
            .sort(
              (
                firstPhase,
                secondPhase
              ) =>
                Number(
                  firstPhase.phaseOrder
                ) -
                Number(
                  secondPhase.phaseOrder
                )
            );

        setPhases(
          normalizedPhases
        );
      } catch (loadError) {
        console.error(
          "Load experiment phases failed:",
          loadError
        );

        setPhases([]);

        setPhaseError(
          getErrorMessage(
            loadError
          )
        );
      } finally {
        setLoadingPhases(false);
      }
    }, [experimentId]);

  const loadWorkflowSummary =
    useCallback(async () => {
      if (
        !Number.isInteger(
          experimentId
        ) ||
        experimentId <= 0
      ) {
        setLoadingWorkflow(false);
        return;
      }

      try {
        setLoadingWorkflow(true);
        setWorkflowError("");

        const [
          equipmentRequirements,
          humanRequirements,
          landRequirements,
          allocations,
        ] = await Promise.all([
          getExperimentEquipmentRequirements({
            experimentId,
            page: 1,
            size: 100,
          }),
          getExperimentHumanRequirements({
            experimentId,
            page: 1,
            size: 100,
          }),
          getExperimentLandRequirements({
            experimentId,
            page: 1,
            size: 100,
          }),
          getAllocationPlans({
            experimentId,
            page: 1,
            size: 100,
          }),
        ]);

        setEquipmentRequirementCount(
          equipmentRequirements.length
        );

        setHumanRequirementCount(
          humanRequirements.length
        );

        setLandRequirementCount(
          landRequirements.length
        );

        setAllocationCount(
          allocations.length
        );

        setApprovedAllocationCount(
          allocations.filter(
            (allocation) =>
              allocation.approveStatus ===
              "Approved"
          ).length
        );

        setScheduleCount(
          allocations.reduce(
            (total, allocation) =>
              total +
              Number(
                allocation.scheduleCount ??
                0
              ),
            0
          )
        );
      } catch (loadError) {
        console.error(
          "Load experiment workflow summary failed:",
          loadError
        );

        setWorkflowError(
          getErrorMessage(
            loadError
          )
        );
      } finally {
        setLoadingWorkflow(false);
      }
    }, [experimentId]);

  useEffect(() => {
    void loadExperiment();
    void loadExperimentPhases();
    void loadWorkflowSummary();
  }, [
    loadExperiment,
    loadExperimentPhases,
    loadWorkflowSummary,
  ]);

  const handleSubmitExperiment =
    async () => {
      if (
        !experiment ||
        !canManageExperiment ||
        submitting
      ) {
        return;
      }

      if (
        !canSubmitExperimentStatus(
          experiment.status
        )
      ) {
        setError(
          `Experiment cannot be submitted while its status is "${experiment.status}".`
        );

        return;
      }

      if (
        phases.length === 0
      ) {
        setError(
          "Please create at least one experiment phase before submitting the experiment."
        );

        return;
      }

      const totalRequirements =
        equipmentRequirementCount +
        humanRequirementCount +
        landRequirementCount;

      if (
        totalRequirements === 0
      ) {
        setError(
          "Please create at least one requirement before submitting the experiment."
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Submit experiment "${experiment.experimentName}" for planning?\n\nAfter submission, editing may be restricted.`
        );

      if (!confirmed) {
        return;
      }

      try {
        setSubmitting(true);
        setError("");
        setSuccessMessage("");

        const updatedExperiment =
          await submitExperiment(
            experiment.experimentId
          );

        setExperiment(
          updatedExperiment
        );

        setSuccessMessage(
          "Experiment submitted successfully."
        );

        await loadExperiment();
      } catch (submitError) {
        console.error(
          "Submit experiment failed:",
          submitError
        );

        setError(
          getErrorMessage(
            submitError
          )
        );
      } finally {
        setSubmitting(false);
      }
    };

  const handleDeletePhase =
    async (
      phase: ExperimentPhase
    ) => {
      if (
        !permission.canDeleteExperimentPhase
      ) {
        return;
      }

      if (
        !canSubmitExperimentStatus(
          experiment?.status
        )
      ) {
        setPhaseError(
          "Experiment phases can only be deleted while the experiment is in Draft status."
        );

        return;
      }

      const phaseId =
        phase.experimentPhaseId;

      if (
        !phaseId ||
        phaseId <= 0
      ) {
        setPhaseError(
          "Invalid experiment phase ID."
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Are you sure you want to delete phase "${phase.phaseName}"?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setDeletingPhaseId(
          phaseId
        );

        setPhaseError("");

        await deleteExperimentPhase(
          phaseId
        );

        setPhases(
          (currentPhases) =>
            currentPhases.filter(
              (currentPhase) =>
                currentPhase.experimentPhaseId !==
                phaseId
            )
        );
      } catch (deleteError) {
        console.error(
          "Delete experiment phase failed:",
          deleteError
        );

        setPhaseError(
          getErrorMessage(
            deleteError
          )
        );
      } finally {
        setDeletingPhaseId(
          null
        );
      }
    };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="experiment-detail-page">
          <p>
            Loading experiment...
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (
    error &&
    !experiment
  ) {
    return (
      <DashboardLayout>
        <div className="experiment-detail-page">
          <div className="detail-header">
            <div>
              <p className="breadcrumb">
                Dashboard / Experiments / Detail
              </p>

              <h1>
                Experiment Detail
              </h1>
            </div>

            <button
              type="button"
              className="back-btn"
              onClick={() =>
                navigate(
                  "/experiments"
                )
              }
            >
              Back
            </button>
          </div>

          <p className="error-message">
            {error ||
              "Experiment not found."}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (!experiment) {
    return null;
  }

  const priority =
    experiment.priority ===
      null ||
    experiment.priority ===
      undefined
      ? "-"
      : priorityLabels[
          experiment.priority
        ] ??
        String(
          experiment.priority
        );

  const experimentIsEditable =
    canSubmitExperimentStatus(
      experiment.status
    );

  const totalRequirements =
    equipmentRequirementCount +
    humanRequirementCount +
    landRequirementCount;

  const hasPhase =
    phases.length > 0;

  const hasRequirement =
    totalRequirements > 0;

  const submitReady =
    hasPhase &&
    hasRequirement &&
    !loadingWorkflow;

  const allocationUnlocked =
    canCreateAllocationForExperimentStatus(
      experiment.status
    ) ||
    allocationCount > 0;

  const canCreateAllocation =
    permission.canCreateAllocation &&
    canCreateAllocationForExperimentStatus(
      experiment.status
    );

  const canSubmit =
    permission.canSubmitExperiment &&
    experimentIsEditable;

  return (
    <DashboardLayout>
      <div className="experiment-detail-page">
        <div className="detail-header">
          <div>
            <p className="breadcrumb">
              Dashboard / Experiments / #
              {
                experiment.experimentId
              }
            </p>

            <h1>
              {
                experiment.experimentName
              }
            </h1>
          </div>

          <button
            type="button"
            className="back-btn"
            onClick={() =>
              navigate(
                "/experiments"
              )
            }
          >
            Back
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="experiment-success-message">
            <CheckCircle2
              size={18}
            />

            <span>
              {successMessage}
            </span>
          </div>
        )}

        <div className="detail-grid">
          <div className="detail-card">
            <h3>
              General Information
            </h3>

            <div className="detail-item">
              <span>
                ID
              </span>

              <strong>
                #
                {
                  experiment.experimentId
                }
              </strong>
            </div>

            <div className="detail-item">
              <span>
                Status
              </span>

              <strong>
                <span
                  className={getExperimentStatusClassName(
                    experiment.status
                  )}
                >
                  {getExperimentStatusLabel(
                    experiment.status
                  )}
                </span>
              </strong>
            </div>

            <div className="detail-item">
              <span>
                Priority
              </span>

              <strong>
                {priority}
              </strong>
            </div>

            <div className="detail-item">
              <span>
                Researcher
              </span>

              <strong>
                {experiment.researcherName ||
                  experiment.createdByName ||
                  "-"}
              </strong>
            </div>
          </div>

          <div className="detail-card">
            <h3>
              Schedule
            </h3>

            <div className="detail-item">
              <span>
                Expected Start Date
              </span>

              <strong>
                {formatDate(
                  experiment.expectStartDate
                )}
              </strong>
            </div>

            <div className="detail-item">
              <span>
                Expected End Date
              </span>

              <strong>
                {formatDate(
                  experiment.expectEndDate
                )}
              </strong>
            </div>

            <div className="detail-item">
              <span>
                Deadline
              </span>

              <strong>
                {formatDate(
                  experiment.deadline
                )}
              </strong>
            </div>
          </div>

          <div className="detail-card">
            <h3>
              Audit Information
            </h3>

            <div className="detail-item">
              <span>
                Created By
              </span>

              <strong>
                {experiment.createdByName ||
                  "-"}
              </strong>
            </div>

            <div className="detail-item">
              <span>
                Created At
              </span>

              <strong>
                {formatDateTime(
                  experiment.createdAt
                )}
              </strong>
            </div>

            <div className="detail-item">
              <span>
                Updated At
              </span>

              <strong>
                {formatDateTime(
                  experiment.updatedAt
                )}
              </strong>
            </div>
          </div>
        </div>

        <div className="detail-card description-card">
          <h3>
            Description
          </h3>

          <p>
            {experiment.description ||
              "No description provided."}
          </p>
        </div>

        <section className="experiment-workspace-section">
          <div className="experiment-workspace-heading">
            <div>
              <h2>Experiment Workflow</h2>

              <p>
                Complete the planning steps in order. All items below stay linked to
                experiment #{experiment.experimentId}.
              </p>
            </div>

            <span
              className={`experiment-workflow-readiness ${
                submitReady
                  ? "experiment-workflow-ready"
                  : ""
              }`}
            >
              {experimentIsEditable
                ? submitReady
                  ? "Ready to Submit"
                  : "Planning Incomplete"
                : getExperimentStatusLabel(
                    experiment.status
                  )}
            </span>
          </div>

          {workflowError && (
            <div className="experiment-workflow-error">
              {workflowError}
            </div>
          )}

          <div className="experiment-workflow-progress">
            <div className={hasPhase ? "is-complete" : ""}>
              <span>1</span>
              <strong>Phases</strong>
              <small>
                {hasPhase
                  ? `${phases.length} created`
                  : "Required before submit"}
              </small>
            </div>

            <div className={hasRequirement ? "is-complete" : ""}>
              <span>2</span>
              <strong>Requirements</strong>
              <small>
                {hasRequirement
                  ? `${totalRequirements} created`
                  : "Add at least one"}
              </small>
            </div>

            <div className={!experimentIsEditable ? "is-complete" : ""}>
              <span>3</span>
              <strong>Submit</strong>
              <small>
                {experimentIsEditable
                  ? "Submit when planning is ready"
                  : getExperimentStatusLabel(
                      experiment.status
                    )}
              </small>
            </div>

            <div className={approvedAllocationCount > 0 ? "is-complete" : ""}>
              <span>4</span>
              <strong>Allocation</strong>
              <small>
                {allocationCount > 0
                  ? `${allocationCount} plan${allocationCount === 1 ? "" : "s"}`
                  : "After experiment submit"}
              </small>
            </div>

            <div className={scheduleCount > 0 ? "is-complete" : ""}>
              <span>5</span>
              <strong>Schedule</strong>
              <small>
                {scheduleCount > 0
                  ? `${scheduleCount} schedule${scheduleCount === 1 ? "" : "s"}`
                  : "After allocation approval"}
              </small>
            </div>
          </div>

          <div className="experiment-workspace-grid">
            <button
              type="button"
              className="experiment-workspace-card"
              onClick={() =>
                document
                  .getElementById("experiment-phases")
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
              }
            >
              <span className="experiment-workspace-icon">
                <Layers3 size={21} />
              </span>

              <span>
                <strong>Experiment Phases</strong>
                <small>{phases.length} phase(s)</small>
              </span>

              <em className={hasPhase ? "is-complete" : ""}>
                {hasPhase ? "Complete" : "Required"}
              </em>
            </button>

            <button
              type="button"
              className="experiment-workspace-card"
              onClick={() =>
                navigate(
                  `/equipment-requirements?experimentId=${experiment.experimentId}`
                )
              }
            >
              <span className="experiment-workspace-icon">
                <ClipboardList size={21} />
              </span>

              <span>
                <strong>Equipment Requirements</strong>
                <small>{equipmentRequirementCount} requirement(s)</small>
              </span>

              <em className={equipmentRequirementCount > 0 ? "is-complete" : ""}>
                {equipmentRequirementCount > 0 ? "Added" : "Not started"}
              </em>
            </button>

            <button
              type="button"
              className="experiment-workspace-card"
              onClick={() =>
                navigate(
                  `/human-requirements?experimentId=${experiment.experimentId}`
                )
              }
            >
              <span className="experiment-workspace-icon">
                <Users size={21} />
              </span>

              <span>
                <strong>Human Requirements</strong>
                <small>{humanRequirementCount} requirement(s)</small>
              </span>

              <em className={humanRequirementCount > 0 ? "is-complete" : ""}>
                {humanRequirementCount > 0 ? "Added" : "Not started"}
              </em>
            </button>

            <button
              type="button"
              className="experiment-workspace-card"
              onClick={() =>
                navigate(
                  `/land-requirements?experimentId=${experiment.experimentId}`
                )
              }
            >
              <span className="experiment-workspace-icon">
                <LandPlot size={21} />
              </span>

              <span>
                <strong>Land Requirements</strong>
                <small>{landRequirementCount} requirement(s)</small>
              </span>

              <em className={landRequirementCount > 0 ? "is-complete" : ""}>
                {landRequirementCount > 0 ? "Added" : "Not started"}
              </em>
            </button>

            <button
              type="button"
              className={`experiment-workspace-card ${
                allocationUnlocked
                  ? ""
                  : "experiment-workspace-card-locked"
              }`}
              onClick={() => {
                if (!allocationUnlocked) {
                  setError(
                    "Allocation becomes available after the experiment is submitted for planning."
                  );
                  return;
                }

                navigate(
                  `/allocation?experimentId=${experiment.experimentId}`
                );
              }}
            >
              <span className="experiment-workspace-icon">
                <CalendarDays size={21} />
              </span>

              <span>
                <strong>Allocation Plans</strong>
                <small>{allocationCount} plan(s)</small>
              </span>

              <em className={approvedAllocationCount > 0 ? "is-complete" : ""}>
                {!allocationUnlocked
                  ? "Locked"
                  : approvedAllocationCount > 0
                    ? "Approved"
                    : allocationCount > 0
                      ? "In progress"
                      : "Not started"}
              </em>
            </button>

            <button
              type="button"
              className="experiment-workspace-card"
              onClick={() =>
                navigate(
                  `/schedules?experimentId=${experiment.experimentId}`
                )
              }
            >
              <span className="experiment-workspace-icon">
                <CalendarDays size={21} />
              </span>

              <span>
                <strong>Schedules</strong>
                <small>{scheduleCount} schedule(s)</small>
              </span>

              <em className={scheduleCount > 0 ? "is-complete" : ""}>
                {scheduleCount > 0
                  ? "Scheduled"
                  : approvedAllocationCount > 0
                    ? "Ready"
                    : "Waiting for approval"}
              </em>
            </button>
          </div>
        </section>

        {(permission.canEditExperiment ||
          canCreateAllocation) && (
          <div className="detail-actions">
            {permission.canEditExperiment &&
              experimentIsEditable && (
                <button
                  type="button"
                  className="edit-btn"
                  onClick={() =>
                    navigate(
                      `/experiments/${experiment.experimentId}/edit`
                    )
                  }
                >
                  Edit Experiment
                </button>
              )}

            {canSubmit && (
              <button
                type="button"
                className="experiment-submit-button"
                disabled={
                  submitting ||
                  !submitReady
                }
                onClick={() =>
                  void handleSubmitExperiment()
                }
              >
                <Send
                  size={18}
                />

                {submitting
                  ? "Submitting..."
                  : "Submit Experiment"}
              </button>
            )}

            {canCreateAllocation && (
              <button
                type="button"
                className="experiment-create-allocation-button"
                onClick={() =>
                  navigate(
                    `/allocation/create?experimentId=${experiment.experimentId}`
                  )
                }
              >
                <Plus
                  size={18}
                />

                Create Allocation
              </button>
            )}
          </div>
        )}

        {canSubmit &&
          !submitReady && (
          <div className="experiment-submit-hint">
            {!hasPhase &&
              "Create at least one phase. "}
            {!hasRequirement &&
              "Create at least one equipment, human, or land requirement. "}
            Complete planning before submitting this experiment.
          </div>
        )}

        <section id="experiment-phases" className="experiment-phase-section">
          <div className="experiment-phase-section-header">
            <div className="experiment-phase-section-title">
              <div className="experiment-phase-section-icon">
                <Layers3
                  size={22}
                />
              </div>

              <div>
                <h2>
                  Experiment Phases
                </h2>

                <p>
                  Manage the stages and expected timeline of this experiment.
                </p>
              </div>
            </div>

            {permission.canCreateExperimentPhase &&
              experimentIsEditable && (
              <button
                type="button"
                className="experiment-phase-create-button"
                onClick={() =>
                  navigate(
                    `/experiment-phases/create?experimentId=${experiment.experimentId}`
                  )
                }
              >
                <Plus
                  size={18}
                />

                Create Phase
              </button>
            )}
          </div>

          {phaseError && (
            <div className="experiment-phase-error">
              {phaseError}
            </div>
          )}

          {loadingPhases ? (
            <div className="experiment-phase-state">
              Loading experiment phases...
            </div>
          ) : phases.length === 0 ? (
            <div className="experiment-phase-empty">
              <Layers3
                size={38}
              />

              <h3>
                No experiment phases
              </h3>

              <p>
                This experiment does not have any phases yet.
              </p>

              {permission.canCreateExperimentPhase &&
                experimentIsEditable && (
                <button
                  type="button"
                  className="experiment-phase-create-button"
                  onClick={() =>
                    navigate(
                      `/experiment-phases/create?experimentId=${experiment.experimentId}`
                    )
                  }
                >
                  <Plus
                    size={18}
                  />

                  Create First Phase
                </button>
              )}
            </div>
          ) : (
            <div className="experiment-phase-table-wrapper">
              <table className="experiment-phase-table">
                <thead>
                  <tr>
                    <th>
                      Order
                    </th>

                    <th>
                      Phase
                    </th>

                    <th>
                      Timeline
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {phases.map(
                    (phase) => {
                      const phaseId =
                        phase.experimentPhaseId;

                      const isDeleting =
                        deletingPhaseId ===
                        phaseId;

                      return (
                        <tr
                          key={
                            phaseId
                          }
                        >
                          <td>
                            <span className="experiment-phase-order">
                              #
                              {
                                phase.phaseOrder
                              }
                            </span>
                          </td>

                          <td>
                            <div className="experiment-phase-name-cell">
                              <strong>
                                {
                                  phase.phaseName
                                }
                              </strong>

                              <span>
                                {phase.phaseDescription ||
                                  "No description"}
                              </span>
                            </div>
                          </td>

                          <td>
                            <div className="experiment-phase-timeline">
                              <span>
                                {formatDate(
                                  phase.expectedStartDate
                                )}
                              </span>

                              <span>
                                →
                              </span>

                              <span>
                                {formatDate(
                                  phase.expectedEndDate
                                )}
                              </span>
                            </div>
                          </td>

                          <td>
                            <span
                              className={
                                getStatusClassName(
                                  phase.status
                                )
                              }
                            >
                              {getStatusLabel(
                                phase.status
                              )}
                            </span>
                          </td>

                          <td>
                            <div className="experiment-phase-actions">
                              <button
                                type="button"
                                className="experiment-phase-action-button"
                                title="View phase"
                                onClick={() =>
                                  navigate(
                                    `/experiment-phases/${phaseId}`
                                  )
                                }
                              >
                                <Eye
                                  size={17}
                                />
                              </button>

                              {permission.canEditExperimentPhase &&
                                experimentIsEditable && (
                                <button
                                  type="button"
                                  className="experiment-phase-action-button"
                                  title="Edit phase"
                                  onClick={() =>
                                    navigate(
                                      `/experiment-phases/${phaseId}/edit`
                                    )
                                  }
                                >
                                  <Pencil
                                    size={17}
                                  />
                                </button>
                              )}

                              {permission.canDeleteExperimentPhase &&
                                experimentIsEditable && (
                                <button
                                  type="button"
                                  className="experiment-phase-action-button experiment-phase-delete-button"
                                  title="Delete phase"
                                  disabled={
                                    isDeleting
                                  }
                                  onClick={() =>
                                    void handleDeletePhase(
                                      phase
                                    )
                                  }
                                >
                                  <Trash2
                                    size={17}
                                  />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}