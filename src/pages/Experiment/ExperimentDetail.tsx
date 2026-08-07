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
  ArrowLeft,
  ClipboardList,
  Eye,
  Layers3,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getExperimentById,
} from "../../services/experimentService";

import {
  deleteExperimentPhase,
  getExperimentPhases,
} from "../../services/experimentPhaseService";

import type {
  ExperimentResponse,
} from "../../types/experiment";

import type {
  ExperimentPhase,
  ExperimentPhaseStatus,
} from "../../types/experimentPhase";

import "./ExperimentDetail.css";
import "./ExperimentPhaseSection.css";

type Role =
  | "Manager"
  | "Researcher"
  | "Technician"
  | "Student";

const priorityLabels: Record<number, string> = {
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
    typeof response === "object" &&
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
      typeof objectResponse.data === "object" &&
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

  const storedRole =
    localStorage.getItem(
      "role"
    );

  const role: Role =
    storedRole === "Admin" ||
    storedRole === "Manager" ||
    storedRole === "Researcher" ||
    storedRole === "Technician" ||
    storedRole === "Student"
      ? storedRole
      : "Student";

  const canManageExperiment =
    role === "Admin" || role === "Manager" || role === "Researcher";

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
    phases,
    setPhases,
  ] = useState<ExperimentPhase[]>(
    []
  );

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
  ] = useState<number | null>(
    null
  );

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
          await getExperimentPhases(
            {
              experimentId,
              page: 1,
              size: 100,
            }
          );

        const normalizedPhases =
          normalizePhaseList(
            response
          )
            .filter(
              (phase) =>
                Number(
                  phase.experimentId
                ) === experimentId
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

  const handleDeletePhase =
    async (
      phase: ExperimentPhase
    ) => {
      if (
        !canManageExperiment
      ) {
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
    error ||
    !experiment
  ) {
    return (
      <DashboardLayout>
        <div className="experiment-detail-page">
          <div className="experiment-detail-header">
            <div>
              <p className="experiment-detail-breadcrumb">
                Dashboard / Experiments / Detail
              </p>

              <h1>
                Experiment Detail
              </h1>
            </div>

            <button
              type="button"
              className="experiment-detail-back-btn"
              onClick={() =>
                navigate(
                  "/experiments"
                )
              }
            >
              <ArrowLeft size={15} />
              Back
            </button>
          </div>

          <p className="experiment-detail-error">
            {error ||
              "Experiment not found."}
          </p>
        </div>
      </DashboardLayout>
    );
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

  return (
    <DashboardLayout>
      <div className="experiment-detail-page">
        <div className="experiment-detail-header">
          <div>
            <p className="experiment-detail-breadcrumb">
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
            className="experiment-detail-back-btn"
            onClick={() =>
              navigate(
                "/experiments"
              )
            }
          >
            <ArrowLeft size={15} />
            Back
          </button>
        </div>

        <div className="experiment-detail-grid">
          <div className="experiment-detail-card">
            <h3>
              General Information
            </h3>

            <div className="experiment-detail-item">
              <span className="experiment-detail-label">ID</span>
              <span className="experiment-detail-value">
                #{experiment.experimentId}
              </span>
            </div>

            <div className="experiment-detail-item">
              <span className="experiment-detail-label">Status</span>
              <span className="experiment-detail-value">
                {experiment.status || "-"}
              </span>
            </div>

            <div className="experiment-detail-item">
              <span className="experiment-detail-label">Priority</span>
              <span className="experiment-detail-value">{priority}</span>
            </div>

            <div className="experiment-detail-item">
              <span className="experiment-detail-label">Researcher</span>
              <span className="experiment-detail-value">
                {experiment.researcherName ||
                  experiment.createdByName ||
                  "-"}
              </span>
            </div>
          </div>

          <div className="experiment-detail-card">
            <h3>
              Schedule
            </h3>

            <div className="experiment-detail-item">
              <span className="experiment-detail-label">Expected Start Date</span>
              <span className="experiment-detail-value">
                {formatDate(experiment.expectStartDate)}
              </span>
            </div>

            <div className="experiment-detail-item">
              <span className="experiment-detail-label">Expected End Date</span>
              <span className="experiment-detail-value">
                {formatDate(experiment.expectEndDate)}
              </span>
            </div>

            <div className="experiment-detail-item">
              <span className="experiment-detail-label">Deadline</span>
              <span className="experiment-detail-value">
                {formatDate(experiment.deadline)}
              </span>
            </div>
          </div>

          <div className="experiment-detail-card">
            <h3>
              Audit Information
            </h3>

            <div className="experiment-detail-item">
              <span className="experiment-detail-label">Created By</span>
              <span className="experiment-detail-value">
                {experiment.createdByName || "-"}
              </span>
            </div>

            <div className="experiment-detail-item">
              <span className="experiment-detail-label">Created At</span>
              <span className="experiment-detail-value">
                {formatDateTime(experiment.createdAt)}
              </span>
            </div>

            <div className="experiment-detail-item">
              <span className="experiment-detail-label">Updated At</span>
              <span className="experiment-detail-value">
                {formatDateTime(experiment.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="experiment-detail-card experiment-detail-description-card">
          <h3>
            Description
          </h3>

          <p>
            {experiment.description ||
              "No description provided."}
          </p>
        </div>

        {canManageExperiment && (
          <div className="experiment-detail-actions">
            <button
              type="button"
              className="experiment-detail-edit-btn"
              onClick={() =>
                navigate(
                  `/experiments/${experiment.experimentId}/edit`
                )
              }
            >
              <Pencil size={14} />
              Edit Experiment
            </button>

            <button
              type="button"
              className="experiment-detail-requirement-btn"
              onClick={() =>
                navigate(
                  `/equipment-requirements/create?experimentId=${experiment.experimentId}`
                )
              }
            >
              <ClipboardList size={14} />
              Create Requirement
            </button>
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
                  Manage the stages and
                  expected timeline of this
                  experiment.
                </p>
              </div>
            </div>

            {canManageExperiment && (
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
                This experiment does not
                have any phases yet.
              </p>

              {canManageExperiment && (
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
                                className="action-btn-pill view"
                                onClick={() =>
                                  navigate(
                                    `/experiment-phases/${phaseId}`
                                  )
                                }
                              >
                                <Eye size={12} />
                                <span>View</span>
                              </button>

                              {canManageExperiment && (
                                <>
                                  <button
                                    type="button"
                                    className="action-btn-pill edit"
                                    onClick={() =>
                                      navigate(
                                        `/experiment-phases/${phaseId}/edit`
                                      )
                                    }
                                  >
                                    <Pencil size={12} />
                                    <span>Edit</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="action-btn-pill delete"
                                    disabled={isDeleting}
                                    onClick={() =>
                                      void handleDeletePhase(phase)
                                    }
                                  >
                                    <Trash2 size={12} />
                                    <span>{isDeleting ? "..." : "Delete"}</span>
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