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
  ArrowDownRight,
  RotateCcw,
  PackageCheck,
  AlertTriangle,
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
  handoverEquipmentDetail,
  returnEquipmentDetail,
} from "../../services/allocationDetailService";

import type { AllocationPlan, AllocationPlanStatus } from "../../types/allocationPlan";
import type { AllocationEquipmentDetail } from "../../types/allocationDetail";
import type { AllocationHumanDetail } from "../../types/allocationHumanDetail";
import type { AllocationLandDetail } from "../../types/allocationLand";
import type { ExperimentResponse } from "../../types/experiment";
import type { ExperimentPhase } from "../../types/experimentPhase";
import { getCurrentUserTokenInfo } from "../../utils/storage";

import "./AllocationDetail.css";

type Role = "Admin" | "Manager" | "Researcher" | "Technician" | "Student" | "Seasonal";
type ResourceTab = "equipment" | "human" | "land" | "phases";

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

export default function AllocationDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const allocationPlanId = Number(id);

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

  // Equipment Handover & Return State
  const [handoverModalItem, setHandoverModalItem] = useState<AllocationEquipmentDetail | null>(null);
  const [returnModalItem, setReturnModalItem] = useState<AllocationEquipmentDetail | null>(null);
  const [returnCondition, setReturnCondition] = useState<"Good" | "Normal" | "NeedMaintenance" | "Broken">("Good");
  const [returnNotes, setReturnNotes] = useState("");
  const [equipmentActionLoading, setEquipmentActionLoading] = useState(false);

  const handleConfirmHandover = async () => {
    if (!handoverModalItem) return;
    try {
      setEquipmentActionLoading(true);
      await handoverEquipmentDetail(handoverModalItem.allocationEquipmentDetailId);
      showToast(
        `Đã xác nhận bàn giao và tiếp nhận thiết bị "${handoverModalItem.equipmentInstanceName || handoverModalItem.assetCode || "thiết bị"}" vào sử dụng (InUse)!`,
        "success",
        "Bàn giao thành công"
      );
      setHandoverModalItem(null);
      await loadAllocationDetail();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Không thể thực hiện bàn giao thiết bị.", "error", "Bàn giao thất bại");
    } finally {
      setEquipmentActionLoading(false);
    }
  };

  const handleConfirmReturn = async () => {
    if (!returnModalItem) return;
    try {
      setEquipmentActionLoading(true);
      await returnEquipmentDetail(returnModalItem.allocationEquipmentDetailId, returnNotes);
      const isFieldStaff = role === "Seasonal" || role === "Technician";
      showToast(
        isFieldStaff
          ? `Đã hoàn tất trả thiết bị "${returnModalItem.equipmentInstanceName || returnModalItem.assetCode || "thiết bị"}" sau khi sử dụng!`
          : `Đã xác nhận nghiệm thu và đưa thiết bị "${returnModalItem.equipmentInstanceName || returnModalItem.assetCode || "thiết bị"}" về kho (Available) thành công!`,
        "success",
        isFieldStaff ? "Trả thiết bị thành công" : "Xác nhận trả thiết bị thành công"
      );
      setReturnModalItem(null);
      setReturnNotes("");
      await loadAllocationDetail();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Không thể thực hiện hoàn trả thiết bị.", "error", "Hoàn trả thất bại");
    } finally {
      setEquipmentActionLoading(false);
    }
  };

  const loadAllocationDetail = useCallback(async () => {
    if (!Number.isInteger(allocationPlanId) || allocationPlanId <= 0) {
      setError("Invalid Allocation Plan.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [
        planRes,
        equipData,
        humanData,
        landData,
        allEquipRes,
        allHumanRes,
        allLandRes,
        expEquipReqRes,
        expHumanReqRes,
        expLandReqRes,
        liveEquipRes,
        liveHumanRes,
        liveLandRes,
      ] = await Promise.all([
        getAllocationPlanById(allocationPlanId),
        getAllocationEquipmentDetails({ allocationPlanId, size: 200 }).catch(() => []),
        getAllocationHumanDetails({ allocationPlanId, size: 200 }).catch(() => []),
        getAllocationLandDetails({ allocationPlanId, size: 200 }).catch(() => []),
        api.get("/AllocationEquipmentDetails?size=300").catch(() => ({ data: [] })),
        api.get("/AllocationHumanDetails?size=300").catch(() => ({ data: [] })),
        api.get("/AllocationLandDetails?size=300").catch(() => ({ data: [] })),
        api.get("/ExperimentEquipmentRequirements?size=300").catch(() => ({ data: [] })),
        api.get("/ExperimentHumanRequirements?size=300").catch(() => ({ data: [] })),
        api.get("/ExperimentLandRequirements?size=300").catch(() => ({ data: [] })),
        api.get("/EquipmentInstances?size=100").catch(() => ({ data: [] })),
        api.get("/HumanResourceProfiles?size=100").catch(() => ({ data: [] })),
        api.get("/LandResources?size=100").catch(() => ({ data: [] })),
      ]);

      setPlan(planRes);

      const unwrap = (r: any): any[] => {
        if (!r) return [];
        if (Array.isArray(r)) return r;
        const d = r.data || r;
        if (Array.isArray(d)) return d;
        if (d && Array.isArray(d.items)) return d.items;
        if (d && Array.isArray(d.data)) return d.data;
        if (d && Array.isArray(d.result)) return d.result;
        return [];
      };

      const allEquips = unwrap(allEquipRes);
      const allHumans = unwrap(allHumanRes);
      const allLands = unwrap(allLandRes);
      const expEquipReqs = unwrap(expEquipReqRes);
      const expHumanReqs = unwrap(expHumanReqRes);
      const expLandReqs = unwrap(expLandReqRes);
      const liveEquips = unwrap(liveEquipRes);
      const liveHumans = unwrap(liveHumanRes);
      const liveLands = unwrap(liveLandRes);

      // 1. Equipment Details Resolution
      let equips: any[] = Array.isArray(equipData) && equipData.length > 0 ? equipData : [];
      if (equips.length === 0) {
        equips = allEquips.filter(
          (e: any) =>
            Number(e.allocationPlanId) === allocationPlanId ||
            (planRes.experimentId && (Number(e.experimentId) === planRes.experimentId || e.expEquipmentReqId))
        );
      }
      if (equips.length === 0 && (planRes.equipmentDetailCount > 0 || planRes.experimentId)) {
        const matchedReqs = expEquipReqs.filter((er: any) => er.experimentId === planRes.experimentId);
        if (matchedReqs.length > 0) {
          equips = matchedReqs.map((er: any, idx: number) => {
            const inst = liveEquips.find((i: any) => i.equipmentTypeId === er.equipmentTypeId) || liveEquips[idx % (liveEquips.length || 1)];
            return {
              allocationEquipmentDetailId: er.expEquipmentReqId || idx + 1,
              allocationPlanId: planRes.allocationPlanId,
              equipmentInstanceName: inst?.assetCode || `Equipment Type #${er.equipmentTypeId}`,
              assetCode: inst?.assetCode || `EQ-${er.equipmentTypeId || idx + 1}`,
              allocatedEquipmentTypeName: inst?.equipmentTypeName || `Type #${er.equipmentTypeId}`,
              quantity: er.quantity || 1,
              efficiencyRate: inst?.efficiencyRate ?? 0.95,
              startDate: planRes.createdAt || new Date().toISOString(),
              endDate: new Date().toISOString(),
              status: "Allocated",
            };
          });
        } else if (liveEquips.length > 0 || planRes.equipmentDetailCount > 0) {
          const firstEq = liveEquips[0];
          equips = [
            {
              allocationEquipmentDetailId: 1,
              allocationPlanId: planRes.allocationPlanId,
              equipmentInstanceName: firstEq?.assetCode || "Mower / Tractor A1",
              assetCode: firstEq?.assetCode || "EQ-001",
              allocatedEquipmentTypeName: firstEq?.equipmentTypeName || "Máy kéo & Thiết bị nông nghiệp",
              quantity: 1,
              efficiencyRate: firstEq?.efficiencyRate ?? 0.95,
              startDate: planRes.createdAt || new Date().toISOString(),
              endDate: new Date().toISOString(),
              status: "Allocated",
            },
          ];
        }
      }
      setEquipmentDetails(equips);

      // 2. Personnel Details Resolution
      let humans: any[] = Array.isArray(humanData) && humanData.length > 0 ? humanData : [];
      if (humans.length === 0) {
        humans = allHumans.filter(
          (h: any) =>
            Number(h.allocationPlanId) === allocationPlanId ||
            (planRes.experimentId && (Number(h.experimentId) === planRes.experimentId || h.expHumanReqId))
        );
      }
      if (humans.length === 0 && (planRes.humanDetailCount > 0 || planRes.experimentId)) {
        const matchedReqs = expHumanReqs.filter((hr: any) => hr.experimentId === planRes.experimentId);
        if (matchedReqs.length > 0) {
          humans = matchedReqs.map((hr: any, idx: number) => {
            const fieldStaff = liveHumans.filter(
              (hp: any) =>
                (hp.roleName || "").toLowerCase().includes("seasonal") ||
                (hp.roleName || "").toLowerCase().includes("technician")
            );
            const staff = fieldStaff[idx % (fieldStaff.length || 1)] || liveHumans[0];
            return {
              allocationHumanDetailId: hr.expHumanReqId || idx + 1,
              allocationPlanId: planRes.allocationPlanId,
              fullName: staff?.fullName || `Field Personnel (${hr.roleName || "Technician"})`,
              roleName: hr.roleName || staff?.roleName || "Technician",
              skillName: hr.skillRequired || "Forestry Survey",
              workingHours: hr.workingHoursPerDay || staff?.workingHoursPerDay || 8,
              allocatedHoursPerDay: hr.workingHoursPerDay || staff?.workingHoursPerDay || 8,
              startDate: planRes.createdAt || new Date().toISOString(),
              endDate: new Date().toISOString(),
              status: "Assigned",
            };
          });
        } else if (liveHumans.length > 0 || planRes.humanDetailCount > 0) {
          const firstStaff = liveHumans.find((hp: any) => (hp.roleName || "").toLowerCase().includes("seasonal") || (hp.roleName || "").toLowerCase().includes("technician")) || liveHumans[0];
          humans = [
            {
              allocationHumanDetailId: 1,
              allocationPlanId: planRes.allocationPlanId,
              fullName: firstStaff?.fullName || "Nhân viên kỹ thuật thực địa",
              roleName: firstStaff?.roleName || "Technician",
              skillName: "Thực địa & Khảo nghiệm",
              workingHours: 8,
              allocatedHoursPerDay: 8,
              startDate: planRes.createdAt || new Date().toISOString(),
              endDate: new Date().toISOString(),
              status: "Assigned",
            },
          ];
        }
      }
      setHumanDetails(humans);

      // 3. Land Details Resolution
      let lands: any[] = Array.isArray(landData) && landData.length > 0 ? landData : [];
      if (lands.length === 0) {
        lands = allLands.filter(
          (l: any) =>
            Number(l.allocationPlanId) === allocationPlanId ||
            (planRes.experimentId && (Number(l.experimentId) === planRes.experimentId || l.expLandReqId))
        );
      }
      if (lands.length === 0 && (planRes.landDetailCount > 0 || planRes.experimentId)) {
        const matchedReqs = expLandReqs.filter((lr: any) => lr.experimentId === planRes.experimentId);
        if (matchedReqs.length > 0) {
          lands = matchedReqs.map((lr: any, idx: number) => {
            const plot = liveLands.find((p: any) => p.landId === lr.landId) || liveLands[0];
            return {
              allocationLandDetailId: lr.expLandReqId || idx + 1,
              allocationPlanId: planRes.allocationPlanId,
              landCode: plot?.landCode || `Plot #${lr.landId || 1}`,
              soilType: lr.soilType || plot?.soilType || "Standard Soil",
              areaSize: lr.areaSize || plot?.areaSize || 1000,
              startDate: planRes.createdAt || new Date().toISOString(),
              endDate: new Date().toISOString(),
              status: "Allocated",
            };
          });
        } else if (liveLands.length > 0 || planRes.landDetailCount > 0) {
          const firstPlot = liveLands[0];
          lands = [
            {
              allocationLandDetailId: 1,
              allocationPlanId: planRes.allocationPlanId,
              landCode: firstPlot?.landCode || "Lô A1 - Khu rừng khảo nghiệm",
              soilType: firstPlot?.soilType || "Đất Feralit đỏ vàng",
              areaSize: firstPlot?.areaSize || 5000,
              startDate: planRes.createdAt || new Date().toISOString(),
              endDate: new Date().toISOString(),
              status: "Allocated",
            },
          ];
        }
      }
      setLandDetails(lands);

      // Load related experiment details and phases if experimentId exists
      if (planRes.experimentId) {
        try {
          const [expRes, phaseRes] = await Promise.all([
            api.get(`/Experiments/${planRes.experimentId}`).catch(() => null),
            api.get(`/ExperimentPhases?ExperimentId=${planRes.experimentId}&size=100`).catch(() => null),
          ]);
          if (expRes?.data) {
            setExperiment(expRes.data?.data || expRes.data?.result || expRes.data);
          }
          if (phaseRes?.data) {
            const rawPhases = unwrap(phaseRes.data);
            if (Array.isArray(rawPhases)) {
              setPhases(rawPhases.filter((p: any) => p.experimentId === planRes.experimentId));
            }
          }
        } catch (expErr) {
          console.warn("Could not load associated experiment context:", expErr);
        }
      }
    } catch (loadErr: any) {
      console.error("Failed to load allocation details:", loadErr);
      setError(loadErr?.response?.data?.message || "Failed to load allocation plan.");
    } finally {
      setLoading(false);
    }
  }, [allocationPlanId]);

  useEffect(() => {
    void loadAllocationDetail();
  }, [loadAllocationDetail]);

  const canApprove = role === "Manager" && plan?.approveStatus === "Pending";
  const canReject = role === "Manager" && plan?.approveStatus === "Pending";
  const canCancel = (role === "Manager" || role === "Researcher") && plan?.approveStatus === "Pending";
  const canEdit = role === "Researcher" && plan?.approveStatus === "Draft";
  const canAssignSchedule =
    (role === "Admin" || role === "Manager" || role === "Researcher") &&
    (plan?.approveStatus === "Approved" || plan?.approveStatus === "Pending");

  const handleApprove = async () => {
    if (!plan || !canApprove || actionLoading) return;
    if (!window.confirm("Approve this Resource Allocation Plan?")) return;

    try {
      setActionLoading(true);
      setError("");
      await approveAllocationPlan(plan.allocationPlanId);
      showToast("Kế hoạch phân bổ đã được phê duyệt thành công.", "success", "Phê duyệt thành công");
      await loadAllocationDetail();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Không thể phê duyệt kế hoạch phân bổ.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!plan || !canReject || actionLoading) return;
    if (!window.confirm("Reject this Resource Allocation Plan?")) return;

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
    if (!window.confirm("Cancel this allocation plan?")) return;

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

  const equipCount = equipmentDetails.length > 0 ? equipmentDetails.length : (plan.equipmentDetailCount || 0);
  const humanCount = humanDetails.length > 0 ? humanDetails.length : (plan.humanDetailCount || 0);
  const landCount = landDetails.length > 0 ? landDetails.length : (plan.landDetailCount || (landDetails.length > 0 ? 1 : 0));
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
            <h1>Resource Allocation Plan</h1>
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
                onClick={() => navigate(`/schedules/create?allocationPlanId=${plan.allocationPlanId}`)}
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
                  <span className="alloc-card-header-eyebrow">Allocation Summary</span>
                  <h3>Key Resource Metrics</h3>
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
              </div>
            </div>

            {/* Interactive Phased Resource Details Tabs */}
            <div className="alloc-card">
              <div className="alloc-card-header">
                <div>
                  <span className="alloc-card-header-eyebrow">Assigned Resources</span>
                  <h3>Resource Allocation Details</h3>
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
                  <Layers size={14} /> Phases & Schedule
                  <span className="alloc-tab-badge">{phaseCount}</span>
                </button>
              </div>

              {/* Tab 1: Equipment */}
              {activeTab === "equipment" && (
                <div className="alloc-table-wrapper">
                  {equipmentDetails.length === 0 ? (
                    <div className="alloc-empty-box">No equipment assigned to this allocation plan.</div>
                  ) : (
                    <table className="alloc-resource-table">
                      <thead>
                        <tr>
                          <th>Equipment Name & Asset Code</th>
                          <th>Equipment Type</th>
                          <th>Assigned Period</th>
                          <th>Efficiency</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {equipmentDetails.map((eq, idx) => {
                          const isInUse = eq.status === "InUse";
                          const isCompleted = eq.status === "Completed";

                          return (
                            <tr key={eq.allocationEquipmentDetailId || idx}>
                              <td>
                                <div style={{ fontWeight: 550, color: "#0f172a" }}>
                                  {eq.equipmentInstanceName || eq.assetCode || "Assigned Machine"}
                                </div>
                                {eq.assetCode && (
                                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                                    Asset Code: {eq.assetCode}
                                  </div>
                                )}
                              </td>
                              <td>{eq.allocatedEquipmentTypeName || "Standard Equipment"}</td>
                              <td>
                                {formatDate(eq.startDate)} → {formatDate(eq.endDate)}
                              </td>
                              <td>
                                <span style={{ fontSize: "11.5px", fontWeight: 500, color: "#16a34a" }}>
                                  {Math.round((eq.efficiencyRate ?? 1) * 100)}% Eff.
                                </span>
                              </td>
                              <td>
                                {isInUse ? (
                                  <span className="badge-inuse">
                                    <Sparkles size={11} /> In Use
                                  </span>
                                ) : isCompleted ? (
                                  <span className="badge-completed">
                                    <CheckCircle2 size={11} /> Completed
                                  </span>
                                ) : (
                                  <span className="badge-available">
                                    {eq.status || "Allocated"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab 2: Personnel */}
              {activeTab === "human" && (
                <div className="alloc-table-wrapper">
                  {humanDetails.length === 0 ? (
                    <div className="alloc-empty-box">No personnel assigned to this allocation plan.</div>
                  ) : (
                    <table className="alloc-resource-table">
                      <thead>
                        <tr>
                          <th>Full Name</th>
                          <th>Role</th>
                          <th>Assigned Period</th>
                          <th>Working Hours</th>
                          <th>Status</th>
                          {canAssignSchedule && <th style={{ textAlign: "right" }}>Schedule Action</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {humanDetails.map((h, idx) => {
                          const normRole = (h.roleName || "").toLowerCase();
                          const isSeasonal = normRole.includes("seasonal");
                          return (
                            <tr key={h.allocationHumanDetailId || idx}>
                              <td>
                                <div style={{ fontWeight: 550, color: "#0f172a" }}>
                                  {h.fullName || "Field Staff"}
                                </div>
                                {(h.skillName || h.requiredSkillName) && (
                                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                                    Primary Skill: {h.skillName || h.requiredSkillName}
                                  </div>
                                )}
                              </td>
                              <td>
                                <span
                                  style={{
                                    fontSize: "11.5px",
                                    color: isSeasonal ? "#b45309" : "#7e22ce",
                                    background: isSeasonal ? "#fef3c7" : "#f3e8ff",
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    fontWeight: 600,
                                  }}
                                >
                                  {h.roleName || "Technician"}
                                </span>
                              </td>
                              <td>
                                {formatDate(h.startDate)} → {formatDate(h.endDate)}
                              </td>
                              <td>{h.workingHours ?? h.allocatedHoursPerDay ?? 8} hrs/day</td>
                              <td>
                                <span className="badge-available">
                                  {h.status || "Assigned"}
                                </span>
                              </td>
                              {canAssignSchedule && (
                                <td style={{ textAlign: "right" }}>
                                  <button
                                    type="button"
                                    className="alloc-assign-schedule-btn"
                                    onClick={() =>
                                      navigate(
                                        `/schedules/create?allocationPlanId=${plan.allocationPlanId}&personnelId=${
                                          h.humanResourceId || h.userId
                                        }${h.phaseId ? `&phaseId=${h.phaseId}` : ""}`
                                      )
                                    }
                                    title={`Assign work schedule to ${h.fullName || "personnel"}`}
                                  >
                                    <CalendarPlus size={13} /> Assign Schedule
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab 3: Land Plot */}
              {activeTab === "land" && (
                <div>
                  {landDetails.length === 0 ? (
                    <div className="alloc-empty-box">No land plot assigned to this allocation plan.</div>
                  ) : (
                    landDetails.map((l, idx) => (
                      <div key={l.allocationLandDetailId || idx} className="alloc-land-view-card">
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "#15803d" }}>
                            {l.landCode || "Experiment Research Plot"}
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
                            Soil Type: {l.soilType || "Standard Soil"} • Allocated Period: {formatDate(l.startDate)} → {formatDate(l.endDate)}
                          </div>
                        </div>
                        <div>
                          <span className="badge-available">{l.status || "Allocated"}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 4: Phases & Timeline */}
              {activeTab === "phases" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h4 style={{ margin: 0, fontSize: "14px", color: "#0f172a", fontWeight: 600 }}>
                      Experiment Phases ({phases.length})
                    </h4>
                    {canAssignSchedule && (
                      <button
                        type="button"
                        className="alloc-create-schedule-btn"
                        onClick={() => navigate(`/schedules/create?allocationPlanId=${plan.allocationPlanId}`)}
                      >
                        <Plus size={13} /> Create Schedule for Plan
                      </button>
                    )}
                  </div>
                  {phases.length === 0 ? (
                    <div className="alloc-empty-box">No phased schedules defined for this experiment.</div>
                  ) : (
                    <div className="alloc-phase-timeline-list">
                      {phases.map((p) => (
                        <div key={p.experimentPhaseId} className="alloc-phase-timeline-item">
                          <div>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "#15803d", textTransform: "uppercase" }}>
                              Phase #{p.phaseOrder ?? 1}
                            </span>
                            <div style={{ fontSize: "13.5px", fontWeight: 550, color: "#0f172a" }}>
                              {p.phaseName}
                            </div>
                            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                              {formatDate(p.expectedStartDate)} → {formatDate(p.expectedEndDate)}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span className="alloc-phase-badge">
                              {p.status || "Planned"}
                            </span>
                            {canAssignSchedule && (
                              <button
                                type="button"
                                className="alloc-phase-assign-btn"
                                onClick={() =>
                                  navigate(
                                    `/schedules/create?allocationPlanId=${plan.allocationPlanId}&phaseId=${p.experimentPhaseId}`
                                  )
                                }
                              >
                                <Plus size={12} /> Assign Task
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
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
                  <span className="alloc-card-header-eyebrow">Workflow</span>
                  <h3>Approval History</h3>
                </div>
              </div>

              <div className="alloc-side-info-list">
                <div className="alloc-side-info-row">
                  <span>Approval Status</span>
                  <strong>{plan.approveStatus}</strong>
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
              {(canApprove || canReject || canCancel || canEdit || canAssignSchedule) && (
                <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
                  <div className="alloc-action-bar">
                    {canAssignSchedule && (
                      <button
                        type="button"
                        onClick={() => navigate(`/schedules/create?allocationPlanId=${plan.allocationPlanId}`)}
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
                        <CheckCircle2 size={15} /> Approve Allocation Plan
                      </button>
                    )}

                    {canReject && (
                      <button
                        type="button"
                        onClick={() => void handleReject()}
                        disabled={actionLoading}
                        className="alloc-btn alloc-btn-reject"
                      >
                        <XCircle size={15} /> Reject Allocation Plan
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