import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Layers,
  Users,
  AlertCircle,
  CheckCircle2,
  Info,
  UserCheck,
  Briefcase,
  ChevronRight,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import {
  getAllocationPlanById,
  getAllocationPlans,
} from "../../services/allocationPlanService";
import { getAllocationHumanDetails } from "../../services/allocationDetailService";
import { getExperimentPhases } from "../../services/experimentPhaseService";
import { getExperiments } from "../../services/experimentService";
import { createSchedule, getSchedules } from "../../services/scheduleService";
import ToastPopup, { type ToastType } from "../../components/common/ToastPopup";

import type { AllocationPlan } from "../../types/allocationPlan";
import type { AllocationHumanDetail } from "../../types/allocationHumanDetail";
import type { ExperimentPhase } from "../../types/experimentPhase";
import type { ExperimentResponse } from "../../types/experiment";
import type { ScheduleStatus } from "../../types/schedule";
import { getCurrentUserTokenInfo } from "../../utils/storage";

import "./CreateSchedule.css";

interface ScheduleFormState {
  allocationPlanId: string;
  phaseId: string;
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  assignedHumanResourceId: string;
  notes: string;
  priority: string;
}


interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel: string;
}

interface CompactTimeDropdownProps {
  value: string;
  items: string[];
  ariaLabel: string;
  onChange: (value: string) => void;
}

