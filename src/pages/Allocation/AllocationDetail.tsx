import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Ban,
  Pencil,
  Sparkles,
  Layers,
  Cpu,
  Users,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  CalendarPlus,
  Plus,
} from "lucide-react";
import ToastPopup, { type ToastType } from "../../components/common/ToastPopup";

import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../services/api";
import {
  approveAllocationPlan,
  cancelAllocationPlan,
  getAllocationPlanById,
  rejectAllocationPlan,
} from "../../services/allocationPlanService";
import {
  getAllocationEquipmentDetails,
  getAllocationHumanDetails,
  getAllocationLandDetails,
} from "../../services/allocationDetailService";

import type { AllocationPlan, AllocationPlanStatus } from "../../types/allocationPlan";
import type { AllocationEquipmentDetail } from "../../types/allocationDetail";
import type { AllocationHumanDetail } from "../../types/allocationHumanDetail";
import type { AllocationLandDetail } from "../../types/allocationLand";
import type { ExperimentResponse } from "../../types/experiment";
import type { ExperimentPhase } from "../../types/experimentPhase";
import { getCurrentUserTokenInfo } from "../../utils/storage";

import "./AllocationDetail.css";

import { usePopup } from "../../context/PopupContext";

type Role = "Admin" | "Manager" | "Researcher" | "Technician" | "Student" | "Seasonal";
type ResourceTab = "equipment" | "human" | "land" | "phases" | "schedule";

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

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function getPriorityLabel(priority?: number | null): string {
  if (priority === null || priority === undefined) return "Normal";
  switch (priority) {
    case 0: return "Low";
    case 1: return "Normal";
    case 2: return "Medium";
    case 3: return "High";
    case 4: return "Urgent";
    default: return `Priority ${priority}`;
  }
}

function getPhaseDisplayName(phaseName?: string | null, phaseId?: number | null): string {
  const trimmed = (phaseName ?? "").trim();

  if (trimmed) {
    return trimmed;
  }

  if (typeof phaseId === "number" && Number.isFinite(phaseId)) {
    return `Phase #${phaseId}`;
  }

  return "-";
}

