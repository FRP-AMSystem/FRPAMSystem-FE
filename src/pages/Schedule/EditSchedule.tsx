import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Layers,
  Users,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Info,
  Briefcase,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../services/api";
import { getAllocationPlans } from "../../services/allocationPlanService";
import { getAllocationHumanDetails } from "../../services/allocationDetailService";
import { getExperimentPhases } from "../../services/experimentPhaseService";
import { getExperiments } from "../../services/experimentService";
import { getScheduleById, updateSchedule } from "../../services/scheduleService";
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
  status: ScheduleStatus;
  assignedHumanResourceId: string;
  notes: string;
  priority: string;
}

const TASK_TEMPLATES = [
  {
    title: "Field Plot Preparation & Clearing",
    desc: "Clear debris, establish plot boundaries, and level soil beds according to protocol.",
  },
  {
    title: "Equipment Setup & Sensor Calibration",
    desc: "Calibrate IoT sensors, drone batteries, and test telemetry before starting field data collection.",
  },
  {
    title: "Seedling Planting & Specimen Tagging",
    desc: "Plant research saplings systematically following randomized block design and attach barcode tags.",
  },
  {
    title: "Controlled Irrigation & Fertilizer Application",
    desc: "Apply designated water volume and nutrient formula as specified in phase schedule.",
  },
  {
    title: "Foliar Health Survey & Growth Measurement",
    desc: "Measure sapling height, stem diameter, and inspect leaves for any pest or disease symptoms.",
  },
  {
    title: "Biomass Harvest & Sample Logging",
    desc: "Harvest plot samples, record fresh weight, and transfer to storage facility for drying analysis.",
  },
];

