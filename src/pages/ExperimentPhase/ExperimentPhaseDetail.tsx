import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  FlaskConical,
  Hash,
  Layers3,
  Pencil,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getExperimentPhaseById,
} from "../../services/experimentPhaseService";

import type {
  ExperimentPhase,
  ExperimentPhaseStatus,
} from "../../types/experimentPhase";

import "./ExperimentPhaseDetail.css";

type Role =
  | "Manager"
  | "Researcher"
  | "Technician" | "Student" | "Seasonal";

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
          status?: number;

          data?: {
            message?: string;
            title?: string;

            errors?: Record<
              string,
              string[]
            >;
          };
        };
      }
    ).response;

    if (
      response?.status === 404
    ) {
      return "Experiment phase was not found.";
    }

    if (
      response?.data?.message
    ) {
      return response.data.message;
    }

    if (
      response?.data?.errors
    ) {
      return Object.values(
        response.data.errors
      )
        .flat()
        .join(" ");
    }

    if (
      response?.data?.title
    ) {
      return response.data.title;
    }
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return "Cannot load experiment phase.";
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
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(date);
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
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function getStatusLabel(
  status: ExperimentPhaseStatus
): string {
  switch (status) {
    case "InProgress":
      return "In Progress";

    case "Completed":
      return "Completed";

    case "Cancelled":
      return "Cancelled";

    case "Planned":
    default:
      return "Planned";
  }
}

function getStatusClassName(
  status: ExperimentPhaseStatus
): string {
  switch (status) {
    case "InProgress":
      return "experiment-phase-detail-status experiment-phase-detail-status-progress";

    case "Completed":
      return "experiment-phase-detail-status experiment-phase-detail-status-completed";

    case "Cancelled":
      return "experiment-phase-detail-status experiment-phase-detail-status-cancelled";

    case "Planned":
    default:
      return "experiment-phase-detail-status experiment-phase-detail-status-planned";
  }
}