export default function AllocationDetail() {
  const { showConfirm, showAlert } = usePopup();
  const navigate = useNavigate();
  const { allocationPlanId: allocationPlanIdParam } = useParams<{ allocationPlanId: string }>();
  const allocationPlanId = Number(allocationPlanIdParam);

  const currentUser = useMemo(() => getCurrentUserTokenInfo(), []);
  const role = (currentUser.role || "Seasonal") as Role;

  const [plan, setPlan] = useState<AllocationPlan | null>(null);
  const [experiment, setExperiment] = useState<ExperimentResponse | null>(null);
  const [phases, setPhases] = useState<ExperimentPhase[]>([]);
  const [equipmentDetails, setEquipmentDetails] = useState<AllocationEquipmentDetail[]>([]);
  const [humanDetails, setHumanDetails] = useState<AllocationHumanDetail[]>([]);
  const [landDetails, setLandDetails] = useState<AllocationLandDetail[]>([]);

  const [activeTab, setActiveTab] = useState<ResourceTab>("equipment");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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
    if (type === "error") setError(message);
    if (type === "success") setSuccessMessage(message);
    setToast({
      visible: true,
      type,
      title:
        title ||
        (type === "error"
          ? "Lỗi thực thi (Action Error)"
          : type === "success"
          ? "Thành công (Success)"
          : "Thông báo (Notice)"),
      message,
    });
  };

  const loadAllocationDetail = useCallback(async () => {
    if (!Number.isInteger(allocationPlanId) || allocationPlanId <= 0) {
      showAlert({
        title: "Invalid Allocation Plan",
        message: "The allocation plan ID is invalid.",
        confirmText: "OK",
        tone: "danger",
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [planRes, equipData, humanData, landData] = await Promise.all([
        getAllocationPlanById(allocationPlanId),
        getAllocationEquipmentDetails({
          allocationPlanId,
          size: 300,
        }),
        getAllocationHumanDetails({
          allocationPlanId,
          size: 300,
        }),
        getAllocationLandDetails({
          allocationPlanId,
          size: 300,
        }),
      ]);

      setPlan(planRes);
      setEquipmentDetails(Array.isArray(equipData) ? equipData : []);
      setHumanDetails(Array.isArray(humanData) ? humanData : []);
      setLandDetails(Array.isArray(landData) ? landData : []);

      if (planRes.experimentId) {
        const [expRes, phaseRes] = await Promise.all([
          api
            .get(`/Experiments/${planRes.experimentId}`)
            .catch(() => null),
          api
            .get(
              `/ExperimentPhases?ExperimentId=${planRes.experimentId}&size=100`
            )
            .catch(() => null),
        ]);

        if (expRes?.data) {
          setExperiment(
            expRes.data?.data ||
              expRes.data?.result ||
              expRes.data
          );
        } else {
          setExperiment(null);
        }

        const phasePayload = phaseRes?.data;
        const rawPhases = Array.isArray(phasePayload)
          ? phasePayload
          : Array.isArray(phasePayload?.items)
            ? phasePayload.items
            : Array.isArray(phasePayload?.data)
              ? phasePayload.data
              : Array.isArray(phasePayload?.result)
                ? phasePayload.result
                : Array.isArray(phasePayload?.data?.items)
                  ? phasePayload.data.items
                  : [];

        setPhases(
          rawPhases.filter(
            (phase: ExperimentPhase) =>
              Number(phase.experimentId) ===
              Number(planRes.experimentId)
          )
        );
      } else {
        setExperiment(null);
        setPhases([]);
      }
    } catch (loadErr: any) {
      console.error(
        "Failed to load allocation details:",
        loadErr
      );

      const message =
        loadErr?.response?.data?.message ||
        loadErr?.response?.data?.error ||
        "Failed to load allocation plan.";

      setError(message);

      showAlert({
        title: "Unable to Load Allocation Plan",
        message,
        confirmText: "OK",
        tone: "danger",
      });
    } finally {
      setLoading(false);
    }
  }, [
    allocationPlanId,
    showAlert,
  ]);

  useEffect(() => {
    void loadAllocationDetail();
  }, [loadAllocationDetail]);

  const canApprove = role === "Manager" && plan?.approveStatus === "Pending";
  const canReject = role === "Manager" && plan?.approveStatus === "Pending";
  const canReviewAISuggestions = role === "Manager" && plan?.approveStatus === "Pending";
  const canCompareAISuggestions = role === "Researcher" && plan?.approveStatus === "Pending";
  const canAllocateResources =
    role === "Manager" && plan?.approveStatus === "Approved";
  const canCancel =
    role === "Researcher" &&
    plan?.approveStatus === "Pending";
  const canEdit = role === "Researcher" && plan?.approveStatus === "Draft";

  // Researcher already requests and persists the concrete resources before submission.
  // Manager only reviews/approves/rejects that request; Manager must not allocate them again.

  // Schedule ownership rule:
  // - Researcher-created + Manager-approved plan -> Researcher assigns.
  // - Manager-created plan (manual or AI replacement) + Approved -> Manager assigns.
  // - Manager viewing an approved Researcher plan -> view only; no schedule action.
  // The persisted Allocation Plan owner is the source of truth.
  const isPlanOwner =
    Number(currentUser.userId || 0) > 0 &&
    Number(plan?.createdBy || 0) === Number(currentUser.userId);

  const canAssignSchedule =
    humanDetails.length > 0 &&
    (role === "Researcher" || role === "Manager") &&
    plan?.approveStatus === "Approved" &&
    isPlanOwner;

  // Schedule navigation is intentionally isolated here.
  // Opening /allocation/:allocationPlanId never redirects to CreateSchedule.
  const openWorkSchedule = (options?: { personnelId?: number | null; phaseId?: number | null }) => {
    if (!plan || !canAssignSchedule) return;

    const params = new URLSearchParams({
      allocationPlanId: String(plan.allocationPlanId),
    });

    if (options?.personnelId) {
      params.set("personnelId", String(options.personnelId));
    }

    if (options?.phaseId) {
      params.set("phaseId", String(options.phaseId));
    }

    navigate(`/schedules/create?${params.toString()}`);
  };

  const handleApprove = async () => {
    if (!plan || !canApprove || actionLoading) return;
    if (!await showConfirm("Approve this resource allocation request?")) return;

    try {
      setActionLoading(true);
      setError("");
      await approveAllocationPlan(plan.allocationPlanId);

      // Experiment đã được Manager duyệt ở bước trước và đang ở trạng thái Ready.
      // Ở đây chỉ duyệt Allocation Plan, không thay đổi Experiment status lần nữa.
      showToast(
        "Kế hoạch phân bổ đã được phê duyệt.",
        "success",
        "Phê duyệt thành công"
      );
      await loadAllocationDetail();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Không thể phê duyệt kế hoạch phân bổ.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!plan || !canReject || actionLoading) return;
    if (!await showConfirm("Reject this resource allocation request?")) return;

    try {
      setActionLoading(true);
      setError("");
      await rejectAllocationPlan(plan.allocationPlanId);
      showToast("Kế hoạch phân bổ đã bị từ chối.", "warning", "Từ chối kế hoạch");
      await loadAllocationDetail();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Không thể từ chối kế hoạch phân bổ.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!plan || !canCancel || actionLoading) return;
    if (!await showConfirm("Cancel this allocation plan?")) return;

    try {
      setActionLoading(true);
      setError("");
      await cancelAllocationPlan(plan.allocationPlanId);
      showToast("Kế hoạch phân bổ đã được hủy.", "info", "Hủy kế hoạch");
      await loadAllocationDetail();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Không thể hủy kế hoạch phân bổ.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="allocation-detail-page">
          <div className="alloc-empty-box">Loading resource allocation plan...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!plan) {
    return (
      <DashboardLayout>
        <div className="allocation-detail-page">
          <div className="alloc-empty-box">
            <h3>Allocation Plan Not Found</h3>
            <p>The requested resource allocation plan could not be found.</p>
            <button
              type="button"
              className="alloc-btn alloc-btn-cancel"
              style={{ maxWidth: "200px", margin: "16px auto 0" }}
              onClick={() => navigate("/allocation")}
            >
              Back to Allocation List
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Prefer persisted details; otherwise show the experiment requirement counts
  // returned by getAllocationPlanById so list and detail counts stay consistent.
  const persistedEquipmentUnits = equipmentDetails.reduce(
    (sum, detail) => sum + Math.max(0, Number(detail.quantity ?? 0)),
    0
  );
  const equipCount =
    persistedEquipmentUnits ||
    plan.equipmentDetailCount ||
    0;
  const humanCount = humanDetails.length || plan.humanDetailCount || 0;
  const landCount = landDetails.length || plan.landDetailCount || 0;
  const phaseCount = phases.length || 1;

  const statusKey = (plan.approveStatus || "Pending").toLowerCase();

  return (
    <DashboardLayout>
      <div className="allocation-detail-page">
        {/* Top Header */}
        <div className="allocation-detail-header">
          <div>
            <button
              type="button"
              className="allocation-back-button"
              onClick={() => navigate("/allocation")}
            >
              <ArrowLeft size={15} /> Back to Allocations
            </button>
            <p className="allocation-breadcrumb">Dashboard / Allocations / Plan Detail</p>
            <h1>{plan.approveStatus === "Pending" ? "Resource Allocation Request" : "Resource Allocation Plan"}</h1>
            <p className="allocation-subtitle">
              {plan.experimentName || experiment?.experimentName || "Target Experiment Resource Allocation"}
            </p>
          </div>

          <div className="allocation-header-right">
            {canAssignSchedule && (
              <button
                type="button"
                className="alloc-btn alloc-btn-approve"
                style={{ width: "auto", padding: "8px 16px", fontSize: "12.5px" }}
                onClick={() => openWorkSchedule()}
              >
                <CalendarPlus size={15} /> Assign Work Schedule
              </button>
            )}
            <span className={`alloc-status-pill alloc-status-${statusKey}`}>
              <ShieldCheck size={14} /> {plan.approveStatus || "Submitted"}
            </span>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="allocation-layout-grid">
          {/* Main Left Column */}
          <div className="allocation-main-col">
            {/* Key Metrics Card */}
            <div className="alloc-card">
              <div className="alloc-card-header">
                <div>
                  <span className="alloc-card-header-eyebrow">Decision Summary</span>
                  <h3>{plan.approveStatus === "Pending" ? "Resource Request Summary" : "Allocated Resource Summary"}</h3>
                </div>
              </div>

              <div className="alloc-metrics-grid">
                <div className="alloc-metric-item">
                  <span className="alloc-metric-label">Equipment Units</span>
                  <div className="alloc-metric-value">{equipCount}</div>
                </div>

                <div className="alloc-metric-item">
                  <span className="alloc-metric-label">Field Personnel</span>
                  <div className="alloc-metric-value">{humanCount}</div>
                </div>

                <div className="alloc-metric-item">
                  <span className="alloc-metric-label">Land Plots</span>
                  <div className="alloc-metric-value">{landCount}</div>
                </div>

                <div className="alloc-metric-item">
                  <span className="alloc-metric-label">Experiment Phases</span>
                  <div className="alloc-metric-value">{phaseCount}</div>
                </div>

                <div className="alloc-metric-item">
                  <span className="alloc-metric-label">Fitness Score</span>
                  <div
                    className="alloc-metric-value"
                    style={{
                      color: plan.fitnessScore != null ? "#15803d" : "#94a3b8",
                    }}
                  >
                    {plan.fitnessScore != null
                      ? Number(plan.fitnessScore).toFixed(2)
                      : "-"}
                  </div>
                </div>

                <div className="alloc-metric-item">
                  <span className="alloc-metric-label">Schedules</span>
                  <div className="alloc-metric-value">
                    {plan.scheduleCount ?? 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="alloc-card">
              <div className="alloc-card-header">
                <div>
                  <span className="alloc-card-header-eyebrow">
                    Plan Information
                  </span>
                  <h3>Allocation Plan Details</h3>
                </div>
              </div>

              <div className="alloc-detail-field-grid alloc-plan-detail-grid">
                <div>
                  <span>Allocation Plan ID</span>
                  <strong>#{plan.allocationPlanId}</strong>
                </div>

                <div>
                  <span>Experiment ID</span>
                  <strong>#{plan.experimentId}</strong>
                </div>

                <div>
                  <span>Approval Status</span>
                  <strong>{plan.approveStatus || "-"}</strong>
                </div>

                <div>
                  <span>Fitness Score</span>
                  <strong>
                    {plan.fitnessScore != null
                      ? Number(plan.fitnessScore).toFixed(2)
                      : "Not evaluated"}
                  </strong>
                </div>

                <div>
                  <span>Created By</span>
                  <strong>{plan.createdByName || `User #${plan.createdBy}`}</strong>
                </div>

                <div>
                  <span>Created At</span>
                  <strong>{formatDateTime(plan.createdAt)}</strong>
                </div>

                <div>
                  <span>Last Updated</span>
                  <strong>{formatDateTime(plan.updatedAt)}</strong>
                </div>

                <div>
                  <span>Approved By</span>
                  <strong>{plan.approveByName || "-"}</strong>
                </div>

                <div>
                  <span>Approved At</span>
                  <strong>{formatDateTime(plan.approvedAt)}</strong>
                </div>
              </div>
            </div>

            {/* Interactive Phased Resource Details Tabs */}
            <div className="alloc-card">
              <div className="alloc-card-header">
                <div>
                  <span className="alloc-card-header-eyebrow">{plan.approveStatus === "Pending" ? "Requested Resources" : "Assigned Resources"}</span>
                  <h3>{plan.approveStatus === "Pending" ? "Resource Request Details" : "Resource Allocation Details"}</h3>
                </div>
              </div>

              {/* Tabs Bar */}
              <div className="alloc-tabs-bar">
                <button
                  type="button"
                  onClick={() => setActiveTab("equipment")}
                  className={`alloc-tab-btn ${activeTab === "equipment" ? "active" : ""}`}
                >
                  <Cpu size={14} /> Equipment
                  <span className="alloc-tab-badge">{equipCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("human")}
                  className={`alloc-tab-btn ${activeTab === "human" ? "active" : ""}`}
                >
                  <Users size={14} /> Personnel
                  <span className="alloc-tab-badge">{humanCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("land")}
                  className={`alloc-tab-btn ${activeTab === "land" ? "active" : ""}`}
                >
                  <MapPin size={14} /> Land Plot
                  <span className="alloc-tab-badge">{landCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("phases")}
                  className={`alloc-tab-btn ${activeTab === "phases" ? "active" : ""}`}
                >
                  <Layers size={14} /> Phases
                  <span className="alloc-tab-badge">{phaseCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("schedule")}
                  className={`alloc-tab-btn ${activeTab === "schedule" ? "active" : ""}`}
                >
                  <Calendar size={14} /> Schedule
                  <span className="alloc-tab-badge">{plan.scheduleCount ?? 0}</span>
                </button>
              </div>

              {/* Tab 1: Equipment */}
              {activeTab === "equipment" && (
                <div className="alloc-table-wrapper">
                  {equipmentDetails.length === 0 ? (
                    <div className="alloc-empty-box">
                      {equipCount > 0
                        ? `No persisted equipment allocation details were found. Experiment requirements: ${equipCount}.`
                        : "No persisted equipment allocation details were found for this plan."}
                    </div>
                  ) : (
                    <table className="alloc-resource-table alloc-resource-table-detailed">
                      <thead>
                        <tr>
                          <th>Asset</th>
                          <th>Requested Type</th>
                          <th>Allocated Type</th>
                          <th>Phase</th>
                          <th>Quantity</th>
                          <th>Assigned Period</th>
                          <th>Efficiency</th>
                          <th>Substitute</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {equipmentDetails.map((eq, idx) => (
                          <tr key={eq.allocationEquipmentDetailId || idx}>
                            <td>
                              {eq.equipmentInstanceId ? (
                                <>
                                  <div className="alloc-primary-text">
                                    {eq.equipmentInstanceName ||
                                      eq.assetCode ||
                                      `Equipment #${eq.equipmentInstanceId}`}
                                  </div>

                                  <div className="alloc-secondary-text">
                                    Asset Code: {eq.assetCode || "-"}
                                  </div>

                                  <div className="alloc-secondary-text">
                                    Serial: {eq.serialNumber || "-"}
                                  </div>

                                  <div className="alloc-secondary-text">
                                    Tracking: Individual
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="alloc-primary-text">
                                    Quantity-based stock
                                  </div>

                                  <div className="alloc-secondary-text">
                                    Quantity: {eq.quantity ?? 0} unit(s)
                                  </div>

                                  <div className="alloc-secondary-text">
                                    Tracking: Quantity Based
                                  </div>
                                </>
                              )}
                            </td>

                            <td>
                              {eq.requestedEquipmentTypeName ||
                                (eq.requestedEquipmentTypeId
                                  ? `Type #${eq.requestedEquipmentTypeId}`
                                  : "-")}
                            </td>

                            <td>
                              {eq.allocatedEquipmentTypeName ||
                                (eq.allocatedEquipmentTypeId
                                  ? `Type #${eq.allocatedEquipmentTypeId}`
                                  : "-")}
                            </td>

                            <td>
                              <div>{getPhaseDisplayName(eq.phaseName, eq.phaseId)}</div>
                              {eq.phaseId && (
                                <div className="alloc-secondary-text">
                                  Phase ID: {eq.phaseId}
                                </div>
                              )}
                            </td>

                            <td>{eq.quantity ?? 1}</td>

                            <td>
                              <div>{formatDate(eq.startDate)}</div>
                              <div className="alloc-period-arrow">→</div>
                              <div>{formatDate(eq.endDate)}</div>
                            </td>

                            <td>
                              <span className="alloc-efficiency-badge">
                                {Math.round((eq.efficiencyRate ?? 0) * 100)}%
                              </span>
                            </td>

                            <td>
                              <span
                                className={
                                  eq.isSubstitute
                                    ? "alloc-yes-badge"
                                    : "alloc-no-badge"
                                }
                              >
                                {eq.isSubstitute ? "Yes" : "No"}
                              </span>
                            </td>

                            <td>
                              <span className="badge-available">
                                {plan.approveStatus === "Pending" ? "Requested" : (eq.status || "Allocated")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab 2: Personnel */}
              {activeTab === "human" && (
                <div className="alloc-table-wrapper">
                  {humanDetails.length === 0 ? (
                    <div className="alloc-empty-box">
                      {humanCount > 0
                        ? `No persisted personnel allocation details were found. Experiment requirements: ${humanCount}.`
                        : "No persisted personnel allocation details were found for this plan."}
                    </div>
                  ) : (
                    <table className="alloc-resource-table alloc-resource-table-detailed">
                      <thead>
                        <tr>
                          <th>Personnel</th>
                          <th>Role</th>
                          <th>Required Skill</th>
                          <th>Phase</th>
                          <th>Working Hours</th>
                          <th>Current Capacity</th>
                          <th>Assigned Period</th>
                          <th>Status</th>
                          {canAssignSchedule && <th>Schedule</th>}
                        </tr>
                      </thead>

                      <tbody>
                        {humanDetails.map((h, idx) => (
                          <tr key={h.allocationHumanDetailId || idx}>
                            <td>
                              <div className="alloc-primary-text">
                                {h.fullName ||
                                  h.humanResourceName ||
                                  `Personnel #${h.humanResourceId}`}
                              </div>

                              <div className="alloc-secondary-text">
                                {h.email || h.username || "-"}
                              </div>

                              <div className="alloc-secondary-text">
                                HR ID: {h.humanResourceId || "-"}
                              </div>
                            </td>

                            <td>
                              <span className="alloc-role-badge">
                                {h.roleName ||
                                  h.humanResourceRoleName ||
                                  "-"}
                              </span>
                            </td>

                            <td>
                              <div>
                                {h.requiredSkillName ||
                                  h.skillName ||
                                  "-"}
                              </div>

                              {h.skillLevel && (
                                <div className="alloc-secondary-text">
                                  Level: {h.skillLevel}
                                </div>
                              )}
                            </td>

                            <td>
                              <div>{getPhaseDisplayName(h.phaseName, h.phaseId)}</div>
                              {h.phaseId && (
                                <div className="alloc-secondary-text">
                                  Phase ID: {h.phaseId}
                                </div>
                              )}
                            </td>

                            <td>
                              <strong>{h.workingHours ?? 0}</strong> hrs/day
                            </td>

                            <td>
                              <div>
                                Max: {h.maxWorkingHoursPerDay ?? "-"} hrs/day
                              </div>
                              <div className="alloc-secondary-text">
                                Current workload: {h.currentWorkload ?? "-"}
                              </div>
                            </td>

                            <td>
                              <div>{formatDate(h.startDate)}</div>
                              <div className="alloc-period-arrow">→</div>
                              <div>{formatDate(h.endDate)}</div>
                            </td>

                            <td>
                              <span className="badge-available">
                                {plan.approveStatus === "Pending" ? "Requested" : (h.status || "Allocated")}
                              </span>
                            </td>

                            {canAssignSchedule && (
                              <td>
                                <button
                                  type="button"
                                  className="alloc-assign-schedule-btn"
                                  onClick={() =>
                                    openWorkSchedule({
                                      personnelId: h.humanResourceId || h.userId,
                                      phaseId: h.phaseId,
                                    })
                                  }
                                >
                                  <CalendarPlus size={13} />
                                  Assign
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab 3: Land Plot */}
              {activeTab === "land" && (
                <div className="alloc-land-grid">
                  {landDetails.length === 0 ? (
                    <div className="alloc-empty-box">
                      {landCount > 0
                        ? `No persisted land allocation details were found. Experiment requirements: ${landCount}.`
                        : "No persisted land allocation details were found for this plan."}
                    </div>
                  ) : (
                    landDetails.map((land, idx) => (
                      <article
                        key={land.allocationLandDetailId || idx}
                        className="alloc-land-detail-card"
                      >
                        <div className="alloc-land-detail-header">
                          <div>
                            <span className="alloc-card-header-eyebrow">
                              Land Plot
                            </span>
                            <h4>
                              {land.landCode ||
                                land.landName ||
                                `Land #${land.landId}`}
                            </h4>
                          </div>

                          <span className="badge-available">
                            {plan.approveStatus === "Pending" ? "Requested" : (land.status || "Allocated")}
                          </span>
                        </div>

                        <div className="alloc-detail-field-grid">
                          <div>
                            <span>Land ID</span>
                            <strong>{land.landId || "-"}</strong>
                          </div>

                          <div>
                            <span>Area</span>
                            <strong>{land.areaName || "-"}</strong>
                          </div>

                          <div>
                            <span>Area Size</span>
                            <strong>
                              {land.areaSize != null
                                ? `${Number(land.areaSize).toLocaleString("vi-VN")}`
                                : "-"}
                            </strong>
                          </div>

                          <div>
                            <span>Soil Type</span>
                            <strong>{land.soilType || "-"}</strong>
                          </div>

                          <div className="alloc-detail-field-wide">
                            <span>Location</span>
                            <strong>{land.location || "-"}</strong>
                          </div>

                          <div>
                            <span>Start Date</span>
                            <strong>{formatDate(land.startDate)}</strong>
                          </div>

                          <div>
                            <span>End Date</span>
                            <strong>{formatDate(land.endDate)}</strong>
                          </div>

                          <div>
                            <span>Requirement ID</span>
                            <strong>{land.expLandReqId || "-"}</strong>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              )}

              {/* Tab 4: Phases */}
              {activeTab === "phases" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        color: "#0f172a",
                        fontWeight: 600,
                      }}
                    >
                      Experiment Phases ({phases.length})
                    </h4>
                  </div>

                  {phases.length === 0 ? (
                    <div className="alloc-empty-box">
                      No experiment phases were found.
                    </div>
                  ) : (
                    <div className="alloc-phase-timeline-list">
                      {phases.map((p) => (
                        <div
                          key={p.experimentPhaseId}
                          className="alloc-phase-timeline-item"
                        >
                          <div>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                color: "#15803d",
                                textTransform: "uppercase",
                              }}
                            >
                              Phase #{p.phaseOrder ?? 1}
                            </span>

                            <div
                              style={{
                                fontSize: "13.5px",
                                fontWeight: 550,
                                color: "#0f172a",
                              }}
                            >
                              {p.phaseName}
                            </div>

                            <div
                              style={{
                                fontSize: "12px",
                                color: "#64748b",
                                marginTop: "2px",
                              }}
                            >
                              {formatDate(p.expectedStartDate)} →{" "}
                              {formatDate(p.expectedEndDate)}
                            </div>
                          </div>

                          <span className="alloc-phase-badge">
                            {p.status || "Planned"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 5: Schedule */}
              {activeTab === "schedule" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        color: "#0f172a",
                        fontWeight: 600,
                      }}
                    >
                      Work Schedules ({plan.scheduleCount ?? 0})
                    </h4>

                    {canAssignSchedule && (
                      <button
                        type="button"
                        className="alloc-create-schedule-btn"
                        onClick={() => openWorkSchedule()}
                      >
                        <Plus size={13} /> Create Work Schedule
                      </button>
                    )}
                  </div>

                  {(plan.scheduleCount ?? 0) === 0 ? (
                    <div className="alloc-empty-box">
                      No work schedules have been created for this allocation plan.
                    </div>
                  ) : (
                    <div className="alloc-empty-box">
                      This allocation plan has {plan.scheduleCount ?? 0} work
                      schedule(s). Open the Schedule module to view their full details.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Side Right Column */}
          <div className="allocation-side-col">
            {/* Experiment Information Card */}
            <div className="alloc-card">
              <div className="alloc-card-header">
                <div>
                  <span className="alloc-card-header-eyebrow">Experiment</span>
                  <h3>Experiment Context</h3>
                </div>
              </div>

              <div className="alloc-side-info-list">
                <div className="alloc-side-info-row">
                  <span>Experiment Name</span>
                  <strong>{experiment?.experimentName || plan.experimentName || "-"}</strong>
                </div>

                <div className="alloc-side-info-row">
                  <span>Experiment ID</span>
                  <strong>#{plan.experimentId}</strong>
                </div>

                <div className="alloc-side-info-row">
                  <span>Start Date</span>
                  <strong>{formatDate(experiment?.expectStartDate || plan.createdAt)}</strong>
                </div>

                <div className="alloc-side-info-row">
                  <span>End Date</span>
                  <strong>{formatDate(experiment?.expectEndDate)}</strong>
                </div>

                <div className="alloc-side-info-row">
                  <span>Deadline</span>
                  <strong>{formatDate(experiment?.deadline)}</strong>
                </div>

                <div className="alloc-side-info-row">
                  <span>Priority</span>
                  <strong>{getPriorityLabel(experiment?.priority)}</strong>
                </div>

                <div className="alloc-side-info-row">
                  <span>Researcher</span>
                  <strong>{experiment?.researcherName || plan.createdByName || "-"}</strong>
                </div>
              </div>
            </div>

            {/* Workflow & Approval Information Card */}
            <div className="alloc-card">
              <div className="alloc-card-header">
                <div>
                  <span className="alloc-card-header-eyebrow">Manager Decision</span>
                  <h3>{plan.approveStatus === "Pending" ? "Review Resource Request" : "Approval History"}</h3>
                </div>
              </div>

              <div className="alloc-side-info-list">
                <div className="alloc-side-info-row">
                  <span>Approval Status</span>
                  <strong>{plan.approveStatus}</strong>
                </div>

                <div className="alloc-side-info-row">
                  <span>Equipment Details</span>
                  <strong>{equipCount}</strong>
                </div>

                <div className="alloc-side-info-row">
                  <span>Personnel Details</span>
                  <strong>{humanCount}</strong>
                </div>

                <div className="alloc-side-info-row">
                  <span>Land Details</span>
                  <strong>{landCount}</strong>
                </div>

                <div className="alloc-side-info-row">
                  <span>Schedules</span>
                  <strong>{plan.scheduleCount ?? 0}</strong>
                </div>

                <div className="alloc-side-info-row">
                  <span>Fitness Score</span>
                  <strong
                    style={{
                      color: plan.fitnessScore != null ? "#15803d" : undefined,
                    }}
                  >
                    {plan.fitnessScore != null
                      ? Number(plan.fitnessScore).toFixed(2)
                      : "-"}
                  </strong>
                </div>

                <div className="alloc-side-info-row">
                  <span>Created By</span>
                  <strong>{plan.createdByName || "-"}</strong>
                </div>

                <div className="alloc-side-info-row">
                  <span>Created Date</span>
                  <strong>{formatDateTime(plan.createdAt)}</strong>
                </div>

                <div className="alloc-side-info-row">
                  <span>Approved By</span>
                  <strong>{plan.approveByName || "-"}</strong>
                </div>

                <div className="alloc-side-info-row">
                  <span>Approved Date</span>
                  <strong>{formatDateTime(plan.approvedAt)}</strong>
                </div>
              </div>

              {/* Action Buttons */}
              {(canApprove ||
                canReject ||
                canReviewAISuggestions ||
                canCompareAISuggestions ||
                canCancel ||
                canEdit ||
                canAllocateResources ||
                canAssignSchedule) && (
                <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
                  <div className="alloc-action-bar">
                    {canAssignSchedule && (
                      <button
                        type="button"
                        onClick={() => openWorkSchedule()}
                        className="alloc-btn alloc-btn-approve"
                      >
                        <CalendarPlus size={15} /> Assign Work Schedule
                      </button>
                    )}

                    {canApprove && (
                      <button
                        type="button"
                        onClick={() => void handleApprove()}
                        disabled={actionLoading}
                        className="alloc-btn alloc-btn-approve"
                      >
                        <CheckCircle2 size={15} /> Approve Resource Request
                      </button>
                    )}

                    {canReviewAISuggestions && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/allocation/${plan.allocationPlanId}/ai-suggestions?experimentId=${plan.experimentId}&allocationPlanId=${plan.allocationPlanId}`
                          )
                        }
                        disabled={actionLoading}
                        className="alloc-btn alloc-btn-approve"
                      >
                        <Sparkles size={15} /> AI Suggestion
                      </button>
                    )}

                    {canCompareAISuggestions && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/allocation/${plan.allocationPlanId}/ai-suggestions?experimentId=${plan.experimentId}&allocationPlanId=${plan.allocationPlanId}`
                          )
                        }
                        disabled={actionLoading}
                        className="alloc-btn alloc-btn-edit"
                      >
                        <Sparkles size={15} /> Compare AI Suggestions
                      </button>
                    )}

                    {canAllocateResources && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/allocation/create?experimentId=${plan.experimentId}&allocationPlanId=${plan.allocationPlanId}`
                          )
                        }
                        disabled={actionLoading}
                        className="alloc-btn alloc-btn-approve"
                      >
                        <Plus size={15} /> Allocate Resources
                      </button>
                    )}

                    {canReject && (
                      <button
                        type="button"
                        onClick={() => void handleReject()}
                        disabled={actionLoading}
                        className="alloc-btn alloc-btn-reject"
                      >
                        <XCircle size={15} /> Reject Resource Request
                      </button>
                    )}

                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => void handleCancel()}
                        disabled={actionLoading}
                        className="alloc-btn alloc-btn-cancel"
                      >
                        <Ban size={15} /> Cancel Plan
                      </button>
                    )}

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => navigate(`/allocation/create?experimentId=${plan.experimentId}`)}
                        disabled={actionLoading}
                        className="alloc-btn alloc-btn-edit"
                      >
                        <Pencil size={15} /> Edit Allocation
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
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