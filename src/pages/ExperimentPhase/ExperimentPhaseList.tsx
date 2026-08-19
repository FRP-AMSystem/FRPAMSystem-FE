import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  CalendarDays,
  Eye,
  Layers3,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  deleteExperimentPhase,
  getExperimentPhases,
} from "../../services/experimentPhaseService";

import type {
  ExperimentPhase,
  ExperimentPhaseStatus,
} from "../../types/experimentPhase";

import "./ExperimentPhaseList.css";

type Role =
  | "Admin"
  | "Manager"
  | "Researcher"
  | "Technician"
  | "Student"
  | "Seasonal";

type StatusFilter =
  | ""
  | ExperimentPhaseStatus;

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

  return "Cannot load experiment phases.";
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

export default function ExperimentPhaseList() {
  const navigate =
    useNavigate();

  const role =
    localStorage.getItem(
      "role"
    ) as Role | null;

  const canManage =
    role === "Admin" || role === "Manager" || role === "Researcher";

  const [
    phases,
    setPhases,
  ] = useState<
    ExperimentPhase[]
  >([]);

  const [
    keyword,
    setKeyword,
  ] = useState("");

  const [
    searchKeyword,
    setSearchKeyword,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState<StatusFilter>("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    deletingId,
    setDeletingId,
  ] = useState<
    number | null
  >(null);

  const [
    error,
    setError,
  ] = useState("");

  const loadPhases =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          const data =
            await getExperimentPhases(
              {
                keyword:
                  searchKeyword ||
                  undefined,

                status:
                  status ||
                  undefined,

                page: 1,
                size: 100,
              }
            );

          const sortedPhases =
            [...data].sort(
              (
                firstPhase,
                secondPhase
              ) => {
                if (
                  firstPhase.experimentId !==
                  secondPhase.experimentId
                ) {
                  return (
                    firstPhase.experimentId -
                    secondPhase.experimentId
                  );
                }

                return (
                  firstPhase.phaseOrder -
                  secondPhase.phaseOrder
                );
              }
            );

          setPhases(
            sortedPhases
          );
        } catch (loadError) {
          console.error(
            "Load experiment phases failed:",
            loadError
          );

          setError(
            getErrorMessage(
              loadError
            )
          );

          setPhases([]);
        } finally {
          setLoading(false);
        }
      },
      [
        searchKeyword,
        status,
      ]
    );

  useEffect(() => {
    void loadPhases();
  }, [loadPhases]);

  const handleKeywordChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    setKeyword(
      event.target.value
    );
  };

  const handleStatusChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    setStatus(
      event.target.value as StatusFilter
    );
  };

  const handleSearch = () => {
    setSearchKeyword(
      keyword.trim()
    );
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement>
  ) => {
    if (
      event.key === "Enter"
    ) {
      handleSearch();
    }
  };

  const handleClearFilters = () => {
    setKeyword("");
    setSearchKeyword("");
    setStatus("");
  };

  const handleDelete = async (
    phase: ExperimentPhase
  ) => {
    if (!canManage) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete phase "${phase.phaseName}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        phase.experimentPhaseId
      );

      setError("");

      await deleteExperimentPhase(
        phase.experimentPhaseId
      );

      setPhases(
        (currentPhases) =>
          currentPhases.filter(
            (item) =>
              item.experimentPhaseId !==
              phase.experimentPhaseId
          )
      );
    } catch (deleteError) {
      console.error(
        "Delete experiment phase failed:",
        deleteError
      );

      setError(
        getErrorMessage(
          deleteError
        )
      );
    } finally {
      setDeletingId(null);
    }
  };

  const hasActiveFilters =
    Boolean(
      keyword ||
      searchKeyword ||
      status
    );

  return (
    <DashboardLayout>
      <div className="experiment-phase-list-page">
        <div className="experiment-phase-list-header">
          <div>
            <p className="experiment-phase-list-breadcrumb">
              Dashboard / Experiment Phases
            </p>

            <h1>
              Experiment Phases
            </h1>

            <p className="experiment-phase-list-description">
              Manage the planned stages,
              timelines and progress of
              experiments.
            </p>
          </div>

          {canManage && (
            <button
              type="button"
              className="experiment-phase-create-button"
              onClick={() =>
                navigate(
                  "/experiment-phases/create"
                )
              }
            >
              <Plus size={18} />

              Create Phase
            </button>
          )}
        </div>

        <section className="experiment-phase-toolbar">
          <div className="experiment-phase-search-wrapper">
            <Search
              size={18}
              className="experiment-phase-search-icon"
            />

            <input
              type="text"
              value={keyword}
              onChange={
                handleKeywordChange
              }
              onKeyDown={
                handleKeyDown
              }
              placeholder="Search by phase or experiment..."
            />
          </div>

          <select
            className="experiment-phase-status-filter"
            value={status}
            onChange={
              handleStatusChange
            }
          >
            <option value="">
              All statuses
            </option>

            <option value="Planned">
              Planned
            </option>

            <option value="InProgress">
              In Progress
            </option>

            <option value="Completed">
              Completed
            </option>

            <option value="Cancelled">
              Cancelled
            </option>
          </select>

          <button
            type="button"
            className="experiment-phase-search-button"
            onClick={
              handleSearch
            }
          >
            Search
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              className="experiment-phase-clear-button"
              onClick={
                handleClearFilters
              }
            >
              Clear
            </button>
          )}
        </section>

        {error && (
          <div className="experiment-phase-error">
            {error}
          </div>
        )}

        <section className="experiment-phase-table-card">
          <div className="experiment-phase-table-header">
            <div>
              <h2>
                Phase List
              </h2>

              <p>
                {phases.length} phase
                {phases.length === 1
                  ? ""
                  : "s"}
              </p>
            </div>

            <div className="experiment-phase-table-header-icon">
              <Layers3 size={22} />
            </div>
          </div>

          {loading ? (
            <div className="experiment-phase-state">
              Loading experiment phases...
            </div>
          ) : phases.length ===
            0 ? (
            <div className="experiment-phase-empty-state">
              <Layers3 size={46} />

              <h3>
                No experiment phases found
              </h3>

              <p>
                {hasActiveFilters
                  ? "No phase matches the current filters."
                  : "Create the first phase to define an experiment timeline."}
              </p>

              {canManage &&
                !hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/experiment-phases/create"
                      )
                    }
                  >
                    <Plus size={18} />

                    Create Experiment Phase
                  </button>
                )}
            </div>
          ) : (
            <div className="experiment-phase-table-wrapper">
              <table className="experiment-phase-table">
                <thead>
                  <tr>
                    <th>
                      Experiment
                    </th>

                    <th>
                      Phase
                    </th>

                    <th>
                      Order
                    </th>

                    <th>
                      Start Date
                    </th>

                    <th>
                      End Date
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
                    (phase) => (
                      <tr
                        key={
                          phase.experimentPhaseId
                        }
                      >
                        <td>
                          <div className="experiment-phase-experiment">
                            <strong>
                              {phase.experimentName ||
                                `Experiment #${phase.experimentId}`}
                            </strong>

                            <span>
                              ID: #
                              {
                                phase.experimentId
                              }
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="experiment-phase-name">
                            <strong>
                              {phase.phaseName ||
                                "-"}
                            </strong>

                            <span>
                              {phase.phaseDescription ||
                                "No description"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className="experiment-phase-order">
                            {
                              phase.phaseOrder
                            }
                          </span>
                        </td>

                        <td>
                          <div className="experiment-phase-date">
                            <CalendarDays
                              size={16}
                            />

                            <span>
                              {formatDate(
                                phase.expectedStartDate
                              )}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="experiment-phase-date">
                            <CalendarDays
                              size={16}
                            />

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
                                  `/experiment-phases/${phase.experimentPhaseId}`
                                )
                              }
                            >
                              <Eye size={12} />
                              <span>View</span>
                            </button>

                            {canManage && (
                              <>
                                <button
                                  type="button"
                                  className="action-btn-pill edit"
                                  onClick={() =>
                                    navigate(
                                      `/experiment-phases/${phase.experimentPhaseId}/edit`
                                    )
                                  }
                                >
                                  <Pencil size={12} />
                                  <span>Edit</span>
                                </button>

                                <button
                                  type="button"
                                  className="action-btn-pill delete"
                                  disabled={
                                    deletingId ===
                                    phase.experimentPhaseId
                                  }
                                  onClick={() =>
                                    void handleDelete(phase)
                                  }
                                >
                                  <Trash2 size={12} />
                                  <span>
                                    {deletingId === phase.experimentPhaseId
                                      ? "..."
                                      : "Delete"}
                                  </span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
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