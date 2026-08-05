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
  Clock3,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  deleteSchedule,
  getSchedules,
} from "../../services/scheduleService";

import type {
  Schedule,
  ScheduleStatus,
} from "../../types/schedule";

import "./ScheduleList.css";

type Role =
  | "Manager"
  | "Researcher"
  | "Technician"
  | "Student";

type StatusFilter =
  | ""
  | ScheduleStatus;

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
    storedRole === "Manager" ||
    storedRole === "Researcher" ||
    storedRole === "Technician" ||
    storedRole === "Student"
  ) {
    return storedRole;
  }

  return "Student";
}

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

    if (
      response?.data?.message
    ) {
      return response.data.message;
    }

    if (
      response?.data?.error
    ) {
      return response.data.error;
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

  return "Cannot load schedules.";
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

  return date.toLocaleDateString(
    "vi-VN"
  );
}

function formatTime(
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

  return date.toLocaleTimeString(
    "vi-VN",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function getStatusLabel(
  status: ScheduleStatus
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
  status: ScheduleStatus
): string {
  switch (status) {
    case "InProgress":
      return "schedule-status schedule-status-progress";

    case "Completed":
      return "schedule-status schedule-status-completed";

    case "Cancelled":
      return "schedule-status schedule-status-cancelled";

    case "Planned":
    default:
      return "schedule-status schedule-status-planned";
  }
}

function getPriorityLabel(
  priority: number
): string {
  return (
    priorityLabels[priority] ??
    `Priority ${priority}`
  );
}

function getPriorityClassName(
  priority: number
): string {
  switch (priority) {
    case 3:
      return "schedule-priority schedule-priority-urgent";

    case 2:
      return "schedule-priority schedule-priority-high";

    case 1:
      return "schedule-priority schedule-priority-medium";

    case 0:
    default:
      return "schedule-priority schedule-priority-low";
  }
}

export default function ScheduleList() {
  const navigate =
    useNavigate();

  const role =
    getCurrentRole();

  const canManage =
    role === "Researcher";

  const [
    schedules,
    setSchedules,
  ] = useState<Schedule[]>([]);

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
    deletingId,
    setDeletingId,
  ] = useState<
    number | null
  >(null);

  const [
    error,
    setError,
  ] = useState("");

  const loadSchedules =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await getSchedules({
            keyword:
              searchKeyword ||
              undefined,

            status:
              status ||
              undefined,

            startDateFrom:
              startDateFrom ||
              undefined,

            startDateTo:
              startDateTo ||
              undefined,

            page: 1,
            size: 100,
          });

        const sortedSchedules =
          [...data].sort(
            (
              firstSchedule,
              secondSchedule
            ) => {
              const firstTime =
                new Date(
                  firstSchedule.startDate
                ).getTime();

              const secondTime =
                new Date(
                  secondSchedule.startDate
                ).getTime();

              if (
                Number.isNaN(firstTime)
              ) {
                return 1;
              }

              if (
                Number.isNaN(secondTime)
              ) {
                return -1;
              }

              return (
                firstTime -
                secondTime
              );
            }
          );

        setSchedules(
          sortedSchedules
        );
      } catch (loadError) {
        console.error(
          "Load schedules failed:",
          loadError
        );

        setError(
          getErrorMessage(
            loadError
          )
        );

        setSchedules([]);
      } finally {
        setLoading(false);
      }
    }, [
      searchKeyword,
      startDateFrom,
      startDateTo,
      status,
    ]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

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

  const handleStartDateFromChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    setStartDateFrom(
      event.target.value
    );
  };

  const handleStartDateToChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    setStartDateTo(
      event.target.value
    );
  };

  const handleSearch = () => {
    if (
      startDateFrom &&
      startDateTo &&
      startDateTo <
        startDateFrom
    ) {
      setError(
        "The end filter date cannot be earlier than the start filter date."
      );

      return;
    }

    setError("");

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
    setStartDateFrom("");
    setStartDateTo("");
    setError("");
  };

  const handleDelete = async (
    schedule: Schedule
  ) => {
    if (!canManage) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete schedule "${
          schedule.title ||
          `#${schedule.scheduleId}`
        }"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        schedule.scheduleId
      );

      setError("");

      await deleteSchedule(
        schedule.scheduleId
      );

      setSchedules(
        (currentSchedules) =>
          currentSchedules.filter(
            (item) =>
              item.scheduleId !==
              schedule.scheduleId
          )
      );
    } catch (deleteError) {
      console.error(
        "Delete schedule failed:",
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
      status ||
      startDateFrom ||
      startDateTo
    );

  return (
    <DashboardLayout>
      <div className="schedule-list-page">
        <div className="schedule-list-header">
          <div>
            <p className="schedule-list-breadcrumb">
              Dashboard / Schedules
            </p>

            <h1>
              Schedules
            </h1>

            <p className="schedule-list-description">
              View experiment schedules,
              allocation timelines and assigned
              personnel.
            </p>
          </div>

          {canManage && (
            <button
              type="button"
              className="schedule-create-button"
              onClick={() =>
                navigate(
                  "/schedules/create"
                )
              }
            >
              <Plus size={18} />

              Create Schedule
            </button>
          )}
        </div>

        <section className="schedule-filter-card">
          <div className="schedule-search-wrapper">
            <Search
              size={18}
              className="schedule-search-icon"
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
              placeholder="Search by title, description or notes..."
            />
          </div>

          <select
            className="schedule-filter-select"
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

          <div className="schedule-date-filter">
            <label htmlFor="scheduleStartDateFrom">
              From
            </label>

            <input
              id="scheduleStartDateFrom"
              type="date"
              value={
                startDateFrom
              }
              onChange={
                handleStartDateFromChange
              }
            />
          </div>

          <div className="schedule-date-filter">
            <label htmlFor="scheduleStartDateTo">
              To
            </label>

            <input
              id="scheduleStartDateTo"
              type="date"
              min={
                startDateFrom ||
                undefined
              }
              value={
                startDateTo
              }
              onChange={
                handleStartDateToChange
              }
            />
          </div>

          <button
            type="button"
            className="schedule-search-button"
            onClick={
              handleSearch
            }
          >
            Search
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              className="schedule-clear-button"
              onClick={
                handleClearFilters
              }
            >
              Clear
            </button>
          )}
        </section>

        {error && (
          <div className="schedule-list-error">
            {error}
          </div>
        )}

        <section className="schedule-table-card">
          <div className="schedule-table-header">
            <div>
              <h2>
                Schedule List
              </h2>

              <p>
                {schedules.length} schedule
                {schedules.length === 1
                  ? ""
                  : "s"}
              </p>
            </div>

            <div className="schedule-table-header-icon">
              <CalendarDays
                size={22}
              />
            </div>
          </div>

          {loading ? (
            <div className="schedule-list-state">
              Loading schedules...
            </div>
          ) : schedules.length ===
            0 ? (
            <div className="schedule-empty-state">
              <CalendarDays
                size={46}
              />

              <h3>
                No schedules found
              </h3>

              <p>
                {hasActiveFilters
                  ? "No schedule matches the current filters."
                  : "Create a schedule for an approved allocation plan."}
              </p>

              {canManage &&
                !hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/schedules/create"
                      )
                    }
                  >
                    <Plus size={18} />

                    Create Schedule
                  </button>
                )}
            </div>
          ) : (
            <div className="schedule-table-wrapper">
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th>ID</th>

                    <th>
                      Schedule
                    </th>

                    <th>
                      Allocation
                    </th>

                    <th>
                      Phase
                    </th>

                    <th>
                      Assigned Human
                    </th>

                    <th>
                      Start
                    </th>

                    <th>
                      End
                    </th>

                    <th>
                      Priority
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
                  {schedules.map(
                    (schedule) => {
                      const isDeleting =
                        deletingId ===
                        schedule.scheduleId;

                      return (
                        <tr
                          key={
                            schedule.scheduleId
                          }
                        >
                          <td>
                            <span className="schedule-id">
                              #
                              {
                                schedule.scheduleId
                              }
                            </span>
                          </td>

                          <td>
                            <div className="schedule-title-cell">
                              <strong>
                                {schedule.title ||
                                  `Schedule #${schedule.scheduleId}`}
                              </strong>

                              <span>
                                {schedule.description ||
                                  schedule.notes ||
                                  "No description"}
                              </span>
                            </div>
                          </td>

                          <td>
                            <div className="schedule-main-cell">
                              <strong>
                                {schedule.allocationPlanName ||
                                  `Allocation #${schedule.allocationPlanId}`}
                              </strong>

                              <span>
                                ID: #
                                {
                                  schedule.allocationPlanId
                                }
                              </span>
                            </div>
                          </td>

                          <td>
                            {schedule.phaseId ? (
                              <div className="schedule-main-cell">
                                <strong>
                                  {schedule.phaseName ||
                                    `Phase #${schedule.phaseId}`}
                                </strong>

                                <span>
                                  ID: #
                                  {
                                    schedule.phaseId
                                  }
                                </span>
                              </div>
                            ) : (
                              <span className="schedule-muted">
                                No phase
                              </span>
                            )}
                          </td>

                          <td>
                            {schedule.assignedHumanResourceId ? (
                              <div className="schedule-human-cell">
                                <UserRound
                                  size={16}
                                />

                                <div>
                                  <strong>
                                    {schedule.assignedHumanResourceName ||
                                      `Human #${schedule.assignedHumanResourceId}`}
                                  </strong>

                                  <span>
                                    ID: #
                                    {
                                      schedule.assignedHumanResourceId
                                    }
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="schedule-muted">
                                Not assigned
                              </span>
                            )}
                          </td>

                          <td>
                            <div className="schedule-date-cell">
                              <CalendarDays
                                size={15}
                              />

                              <div>
                                <strong>
                                  {formatDate(
                                    schedule.startDate
                                  )}
                                </strong>

                                <span>
                                  {formatTime(
                                    schedule.startDate
                                  )}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="schedule-date-cell">
                              <Clock3
                                size={15}
                              />

                              <div>
                                <strong>
                                  {formatDate(
                                    schedule.endDate
                                  )}
                                </strong>

                                <span>
                                  {formatTime(
                                    schedule.endDate
                                  )}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span
                              className={
                                getPriorityClassName(
                                  schedule.priority
                                )
                              }
                            >
                              {getPriorityLabel(
                                schedule.priority
                              )}
                            </span>
                          </td>

                          <td>
                            <span
                              className={
                                getStatusClassName(
                                  schedule.status
                                )
                              }
                            >
                              {getStatusLabel(
                                schedule.status
                              )}
                            </span>
                          </td>

                          <td>
                            <div className="schedule-actions">
                              <button
                                type="button"
                                className="schedule-action-button schedule-view-button"
                                title="View schedule"
                                onClick={() =>
                                  navigate(
                                    `/schedules/${schedule.scheduleId}`
                                  )
                                }
                              >
                                <Eye size={17} />
                              </button>

                              {canManage && (
                                <>
                                  <button
                                    type="button"
                                    className="schedule-action-button schedule-edit-button"
                                    title="Edit schedule"
                                    onClick={() =>
                                      navigate(
                                        `/schedules/${schedule.scheduleId}/edit`
                                      )
                                    }
                                  >
                                    <Pencil
                                      size={17}
                                    />
                                  </button>

                                  <button
                                    type="button"
                                    className="schedule-action-button schedule-delete-button"
                                    title="Delete schedule"
                                    disabled={
                                      isDeleting
                                    }
                                    onClick={() =>
                                      void handleDelete(
                                        schedule
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