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
  Clock3,
  FileText,
  Hash,
  Layers3,
  Pencil,
  Trash2,
  UserRound,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  deleteSchedule,
  getScheduleById,
} from "../../services/scheduleService";

import type {
  Schedule,
  ScheduleStatus,
} from "../../types/schedule";

import "./ScheduleDetail.css";

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

function getCurrentRole(): Role {
  const storedRole =
    localStorage.getItem("role");

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
          status?: number;
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

    if (response?.status === 404) {
      return "Schedule was not found.";
    }

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

  return "Cannot load schedule.";
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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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
    "vi-VN"
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
      return "schedule-detail-status schedule-detail-status-progress";

    case "Completed":
      return "schedule-detail-status schedule-detail-status-completed";

    case "Cancelled":
      return "schedule-detail-status schedule-detail-status-cancelled";

    case "Planned":
    default:
      return "schedule-detail-status schedule-detail-status-planned";
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
      return "schedule-detail-priority schedule-detail-priority-urgent";

    case 2:
      return "schedule-detail-priority schedule-detail-priority-high";

    case 1:
      return "schedule-detail-priority schedule-detail-priority-medium";

    case 0:
    default:
      return "schedule-detail-priority schedule-detail-priority-low";
  }
}

export default function ScheduleDetail() {
  const navigate = useNavigate();

  const { id } =
    useParams<{ id: string }>();

  const scheduleId = Number(id);

  const role = getCurrentRole();

  const canManage =
    role === "Researcher";

  const [
    schedule,
    setSchedule,
  ] = useState<Schedule | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSchedule() {
      if (
        !id ||
        !Number.isInteger(scheduleId) ||
        scheduleId <= 0
      ) {
        if (active) {
          setError(
            "Invalid schedule ID."
          );

          setLoading(false);
        }

        return;
      }

      try {
        setLoading(true);
        setError("");

        const data =
          await getScheduleById(
            scheduleId
          );

        if (active) {
          setSchedule(data);
        }
      } catch (loadError) {
        console.error(
          "Load schedule detail failed:",
          loadError
        );

        if (active) {
          setSchedule(null);

          setError(
            getErrorMessage(
              loadError
            )
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSchedule();

    return () => {
      active = false;
    };
  }, [id, scheduleId]);

  const handleDelete = async () => {
    if (
      !canManage ||
      !schedule
    ) {
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
      setDeleting(true);
      setError("");

      await deleteSchedule(
        schedule.scheduleId
      );

      navigate(
        "/schedules",
        {
          replace: true,
        }
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
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="schedule-detail-page">
          <div className="schedule-detail-state">
            Loading schedule...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (
    error &&
    !schedule
  ) {
    return (
      <DashboardLayout>
        <div className="schedule-detail-page">
          <div className="schedule-detail-header">
            <div>
              <p className="schedule-detail-breadcrumb">
                Dashboard / Schedules / Detail
              </p>

              <h1>
                Schedule Detail
              </h1>
            </div>

            <button
              type="button"
              className="schedule-detail-back-button"
              onClick={() =>
                navigate(
                  "/schedules"
                )
              }
            >
              <ArrowLeft size={18} />

              Back
            </button>
          </div>

          <div className="schedule-detail-error">
            {error}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!schedule) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="schedule-detail-page">
        <div className="schedule-detail-header">
          <div>
            <p className="schedule-detail-breadcrumb">
              Dashboard / Schedules / #
              {schedule.scheduleId}
            </p>

            <h1>
              {schedule.title ||
                `Schedule #${schedule.scheduleId}`}
            </h1>

            <p className="schedule-detail-description">
              View the schedule timeline,
              allocation, assigned personnel
              and current status.
            </p>
          </div>

          <div className="schedule-detail-header-actions">
            <button
              type="button"
              className="schedule-detail-back-button"
              onClick={() =>
                navigate(
                  "/schedules"
                )
              }
            >
              <ArrowLeft size={18} />

              Back
            </button>

            {canManage && (
              <>
                <button
                  type="button"
                  className="schedule-detail-edit-button"
                  onClick={() =>
                    navigate(
                      `/schedules/${schedule.scheduleId}/edit`
                    )
                  }
                >
                  <Pencil size={18} />

                  Edit
                </button>

                <button
                  type="button"
                  className="schedule-detail-delete-button"
                  disabled={deleting}
                  onClick={() =>
                    void handleDelete()
                  }
                >
                  <Trash2 size={18} />

                  {deleting
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="schedule-detail-error">
            {error}
          </div>
        )}

        <section className="schedule-detail-summary-card">
          <div className="schedule-detail-summary-icon">
            <CalendarDays size={30} />
          </div>

          <div className="schedule-detail-summary-grid">
            <div>
              <span>
                Schedule ID
              </span>

              <strong>
                #{schedule.scheduleId}
              </strong>
            </div>

            <div>
              <span>
                Status
              </span>

              <strong
                className={
                  getStatusClassName(
                    schedule.status
                  )
                }
              >
                {getStatusLabel(
                  schedule.status
                )}
              </strong>
            </div>

            <div>
              <span>
                Priority
              </span>

              <strong
                className={
                  getPriorityClassName(
                    schedule.priority
                  )
                }
              >
                {getPriorityLabel(
                  schedule.priority
                )}
              </strong>
            </div>
          </div>
        </section>

        <div className="schedule-detail-grid">
          <section className="schedule-detail-card">
            <div className="schedule-detail-card-title">
              <ClipboardList size={21} />

              <h2>
                Allocation Information
              </h2>
            </div>

            <div className="schedule-detail-information">
              <div>
                <span>
                  Allocation Plan
                </span>

                <strong>
                  {schedule.allocationPlanName ||
                    `Allocation #${schedule.allocationPlanId}`}
                </strong>
              </div>

              <div>
                <span>
                  Allocation Plan ID
                </span>

                <strong>
                  #{schedule.allocationPlanId}
                </strong>
              </div>

              <div>
                <span>
                  Experiment Phase
                </span>

                <strong>
                  {schedule.phaseName ||
                    (schedule.phaseId
                      ? `Phase #${schedule.phaseId}`
                      : "No phase")}
                </strong>
              </div>

              <div>
                <span>
                  Phase ID
                </span>

                <strong>
                  {schedule.phaseId
                    ? `#${schedule.phaseId}`
                    : "-"}
                </strong>
              </div>
            </div>
          </section>

          <section className="schedule-detail-card">
            <div className="schedule-detail-card-title">
              <Clock3 size={21} />

              <h2>
                Schedule Timeline
              </h2>
            </div>

            <div className="schedule-detail-information">
              <div>
                <span>
                  Start Date
                </span>

                <strong>
                  {formatDate(
                    schedule.startDate
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Start Time
                </span>

                <strong>
                  {formatTime(
                    schedule.startDate
                  )}
                </strong>
              </div>

              <div>
                <span>
                  End Date
                </span>

                <strong>
                  {formatDate(
                    schedule.endDate
                  )}
                </strong>
              </div>

              <div>
                <span>
                  End Time
                </span>

                <strong>
                  {formatTime(
                    schedule.endDate
                  )}
                </strong>
              </div>
            </div>
          </section>

          <section className="schedule-detail-card">
            <div className="schedule-detail-card-title">
              <UserRound size={21} />

              <h2>
                Assignment Information
              </h2>
            </div>

            <div className="schedule-detail-information">
              <div>
                <span>
                  Assigned Human Resource
                </span>

                <strong>
                  {schedule.assignedHumanResourceName ||
                    (schedule.assignedHumanResourceId
                      ? `Human Resource #${schedule.assignedHumanResourceId}`
                      : "Not assigned")}
                </strong>
              </div>

              <div>
                <span>
                  Human Resource ID
                </span>

                <strong>
                  {schedule.assignedHumanResourceId
                    ? `#${schedule.assignedHumanResourceId}`
                    : "-"}
                </strong>
              </div>

              <div>
                <span>
                  Created By
                </span>

                <strong>
                  {schedule.createdByName ||
                    (schedule.createdBy
                      ? `User #${schedule.createdBy}`
                      : "-")}
                </strong>
              </div>

              <div>
                <span>
                  Created By ID
                </span>

                <strong>
                  {schedule.createdBy
                    ? `#${schedule.createdBy}`
                    : "-"}
                </strong>
              </div>
            </div>
          </section>

          <section className="schedule-detail-card">
            <div className="schedule-detail-card-title">
              <Hash size={21} />

              <h2>
                Record Information
              </h2>
            </div>

            <div className="schedule-detail-information">
              <div>
                <span>
                  Created At
                </span>

                <strong>
                  {formatDateTime(
                    schedule.createdAt
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Updated At
                </span>

                <strong>
                  {formatDateTime(
                    schedule.updatedAt
                  )}
                </strong>
              </div>
            </div>
          </section>

          <section className="schedule-detail-card schedule-detail-wide-card">
            <div className="schedule-detail-card-title">
              <FileText size={21} />

              <h2>
                Description
              </h2>
            </div>

            <p className="schedule-detail-text-content">
              {schedule.description ||
                "No description was provided."}
            </p>
          </section>

          <section className="schedule-detail-card schedule-detail-wide-card">
            <div className="schedule-detail-card-title">
              <Layers3 size={21} />

              <h2>
                Notes
              </h2>
            </div>

            <p className="schedule-detail-text-content">
              {schedule.notes ||
                "No additional notes were provided."}
            </p>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}