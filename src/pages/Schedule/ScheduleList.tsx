import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  Eye,
  Pencil,
  Plus,
  Search,
  UserRound,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";
import { getSchedules, getMySchedules } from "../../services/scheduleService";
import type { Schedule, ScheduleStatus } from "../../types/schedule";
import "./ScheduleList.css";

type Role = "Admin" | "Manager" | "Researcher" | "Technician" | "Student" | "Seasonal";
type StatusFilter = "" | ScheduleStatus;

type ScheduleGroup = {
  key: string;
  title: string;
  description: string;
  allocationPlanId: number;
  allocationPlanName?: string | null;
  phaseId?: number | null;
  phaseName?: string | null;
  assignedHumanResourceId?: number | null;
  assignedHumanResourceName?: string | null;
  priority: number;
  schedules: Schedule[];
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  statuses: ScheduleStatus[];
};

const priorityLabels: Record<number, string> = { 0: "Low", 1: "Medium", 2: "High", 3: "Urgent" };

function getCurrentRole(): Role {
  const role = localStorage.getItem("role");
  if (role === "Admin" || role === "Manager" || role === "Researcher" || role === "Technician" || role === "Student" || role === "Seasonal") return role;
  return "Seasonal";
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string; title?: string; error?: string; errors?: Record<string, string[]> } } }).response;
    if (response?.data?.message) return response.data.message;
    if (response?.data?.error) return response.data.error;
    if (response?.data?.errors) return Object.values(response.data.errors).flat().join(" ");
    if (response?.data?.title) return response.data.title;
  }
  if (error instanceof Error) return error.message;
  return "Cannot load schedules.";
}

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value?: string | null): string {
  const date = toDate(value);
  return date ? date.toLocaleDateString("en-GB") : value || "-";
}

function formatTime(value?: string | null): string {
  const date = toDate(value);
  return date ? date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }) : "-";
}

function formatWeekday(value?: string | null): string {
  const date = toDate(value);
  return date ? date.toLocaleDateString("en-US", { weekday: "short" }) : "-";
}

function getStatusLabel(status: ScheduleStatus): string {
  if (status === "InProgress") return "In Progress";
  return status;
}

function getStatusClassName(status: ScheduleStatus): string {
  if (status === "InProgress") return "schedule-status schedule-status-progress";
  if (status === "Completed") return "schedule-status schedule-status-completed";
  if (status === "Cancelled") return "schedule-status schedule-status-cancelled";
  return "schedule-status schedule-status-planned";
}

function getPriorityLabel(priority: number): string {
  return priorityLabels[priority] ?? `Priority ${priority}`;
}

function getPriorityClassName(priority: number): string {
  if (priority === 3) return "schedule-priority schedule-priority-urgent";
  if (priority === 2) return "schedule-priority schedule-priority-high";
  if (priority === 1) return "schedule-priority schedule-priority-medium";
  return "schedule-priority schedule-priority-low";
}

function getGroupStatus(statuses: ScheduleStatus[]): ScheduleStatus {
  if (statuses.includes("InProgress")) return "InProgress";
  if (statuses.every((s) => s === "Completed")) return "Completed";
  if (statuses.every((s) => s === "Cancelled")) return "Cancelled";
  return "Planned";
}

function makeGroupKey(schedule: Schedule): string {
  // The API currently stores one record per working day and has no assignmentBatchId.
  // These stable assignment fields let the list present those daily records as one assignment.
  return [
    schedule.allocationPlanId,
    schedule.assignedHumanResourceId ?? "none",
    schedule.phaseId ?? "none",
    schedule.title?.trim() || "Untitled",
    schedule.description?.trim() || "",
    schedule.notes?.trim() || "",
    schedule.priority,
  ].join("::");
}

