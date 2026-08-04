import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  Eye,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getScheduleConflicts,
} from "../../services/scheduleConflictService";

import type {
  ScheduleConflict,
  ScheduleConflictSeverity,
  ScheduleConflictType,
} from "../../types/scheduleConflict";

import "./ConflictList.css";

type ConflictTypeFilter =
  | ""
  | ScheduleConflictType;

type SeverityFilter =
  | ""
  | ScheduleConflictSeverity;

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
            error?: string;

            errors?: Record<
              string,
              string[]
            >;
          };
        };
      }
    ).response;

    if (response?.data?.message) {
      return response.data.message;
    }

    if (response?.data?.error) {
      return response.data.error;
    }

    if (response?.data?.errors) {
      return Object.values(
        response.data.errors
      )
        .flat()
        .join(" ");
    }

    if (response?.data?.title) {
      return response.data.title;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Cannot load schedule conflicts.";
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

  return date.toLocaleString(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function getDurationText(
  startDate: string,
  endDate: string
): string {
  const startTime =
    new Date(startDate).getTime();

  const endTime =
    new Date(endDate).getTime();

  if (
    Number.isNaN(startTime) ||
    Number.isNaN(endTime) ||
    endTime <= startTime
  ) {
    return "-";
  }

  const totalMinutes =
    Math.round(
      (endTime - startTime) /
        60_000
    );

  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} minute${
      minutes === 1
        ? ""
        : "s"
    }`;
  }

  if (minutes === 0) {
    return `${hours} hour${
      hours === 1
        ? ""
        : "s"
    }`;
  }

  return `${hours}h ${minutes}m`;
}

function getConflictTypeLabel(
  conflictType: ScheduleConflictType
): string {
  switch (conflictType) {
    case "HumanResourceOverlap":
      return "Human Resource";

    case "AllocationOverlap":
      return "Allocation";

    case "PhaseOverlap":
      return "Experiment Phase";

    default:
      return conflictType;
  }
}

function getConflictTypeClassName(
  conflictType: ScheduleConflictType
): string {
  switch (conflictType) {
    case "HumanResourceOverlap":
      return "conflict-type conflict-type-human";

    case "AllocationOverlap":
      return "conflict-type conflict-type-allocation";

    case "PhaseOverlap":
      return "conflict-type conflict-type-phase";

    default:
      return "conflict-type";
  }
}

function getSeverityClassName(
  severity: ScheduleConflictSeverity
): string {
  switch (severity) {
    case "High":
      return "conflict-severity conflict-severity-high";

    case "Medium":
      return "conflict-severity conflict-severity-medium";

    case "Low":
    default:
      return "conflict-severity conflict-severity-low";
  }
}

function getScheduleTitle(
  title: string | null | undefined,
  scheduleId: number
): string {
  return (
    title?.trim() ||
    `Schedule #${scheduleId}`
  );
}

