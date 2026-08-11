import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import { getSchedules } from "../../services/scheduleService";

import type {
  Schedule,
  ScheduleStatus,
} from "../../types/schedule";

import "./ScheduleCalendar.css";

/* ─── helpers ─── */

const WEEKDAY_LABELS = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getStatusClass(status: ScheduleStatus): string {
  switch (status) {
    case "InProgress":
      return "status-in-progress";
    case "Completed":
      return "status-completed";
    case "Cancelled":
      return "status-cancelled";
    case "Planned":
    default:
      return "status-planned";
  }
}

function getStatusLabel(status: ScheduleStatus): string {
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

function getPriorityClass(priority: number): string {
  if (priority >= 3) return "priority-urgent";
  if (priority >= 2) return "priority-high";
  return "";
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function getErrorMessage(error: unknown): string {
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
            errors?: Record<string, string[]>;
          };
        };
      }
    ).response;

    if (response?.data?.message) return response.data.message;
    if (response?.data?.error) return response.data.error;
    if (response?.data?.errors) {
      return Object.values(response.data.errors).flat().join(" ");
    }
    if (response?.data?.title) return response.data.title;
  }

  if (error instanceof Error) return error.message;
  return "Cannot load schedules.";
}

/* ─── calendar math ─── */

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

function buildCalendarDays(
  year: number,
  month: number
): CalendarDay[] {
  const today = new Date();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  // Monday = 0, Sunday = 6  (ISO)
  let startDow = firstOfMonth.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days: CalendarDay[] = [];

  // days from previous month
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({
      date: d,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: isSameDay(d, today),
    });
  }

  // days of current month
  for (let d = 1; d <= lastOfMonth.getDate(); d++) {
    const date = new Date(year, month, d);
    days.push({
      date,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: isSameDay(date, today),
    });
  }

  // pad to fill last row (always complete 6 rows = 42 cells, or at least fill current row)
  const remainder = days.length % 7;
  if (remainder > 0) {
    const fill = 7 - remainder;
    for (let i = 1; i <= fill; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        dayNumber: d.getDate(),
        isCurrentMonth: false,
        isToday: isSameDay(d, today),
      });
    }
  }

  return days;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ─── component ─── */

const MAX_EVENTS_PER_CELL = 3;

export default function ScheduleCalendar() {
  const navigate = useNavigate();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ScheduleStatus>("");

  /* load schedules */
  const loadSchedules = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getSchedules({
        page: 1,
        size: 500,
        status: statusFilter || undefined,
      });

      setSchedules(data);
    } catch (err) {
      console.error("Load schedules failed:", err);
      setError(getErrorMessage(err));
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  /* navigation */
  const goToPrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  /* build calendar grid */
  const calendarDays = useMemo(
    () => buildCalendarDays(year, month),
    [year, month]
  );

  /* map schedules to days */
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Schedule[]>();

    for (const schedule of schedules) {
      const start = new Date(schedule.startDate);
      const end = schedule.endDate
        ? new Date(schedule.endDate)
        : start;

      if (Number.isNaN(start.getTime())) continue;

      // For multi-day events, place them on each day
      const current = new Date(start);
      const endDay = Number.isNaN(end.getTime()) ? start : end;

      while (current <= endDay) {
        const key = dateKey(current);
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(schedule);
        current.setDate(current.getDate() + 1);
      }
    }

    return map;
  }, [schedules]);

  /* status filter chips */
  const statusOptions: { value: "" | ScheduleStatus; label: string }[] = [
    { value: "", label: "All" },
    { value: "Planned", label: "Planned" },
    { value: "InProgress", label: "In Progress" },
    { value: "Completed", label: "Completed" },
    { value: "Cancelled", label: "Cancelled" },
  ];

  return (
    <DashboardLayout>
      <div className="schedule-calendar-page">
        {/* Header */}
        <div className="schedule-calendar-header">
          <div>
            <p className="breadcrumb">
              Dashboard / Schedules
            </p>
            <h1>My Schedules</h1>
            <p className="subtitle">
              View your assigned tasks on a monthly calendar. Click on a task to see details.
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="calendar-toolbar">
          <div className="calendar-nav">
            <button
              type="button"
              className="calendar-nav-btn"
              onClick={goToPrevMonth}
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>

            <span className="calendar-month-label">
              {MONTH_NAMES[month]} {year}
            </span>

            <button
              type="button"
              className="calendar-nav-btn"
              onClick={goToNextMonth}
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>

            <button
              type="button"
              className="calendar-today-btn"
              onClick={goToToday}
            >
              Today
            </button>
          </div>

          {/* Legend */}
          <div className="calendar-legend">
            <span className="calendar-legend-item">
              <span className="calendar-legend-dot planned" />
              Planned
            </span>
            <span className="calendar-legend-item">
              <span className="calendar-legend-dot in-progress" />
              In Progress
            </span>
            <span className="calendar-legend-item">
              <span className="calendar-legend-dot completed" />
              Completed
            </span>
            <span className="calendar-legend-item">
              <span className="calendar-legend-dot cancelled" />
              Cancelled
            </span>
          </div>
        </div>

        {/* Status filter chips */}
        <div style={{ marginBottom: "16px" }}>
          <div className="calendar-status-filter">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`calendar-status-chip${statusFilter === opt.value ? " active" : ""}`}
                onClick={() => setStatusFilter(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="calendar-error">{error}</div>
        )}

        {/* Calendar Grid */}
        <div className="calendar-grid-card">
          {/* Weekday Header */}
          <div className="calendar-weekday-header">
            {WEEKDAY_LABELS.map((day) => (
              <div key={day} className="calendar-weekday-cell">
                {day}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="calendar-loading">
              Loading schedules...
            </div>
          ) : (
            <div className="calendar-days-grid">
              {calendarDays.map((day, idx) => {
                const key = dateKey(day.date);
                const dayEvents = eventsByDate.get(key) || [];
                const visibleEvents = dayEvents.slice(0, MAX_EVENTS_PER_CELL);
                const extraCount = dayEvents.length - MAX_EVENTS_PER_CELL;

                const cellClasses = [
                  "calendar-day-cell",
                  !day.isCurrentMonth && "outside-month",
                  day.isToday && "today",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <div key={idx} className={cellClasses}>
                    <div className="calendar-day-number">
                      {day.dayNumber}
                    </div>

                    <div className="calendar-events">
                      {visibleEvents.map((schedule) => (
                        <div
                          key={schedule.scheduleId}
                          className={`calendar-event ${getStatusClass(schedule.status)} ${getPriorityClass(schedule.priority)}`}
                          title={`${schedule.title || `Schedule #${schedule.scheduleId}`} — ${getStatusLabel(schedule.status)}`}
                          onClick={() =>
                            navigate(
                              `/schedules/${schedule.scheduleId}`
                            )
                          }
                        >
                          {schedule.title ||
                            `Schedule #${schedule.scheduleId}`}
                        </div>
                      ))}

                      {extraCount > 0 && (
                        <div className="calendar-more-events">
                          +{extraCount} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