const priorityLabels: Record<number, string> = {
  0: "Low",
  1: "Medium",
  2: "High",
  3: "Urgent",
};

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
  const iso = `${dateStr}T${validTime}:00`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function EditSchedule() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const scheduleId = Number(id);

  const currentUser = useMemo(() => getCurrentUserTokenInfo(), []);
  const role = currentUser.role || "Seasonal";
  const currentUserId = currentUser.userId ? Number(currentUser.userId) : null;

  // Master State
  const [allAllocationPlans, setAllAllocationPlans] = useState<AllocationPlan[]>([]);
  const [myExperiments, setMyExperiments] = useState<ExperimentResponse[]>([]);
  const [phases, setPhases] = useState<ExperimentPhase[]>([]);
  const [allocatedHumans, setAllocatedHumans] = useState<AllocationHumanDetail[]>([]);

  const [form, setForm] = useState<ScheduleFormState>({
    allocationPlanId: "",
    phaseId: "",
    title: "",
    description: "",
    startDate: "",
    startTime: "08:00",
    endDate: "",
    endTime: "17:00",
    status: "Planned",
    assignedHumanResourceId: "",
    notes: "",
    priority: "1",
  });

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
          ? "Lỗi xác thực lịch (Validation Error)"
          : type === "warning"
          ? "Cảnh báo (Warning)"
          : "Thông báo (Notice)"),
      message,
    });
  };

  // 1. Load Target Schedule + Allocations & Experiments
  useEffect(() => {
    async function loadScheduleAndMasterData() {
      if (!scheduleId || isNaN(scheduleId)) {
        setError("Invalid schedule ID.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [scheduleRes, allocationsRes, expRes] = await Promise.all([
          getScheduleById(scheduleId),
          getAllocationPlans().catch(() => []),
          role === "Researcher" && currentUserId
            ? getExperiments({ researcherId: currentUserId, size: 300 }).catch(() => [])
            : getExperiments({ size: 300 }).catch(() => []),
        ]);

        const rawAllocations = Array.isArray(allocationsRes) ? allocationsRes : [];
        const rawExperiments = Array.isArray(expRes) ? expRes : [];

        setAllAllocationPlans(rawAllocations);
        setMyExperiments(rawExperiments);

        if (scheduleRes) {
          const startD = scheduleRes.startDate ? new Date(scheduleRes.startDate) : null;
          const endD = scheduleRes.endDate ? new Date(scheduleRes.endDate) : null;

          const startYmd = startD ? startD.toISOString().slice(0, 10) : "";
          const startHm = startD
            ? `${String(startD.getHours()).padStart(2, "0")}:${String(startD.getMinutes()).padStart(2, "0")}`
            : "08:00";

          const endYmd = endD ? endD.toISOString().slice(0, 10) : "";
          const endHm = endD
            ? `${String(endD.getHours()).padStart(2, "0")}:${String(endD.getMinutes()).padStart(2, "0")}`
            : "17:00";

          setForm({
            allocationPlanId: scheduleRes.allocationPlanId ? String(scheduleRes.allocationPlanId) : "",
            phaseId: scheduleRes.phaseId ? String(scheduleRes.phaseId) : "",
            title: scheduleRes.title || "",
            description: scheduleRes.description || "",
            startDate: startYmd,
            startTime: startHm,
            endDate: endYmd,
            endTime: endHm,
            status: scheduleRes.status || "Planned",
            assignedHumanResourceId: scheduleRes.assignedHumanResourceId
              ? String(scheduleRes.assignedHumanResourceId)
              : "",
            notes: scheduleRes.notes || "",
            priority: String(scheduleRes.priority ?? 1),
          });
        }
      } catch (err: any) {
        console.error("Failed to load schedule data:", err);
        setError(err?.response?.data?.message || "Failed to load schedule details.");
      } finally {
        setLoading(false);
      }
    }

    void loadScheduleAndMasterData();
  }, [scheduleId, role, currentUserId]);

  // 2. Filter Allocations for Researcher
  const allowedAllocationPlans = useMemo(() => {
    const isResearcher = role === "Researcher";
    const myExpIds = new Set(myExperiments.map((e) => e.experimentId));

    return allAllocationPlans.filter((plan) => {
      if (form.allocationPlanId && String(plan.allocationPlanId) === form.allocationPlanId) {
        return true;
      }

      if (!isResearcher) return true;

      const isOwner =
        (currentUserId && plan.createdBy === currentUserId) ||
        (plan.experimentId && myExpIds.has(plan.experimentId)) ||
        (plan.createdByName &&
          currentUser.fullName &&
          plan.createdByName.toLowerCase() === currentUser.fullName.toLowerCase());

      return isOwner;
    });
  }, [allAllocationPlans, myExperiments, role, currentUserId, currentUser.fullName, form.allocationPlanId]);

  // Selected Allocation Object
  const selectedAllocation = useMemo(() => {
    return allAllocationPlans.find((p) => String(p.allocationPlanId) === form.allocationPlanId);
  }, [allAllocationPlans, form.allocationPlanId]);

  // 3. When Allocation Plan changes -> Fetch allocated humans & experiment phases
  const loadAllocationSpecificData = useCallback(async (planId: number, experimentId?: number | null) => {
    try {
      setLoadingDetails(true);
      setError("");

      const [humanRes, phaseRes, liveHumanAllRes] = await Promise.all([
        getAllocationHumanDetails({ allocationPlanId: planId, size: 100 }).catch(() => []),
        experimentId
          ? getExperimentPhases({ experimentId, size: 100 }).catch(() => [])
          : Promise.resolve([]),
        api.get("/AllocationHumanDetails?size=300").catch(() => ({ data: [] })),
      ]);

      let humans: AllocationHumanDetail[] = Array.isArray(humanRes) ? humanRes : [];

      if (humans.length === 0 && liveHumanAllRes?.data) {
        const rawAll = Array.isArray(liveHumanAllRes.data)
          ? liveHumanAllRes.data
          : liveHumanAllRes.data?.items || liveHumanAllRes.data?.data || [];
        humans = rawAll.filter(
          (h: any) => h.allocationPlanId === planId || (experimentId && h.experimentId === experimentId)
        );
      }

      setAllocatedHumans(humans);
      setPhases(Array.isArray(phaseRes) ? phaseRes : []);
    } catch (err: any) {
      console.error("Failed to load allocation human details:", err);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    if (!form.allocationPlanId) {
      setAllocatedHumans([]);
      setPhases([]);
      return;
    }

    const planId = Number(form.allocationPlanId);
    if (!planId || isNaN(planId)) return;

    const plan = allAllocationPlans.find((p) => p.allocationPlanId === planId);
    void loadAllocationSpecificData(planId, plan?.experimentId);
  }, [form.allocationPlanId, allAllocationPlans, loadAllocationSpecificData]);

  // 4. Group Allocated Human Resources by Phase
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

    phases.forEach((p) => {
      const key = `phase_${p.experimentPhaseId}`;
      map.set(key, {
        phaseId: p.experimentPhaseId,
        phaseName: `Phase #${p.phaseOrder ?? 1}: ${p.phaseName}`,
        phaseOrder: p.phaseOrder ?? 1,
        personnel: [],
      });
    });

    map.set("general", {
      phaseId: null,
      phaseName: "General / Entire Experiment Personnel",
      phaseOrder: 999,
      personnel: [],
    });

    allocatedHumans.forEach((h) => {
      const targetPhaseId = h.phaseId || (h.phaseHumanReqId ? Number(h.phaseHumanReqId) : null);
      const phaseKey = targetPhaseId ? `phase_${targetPhaseId}` : "general";

      if (map.has(phaseKey)) {
        map.get(phaseKey)!.personnel.push(h);
      } else {
        map.set(phaseKey, {
          phaseId: targetPhaseId,
          phaseName: h.phaseName || `Phase #${targetPhaseId}`,
          phaseOrder: 50,
          personnel: [h],
        });
      }
    });

    return Array.from(map.values())
      .filter((g) => g.personnel.length > 0)
      .sort((a, b) => (a.phaseOrder ?? 999) - (b.phaseOrder ?? 999));
  }, [allocatedHumans, phases]);

  // Selected Personnel Object
  const selectedPersonnel = useMemo(() => {
    if (!form.assignedHumanResourceId) return null;
    return allocatedHumans.find((h) => String(h.humanResourceId) === form.assignedHumanResourceId);
  }, [allocatedHumans, form.assignedHumanResourceId]);

  // Selected Phase Object
  const selectedPhase = useMemo(() => {
    if (!form.phaseId) return null;
    return phases.find((p) => String(p.experimentPhaseId) === form.phaseId);
  }, [phases, form.phaseId]);

  // Handle Form Changes
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setError("");

    if (name === "allocationPlanId") {
      setForm((prev) => ({
        ...prev,
        allocationPlanId: value,
        phaseId: "",
        assignedHumanResourceId: "",
      }));
      return;
    }

    if (name === "assignedHumanResourceId") {
      const targetStaff = allocatedHumans.find((h) => String(h.humanResourceId) === value);
      setForm((prev) => ({
        ...prev,
        assignedHumanResourceId: value,
        phaseId: targetStaff?.phaseId && !prev.phaseId ? String(targetStaff.phaseId) : prev.phaseId,
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Quick Template Click
  const handleApplyTemplate = (tpl: { title: string; desc: string }) => {
    setForm((prev) => ({
      ...prev,
      title: tpl.title,
      description: tpl.desc,
    }));
  };

  // Submit Handler
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const planId = Number(form.allocationPlanId);
    if (!planId || isNaN(planId)) {
      showToast("Vui lòng chọn một kế hoạch phân bổ (Allocation Plan).", "warning");
      return;
    }

    if (!form.title.trim()) {
      showToast("Vui lòng nhập tiêu đề lịch làm việc (Schedule Title).", "warning");
      return;
    }

    if (!form.startDate || !form.endDate) {
      showToast("Vui lòng chỉ định ngày bắt đầu và ngày kết thúc.", "warning");
      return;
    }

    const startIso = combineDateAndTime(form.startDate, form.startTime);
    const endIso = combineDateAndTime(form.endDate, form.endTime);

    if (!startIso || !endIso) {
      showToast("Định dạng ngày hoặc giờ không hợp lệ.", "error");
      return;
    }

    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      showToast(
        "Thời gian kết thúc lịch phải sau thời gian bắt đầu (Schedule end time must be strictly after start time).",
        "error",
        "Lỗi thời gian (Invalid Schedule Period)"
      );
      return;
    }

    const assignedHumanResourceId = form.assignedHumanResourceId
      ? Number(form.assignedHumanResourceId)
      : null;

    try {
      setSaving(true);

      await updateSchedule(scheduleId, {
        allocationPlanId: planId,
        phaseId: form.phaseId ? Number(form.phaseId) : null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        startDate: startIso,
        endDate: endIso,
        status: form.status,
        priority: Number(form.priority),
        assignedHumanResourceId: assignedHumanResourceId,
        createdBy: currentUserId,
        notes: form.notes.trim() || null,
      });

      navigate(`/schedules/${scheduleId}`, { replace: true });
    } catch (submitErr: any) {
      console.error("Update schedule failed:", submitErr);
      showToast(
        submitErr?.response?.data?.message ||
          submitErr?.message ||
          "Không thể cập nhật lịch làm việc. Vui lòng kiểm tra lại các trường dữ liệu.",
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
            Loading schedule details...
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
            <button type="button" className="schedule-back-btn" onClick={() => navigate(`/schedules/${scheduleId}`)}>
              <ArrowLeft size={15} /> Back to Schedule Details
            </button>
            <p className="schedule-breadcrumb">Dashboard / Schedules / Edit #{scheduleId}</p>
            <h1>Edit Work Schedule</h1>
            <p className="schedule-subtitle">
              Modify work instructions, timing, phase association, or reassign field personnel.
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
                  required
                >
                  <option value="">-- Select an Approved Allocation Plan --</option>
                  {allowedAllocationPlans.map((plan) => {
                    const planId = plan.allocationPlanId;
                    const expTitle = plan.experimentName || `Experiment #${plan.experimentId}`;
                    const status = plan.approveStatus || "Pending";
                    const fitness = Math.round(plan.fitnessScore ?? 85);
                    return (
                      <option key={planId} value={planId}>
                        Allocation #{planId} — {expTitle} [{status} • Fitness {fitness}%]
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Experiment Phase Select */}
              <div className="schedule-form-group">
                <label htmlFor="phaseId">Experiment Phase (Optional / Specific Phase)</label>
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
                  {groupedPersonnelByPhase.map((group, gIdx) => (
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
              </div>

              {/* Visual Personnel Cards Grid */}
              {allocatedHumans.length > 0 && (
                <div>
                  <label style={{ fontSize: "12px", color: "#475569", fontWeight: 600 }}>
                    Click staff card to assign quickly:
                  </label>
                  <div className="schedule-personnel-visual-grid">
                    {allocatedHumans.map((h, idx) => {
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
                              <span className={`schedule-role-tag ${isSeasonal ? "seasonal" : "technician"}`}>
                                {roleName}
                              </span>
                              {h.phaseName && <span className="schedule-phase-tag">{h.phaseName}</span>}
                            </div>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                              {h.workingHours || 8} hrs/day • {formatDate(h.startDate)}
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

              {/* Quick Task Templates */}
              <div className="schedule-templates-wrapper">
                <span className="schedule-templates-title">
                  <Sparkles size={13} color="#16a34a" /> Quick Task Templates:
                </span>
                <div className="schedule-templates-grid">
                  {TASK_TEMPLATES.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="schedule-template-btn"
                      onClick={() => handleApplyTemplate(t)}
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
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

              {/* Start Date & Time */}
              <div className="schedule-form-group">
                <label>
                  Start Date & Time <span className="required-star">*</span>
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="date"
                    name="startDate"
                    className="schedule-input"
                    style={{ flex: 1 }}
                    value={form.startDate}
                    onChange={handleChange}
                    required
                  />
                  <input
                    type="time"
                    name="startTime"
                    className="schedule-input"
                    style={{ width: "105px" }}
                    value={form.startTime}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* End Date & Time */}
              <div className="schedule-form-group">
                <label>
                  End Date & Time <span className="required-star">*</span>
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="date"
                    name="endDate"
                    className="schedule-input"
                    style={{ flex: 1 }}
                    value={form.endDate}
                    onChange={handleChange}
                    required
                  />
                  <input
                    type="time"
                    name="endTime"
                    className="schedule-input"
                    style={{ width: "105px" }}
                    value={form.endTime}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Priority & Status */}
              <div className="schedule-form-row">
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
                </div>

                <div className="schedule-form-group">
                  <label htmlFor="status">Schedule Status</label>
                  <select
                    id="status"
                    name="status"
                    className="schedule-select"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="Planned">Planned</option>
                    <option value="InProgress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
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
                    {selectedAllocation ? `Plan #${selectedAllocation.allocationPlanId}` : "Not selected"}
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
                        [{selectedPersonnel.roleName || "Technician"}] {selectedPersonnel.fullName || "Staff"}
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
                    {form.startDate ? `${formatDate(form.startDate)}` : "TBD"} →{" "}
                    {form.endDate ? `${formatDate(form.endDate)}` : "TBD"}
                  </strong>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="schedule-form-actions">
                <button
                  type="button"
                  className="schedule-btn schedule-btn-cancel"
                  onClick={() => navigate(`/schedules/${scheduleId}`)}
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
                    "Saving..."
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> Save Changes
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