export default function ConflictList() {
  const navigate =
    useNavigate();

  const [
    conflicts,
    setConflicts,
  ] = useState<
    ScheduleConflict[]
  >([]);

  const [
    keyword,
    setKeyword,
  ] = useState("");

  const [
    appliedKeyword,
    setAppliedKeyword,
  ] = useState("");

  const [
    conflictType,
    setConflictType,
  ] = useState<ConflictTypeFilter>(
    ""
  );

  const [
    severity,
    setSeverity,
  ] = useState<SeverityFilter>(
    ""
  );

  const [
    startDateFrom,
    setStartDateFrom,
  ] = useState("");

  const [
    startDateTo,
    setStartDateTo,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const loadConflicts =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await getScheduleConflicts({
            keyword:
              appliedKeyword ||
              undefined,

            conflictType:
              conflictType ||
              undefined,

            severity:
              severity ||
              undefined,

            startDateFrom:
              startDateFrom ||
              undefined,

            startDateTo:
              startDateTo ||
              undefined,
          });

        setConflicts(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (loadError) {
        console.error(
          "Load conflicts failed:",
          loadError
        );

        setError(
          getErrorMessage(
            loadError
          )
        );

        setConflicts([]);
      } finally {
        setLoading(false);
      }
    }, [
      appliedKeyword,
      conflictType,
      severity,
      startDateFrom,
      startDateTo,
    ]);

  useEffect(() => {
    void loadConflicts();
  }, [loadConflicts]);

  const conflictSummary =
    useMemo(() => {
      return conflicts.reduce(
        (
          summary,
          conflict
        ) => {
          summary.total += 1;

          if (
            conflict.severity ===
            "High"
          ) {
            summary.high += 1;
          }

          if (
            conflict.severity ===
            "Medium"
          ) {
            summary.medium += 1;
          }

          if (
            conflict.severity ===
            "Low"
          ) {
            summary.low += 1;
          }

          return summary;
        },
        {
          total: 0,
          high: 0,
          medium: 0,
          low: 0,
        }
      );
    }, [conflicts]);

  const handleKeywordChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    setKeyword(
      event.target.value
    );
  };

  const handleConflictTypeChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    setConflictType(
      event.target
        .value as ConflictTypeFilter
    );
  };

  const handleSeverityChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    setSeverity(
      event.target
        .value as SeverityFilter
    );
  };

  const handleSearch = () => {
    if (
      startDateFrom &&
      startDateTo &&
      startDateTo < startDateFrom
    ) {
      setError(
        "The end filter date cannot be earlier than the start filter date."
      );

      return;
    }

    setError("");

    setAppliedKeyword(
      keyword.trim()
    );
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  const handleClearFilters = () => {
    setKeyword("");
    setAppliedKeyword("");
    setConflictType("");
    setSeverity("");
    setStartDateFrom("");
    setStartDateTo("");
    setError("");
  };

  const hasActiveFilters =
    Boolean(
      keyword ||
      appliedKeyword ||
      conflictType ||
      severity ||
      startDateFrom ||
      startDateTo
    );

  return (
    <DashboardLayout>
      <div className="conflict-list-page">
        <div className="conflict-list-header">
          <div>
            <p className="conflict-list-breadcrumb">
              Dashboard / Conflicts
            </p>

            <h1>
              Schedule Conflicts
            </h1>

            <p className="conflict-list-description">
              Detect overlapping schedules,
              duplicate personnel assignments
              and allocation timeline
              conflicts.
            </p>
          </div>

          <button
            type="button"
            className="conflict-refresh-button"
            disabled={loading}
            onClick={() =>
              void loadConflicts()
            }
          >
            <RefreshCw
              size={18}
              className={
                loading
                  ? "conflict-refresh-icon spinning"
                  : "conflict-refresh-icon"
              }
            />

            Refresh
          </button>
        </div>

        <section className="conflict-summary-grid">
          <div className="conflict-summary-card">
            <div className="conflict-summary-icon conflict-summary-icon-total">
              <AlertTriangle
                size={21}
              />
            </div>

            <div>
              <span>
                Total Conflicts
              </span>

              <strong>
                {conflictSummary.total}
              </strong>
            </div>
          </div>

          <div className="conflict-summary-card">
            <div className="conflict-summary-icon conflict-summary-icon-high">
              <AlertTriangle
                size={21}
              />
            </div>

            <div>
              <span>
                High Severity
              </span>

              <strong>
                {conflictSummary.high}
              </strong>
            </div>
          </div>

          <div className="conflict-summary-card">
            <div className="conflict-summary-icon conflict-summary-icon-medium">
              <Clock3 size={21} />
            </div>

            <div>
              <span>
                Medium Severity
              </span>

              <strong>
                {conflictSummary.medium}
              </strong>
            </div>
          </div>

          <div className="conflict-summary-card">
            <div className="conflict-summary-icon conflict-summary-icon-low">
              <CalendarDays
                size={21}
              />
            </div>

            <div>
              <span>
                Low Severity
              </span>

              <strong>
                {conflictSummary.low}
              </strong>
            </div>
          </div>
        </section>

        <section className="conflict-filter-card">
          <div className="conflict-search-wrapper">
            <Search
              size={18}
              className="conflict-search-icon"
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
              placeholder="Search schedules, resources or allocations..."
            />
          </div>

          <select
            className="conflict-filter-select"
            value={conflictType}
            onChange={
              handleConflictTypeChange
            }
          >
            <option value="">
              All conflict types
            </option>

            <option value="HumanResourceOverlap">
              Human Resource
            </option>

            <option value="AllocationOverlap">
              Allocation
            </option>

            <option value="PhaseOverlap">
              Experiment Phase
            </option>
          </select>

          <select
            className="conflict-filter-select"
            value={severity}
            onChange={
              handleSeverityChange
            }
          >
            <option value="">
              All severities
            </option>

            <option value="High">
              High
            </option>

            <option value="Medium">
              Medium
            </option>

            <option value="Low">
              Low
            </option>
          </select>

          <div className="conflict-date-filter">
            <label htmlFor="conflictStartDateFrom">
              From
            </label>

            <input
              id="conflictStartDateFrom"
              type="date"
              value={
                startDateFrom
              }
              onChange={(event) =>
                setStartDateFrom(
                  event.target.value
                )
              }
            />
          </div>

          <div className="conflict-date-filter">
            <label htmlFor="conflictStartDateTo">
              To
            </label>

            <input
              id="conflictStartDateTo"
              type="date"
              min={
                startDateFrom ||
                undefined
              }
              value={
                startDateTo
              }
              onChange={(event) =>
                setStartDateTo(
                  event.target.value
                )
              }
            />
          </div>

          <button
            type="button"
            className="conflict-search-button"
            onClick={handleSearch}
          >
            Search
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              className="conflict-clear-button"
              onClick={
                handleClearFilters
              }
            >
              Clear
            </button>
          )}
        </section>

        {error && (
          <div className="conflict-list-error">
            {error}
          </div>
        )}

        <section className="conflict-table-card">
          <div className="conflict-table-header">
            <div>
              <h2>
                Detected Conflicts
              </h2>

              <p>
                {conflicts.length} conflict
                {conflicts.length === 1
                  ? ""
                  : "s"}{" "}
                found
              </p>
            </div>

            <div className="conflict-table-header-icon">
              <AlertTriangle
                size={22}
              />
            </div>
          </div>

          {loading ? (
            <div className="conflict-list-state">
              Checking schedule conflicts...
            </div>
          ) : conflicts.length ===
            0 ? (
            <div className="conflict-empty-state">
              <CalendarDays
                size={46}
              />

              <h3>
                No conflicts detected
              </h3>

              <p>
                {hasActiveFilters
                  ? "No conflict matches the current filters."
                  : "The current active schedules do not contain overlapping assignments."}
              </p>
            </div>
          ) : (
            <div className="conflict-table-wrapper">
              <table className="conflict-table">
                <thead>
                  <tr>
                    <th>
                      Severity
                    </th>

                    <th>
                      Conflict Type
                    </th>

                    <th>
                      Resource
                    </th>

                    <th>
                      First Schedule
                    </th>

                    <th>
                      Second Schedule
                    </th>

                    <th>
                      Overlap Period
                    </th>

                    <th>
                      Duration
                    </th>

                    <th>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {conflicts.map(
                    (conflict) => (
                      <tr
                        key={
                          conflict.conflictId
                        }
                      >
                        <td>
                          <span
                            className={
                              getSeverityClassName(
                                conflict.severity
                              )
                            }
                          >
                            {
                              conflict.severity
                            }
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              getConflictTypeClassName(
                                conflict.conflictType
                              )
                            }
                          >
                            {getConflictTypeLabel(
                              conflict.conflictType
                            )}
                          </span>
                        </td>

                        <td>
                          <div className="conflict-resource-cell">
                            {conflict.conflictType ===
                            "HumanResourceOverlap" ? (
                              <UserRound
                                size={17}
                              />
                            ) : (
                              <CalendarDays
                                size={17}
                              />
                            )}

                            <div>
                              <strong>
                                {conflict.resourceName ||
                                  "Unknown resource"}
                              </strong>

                              <span>
                                {conflict.resourceId
                                  ? `ID: #${conflict.resourceId}`
                                  : "-"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="conflict-schedule-cell">
                            <strong>
                              {getScheduleTitle(
                                conflict
                                  .firstSchedule
                                  .title,
                                conflict
                                  .firstSchedule
                                  .scheduleId
                              )}
                            </strong>

                            <span>
                              Schedule #
                              {
                                conflict
                                  .firstSchedule
                                  .scheduleId
                              }
                            </span>

                            <small>
                              {formatDateTime(
                                conflict
                                  .firstSchedule
                                  .startDate
                              )}
                              {" → "}
                              {formatDateTime(
                                conflict
                                  .firstSchedule
                                  .endDate
                              )}
                            </small>
                          </div>
                        </td>

                        <td>
                          <div className="conflict-schedule-cell">
                            <strong>
                              {getScheduleTitle(
                                conflict
                                  .secondSchedule
                                  .title,
                                conflict
                                  .secondSchedule
                                  .scheduleId
                              )}
                            </strong>

                            <span>
                              Schedule #
                              {
                                conflict
                                  .secondSchedule
                                  .scheduleId
                              }
                            </span>

                            <small>
                              {formatDateTime(
                                conflict
                                  .secondSchedule
                                  .startDate
                              )}
                              {" → "}
                              {formatDateTime(
                                conflict
                                  .secondSchedule
                                  .endDate
                              )}
                            </small>
                          </div>
                        </td>

                        <td>
                          <div className="conflict-overlap-cell">
                            <div>
                              <span>
                                Start
                              </span>

                              <strong>
                                {formatDateTime(
                                  conflict.overlapStart
                                )}
                              </strong>
                            </div>

                            <div>
                              <span>
                                End
                              </span>

                              <strong>
                                {formatDateTime(
                                  conflict.overlapEnd
                                )}
                              </strong>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="conflict-duration">
                            {getDurationText(
                              conflict.overlapStart,
                              conflict.overlapEnd
                            )}
                          </span>
                        </td>

                        <td>
                          <div className="conflict-actions">
                            <button
                              type="button"
                              className="conflict-action-button"
                              title="View first schedule"
                              onClick={() =>
                                navigate(
                                  `/schedules/${conflict.firstSchedule.scheduleId}`
                                )
                              }
                            >
                              <Eye size={17} />

                              <span>
                                First
                              </span>
                            </button>

                            <button
                              type="button"
                              className="conflict-action-button"
                              title="View second schedule"
                              onClick={() =>
                                navigate(
                                  `/schedules/${conflict.secondSchedule.scheduleId}`
                                )
                              }
                            >
                              <Eye size={17} />

                              <span>
                                Second
                              </span>
                            </button>
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

        <section className="conflict-information-card">
          <AlertTriangle size={21} />

          <div>
            <h3>
              Conflict detection information
            </h3>

            <p>
              Conflicts are calculated from
              active schedules. Cancelled
              schedules are ignored. Severity
              is based on the duration of the
              overlapping period.
            </p>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}