export default function ExperimentPhaseDetail() {
  const navigate =
    useNavigate();

  const {
    id,
  } = useParams();

  const phaseId =
    Number(id);

  const role =
    localStorage.getItem(
      "role"
    ) as Role | null;

  const canEdit =
    role === "Admin" || role === "Manager" || role === "Researcher";

  const [
    phase,
    setPhase,
  ] = useState<
    ExperimentPhase | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    async function loadPhase() {
      if (
        !Number.isInteger(
          phaseId
        ) ||
        phaseId <= 0
      ) {
        setError(
          "Invalid experiment phase ID."
        );

        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data =
          await getExperimentPhaseById(
            phaseId
          );

        setPhase(data);
      } catch (loadError) {
        console.error(
          "Load experiment phase detail failed:",
          loadError
        );

        setError(
          getErrorMessage(
            loadError
          )
        );

        setPhase(null);
      } finally {
        setLoading(false);
      }
    }

    void loadPhase();
  }, [phaseId]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="experiment-phase-detail-page">
          <div className="experiment-phase-detail-state">
            Loading experiment phase...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (
    error ||
    !phase
  ) {
    return (
      <DashboardLayout>
        <div className="experiment-phase-detail-page">
          <div className="experiment-phase-detail-header">
            <div>
              <p className="experiment-phase-detail-breadcrumb">
                Dashboard / Experiment Phases / Detail
              </p>

              <h1>
                Experiment Phase Detail
              </h1>
            </div>

            <button
              type="button"
              className="experiment-phase-detail-back-button"
              onClick={() =>
                navigate(
                  "/experiment-phases"
                )
              }
            >
              <ArrowLeft size={18} />

              Back
            </button>
          </div>

          <div className="experiment-phase-detail-error">
            {error ||
              "Experiment phase was not found."}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="experiment-phase-detail-page">
        <div className="experiment-phase-detail-header">
          <div>
            <p className="experiment-phase-detail-breadcrumb">
              Dashboard / Experiment Phases / #{phase.experimentPhaseId}
            </p>

            <h1>
              {phase.phaseName}
            </h1>

            <p className="experiment-phase-detail-description">
              View timeline, status and
              experiment information for
              this phase.
            </p>
          </div>

          <div className="experiment-phase-detail-header-actions">
            <button
              type="button"
              className="experiment-phase-detail-back-button"
              onClick={() =>
                navigate(
                  "/experiment-phases"
                )
              }
            >
              <ArrowLeft size={18} />

              Back
            </button>

            {canEdit && (
              <button
                type="button"
                className="experiment-phase-detail-edit-button"
                onClick={() =>
                  navigate(
                    `/experiment-phases/${phase.experimentPhaseId}/edit`
                  )
                }
              >
                <Pencil size={18} />

                Edit Phase
              </button>
            )}
          </div>
        </div>

        <section className="experiment-phase-detail-summary-card">
          <div className="experiment-phase-detail-summary-icon">
            <Layers3 size={30} />
          </div>

          <div className="experiment-phase-detail-summary-content">
            <div>
              <span>
                Phase Name
              </span>

              <strong>
                {phase.phaseName ||
                  "-"}
              </strong>
            </div>

            <div>
              <span>
                Phase Order
              </span>

              <strong>
                #{phase.phaseOrder}
              </strong>
            </div>

            <div>
              <span>
                Status
              </span>

              <strong
                className={
                  getStatusClassName(
                    phase.status
                  )
                }
              >
                {getStatusLabel(
                  phase.status
                )}
              </strong>
            </div>
          </div>
        </section>

        <div className="experiment-phase-detail-grid">
          <section className="experiment-phase-detail-card">
            <div className="experiment-phase-detail-card-title">
              <FlaskConical
                size={21}
              />

              <h2>
                Experiment Information
              </h2>
            </div>

            <div className="experiment-phase-detail-information">
              <div>
                <span>
                  Experiment
                </span>

                <strong>
                  {phase.experimentName ||
                    `Experiment #${phase.experimentId}`}
                </strong>
              </div>

              <div>
                <span>
                  Experiment ID
                </span>

                <strong>
                  #{phase.experimentId}
                </strong>
              </div>

              <div>
                <span>
                  Phase ID
                </span>

                <strong>
                  #{phase.experimentPhaseId}
                </strong>
              </div>

              <div>
                <span>
                  Phase Order
                </span>

                <strong>
                  {phase.phaseOrder}
                </strong>
              </div>
            </div>
          </section>

          <section className="experiment-phase-detail-card">
            <div className="experiment-phase-detail-card-title">
              <CalendarDays
                size={21}
              />

              <h2>
                Expected Timeline
              </h2>
            </div>

            <div className="experiment-phase-detail-information">
              <div>
                <span>
                  Expected Start Date
                </span>

                <strong>
                  {formatDate(
                    phase.expectedStartDate
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Expected End Date
                </span>

                <strong>
                  {formatDate(
                    phase.expectedEndDate
                  )}
                </strong>
              </div>
            </div>
          </section>

          <section className="experiment-phase-detail-card experiment-phase-detail-description-card">
            <div className="experiment-phase-detail-card-title">
              <ClipboardList
                size={21}
              />

              <h2>
                Phase Description
              </h2>
            </div>

            <p className="experiment-phase-detail-description-content">
              {phase.phaseDescription ||
                "No description was provided for this experiment phase."}
            </p>
          </section>

          <section className="experiment-phase-detail-card">
            <div className="experiment-phase-detail-card-title">
              <Hash size={21} />

              <h2>
                Record Information
              </h2>
            </div>

            <div className="experiment-phase-detail-information">
              <div>
                <span>
                  Created At
                </span>

                <strong>
                  {formatDateTime(
                    phase.createdAt
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Updated At
                </span>

                <strong>
                  {formatDateTime(
                    phase.updatedAt
                  )}
                </strong>
              </div>
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}