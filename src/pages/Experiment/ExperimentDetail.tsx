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
  CheckCircle2,
  Eye,
  Layers3,
  Pencil,
  Plus,
  Send,
  Trash2,
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

type Role =
  | "Admin"
  | "Manager"
  | "Researcher"
  | "Technician"
  | "Student";

const priorityLabels: Record<
  number,
  string
> = {
  0: "Low",
  1: "Medium",
  2: "High",
  3: "Urgent",
};

function getCurrentRole(): Role {
  const storedRole =
    localStorage.getItem(
      "role"
    );

  if (
    storedRole === "Admin" ||
    storedRole === "Manager" ||
    storedRole === "Researcher" ||
    storedRole === "Technician" ||
    storedRole === "Student"
  ) {
    return storedRole;
  }

  return "Student";
}

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
    getCurrentRole();

  const canManageExperiment =
    role === "Researcher";

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

  useEffect(() => {
    void loadExperiment();
    void loadExperimentPhases();
  }, [
    loadExperiment,
    loadExperimentPhases,
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
        !canManageExperiment
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

  const canSubmit =
    canManageExperiment &&
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

        {canManageExperiment && (
          <div className="detail-actions">
            {experimentIsEditable && (
              <>
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

                <button
                  type="button"
                  className="requirement-btn"
                  onClick={() =>
                    navigate(
                      `/equipment-requirements/create?experimentId=${experiment.experimentId}`
                    )
                  }
                >
                  Create Requirement
                </button>
              </>
            )}

            {canSubmit && (
              <button
                type="button"
                className="experiment-submit-button"
                disabled={
                  submitting ||
                  phases.length ===
                    0
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
          </div>
        )}

        {canSubmit &&
          phases.length === 0 && (
          <div className="experiment-submit-hint">
            Create at least one phase before submitting this experiment.
          </div>
        )}

        <section className="experiment-phase-section">
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

            {canManageExperiment &&
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

              {canManageExperiment &&
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

                              {canManageExperiment &&
                                experimentIsEditable && (
                                <>
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
                                </>
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