function CompactTimeDropdown({ value, items, ariaLabel, onChange }: CompactTimeDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        selectedRef.current?.scrollIntoView({ block: "center" });
      });
    }
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: "relative", minWidth: 0 }}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "100%",
          height: "40px",
          padding: "0 10px",
          border: `1px solid ${open ? "#16a34a" : "#cbd5e1"}`,
          borderRadius: "8px",
          background: "#fff",
          color: "#0f172a",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          outline: "none",
          boxShadow: open ? "0 0 0 3px rgba(34,197,94,.10)" : "none",
        }}
      >
        <span>{value}</span>
        <span style={{ color: "#64748b", fontSize: "10px" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          style={{
            position: "absolute",
            zIndex: 60,
            top: "calc(100% + 5px)",
            left: 0,
            right: 0,
            maxHeight: "176px",
            overflowY: "auto",
            padding: "5px",
            border: "1px solid #dbe3ee",
            borderRadius: "9px",
            background: "#fff",
            boxShadow: "0 10px 24px rgba(15,23,42,.14)",
            scrollbarWidth: "thin",
          }}
        >
          {items.map((item) => {
            const selected = item === value;
            return (
              <button
                key={item}
                ref={selected ? selectedRef : null}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(item);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  height: "32px",
                  padding: "0 9px",
                  border: 0,
                  borderRadius: "6px",
                  background: selected ? "#dcfce7" : "transparent",
                  color: selected ? "#15803d" : "#0f172a",
                  fontWeight: selected ? 800 : 600,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                {item}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScheduleTimePicker({ value, onChange, disabled = false, ariaLabel }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [hour = "08", minute = "00"] = (value || "08:00").split(":");
  const hours = useMemo(
    () => Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0")),
    []
  );
  const minutes = useMemo(
    () => Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0")),
    []
  );

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const setPart = (nextHour: string, nextMinute: string) => {
    onChange(`${nextHour.padStart(2, "0")}:${nextMinute.padStart(2, "0")}`);
  };

  return (
    <div ref={rootRef} style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        style={{
          width: "100%",
          height: "42px",
          border: `1px solid ${open ? "#16a34a" : "#cbd5e1"}`,
          borderRadius: "8px",
          background: disabled ? "#f8fafc" : "#fff",
          padding: "0 13px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          cursor: disabled ? "not-allowed" : "pointer",
          color: "#0f172a",
          boxShadow: open ? "0 0 0 3px rgba(34,197,94,.10)" : "none",
          transition: "border-color .15s ease, box-shadow .15s ease",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "9px", fontWeight: 600 }}>
          <Clock size={17} color="#16a34a" />
          {hour}:{minute}
        </span>
        <span style={{ color: "#64748b", fontSize: "11px" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && !disabled && (
        <div
          style={{
            position: "absolute",
            zIndex: 40,
            top: "calc(100% + 8px)",
            left: 0,
            width: "100%",
            minWidth: "260px",
            padding: "14px",
            border: "1px solid #dbe3ee",
            borderRadius: "12px",
            background: "#fff",
            boxShadow: "0 14px 34px rgba(15,23,42,.16)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>Select time</div>
              <div style={{ marginTop: "2px", fontSize: "11px", color: "#64748b" }}>24-hour format</div>
            </div>
            <div style={{ padding: "5px 9px", borderRadius: "8px", background: "#f0fdf4", color: "#15803d", fontWeight: 700, fontSize: "13px" }}>
              {hour}:{minute}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 18px 1fr", alignItems: "start", gap: "8px" }}>
            <CompactTimeDropdown
              ariaLabel={`${ariaLabel} hour`}
              value={hour}
              items={hours}
              onChange={(nextHour) => setPart(nextHour, minute)}
            />
            <span style={{ paddingTop: "10px", textAlign: "center", fontWeight: 800, color: "#64748b" }}>:</span>
            <CompactTimeDropdown
              ariaLabel={`${ariaLabel} minute`}
              value={minute}
              items={minutes}
              onChange={(nextMinute) => setPart(hour, nextMinute)}
            />
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              width: "100%",
              height: "36px",
              marginTop: "12px",
              border: 0,
              borderRadius: "8px",
              background: "#16a34a",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

const priorityLabels: Record<number, string> = {
  0: "Low",
  1: "Medium",
  2: "High",
  3: "Urgent",
};

const WEEK_DAYS = [
  { value: 1, label: "Mon", fullLabel: "Monday" },
  { value: 2, label: "Tue", fullLabel: "Tuesday" },
  { value: 3, label: "Wed", fullLabel: "Wednesday" },
  { value: 4, label: "Thu", fullLabel: "Thursday" },
  { value: 5, label: "Fri", fullLabel: "Friday" },
  { value: 6, label: "Sat", fullLabel: "Saturday" },
  { value: 0, label: "Sun", fullLabel: "Sunday" },
];

function dateOnly(value?: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function getDatesForWeekdays(start: string, end: string, weekdays: number[]): string[] {
  if (!start || !end || weekdays.length === 0) return [];
  const result: string[] = [];
  const cursor = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (cursor <= last) {
    if (weekdays.includes(cursor.getDay())) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, "0");
      const d = String(cursor.getDate()).padStart(2, "0");
      result.push(`${y}-${m}-${d}`);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function combineDateAndTime(dateStr: string, timeStr: string): string | null {
  if (!dateStr) return null;

  const validTime = timeStr && timeStr.trim() ? timeStr.trim() : "08:00";
  const [hours, minutes] = validTime.split(":").map(Number);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dateStr) ||
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  // IMPORTANT: The Schedule API expects the selected wall-clock time.
  // Do not call new Date(...).toISOString() here because that converts
  // local time to UTC (for example 08:00 can become 01:00).
  return `${dateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

export default function CreateSchedule() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const allocationPlanIdFromUrl = searchParams.get("allocationPlanId") ?? "";
  const phaseIdFromUrl = searchParams.get("phaseId") ?? "";
  const personnelIdFromUrl = searchParams.get("personnelId") ?? "";

  const currentUser = useMemo(() => getCurrentUserTokenInfo(), []);
  const role = currentUser.role || "Seasonal";
  const currentUserId = currentUser.userId ? Number(currentUser.userId) : null;

  // Master State
  const [allAllocationPlans, setAllAllocationPlans] = useState<AllocationPlan[]>([]);
  const [myExperiments, setMyExperiments] = useState<ExperimentResponse[]>([]);
  const [phases, setPhases] = useState<ExperimentPhase[]>([]);
  const [allocatedHumans, setAllocatedHumans] = useState<AllocationHumanDetail[]>([]);

  const [tasks, setTasks] = useState<string[]>([]);
  const [taskInput, setTaskInput] = useState("");

  const [form, setForm] = useState<ScheduleFormState>({
    allocationPlanId: allocationPlanIdFromUrl,
    phaseId: phaseIdFromUrl,
    title: "",
    description: "",
    startDate: "",
    startTime: "08:00",
    endDate: "",
    endTime: "17:00",
    assignedHumanResourceId: personnelIdFromUrl,
    notes: "",
    priority: "1",
  });

  // Default working week: Monday through Friday.
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);

  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [toast, setToast] = useState<{
    visible: boolean;
    type: ToastType;
    title?: string;
    message: string;
  }>({
    visible: false,
    type: "error",
    message: "",
  });

  const showToast = (message: string, type: ToastType = "error", title?: string) => {
    setError(message);
    setToast({
      visible: true,
      type,
      title:
        title ||
        (type === "error"
          ? "Schedule Validation Error"
          : type === "warning"
          ? "Warning"
          : "Notice"),
      message,
    });
  };

  // 1. Initial Load of Allocations & Experiments
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        setError("");

        const [allocationsRes, expRes] = await Promise.all([
          getAllocationPlans().catch(() => []),
          role === "Researcher" && currentUserId
            ? getExperiments({ researcherId: currentUserId, size: 300 }).catch(() => [])
            : getExperiments({ size: 300 }).catch(() => []),
        ]);

        let rawAllocations = Array.isArray(allocationsRes) ? allocationsRes : [];
        const rawExperiments = Array.isArray(expRes) ? expRes : [];

        // When Create Schedule is opened from Allocation Detail, the target plan
        // may not be present in the first page returned by getAllocationPlans().
        // Load that exact plan by id and merge it into the local list so the URL
        // context is never lost.
        const urlPlanId = Number(allocationPlanIdFromUrl);
        if (urlPlanId && !Number.isNaN(urlPlanId)) {
          const exists = rawAllocations.some(
            (plan) => Number(plan.allocationPlanId) === urlPlanId
          );

          if (!exists) {
            try {
              const exactPlan = await getAllocationPlanById(urlPlanId);
              if (exactPlan) {
                rawAllocations = [exactPlan, ...rawAllocations];
              }
            } catch (planErr) {
              console.error("Failed to load Allocation Plan from URL:", planErr);
            }
          }
        }

        setAllAllocationPlans(rawAllocations);
        setMyExperiments(rawExperiments);
      } catch (err: any) {
        console.error("Failed to load initial schedule creation data:", err);
        setError(err?.response?.data?.message || "Failed to load allocation plans.");
      } finally {
        setLoading(false);
      }
    }

    void loadInitialData();
  }, [role, currentUserId, allocationPlanIdFromUrl]);

  // 2. Only Approved Allocation Plans can be used for scheduling.
  // Ownership is validated from the persisted Allocation Plan itself.
  // Do NOT depend on getExperiments({ researcherId }) here: that list can be
  // filtered by experiment status and can incorrectly hide a valid approved plan.
  const allowedAllocationPlans = useMemo(() => {
    if (role !== "Researcher") {
      return [];
    }

    const normalizedFullName = (currentUser.fullName || "")
      .trim()
      .toLowerCase();

    return allAllocationPlans.filter((plan) => {
      if (String(plan.approveStatus || "").trim().toLowerCase() !== "approved") {
        return false;
      }

      const createdById = Number(plan.createdBy || 0);
      const createdByName = (plan.createdByName || "").trim().toLowerCase();

      // Prefer the Allocation Plan owner fields. Some backend responses do not
      // expose createdBy consistently, so fall back to experiment ownership only
      // when we actually have matching experiment data.
      const ownedByUserId =
        Boolean(currentUserId) && createdById > 0 && createdById === currentUserId;

      const ownedByName =
        Boolean(normalizedFullName) &&
        Boolean(createdByName) &&
        (createdByName === normalizedFullName ||
          createdByName.includes(normalizedFullName) ||
          normalizedFullName.includes(createdByName));

      const ownedExperiment = myExperiments.some(
        (experiment) =>
          Number(experiment.experimentId) === Number(plan.experimentId)
      );

      return ownedByUserId || ownedByName || ownedExperiment;
    });
  }, [
    allAllocationPlans,
    myExperiments,
    role,
    currentUserId,
    currentUser.fullName,
  ]);

  // Selected Allocation Object
  const selectedAllocation = useMemo(() => {
    return allAllocationPlans.find(
      (p) => String(p.allocationPlanId) === form.allocationPlanId
    );
  }, [allAllocationPlans, form.allocationPlanId]);

  // 3. When Allocation Plan changes -> load ONLY persisted human allocations
  // belonging to that exact Allocation Plan, plus the Experiment phases.
  const loadAllocationSpecificData = useCallback(
    async (planId: number, experimentId?: number | null) => {
      try {
        setLoadingDetails(true);
        setError("");

        const [humanRes, phaseRes] = await Promise.all([
          getAllocationHumanDetails({
            allocationPlanId: planId,
            page: 1,
            size: 300,
          }).catch(() => []),
          experimentId
            ? getExperimentPhases({
                experimentId,
                page: 1,
                size: 300,
              }).catch(() => [])
            : Promise.resolve([]),
        ]);

        // Never fall back to experiment-wide personnel. A Researcher may only
        // schedule personnel actually allocated by Manager to this plan.
        const humans: AllocationHumanDetail[] = (
          Array.isArray(humanRes) ? humanRes : []
        ).filter(
          (item) =>
            item.allocationPlanId === planId &&
            item.status !== "Cancelled"
        );

        const loadedPhases = Array.isArray(phaseRes) ? phaseRes : [];

        setAllocatedHumans(humans);
        setPhases(loadedPhases);

        setForm((prev) => {
          let next = { ...prev };

          // URL personnel may be used only if it belongs to this plan.
          if (personnelIdFromUrl) {
            const matched = humans.find(
              (h) => String(h.humanResourceId) === personnelIdFromUrl
            );

            if (matched) {
              next = {
                ...next,
                assignedHumanResourceId: String(matched.humanResourceId),
                phaseId: matched.phaseId
                  ? String(matched.phaseId)
                  : next.phaseId,
              };
            } else {
              next.assignedHumanResourceId = "";
            }
          }

          // URL phase must belong to this experiment.
          if (
            next.phaseId &&
            !loadedPhases.some(
              (p) => String(p.experimentPhaseId) === next.phaseId
            )
          ) {
            next.phaseId = "";
          }

          return next;
        });
      } catch (err: any) {
        console.error("Failed to load allocation human details:", err);
        showToast(
          err?.response?.data?.message ||
            "Unable to load personnel allocated to this plan.",
          "error"
        );
      } finally {
        setLoadingDetails(false);
      }
    },
    [personnelIdFromUrl]
  );

  useEffect(() => {
    // Wait until the URL plan + Researcher experiments have finished loading.
    // Without this guard, the first render has an empty allowedAllocationPlans,
    // causing the valid allocationPlanId from the URL to be cleared prematurely.
    if (loading) return;

    if (!form.allocationPlanId) {
      setAllocatedHumans([]);
      setPhases([]);
      return;
    }

    const planId = Number(form.allocationPlanId);
    if (!planId || Number.isNaN(planId)) return;

    const plan = allowedAllocationPlans.find(
      (item) => Number(item.allocationPlanId) === planId
    );

    if (!plan) {
      // Keep the URL selection visible instead of silently clearing it. This makes
      // a genuine authorization/status problem explicit and avoids the blank form
      // shown when a valid plan was excluded by a secondary experiment query.
      const rawPlan = allAllocationPlans.find(
        (item) => Number(item.allocationPlanId) === planId
      );

      setAllocatedHumans([]);
      setPhases([]);

      if (rawPlan && String(rawPlan.approveStatus || "").toLowerCase() !== "approved") {
        showToast(
          `Allocation Plan #${planId} has not been approved by the Manager.`,
          "warning"
        );
      } else {
        showToast(
          `Allocation Plan #${planId} does not belong to the current Researcher.`,
          "warning"
        );
      }
      return;
    }

    void loadAllocationSpecificData(planId, plan.experimentId);
  }, [
    loading,
    form.allocationPlanId,
    allowedAllocationPlans,
    loadAllocationSpecificData,
  ]);

  // 4. Group Allocated Human Resources clearly by Phase
  const groupedPersonnelByPhase = useMemo(() => {
    const map = new Map<
      string,
      {
        phaseId: number | null;
        phaseName: string;
        phaseOrder?: number;
        personnel: AllocationHumanDetail[];
      }
    >();

    // Initialize map with all known experiment phases
    phases.forEach((p) => {
      const key = `phase_${p.experimentPhaseId}`;
      map.set(key, {
        phaseId: p.experimentPhaseId,
        phaseName: `Phase #${p.phaseOrder ?? 1}: ${p.phaseName}`,
        phaseOrder: p.phaseOrder ?? 1,
        personnel: [],
      });
    });

    // Add general / unassigned bucket
    map.set("general", {
      phaseId: null,
      phaseName: "General / Entire Experiment Personnel",
      phaseOrder: 999,
      personnel: [],
    });

    // Populate personnel into respective phase buckets
    allocatedHumans.forEach((h) => {
      const targetPhaseId = h.phaseId || (h.phaseHumanReqId ? Number(h.phaseHumanReqId) : null);
      const phaseKey = targetPhaseId ? `phase_${targetPhaseId}` : "general";

      if (map.has(phaseKey)) {
        map.get(phaseKey)!.personnel.push(h);
      } else {
        // Phase not in current phase list, create dynamic entry
        map.set(phaseKey, {
          phaseId: targetPhaseId,
          phaseName: h.phaseName || `Phase #${targetPhaseId}`,
          phaseOrder: 50,
          personnel: [h],
        });
      }
    });

    // Return only groups that have personnel
    return Array.from(map.values())
      .filter((g) => g.personnel.length > 0)
      .sort((a, b) => (a.phaseOrder ?? 999) - (b.phaseOrder ?? 999));
  }, [allocatedHumans, phases]);

  // Personnel options follow the selected phase. General allocations
  // (phaseId == null) remain available for the whole experiment.
  const personnelForSelectedPhase = useMemo(() => {
    if (!form.phaseId) {
      return allocatedHumans;
    }

    const phaseId = Number(form.phaseId);

    return allocatedHumans.filter(
      (human) => human.phaseId == null || human.phaseId === phaseId
    );
  }, [allocatedHumans, form.phaseId]);

  // Selected Personnel Object
  const selectedPersonnel = useMemo(() => {
    if (!form.assignedHumanResourceId) return null;
    return allocatedHumans.find(
      (h) => String(h.humanResourceId) === form.assignedHumanResourceId
    );
  }, [allocatedHumans, form.assignedHumanResourceId]);

  // Selected Phase Object
  const selectedPhase = useMemo(() => {
    if (!form.phaseId) return null;
    return phases.find((p) => String(p.experimentPhaseId) === form.phaseId);
  }, [phases, form.phaseId]);

  // Handle Form Changes
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setError("");

    if (name === "allocationPlanId") {
      setForm((prev) => ({
        ...prev,
        allocationPlanId: value,
        phaseId: "",
        assignedHumanResourceId: "",
        startDate: "",
        endDate: "",
      }));
      return;
    }

    if (name === "assignedHumanResourceId") {
      const targetStaff = allocatedHumans.find(
        (h) => String(h.humanResourceId) === value
      );

      setForm((prev) => {
        const nextPhaseId =
          targetStaff?.phaseId && !prev.phaseId
            ? String(targetStaff.phaseId)
            : prev.phaseId;

        return {
          ...prev,
          assignedHumanResourceId: value,
          phaseId: nextPhaseId,
          // The allocation period is fixed. Researcher chooses working weekdays inside it.
          startDate: dateOnly(targetStaff?.startDate),
          endDate: dateOnly(targetStaff?.endDate),
        };
      });
      return;
    }

    if (name === "phaseId") {
      const targetPhase = phases.find(
        (p) => String(p.experimentPhaseId) === value
      );
      const targetPhaseId = value ? Number(value) : null;

      setForm((prev) => {
        const currentHuman = allocatedHumans.find(
          (h) =>
            String(h.humanResourceId) === prev.assignedHumanResourceId
        );

        const humanStillValid =
          !currentHuman ||
          targetPhaseId == null ||
          currentHuman.phaseId == null ||
          currentHuman.phaseId === targetPhaseId;

        return {
          ...prev,
          phaseId: value,
          assignedHumanResourceId: humanStillValid
            ? prev.assignedHumanResourceId
            : "",
          startDate:
            targetPhase?.expectedStartDate?.slice(0, 10) || "",
          endDate:
            targetPhase?.expectedEndDate?.slice(0, 10) || "",
        };
      });
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Tasks are entered by the Researcher instead of being hard-coded in the frontend.
  const syncTaskSummary = (nextTasks: string[]) => {
    setForm((prev) => ({
      ...prev,
      title:
        nextTasks.length === 0
          ? ""
          : nextTasks.length === 1
          ? nextTasks[0]
          : `${nextTasks.length} Assigned Field Tasks`,
      description: nextTasks
        .map((task, index) => `${index + 1}. ${task}`)
        .join("\n"),
    }));
  };

  const handleAddTask = () => {
    const task = taskInput.trim();
    if (!task) return;

    if (tasks.some((item) => item.toLowerCase() === task.toLowerCase())) {
      showToast("This task has already been added.", "warning");
      return;
    }

    const nextTasks = [...tasks, task];
    setTasks(nextTasks);
    setTaskInput("");
    syncTaskSummary(nextTasks);
  };

  const handleRemoveTask = (taskToRemove: string) => {
    const nextTasks = tasks.filter((task) => task !== taskToRemove);
    setTasks(nextTasks);
    syncTaskSummary(nextTasks);
  };

  const handleTaskInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddTask();
    }
  };

  // Submit Handler
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const planId = Number(form.allocationPlanId);
    if (!planId || isNaN(planId)) {
      showToast("Please select an Allocation Plan.", "warning");
      return;
    }

    const approvedPlan = allAllocationPlans.find(
      (plan) => plan.allocationPlanId === planId && plan.approveStatus === "Approved"
    );
    if (!approvedPlan) {
      showToast("Work schedules can only be assigned to an Allocation Plan approved by the Manager.", "warning");
      return;
    }

    if (role !== "Researcher") {
      showToast("Only a Researcher can assign work schedules to allocated personnel.", "warning");
      return;
    }

    if (!form.title.trim()) {
      showToast("Please enter a Schedule Title.", "warning");
      return;
    }

    const assignedHumanResourceId = form.assignedHumanResourceId
      ? Number(form.assignedHumanResourceId)
      : null;

    if (!assignedHumanResourceId) {
      showToast(
        "Please select personnel allocated to this Allocation Plan.",
        "warning"
      );
      return;
    }

    const allocatedHuman = allocatedHumans.find(
      (human) => human.humanResourceId === assignedHumanResourceId
    );

    if (!allocatedHuman) {
      showToast("The selected personnel does not belong to the current Allocation Plan.", "error");
      return;
    }

    if (selectedWeekdays.length === 0) {
      showToast("Please select at least one working day.", "warning");
      return;
    }

    const allocationStartDate = dateOnly(allocatedHuman.startDate);
    const allocationEndDate = dateOnly(allocatedHuman.endDate);
    if (!allocationStartDate || !allocationEndDate) {
      showToast("The selected personnel does not have a valid allocation period.", "error");
      return;
    }

    const phaseId = form.phaseId ? Number(form.phaseId) : null;
    if (phaseId && allocatedHuman.phaseId != null && allocatedHuman.phaseId !== phaseId) {
      showToast("The selected personnel is not allocated to this phase.", "error");
      return;
    }

    const workDates = getDatesForWeekdays(
      allocationStartDate,
      allocationEndDate,
      selectedWeekdays
    );

    if (workDates.length === 0) {
      showToast("No dates match the selected weekdays within the allocation period.", "warning");
      return;
    }

    try {
      setSaving(true);

      let createdCount = 0;
      const conflicts: string[] = [];

      // Create one schedule per selected working day. The allocation start/end remain fixed.
      for (const workDate of workDates) {
        const startIso = combineDateAndTime(workDate, form.startTime);
        const endIso = combineDateAndTime(workDate, form.endTime);

        if (!startIso || !endIso) {
          throw new Error(`Invalid date or time: ${workDate}`);
        }
        if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
          showToast("End time must be later than start time on the same working day.", "warning");
          return;
        }

        const existingSchedules = await getSchedules({
          assignedHumanResourceId,
          dateFrom: startIso,
          dateTo: endIso,
          page: 1,
          size: 300,
        });

        const scheduleStart = new Date(startIso).getTime();
        const scheduleEnd = new Date(endIso).getTime();
        const hasConflict = existingSchedules.some((schedule) => {
          if (schedule.status === "Cancelled") return false;
          const existingStart = new Date(schedule.startDate).getTime();
          const existingEnd = new Date(schedule.endDate).getTime();
          return existingStart < scheduleEnd && existingEnd > scheduleStart;
        });

        if (hasConflict) {
          conflicts.push(formatDate(workDate));
          continue;
        }

        await createSchedule({
          allocationPlanId: planId,
          phaseId,
          title: form.title.trim(),
          description: form.description.trim() || null,
          startDate: startIso,
          endDate: endIso,
          status: (new Date(startIso).getTime() <= Date.now()
            ? new Date(endIso).getTime() <= Date.now()
              ? "Completed"
              : "InProgress"
            : "Planned") as ScheduleStatus,
          priority: Number(form.priority),
          assignedHumanResourceId,
          createdBy: currentUserId,
          notes: form.notes.trim() || null,
        });
        createdCount += 1;
      }

      if (createdCount === 0 && conflicts.length > 0) {
        showToast(
          `No schedules were created because all selected dates conflict with existing schedules: ${conflicts.join(", ")}.`,
          "error",
          "Schedule Conflict"
        );
        return;
      }

      if (conflicts.length > 0) {
        showToast(
          `Created ${createdCount} schedules. Skipped ${conflicts.length} conflicting date(s): ${conflicts.join(", ")}.`,
          "warning",
          "Schedules Created"
        );
      }

      navigate(
        `/schedules?allocationPlanId=${planId}&humanResourceId=${assignedHumanResourceId}&created=1&createdCount=${createdCount}`,
        { replace: true }
      );
    } catch (submitErr: any) {
      console.error("Create schedule failed:", submitErr);
      showToast(
        submitErr?.response?.data?.message ||
          submitErr?.message ||
          "Unable to create work schedules. Please check the entered information.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="schedule-create-page">
          <div style={{ textAlign: "center", padding: "48px 0", color: "#64748b" }}>
            Loading schedule creation form...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="schedule-create-page">
        {/* Top Header */}
        <div className="schedule-create-header">
          <div>
            <button
              type="button"
              className="schedule-back-btn"
              onClick={() => navigate("/schedules")}
            >
              <ArrowLeft size={15} /> Back to Schedules
            </button>
            <p className="schedule-breadcrumb">Dashboard / Schedules / Create</p>
            <h1>Create Work Schedule</h1>
            <p className="schedule-subtitle">
              Assign field work schedule to allocated Technicians and Seasonal staff for each phase.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="schedule-form-layout">
          {/* Main Left Column */}
          <div className="schedule-main-col">
            {/* Step 1: Allocation Plan & Phase Context */}
            <div className="schedule-card">
              <div className="schedule-card-header">
                <div>
                  <span className="schedule-card-eyebrow">Step 1: Allocation & Phase</span>
                  <h3>
                    <Layers size={16} color="#16a34a" /> Allocation Plan Selection
                  </h3>
                </div>
              </div>

              {/* Allocation Plan Select */}
              <div className="schedule-form-group">
                <label htmlFor="allocationPlanId">
                  Resource Allocation Plan <span className="required-star">*</span>
                </label>
                <select
                  id="allocationPlanId"
                  name="allocationPlanId"
                  className="schedule-select"
                  value={form.allocationPlanId}
                  onChange={handleChange}
                  disabled={Boolean(allocationPlanIdFromUrl)}
                  required
                >
                  <option value="">-- Select an Approved Allocation Plan --</option>
                  {allowedAllocationPlans.map((plan) => {
                    const planId = plan.allocationPlanId;
                    const expTitle = plan.experimentName || `Experiment #${plan.experimentId}`;
                    const status = plan.approveStatus || "Pending";
                    const fitness = Number(plan.fitnessScore ?? 0).toFixed(2);
                    return (
                      <option key={planId} value={planId}>
                        Allocation #{planId} — {expTitle} [{status} • Fitness {fitness}%]
                      </option>
                    );
                  })}
                </select>
                {role === "Researcher" && allowedAllocationPlans.length === 0 && (
                  <p style={{ fontSize: "12px", color: "#b45309", margin: "4px 0 0" }}>
                    No allocation plans found for your experiments. Please create an allocation plan first.
                  </p>
                )}
              </div>

              {/* Experiment Phase Select */}
              <div className="schedule-form-group">
                <label htmlFor="phaseId">
                  Experiment Phase (Optional / Specific Phase)
                </label>
                <select
                  id="phaseId"
                  name="phaseId"
                  className="schedule-select"
                  value={form.phaseId}
                  onChange={handleChange}
                  disabled={!form.allocationPlanId || loadingDetails}
                >
                  <option value="">-- General / Entire Experiment --</option>
                  {phases.map((p) => (
                    <option key={p.experimentPhaseId} value={p.experimentPhaseId}>
                      Phase #{p.phaseOrder ?? 1}: {p.phaseName} ({formatDate(p.expectedStartDate)} →{" "}
                      {formatDate(p.expectedEndDate)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 2: Assigned Human Resource (Phased Grouping) */}
            <div className="schedule-card">
              <div className="schedule-card-header">
                <div>
                  <span className="schedule-card-eyebrow">Step 2: Personnel Assignment</span>
                  <h3>
                    <Users size={16} color="#16a34a" /> Assigned Human Resource (By Phase)
                  </h3>
                </div>
                {allocatedHumans.length > 0 && (
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#16a34a" }}>
                    {allocatedHumans.length} Allocated Staff Available
                  </span>
                )}
              </div>

              {/* Assigned Human Resource Select with Phased Optgroups */}
              <div className="schedule-form-group">
                <label htmlFor="assignedHumanResourceId">
                  Assigned Personnel (Seasonal / Technician) <span className="required-star">*</span>
                </label>
                <select
                  id="assignedHumanResourceId"
                  name="assignedHumanResourceId"
                  className="schedule-select"
                  value={form.assignedHumanResourceId}
                  onChange={handleChange}
                  disabled={!form.allocationPlanId || loadingDetails}
                  required
                >
                  <option value="">-- Select Allocated Personnel --</option>
                  {groupedPersonnelByPhase
                    .map((group) => ({
                      ...group,
                      personnel: group.personnel.filter((human) =>
                        personnelForSelectedPhase.some(
                          (allowed) =>
                            allowed.allocationHumanDetailId ===
                            human.allocationHumanDetailId
                        )
                      ),
                    }))
                    .filter((group) => group.personnel.length > 0)
                    .map((group, gIdx) => (
                    <optgroup key={gIdx} label={`📍 ${group.phaseName} (${group.personnel.length} staff)`}>
                      {group.personnel.map((h, hIdx) => {
                        const roleName = h.roleName || h.humanResourceRoleName || "Technician";
                        const skill = h.requiredSkillName || h.skillName || "Field Forestry";
                        const hours = h.workingHours || 8;
                        const period = `${formatDate(h.startDate)} → ${formatDate(h.endDate)}`;

                        return (
                          <option key={h.humanResourceId || hIdx} value={h.humanResourceId}>
                            [{roleName}] {h.fullName || "Field Staff"} • {skill} ({hours}h/day, {period})
                          </option>
                        );
                      })}
                    </optgroup>
                  ))}
                </select>

                {!form.allocationPlanId ? (
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0" }}>
                    Please select an allocation plan above to view the allocated field personnel.
                  </p>
                ) : allocatedHumans.length === 0 && !loadingDetails ? (
                  <p style={{ fontSize: "12px", color: "#dc2626", margin: "4px 0 0" }}>
                    No personnel has been allocated by Manager to this plan yet.
                  </p>
                ) : null}
              </div>

              {/* Visual Personnel Cards Grid */}
              {allocatedHumans.length > 0 && (
                <div>
                  <label style={{ fontSize: "12px", color: "#475569", fontWeight: 600 }}>
                    Click staff card to assign quickly:
                  </label>
                  <div className="schedule-personnel-visual-grid">
                    {personnelForSelectedPhase.map((h, idx) => {
                      const isSelected = String(h.humanResourceId) === form.assignedHumanResourceId;
                      const roleName = h.roleName || h.humanResourceRoleName || "Technician";
                      const isSeasonal = roleName.toLowerCase().includes("seasonal");
                      const initials = (h.fullName || "FS")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);

                      return (
                        <div
                          key={h.humanResourceId || idx}
                          className={`schedule-personnel-card ${isSelected ? "selected" : ""}`}
                          onClick={() => {
                            handleChange({
                              target: {
                                name: "assignedHumanResourceId",
                                value: String(h.humanResourceId),
                              },
                            } as any);
                          }}
                        >
                          <div className="schedule-personnel-avatar">{initials}</div>
                          <div className="schedule-personnel-info">
                            <span className="schedule-personnel-name">{h.fullName || "Field Staff"}</span>
                            <div className="schedule-personnel-badges">
                              <span
                                className={`schedule-role-tag ${
                                  isSeasonal ? "seasonal" : "technician"
                                }`}
                              >
                                {roleName}
                              </span>
                              {h.phaseName && (
                                <span className="schedule-phase-tag">{h.phaseName}</span>
                              )}
                            </div>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                              {h.workingHours || 8} hrs/day • Available {formatDate(h.startDate)} → {formatDate(h.endDate)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Work Description & Task Details */}
            <div className="schedule-card">
              <div className="schedule-card-header">
                <div>
                  <span className="schedule-card-eyebrow">Step 3: Work Content</span>
                  <h3>
                    <Briefcase size={16} color="#16a34a" /> Task & Work Instructions
                  </h3>
                </div>
              </div>

              {/* Researcher-defined tasks */}
              <div className="schedule-templates-wrapper">
                <span className="schedule-templates-title">Tasks <span className="required-star">*</span></span>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="text"
                    className="schedule-input"
                    value={taskInput}
                    onChange={(event) => setTaskInput(event.target.value)}
                    onKeyDown={handleTaskInputKeyDown}
                    placeholder="Enter a task, e.g., Inspect seedling growth"
                    disabled={saving}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleAddTask}
                    disabled={saving || !taskInput.trim()}
                    style={{
                      minWidth: 110,
                      height: 40,
                      padding: "0 18px",
                      border: 0,
                      borderRadius: 8,
                      background: taskInput.trim() ? "#16a34a" : "#d1d5db",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: taskInput.trim() ? "pointer" : "not-allowed",
                    }}
                  >
                    + Add Task
                  </button>
                </div>

                <div style={{ marginTop: 8, color: "#64748b", fontSize: 12 }}>
                  Type a task and press Enter or click Add Task. You can assign multiple tasks to the same staff member.
                </div>

                {tasks.length > 0 && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "12px",
                      border: "1px solid #bbf7d0",
                      borderRadius: 8,
                      background: "#f0fdf4",
                    }}
                  >
                    <div style={{ marginBottom: 8, color: "#166534", fontSize: 13 }}>
                      <strong>Added Tasks ({tasks.length})</strong>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {tasks.map((task, index) => (
                        <div
                          key={`${task}-${index}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            padding: "8px 10px",
                            border: "1px solid #dcfce7",
                            borderRadius: 7,
                            background: "#fff",
                            color: "#14532d",
                            fontSize: 13,
                          }}
                        >
                          <span><strong>{index + 1}.</strong> {task}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTask(task)}
                            disabled={saving}
                            aria-label={`Remove ${task}`}
                            title="Remove task"
                            style={{
                              width: 28,
                              height: 28,
                              border: "1px solid #fecaca",
                              borderRadius: 6,
                              background: "#fff",
                              color: "#dc2626",
                              cursor: "pointer",
                              fontSize: 18,
                              lineHeight: 1,
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Title */}
              <div className="schedule-form-group">
                <label htmlFor="title">
                  Schedule Title <span className="required-star">*</span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  className="schedule-input"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g., Soil Sample Collection & Nutrient Measurement"
                  required
                />
              </div>

              {/* Description */}
              <div className="schedule-form-group">
                <label htmlFor="description">Detailed Work Instructions</label>
                <textarea
                  id="description"
                  name="description"
                  className="schedule-textarea"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Provide step-by-step instructions for the technician or seasonal worker..."
                  rows={3}
                />
              </div>

              {/* Notes */}
              <div className="schedule-form-group">
                <label htmlFor="notes">Safety & Equipment Notes</label>
                <input
                  id="notes"
                  name="notes"
                  type="text"
                  className="schedule-input"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="e.g., Wear safety boots, ensure drone battery is fully charged..."
                />
              </div>
            </div>
          </div>

          {/* Side Right Column */}
          <div className="schedule-side-col">
            {/* Step 4: Schedule Timing & Execution */}
            <div className="schedule-card">
              <div className="schedule-card-header">
                <div>
                  <span className="schedule-card-eyebrow">Step 4: Timing & Priority</span>
                  <h3>
                    <Clock size={16} color="#16a34a" /> Execution Period
                  </h3>
                </div>
              </div>

              {selectedPersonnel && (
                <div
                  style={{
                    marginBottom: "14px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    fontSize: "12px",
                    color: "#166534",
                    lineHeight: 1.5,
                  }}
                >
                  <strong>{selectedPersonnel.fullName || "Selected staff"}</strong> is available from {" "}
                  <strong>{formatDate(selectedPersonnel.startDate)}</strong> to {" "}
                  <strong>{formatDate(selectedPersonnel.endDate)}</strong>. The allocation period is fixed. Choose which weekdays this employee works within that range.
                </div>
              )}

              <div className="schedule-form-group">
                <label>Allocation Period</label>
                <div className="schedule-input" style={{ background: "#f8fafc", cursor: "default" }}>
                  {selectedPersonnel
                    ? `${formatDate(selectedPersonnel.startDate)} → ${formatDate(selectedPersonnel.endDate)}`
                    : "Select personnel first"}
                </div>
              </div>

              <div className="schedule-form-group">
                <label>Working Days <span className="required-star">*</span></label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
                  {WEEK_DAYS.map((day) => {
                    const checked = selectedWeekdays.includes(day.value);
                    return (
                      <label
                        key={day.value}
                        title={day.fullLabel}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "5px",
                          padding: "9px 4px",
                          border: `1px solid ${checked ? "#22c55e" : "#dbe3ee"}`,
                          borderRadius: "8px",
                          background: checked ? "#f0fdf4" : "#fff",
                          cursor: selectedPersonnel ? "pointer" : "not-allowed",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!selectedPersonnel}
                          onChange={() =>
                            setSelectedWeekdays((prev) =>
                              checked
                                ? prev.filter((value) => value !== day.value)
                                : [...prev, day.value]
                            )
                          }
                        />
                        {day.label}
                      </label>
                    );
                  })}
                </div>
                <small style={{ color: "#64748b", marginTop: "6px", display: "block" }}>
                  Schedules will only be created on the selected weekdays within the allocation period. Default: Monday–Friday.
                </small>
              </div>

              <div className="schedule-form-group">
                <label>Daily Working Time <span className="required-star">*</span></label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <ScheduleTimePicker
                    ariaLabel="Start working time"
                    value={form.startTime}
                    disabled={!selectedPersonnel}
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, startTime: value }))
                    }
                  />
                  <span style={{ color: "#64748b", fontWeight: 600 }}>to</span>
                  <ScheduleTimePicker
                    ariaLabel="End working time"
                    value={form.endTime}
                    disabled={!selectedPersonnel}
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, endTime: value }))
                    }
                  />
                </div>
              </div>

              {/* Priority. Schedule status is automatic from its start/end time. */}
              <div className="schedule-form-group">
                <label htmlFor="priority">Priority</label>
                <select
                  id="priority"
                  name="priority"
                  className="schedule-select"
                  value={form.priority}
                  onChange={handleChange}
                >
                  <option value="0">Low</option>
                  <option value="1">Medium</option>
                  <option value="2">High</option>
                  <option value="3">Urgent</option>
                </select>
                <small style={{ color: "#64748b", marginTop: "6px", display: "block" }}>
                  Status is automatic: Planned before start time, In Progress while working, and Completed after end time.
                </small>
              </div>
            </div>

            {/* Live Summary Preview Card */}
            <div className="schedule-card" style={{ background: "#f8fafc" }}>
              <div className="schedule-card-header">
                <div>
                  <span className="schedule-card-eyebrow">Overview</span>
                  <h3>
                    <Info size={16} color="#0284c7" /> Schedule Summary
                  </h3>
                </div>
              </div>

              <div className="schedule-summary-box">
                <div className="schedule-summary-item">
                  <span>Allocation Plan</span>
                  <strong>
                    {selectedAllocation
                      ? `Plan #${selectedAllocation.allocationPlanId}`
                      : "Not selected"}
                  </strong>
                </div>

                <div className="schedule-summary-item">
                  <span>Experiment</span>
                  <strong>
                    {selectedAllocation?.experimentName ||
                      (selectedAllocation?.experimentId
                        ? `Experiment #${selectedAllocation.experimentId}`
                        : "-")}
                  </strong>
                </div>

                <div className="schedule-summary-item">
                  <span>Target Phase</span>
                  <strong>{selectedPhase?.phaseName || "Entire Experiment"}</strong>
                </div>

                <div className="schedule-summary-item">
                  <span>Assigned Staff</span>
                  <strong>
                    {selectedPersonnel ? (
                      <span style={{ color: "#16a34a" }}>
                        [{selectedPersonnel.roleName || "Technician"}]{" "}
                        {selectedPersonnel.fullName || "Staff"}
                      </span>
                    ) : (
                      "Not selected"
                    )}
                  </strong>
                </div>

                <div className="schedule-summary-item">
                  <span>Priority</span>
                  <strong>{priorityLabels[Number(form.priority)] || "Medium"}</strong>
                </div>

                <div className="schedule-summary-item">
                  <span>Period</span>
                  <strong>
                    {selectedPersonnel
                      ? `${formatDate(selectedPersonnel.startDate)} → ${formatDate(selectedPersonnel.endDate)}`
                      : "TBD"}
                  </strong>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="schedule-form-actions">
                <button
                  type="button"
                  className="schedule-btn schedule-btn-cancel"
                  onClick={() => navigate("/schedules")}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="schedule-btn schedule-btn-submit"
                  disabled={saving || !form.allocationPlanId}
                >
                  {saving ? (
                    "Assigning..."
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> Assign Schedule
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Global Toast / Popup Alert */}
        <ToastPopup
          visible={toast.visible}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
        />
      </div>
    </DashboardLayout>
  );
}