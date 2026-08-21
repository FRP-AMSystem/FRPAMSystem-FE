import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  X,
} from "lucide-react";

import { getSchedules } from "../../../services/scheduleService";

import type { HumanResourceProfile } from "../../../types/humanResourceProfile";
import type { Schedule } from "../../../types/schedule";

import "./HumanScheduleCalendar.css";

const WORK_START_HOUR = 8;
const WORK_END_HOUR = 17;
const TOTAL_WORK_HOURS = WORK_END_HOUR - WORK_START_HOUR;

interface HumanScheduleCalendarProps {
  open: boolean;
  human: HumanResourceProfile | null;
  phaseId: number | null;
  phaseName?: string | null;
  phaseStartDate?: string | null;
  phaseEndDate?: string | null;
  experimentName?: string | null;
  requiredWorkingHours: number;
  selectedWorkingDates?: string[];
  onClose: () => void;
  onScheduled: (payload: {
    humanResourceId: number;
    phaseId: number;
    dates: string[];
  }) => void;
}

type DayState = "outside" | "available" | "busy" | "selected";

interface CalendarDay {
  key: string;
  date: Date;
  currentMonth: boolean;
  state: DayState;
  freeHours: number;
  busyHours: number;
}

interface TimeRange {
  start: number;
  end: number;
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value?: string | null): Date | null {
  if (!value) return null;

  const clean = value.slice(0, 10);
  const [year, month, day] = clean.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function startOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0
  );
}

function endOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  );
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function sameMonth(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth()
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toHourValue(date: Date): number {
  return (
    date.getHours() +
    date.getMinutes() / 60 +
    date.getSeconds() / 3600
  );
}

function mergeRanges(ranges: TimeRange[]): TimeRange[] {
  if (ranges.length === 0) return [];

  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: TimeRange[] = [{ ...sorted[0] }];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    const previous = merged[merged.length - 1];

    if (current.start <= previous.end) {
      previous.end = Math.max(previous.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function scheduleRangesForDate(
  schedules: Schedule[],
  dateKey: string
): TimeRange[] {
  const ranges: TimeRange[] = [];

  schedules.forEach((schedule) => {
    if (schedule.status === "Cancelled") return;

    const start = new Date(schedule.startDate);
    const end = new Date(schedule.endDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return;
    }

    const dayStart = parseLocalDate(dateKey);
    if (!dayStart) return;

    const dayEnd = endOfDay(dayStart);

    if (end <= dayStart || start >= dayEnd) return;

    const clippedStart = start < dayStart ? dayStart : start;
    const clippedEnd = end > dayEnd ? dayEnd : end;

    const startHour = clamp(
      toHourValue(clippedStart),
      WORK_START_HOUR,
      WORK_END_HOUR
    );
    const endHour = clamp(
      toHourValue(clippedEnd),
      WORK_START_HOUR,
      WORK_END_HOUR
    );

    if (endHour > startHour) {
      ranges.push({
        start: startHour,
        end: endHour,
      });
    }
  });

  return mergeRanges(ranges);
}

function getFreeRanges(busyRanges: TimeRange[]): TimeRange[] {
  const free: TimeRange[] = [];
  let cursor = WORK_START_HOUR;

  busyRanges.forEach((range) => {
    if (range.start > cursor) {
      free.push({
        start: cursor,
        end: range.start,
      });
    }

    cursor = Math.max(cursor, range.end);
  });

  if (cursor < WORK_END_HOUR) {
    free.push({
      start: cursor,
      end: WORK_END_HOUR,
    });
  }

  return free.filter((range) => range.end > range.start);
}

function totalHours(ranges: TimeRange[]): number {
  return ranges.reduce(
    (sum, range) => sum + (range.end - range.start),
    0
  );
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatHours(value: number): string {
  if (Math.abs(value - Math.round(value)) < 0.001) {
    return String(Math.round(value));
  }

  return value.toFixed(1);
}

function formatDateLabel(dateKey: string): string {
  const date = parseLocalDate(dateKey);
  if (!date) return dateKey;

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function HumanScheduleCalendar({
  open,
  human,
  phaseId,
  phaseName,
  phaseStartDate,
  phaseEndDate,
  experimentName,
  requiredWorkingHours,
  selectedWorkingDates = [],
  onClose,
  onScheduled,
}: HumanScheduleCalendarProps) {
  const phaseStart = useMemo(
    () => parseLocalDate(phaseStartDate),
    [phaseStartDate]
  );

  const phaseEnd = useMemo(
    () => parseLocalDate(phaseEndDate),
    [phaseEndDate]
  );

  const initialMonth = useMemo(() => {
    const base = phaseStart || new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  }, [phaseStart]);

  const [visibleMonth, setVisibleMonth] = useState(initialMonth);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalizedRequiredHours = useMemo(() => {
    const value = Number(requiredWorkingHours) || 0;
    return Math.max(0, value);
  }, [requiredWorkingHours]);

  const loadSchedules = useCallback(async () => {
    if (!open || !human || !phaseStart || !phaseEnd) return;

    try {
      setLoading(true);
      setError("");

      const data = await getSchedules({
        assignedHumanResourceId: human.humanResourceId,
        dateFrom: `${toLocalDateKey(phaseStart)}T00:00:00`,
        dateTo: `${toLocalDateKey(phaseEnd)}T23:59:59`,
        page: 1,
        size: 500,
      });

      setSchedules(data);
    } catch (loadError) {
      console.error("Load human schedules failed:", loadError);
      setSchedules([]);
      setError("Unable to load this person's schedule.");
    } finally {
      setLoading(false);
    }
  }, [open, human, phaseStart, phaseEnd]);

  useEffect(() => {
    if (!open) return;

    setVisibleMonth(initialMonth);
    setSelectedDates(Array.from(new Set(selectedWorkingDates)).sort());
    void loadSchedules();
  }, [open, initialMonth, loadSchedules, selectedWorkingDates]);

  const selectedDateSet = useMemo(
    () => new Set(selectedDates),
    [selectedDates]
  );

  const dayMetrics = useCallback(
  (dateKey: string) => {
    const busyRanges = scheduleRangesForDate(
      schedules,
      dateKey
    );

    const busyHours = totalHours(busyRanges);
    const freeRanges = getFreeRanges(busyRanges);
    const freeHours = totalHours(freeRanges);

    return {
      busyRanges,
      busyHours,
      freeRanges,
      freeHours,
    };
  },
  [schedules]
);

  const calendarDays = useMemo<CalendarDay[]>(() => {
    const first = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      1
    );

    const last = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + 1,
      0
    );

    const mondayIndex = (first.getDay() + 6) % 7;
    const gridStart = addDays(first, -mondayIndex);

    const lastMondayIndex = (last.getDay() + 6) % 7;
    const trailing = 6 - lastMondayIndex;
    const gridEnd = addDays(last, trailing);

    const days: CalendarDay[] = [];

    for (
      let cursor = gridStart;
      cursor <= gridEnd;
      cursor = addDays(cursor, 1)
    ) {
      const date = new Date(cursor);
      const key = toLocalDateKey(date);

      const insidePhase = Boolean(
        phaseStart &&
          phaseEnd &&
          startOfDay(date) >= startOfDay(phaseStart) &&
          startOfDay(date) <= startOfDay(phaseEnd)
      );

      const metrics = dayMetrics(key);
      let state: DayState = "outside";

      if (insidePhase) {
        if (selectedDateSet.has(key)) {
          state = "selected";
        } else if (
          normalizedRequiredHours > 0 &&
          normalizedRequiredHours <= TOTAL_WORK_HOURS &&
          metrics.freeHours + 0.0001 >= normalizedRequiredHours
        ) {
          state = "available";
        } else {
          state = "busy";
        }
      }

      days.push({
        key,
        date,
        currentMonth: sameMonth(date, visibleMonth),
        state,
        freeHours: metrics.freeHours,
        busyHours: metrics.busyHours,
      });
    }

    return days;
  }, [
    visibleMonth,
    phaseStart,
    phaseEnd,
    dayMetrics,
    selectedDateSet,
    normalizedRequiredHours,
  ]);

  const canGoPrevious = useMemo(() => {
    if (!phaseStart) return true;

    const previous = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() - 1,
      1
    );

    const phaseMonth = new Date(
      phaseStart.getFullYear(),
      phaseStart.getMonth(),
      1
    );

    return previous >= phaseMonth;
  }, [visibleMonth, phaseStart]);

  const canGoNext = useMemo(() => {
    if (!phaseEnd) return true;

    const next = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + 1,
      1
    );

    const phaseMonth = new Date(
      phaseEnd.getFullYear(),
      phaseEnd.getMonth(),
      1
    );

    return next <= phaseMonth;
  }, [visibleMonth, phaseEnd]);

  /*
   * Chỉ toggle ở FE. Chưa POST ngay để Researcher có thể chọn nhiều ngày.
   * Confirm chỉ lưu ngày đã chọn vào state của CreateAllocation. Schedule chỉ được POST khi Submit Allocation Plan.
   */
  const handleToggleDate = (day: CalendarDay) => {
    if (
      loading ||
      day.state === "outside" ||
      day.state === "busy"
    ) {
      return;
    }

    setError("");

    setSelectedDates((current) => {
      if (current.includes(day.key)) {
        return current.filter((date) => date !== day.key);
      }

      return [...current, day.key].sort();
    });
  };

  const handleConfirmDates = () => {
    if (!human || !phaseId) {
      setError("Phase or personnel information is missing.");
      return;
    }

    const requiredHours = normalizedRequiredHours;

    if (requiredHours <= 0) {
      setError("Required working hours must be greater than 0.");
      return;
    }

    if (requiredHours > TOTAL_WORK_HOURS) {
      setError(
        `Required working hours exceed the 08:00-17:00 workday (${TOTAL_WORK_HOURS} hours).`
      );
      return;
    }

    const invalidDate = selectedDates.find((dateKey) => {
      const metrics = dayMetrics(dateKey);
      return metrics.freeHours + 0.0001 < requiredHours;
    });

    if (invalidDate) {
      setError(
        `${formatDateLabel(invalidDate)} no longer has enough free working hours.`
      );
      void loadSchedules();
      return;
    }

    // IMPORTANT: this only saves the selected dates in FE state.
    // No POST/PUT/DELETE Schedule request is sent here.
    onScheduled({
      humanResourceId: human.humanResourceId,
      phaseId,
      dates: [...selectedDates].sort(),
    });
  };

  if (!open) return null;

  return (
    <div
      className="human-schedule-overlay"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className="human-schedule-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Personnel working schedule"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="human-schedule-header">
          <div>
            <div className="human-schedule-eyebrow">
              <CalendarDays size={15} /> Personnel Schedule
            </div>

            <h2>{human?.fullName || "Personnel"}</h2>

            <p>
              {human?.roleName || "Personnel"} • Office hours 08:00-17:00 • Required {" "}
              {formatHours(normalizedRequiredHours)} hrs/day
            </p>
          </div>

          <button
            type="button"
            className="human-schedule-close"
            onClick={onClose}
            aria-label="Close calendar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="human-schedule-phase-info">
          <div>
            <span>Experiment</span>
            <strong>{experimentName || "-"}</strong>
          </div>

          <div>
            <span>Phase</span>
            <strong>{phaseName || `#${phaseId ?? "-"}`}</strong>
          </div>

          <div>
            <span>Phase window</span>
            <strong>
              {phaseStartDate?.slice(0, 10) || "-"} → {" "}
              {phaseEndDate?.slice(0, 10) || "-"}
            </strong>
          </div>
        </div>

        {error && (
          <div className="human-schedule-error">
            {error}
          </div>
        )}

        <div className="human-schedule-toolbar">
          <button
            type="button"
            className="human-schedule-nav"
            disabled={!canGoPrevious || loading}
            onClick={() =>
              setVisibleMonth(
                (current) =>
                  new Date(
                    current.getFullYear(),
                    current.getMonth() - 1,
                    1
                  )
              )
            }
          >
            <ChevronLeft size={17} />
          </button>

          <strong>{monthLabel(visibleMonth)}</strong>

          <button
            type="button"
            className="human-schedule-nav"
            disabled={!canGoNext || loading}
            onClick={() =>
              setVisibleMonth(
                (current) =>
                  new Date(
                    current.getFullYear(),
                    current.getMonth() + 1,
                    1
                  )
              )
            }
          >
            <ChevronRight size={17} />
          </button>
        </div>

        <div className="human-schedule-weekdays">
          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
            (label) => (
              <span key={label}>{label}</span>
            )
          )}
        </div>

        <div className="human-schedule-grid">
          {calendarDays.map((day) => {
            const disabled =
              loading ||
              day.state === "outside" ||
              day.state === "busy";

            return (
              <button
                key={day.key}
                type="button"
                className={`human-schedule-day ${day.state} ${
                  !day.currentMonth ? "other-month" : ""
                }`}
                disabled={disabled}
                onClick={() => handleToggleDate(day)}
                title={
                  day.state === "outside"
                    ? "Outside phase date range"
                    : day.state === "busy"
                      ? `Not enough time: ${formatHours(
                          day.freeHours
                        )}h free / ${formatHours(
                          normalizedRequiredHours
                        )}h required`
                      : day.state === "selected"
                        ? "Selected. Click again to remove this date."
                        : `${formatHours(
                            day.freeHours
                          )}h free in 08:00-17:00`
                }
              >
                <span className="human-schedule-day-number">
                  {day.date.getDate()}
                </span>

                {day.state !== "outside" && (
                  <span className="human-schedule-hours">
                    {day.state === "selected"
                      ? "Selected"
                      : `${formatHours(day.freeHours)}h free`}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="human-schedule-legend">
          <div>
            <span className="legend-dot available" />
            Available / enough time
          </div>
          <div>
            <span className="legend-dot busy" />
            Busy / not enough time
          </div>
          <div>
            <span className="legend-dot selected" />
            Selected working date (not saved yet)
          </div>
          <div>
            <span className="legend-dot outside" />
            Outside phase
          </div>
        </div>

        <div className="human-schedule-footer-note">
          <Clock3 size={15} />
          Availability is calculated only inside 08:00-17:00. Selected dates are temporary and are saved to the backend only when the Allocation Plan is submitted.
        </div>

        <div className="human-schedule-selection-panel">
          <div className="human-schedule-selection-info">
            <strong>
              {selectedDates.length} working date(s) selected
            </strong>

            <span>
              Click an available date to add it. Click a green date again to remove it.
            </span>
          </div>

          {selectedDates.length > 0 && (
            <div className="human-schedule-selected-dates">
              {selectedDates.map((date) => (
                <span key={date}>
                  <Check size={12} />
                  {formatDateLabel(date)}
                </span>
              ))}
            </div>
          )}

          <div className="human-schedule-actions">
            <button
              type="button"
              className="human-schedule-clear-btn"
              disabled={selectedDates.length === 0}
              onClick={() => setSelectedDates([])}
            >
              Clear All
            </button>

            <button
              type="button"
              className="human-schedule-confirm-btn"
                onClick={handleConfirmDates}
            >
              {selectedDates.length > 0
                ? `Confirm ${selectedDates.length} Selected Date(s)`
                : "Confirm No Working Dates"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