function groupSchedules(items: Schedule[]): ScheduleGroup[] {
  const map = new Map<string, Schedule[]>();
  for (const schedule of items) {
    const key = makeGroupKey(schedule);
    const existing = map.get(key) ?? [];
    existing.push(schedule);
    map.set(key, existing);
  }

  return Array.from(map.entries()).map(([key, groupItems]) => {
    const ordered = [...groupItems].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    return {
      key,
      title: first.title || `Assignment #${first.scheduleId}`,
      description: first.description || first.notes || "No description",
      allocationPlanId: Number(first.allocationPlanId),
      allocationPlanName: first.allocationPlanName,
      phaseId: first.phaseId,
      phaseName: first.phaseName,
      assignedHumanResourceId: first.assignedHumanResourceId,
      assignedHumanResourceName: first.assignedHumanResourceName,
      priority: first.priority,
      schedules: ordered,
      startDate: first.startDate,
      endDate: last.endDate,
      startTime: first.startDate,
      endTime: first.endDate,
      statuses: ordered.map((s) => s.status),
    };
  }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

export default function ScheduleList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const allocationPlanIdFilter = Number(searchParams.get("allocationPlanId") || 0);
  const humanResourceIdFilter = Number(searchParams.get("humanResourceId") || 0);
  const createdFromAssign = searchParams.get("created") === "1";
  const createdCount = Number(searchParams.get("createdCount") || 0);

  const role = getCurrentRole();
  const canManage = role === "Admin" || role === "Manager" || role === "Researcher";

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [startDateFrom, setStartDateFrom] = useState("");
  const [startDateTo, setStartDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const loadSchedules = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const isFieldStaff = role === "Technician" || role === "Seasonal" || role === "Student";
      const params = {
        keyword: searchKeyword || undefined,
        status: status || undefined,
        startDateFrom: startDateFrom || undefined,
        startDateTo: startDateTo || undefined,
        page: 1,
        size: 100,
      };
      const data = isFieldStaff
        ? await getMySchedules(params).catch(() => getSchedules(params))
        : await getSchedules(params);

      const filtered = [...data]
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .filter((schedule) => {
          if (allocationPlanIdFilter && Number(schedule.allocationPlanId) !== allocationPlanIdFilter) return false;
          if (humanResourceIdFilter && Number(schedule.assignedHumanResourceId) !== humanResourceIdFilter) return false;
          return true;
        });
      setSchedules(filtered);
    } catch (loadError) {
      console.error("Load schedules failed:", loadError);
      setError(getErrorMessage(loadError));
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, status, startDateFrom, startDateTo, role, allocationPlanIdFilter, humanResourceIdFilter]);

  useEffect(() => { void loadSchedules(); }, [loadSchedules]);

  const groups = useMemo(() => groupSchedules(schedules), [schedules]);
  const { currentPage, pageSize, paginatedItems, setCurrentPage, setPageSize } = usePagination(groups, 10);

  const handleSearch = () => {
    if (startDateFrom && startDateTo && startDateTo < startDateFrom) {
      setError("The end filter date cannot be earlier than the start filter date.");
      return;
    }
    setError("");
    setSearchKeyword(keyword.trim());
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setKeyword("");
    setSearchKeyword("");
    setStatus("");
    setStartDateFrom("");
    setStartDateTo("");
    setError("");
    setSearchParams({});
    setCurrentPage(1);
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const hasActiveFilters = Boolean(keyword || searchKeyword || status || startDateFrom || startDateTo || allocationPlanIdFilter || humanResourceIdFilter);

  return (
    <DashboardLayout>
      <div className="schedule-list-page">
        <div className="schedule-list-header">
          <div>
            <p className="schedule-list-breadcrumb">Dashboard / Schedules</p>
            <h1>Schedules</h1>
            <p className="schedule-list-description">View work assignments and expand an assignment to see its scheduled working days.</p>
          </div>
          {canManage && (
            <button type="button" className="schedule-create-button" onClick={() => navigate("/schedules/create")}>
              <Plus size={18} /> Create Schedule
            </button>
          )}
        </div>

        <section className="schedule-filter-card">
          <div className="schedule-search-wrapper">
            <Search size={18} className="schedule-search-icon" />
            <input
              type="text"
              value={keyword}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setKeyword(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleSearch()}
              placeholder="Search by title, description or notes..."
            />
          </div>
          <select className="schedule-filter-select" value={status} onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as StatusFilter)}>
            <option value="">All statuses</option>
            <option value="Planned">Planned</option>
            <option value="InProgress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <div className="schedule-date-filter">
            <label htmlFor="scheduleStartDateFrom">From</label>
            <input id="scheduleStartDateFrom" type="date" value={startDateFrom} onChange={(e) => setStartDateFrom(e.target.value)} />
          </div>
          <div className="schedule-date-filter">
            <label htmlFor="scheduleStartDateTo">To</label>
            <input id="scheduleStartDateTo" type="date" min={startDateFrom || undefined} value={startDateTo} onChange={(e) => setStartDateTo(e.target.value)} />
          </div>
          <button type="button" className="schedule-search-button" onClick={handleSearch}>Search</button>
          {hasActiveFilters && <button type="button" className="schedule-clear-button" onClick={handleClearFilters}>Clear</button>}
        </section>

        {(allocationPlanIdFilter || humanResourceIdFilter) && (
          <div style={{ marginBottom: 16, padding: "14px 16px", border: "1px solid #bbf7d0", borderRadius: 12, background: "#f0fdf4", color: "#166534", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <strong>{createdFromAssign ? `${createdCount || schedules.length} scheduled day${(createdCount || schedules.length) === 1 ? "" : "s"} created successfully` : "Filtered schedule results"}</strong>
              <div style={{ marginTop: 4, fontSize: 13 }}>
                {allocationPlanIdFilter ? `Allocation #${allocationPlanIdFilter}` : ""}
                {allocationPlanIdFilter && humanResourceIdFilter ? " • " : ""}
                {humanResourceIdFilter ? `Assigned Human #${humanResourceIdFilter}` : ""}
              </div>
            </div>
            <button type="button" className="schedule-clear-button" onClick={() => setSearchParams({})}>Show All Schedules</button>
          </div>
        )}

        {error && <div className="schedule-list-error">{error}</div>}

        <section className="schedule-table-card">
          <div className="schedule-table-header">
            <div>
              <h2>Schedule Assignments</h2>
              <p>{groups.length} assignment{groups.length === 1 ? "" : "s"} • {schedules.length} scheduled day{schedules.length === 1 ? "" : "s"}</p>
            </div>
            <div className="schedule-table-header-icon"><CalendarDays size={22} /></div>
          </div>

          {loading ? (
            <div className="schedule-list-state">Loading schedules...</div>
          ) : groups.length === 0 ? (
            <div className="schedule-empty-state">
              <CalendarDays size={46} />
              <h3>No schedules found</h3>
              <p>{hasActiveFilters ? "No schedule matches the current filters." : "Create a schedule for an approved allocation plan."}</p>
            </div>
          ) : (
            <div className="schedule-table-wrapper">
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th>Assignment</th>
                    <th>Allocation</th>
                    <th>Phase</th>
                    <th>Assigned Human</th>
                    <th>Period</th>
                    <th>Daily Time</th>
                    <th>Days</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((group) => {
                    const expanded = expandedGroups.has(group.key);
                    const groupStatus = getGroupStatus(group.statuses);
                    return (
                      <Fragment key={group.key}>
                        <tr key={group.key}>
                          <td><div className="schedule-title-cell"><strong>{group.title}</strong><span>{group.description}</span></div></td>
                          <td><div className="schedule-main-cell"><strong>{group.allocationPlanName || `Allocation #${group.allocationPlanId}`}</strong><span>ID: #{group.allocationPlanId}</span></div></td>
                          <td>{group.phaseId ? <div className="schedule-main-cell"><strong>{group.phaseName || `Phase #${group.phaseId}`}</strong><span>ID: #{group.phaseId}</span></div> : <span className="schedule-muted">No phase</span>}</td>
                          <td>{group.assignedHumanResourceId ? <div className="schedule-human-cell"><UserRound size={16} /><div><strong>{group.assignedHumanResourceName || `Human #${group.assignedHumanResourceId}`}</strong><span>ID: #{group.assignedHumanResourceId}</span></div></div> : <span className="schedule-muted">Not assigned</span>}</td>
                          <td><div className="schedule-date-cell"><CalendarDays size={15} /><div><strong>{formatDate(group.startDate)}</strong><span>to {formatDate(group.endDate)}</span></div></div></td>
                          <td><div className="schedule-date-cell"><Clock3 size={15} /><div><strong>{formatTime(group.startTime)}</strong><span>to {formatTime(group.endTime)}</span></div></div></td>
                          <td><strong>{group.schedules.length}</strong><div className="schedule-muted">working day{group.schedules.length === 1 ? "" : "s"}</div></td>
                          <td><span className={getPriorityClassName(group.priority)}>{getPriorityLabel(group.priority)}</span></td>
                          <td><span className={getStatusClassName(groupStatus)}>{getStatusLabel(groupStatus)}</span></td>
                          <td>
                            <div className="schedule-actions" style={{ gap: 6, flexWrap: "nowrap" }}>
                              <button type="button" className="action-btn-pill view" onClick={() => navigate(`/schedules/${group.schedules[0].scheduleId}`)} title="View assignment">
                                <Eye size={12} /><span>View</span>
                              </button>
                              {canManage && (
                                <button type="button" className="action-btn-pill edit" onClick={() => navigate(`/schedules/${group.schedules[0].scheduleId}/edit`)} title="Edit assignment">
                                  <Pencil size={12} /><span>Edit</span>
                                </button>
                              )}
                              <button type="button" className="action-btn-pill view" onClick={() => toggleGroup(group.key)} title={expanded ? "Hide scheduled days" : "Show scheduled days"}>
                                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />} <span>{expanded ? "Hide" : "Days"}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expanded && (
                          <tr key={`${group.key}-details`}>
                            <td colSpan={10} style={{ padding: 0, background: "#f8fafc" }}>
                              <div style={{ padding: "14px 18px 18px 46px" }}>
                                <div style={{ fontWeight: 700, marginBottom: 10, color: "#0f172a" }}>Scheduled Days ({group.schedules.length})</div>
                                <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
                                  <div style={{ maxHeight: 320, overflowY: "auto" }}>
                                    {group.schedules.map((schedule, index) => (
                                      <div key={schedule.scheduleId} style={{ display: "grid", gridTemplateColumns: "72px 160px 180px 130px", gap: 18, alignItems: "center", padding: "11px 14px", borderBottom: index === group.schedules.length - 1 ? "none" : "1px solid #eef2f7" }}>
                                        <strong>{formatWeekday(schedule.startDate)}</strong>
                                        <span>{formatDate(schedule.startDate)}</span>
                                        <span>{formatTime(schedule.startDate)} → {formatTime(schedule.endDate)}</span>
                                        <span className={getStatusClassName(schedule.status)} style={{ justifySelf: "start" }}>{getStatusLabel(schedule.status)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              <Pagination currentPage={currentPage} totalItems={groups.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
