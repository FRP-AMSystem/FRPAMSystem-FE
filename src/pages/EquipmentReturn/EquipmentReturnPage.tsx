import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowDownRight,
  CheckCircle2,
  Cpu,
  Layers,
  PackageCheck,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Truck,
  X,
  XCircle,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import ToastPopup, { type ToastType } from "../../components/common/ToastPopup";
import { useNotification } from "../../context/NotificationContext";

import {
  getMyAllocationEquipmentDetails,
  getAllocationEquipmentDetails,
  handoverEquipmentDetail,
  returnEquipmentDetail,
} from "../../services/allocationDetailService";
import {
  reportEquipmentInstances,
  confirmEquipmentInstances,
} from "../../services/equipmentInstanceService";

import { getStoredRole } from "../../config/rolePermissions";

import type { AllocationEquipmentDetail } from "../../types/allocationDetail";
import type { EquipmentConditionLevel } from "../../types/equipmentInstance";

import "./EquipmentReturnPage.css";

type TabFilter = "all" | "inuse" | "allocated" | "completed";

function formatDate(val?: string | null): string {
  if (!val) return "-";
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? val : d.toLocaleDateString("vi-VN");
}

export default function EquipmentReturnPage() {
  const role = getStoredRole();
  const isManager = role === "Manager" || role === "Admin";
  const isFieldStaff = role === "Seasonal" || role === "Technician" || role === "Student";
  const { sendLocalNotification, fetchUnreadCount } = useNotification();

  const [items, setItems] = useState<AllocationEquipmentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tabFilter, setTabFilter] = useState<TabFilter>("all");

  // Action Modals
  const [returnModalItem, setReturnModalItem] = useState<AllocationEquipmentDetail | null>(null);
  const [handoverModalItem, setHandoverModalItem] = useState<AllocationEquipmentDetail | null>(null);
  const [returnCondition, setReturnCondition] = useState<EquipmentConditionLevel>("Good");
  const [returnNotes, setReturnNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Toast
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
    setToast({
      visible: true,
      type,
      title:
        title ||
        (type === "error"
          ? "Operation Failed"
          : type === "success"
          ? "Success"
          : "Notification"),
      message,
    });
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      let list: AllocationEquipmentDetail[] = [];

      if (isManager) {
        // Manager loads all allocated equipment across plans to inspect and confirm returns
        list = await getAllocationEquipmentDetails({ size: 400 });
      } else {
        // Field staff loads equipment assigned to their experiments
        try {
          list = await getMyAllocationEquipmentDetails({ size: 400 });
        } catch {
          list = await getAllocationEquipmentDetails({ size: 400 });
        }

        if (!Array.isArray(list) || list.length === 0) {
          const allList = await getAllocationEquipmentDetails({ size: 400 }).catch(() => []);
          if (allList.length > 0) {
            list = allList;
          }
        }
      }

      setItems(list || []);
    } catch (err: any) {
      showToast(err?.message || "Failed to load equipment list.", "error");
    } finally {
      setLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Calculations
  const stats = useMemo(() => {
    const total = items.length;
    const inUse = items.filter((i) => i.status === "InUse").length;
    const allocated = items.filter(
      (i) => i.status === "Allocated" || i.status === "Reserved" || !i.status
    ).length;
    const completed = items.filter((i) => i.status === "Completed").length;
    return { total, inUse, allocated, completed };
  }, [items]);

  // Filtering
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const status = item.status || "Allocated";
      const matchesTab =
        tabFilter === "all" ||
        (tabFilter === "inuse" && status === "InUse") ||
        (tabFilter === "allocated" && (status === "Allocated" || status === "Reserved")) ||
        (tabFilter === "completed" && status === "Completed");

      if (!matchesTab) return false;

      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase();
      const name = (item.allocatedEquipmentTypeName || "").toLowerCase();
      const instName = (item.equipmentInstanceName || "").toLowerCase();
      const code = (item.assetCode || "").toLowerCase();
      const serial = (item.serialNumber || "").toLowerCase();
      const exp = (item.experimentName || "").toLowerCase();
      const phase = (item.phaseName || "").toLowerCase();

      return (
        name.includes(q) ||
        instName.includes(q) ||
        code.includes(q) ||
        serial.includes(q) ||
        exp.includes(q) ||
        phase.includes(q)
      );
    });
  }, [items, tabFilter, searchTerm]);

  // Handover Execution (Seasonal / Technician)
  const handleConfirmHandover = async () => {
    if (!handoverModalItem) return;
    try {
      setActionLoading(true);
      await handoverEquipmentDetail(handoverModalItem.allocationEquipmentDetailId);
      showToast(
        `Equipment "${handoverModalItem.equipmentInstanceName || handoverModalItem.assetCode || "machine"}" has been accepted into active use (In Use)!`,
        "success",
        "Equipment Handover Complete"
      );
      setHandoverModalItem(null);
      await loadData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to accept equipment.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Return / Confirmation Execution
  const handleConfirmReturn = async () => {
    if (!returnModalItem) return;
    try {
      setActionLoading(true);

      const targetInstanceId = returnModalItem.equipmentInstanceId;
      const ids = targetInstanceId ? [targetInstanceId] : [];

      if (isManager) {
        // Manager final acceptance
        await confirmEquipmentInstances({
          equipmentInstanceIds: ids,
          confirmAction: "AcceptReturn",
          note: returnNotes || "Manager verified and accepted equipment into inventory.",
        });
        await returnEquipmentDetail(returnModalItem.allocationEquipmentDetailId, returnNotes);

        showToast(
          `Equipment "${returnModalItem.equipmentInstanceName || returnModalItem.assetCode || "machine"}" has been accepted back into inventory (Available)!`,
          "success",
          "Equipment Return Confirmed"
        );
      } else {
        // Seasonal / Technician submitting return request to Researcher
        await reportEquipmentInstances({
          allocationPlanId: returnModalItem.allocationPlanId,
          equipmentInstanceIds: ids,
          reportType: "Return",
          note: `[Field Staff Return Request]: Condition: ${returnCondition}. ${returnNotes}`.trim(),
        });

        sendLocalNotification({
          title: "Return Request Sent to Researcher",
          message: `Return request for equipment "${returnModalItem.equipmentInstanceName || returnModalItem.assetCode}" has been submitted to the Lead Researcher.`,
          notificationType: "Info",
          referenceType: "AllocationEquipmentDetail",
          referenceId: returnModalItem.allocationEquipmentDetailId,
        });
        void fetchUnreadCount();

        showToast(
          `Return request for equipment "${returnModalItem.equipmentInstanceName || returnModalItem.assetCode || "machine"}" submitted to Lead Researcher successfully!`,
          "success",
          "Return Request Submitted"
        );
      }

      setReturnModalItem(null);
      setReturnNotes("");
      await loadData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to process equipment return.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="equipment-return-page">
        {/* Toast */}
        <ToastPopup
          visible={toast.visible}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
        />

        {/* Header */}
        <header className="eq-return-header">
          <div>
            <p className="eq-return-breadcrumb">
              {isManager
                ? "Operations / Equipment Return Confirmation"
                : "Operations / Equipment Handover & Return"}
            </p>
            <h1>
              {isManager
                ? "Equipment Return Confirmation"
                : "Equipment Handover & Return"}
            </h1>
            <p className="eq-return-description">
              {isManager
                ? "Inspect and confirm final inventory returns of field machines and equipment from Researchers and Field Technicians back into the central asset pool."
                : "Manage field machines and tools assigned to your active trials and shifts. Accept equipment into active use and submit return requests to the Lead Researcher upon trial completion."}
            </p>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="eq-return-stats-grid">
          <div className="eq-return-stat-card">
            <div className="eq-stat-icon-wrapper eq-stat-icon-all">
              <Cpu size={22} />
            </div>
            <div className="eq-stat-info">
              <span className="eq-stat-label">
                {isManager ? "Total Allocated Equipment" : "Total Assigned Equipment"}
              </span>
              <span className="eq-stat-value">{stats.total}</span>
            </div>
          </div>

          <div className="eq-return-stat-card">
            <div className="eq-stat-icon-wrapper eq-stat-icon-inuse">
              {isManager ? <PackageCheck size={22} /> : <RotateCcw size={22} />}
            </div>
            <div className="eq-stat-info">
              <span className="eq-stat-label">
                {isManager ? "Pending Return Confirmation" : "In Active Use (Ready to Return)"}
              </span>
              <span className="eq-stat-value" style={{ color: isManager ? "#059669" : "#dc2626" }}>
                {stats.inUse}
              </span>
            </div>
          </div>

          <div className="eq-return-stat-card">
            <div className="eq-stat-icon-wrapper eq-stat-icon-allocated">
              <Truck size={22} />
            </div>
            <div className="eq-stat-info">
              <span className="eq-stat-label">
                {isManager ? "Awaiting Field Handover" : "Awaiting Handover (New)"}
              </span>
              <span className="eq-stat-value" style={{ color: "#2563eb" }}>
                {stats.allocated}
              </span>
            </div>
          </div>

          <div className="eq-return-stat-card">
            <div className="eq-stat-icon-wrapper eq-stat-icon-completed">
              <CheckCircle2 size={22} />
            </div>
            <div className="eq-stat-info">
              <span className="eq-stat-label">
                {isManager ? "Accepted into Inventory" : "Returned to Inventory"}
              </span>
              <span className="eq-stat-value" style={{ color: "#16a34a" }}>
                {stats.completed}
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar & Search */}
        <div className="eq-return-toolbar">
          <div className="eq-return-search-box">
            <Search size={16} className="eq-return-search-icon" />
            <input
              type="text"
              placeholder="Search by equipment name, code, serial number, experiment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Tab Filter Pills */}
          <div className="eq-return-tabs">
            <button
              type="button"
              className={`eq-tab-btn ${tabFilter === "all" ? "active" : ""}`}
              onClick={() => setTabFilter("all")}
            >
              All Equipment ({stats.total})
            </button>
            <button
              type="button"
              className={`eq-tab-btn ${tabFilter === "inuse" ? "active" : ""}`}
              onClick={() => setTabFilter("inuse")}
            >
              In Use ({stats.inUse})
            </button>
            <button
              type="button"
              className={`eq-tab-btn ${tabFilter === "allocated" ? "active" : ""}`}
              onClick={() => setTabFilter("allocated")}
            >
              Awaiting Handover ({stats.allocated})
            </button>
            <button
              type="button"
              className={`eq-tab-btn ${tabFilter === "completed" ? "active" : ""}`}
              onClick={() => setTabFilter("completed")}
            >
              Returned ({stats.completed})
            </button>
          </div>
        </div>

        {/* Main Table Card */}
        <div className="eq-return-table-card">
          <table className="eq-return-table">
            <thead>
              <tr>
                <th>Equipment Name & Type</th>
                <th>Asset Code / Serial</th>
                <th>Assigned Experiment & Phase</th>
                <th>Scheduled Period</th>
                <th>Efficiency</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="eq-return-loading">
                    <div className="eq-return-spinner" />
                    <span>Loading equipment records from server...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="eq-return-empty">
                    <PackageCheck size={40} color="#94a3b8" />
                    <p>No equipment records found.</p>
                    <span>No equipment matches your current filter or search criteria.</span>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const status = item.status || "Allocated";
                  const canHandover = !isManager && status === "Allocated";
                  const canReturn = status === "InUse";

                  return (
                    <tr key={item.allocationEquipmentDetailId}>
                      <td className="eq-name-cell">
                        <div className="eq-icon-small">
                          <Cpu size={16} />
                        </div>
                        <div>
                          <strong className="eq-main-title">
                            {item.allocatedEquipmentTypeName || "Field Machine"}
                          </strong>
                          <span className="eq-sub-title">
                            {item.equipmentInstanceName || "Standard Unit"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="eq-asset-code">
                          {item.assetCode || `EQ-${item.allocationEquipmentDetailId}`}
                        </span>
                        {item.serialNumber && (
                          <span className="eq-serial-sub">SN: {item.serialNumber}</span>
                        )}
                      </td>

                      <td>
                        <div className="eq-exp-info">
                          <strong>{item.experimentName || "Assigned Experiment"}</strong>
                          <span>{item.phaseName || "Active Phase"}</span>
                        </div>
                      </td>

                      <td>
                        <div className="eq-date-range">
                          <span>{formatDate(item.startDate)}</span>
                          <small>→</small>
                          <span>{formatDate(item.endDate)}</span>
                        </div>
                      </td>

                      <td>
                        <span className="eq-efficiency-pill">
                          {Math.round((item.efficiencyRate ?? 1) * 100)}% Eff.
                        </span>
                      </td>

                      <td>
                        <span className={`eq-status-badge eq-status-${status.toLowerCase()}`}>
                          {status === "InUse"
                            ? "In Use"
                            : status === "Allocated"
                            ? "Awaiting Handover"
                            : status === "Completed"
                            ? "Returned"
                            : status}
                        </span>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <div className="eq-action-buttons">
                          {canHandover && (
                            <button
                              type="button"
                              className="eq-btn-handover"
                              onClick={() => setHandoverModalItem(item)}
                              title="Accept equipment into active use"
                            >
                              <ArrowDownRight size={13} />
                              <span>Accept Handover</span>
                            </button>
                          )}

                          {canReturn && (
                            <button
                              type="button"
                              className="eq-btn-return"
                              onClick={() => setReturnModalItem(item)}
                              title={
                                isManager
                                  ? "Confirm equipment inventory acceptance"
                                  : "Submit return request to Lead Researcher"
                              }
                            >
                              <RotateCcw size={13} />
                              <span>
                                {isManager ? "Confirm Acceptance" : "Request Return"}
                              </span>
                            </button>
                          )}

                          {!canHandover && !canReturn && (
                            <span style={{ fontSize: "12px", color: "#94a3b8" }}>—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal: Handover Confirmation (Accept Equipment) */}
        {handoverModalItem && (
          <div className="eq-modal-overlay" onClick={() => setHandoverModalItem(null)}>
            <div className="eq-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="eq-modal-head">
                <div className="eq-modal-title">
                  <ArrowDownRight size={18} color="#2563eb" />
                  <h2>Confirm Equipment Handover</h2>
                </div>
                <button
                  type="button"
                  className="eq-modal-close-btn"
                  onClick={() => setHandoverModalItem(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="eq-modal-content">
                <p style={{ margin: "0 0 14px", fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
                  You are about to accept and begin using the following field equipment:
                </p>

                <div className="eq-modal-info-card">
                  <div className="eq-modal-info-title">
                    {handoverModalItem.allocatedEquipmentTypeName || "Field Machine"} (
                    {handoverModalItem.assetCode || "N/A"})
                  </div>
                  <div className="eq-modal-info-sub">
                    Experiment: {handoverModalItem.experimentName || "Assigned Experiment"}
                  </div>
                </div>

                <div className="eq-modal-actions">
                  <button
                    type="button"
                    className="audit-secondary-btn"
                    onClick={() => setHandoverModalItem(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="audit-primary-btn"
                    disabled={actionLoading}
                    onClick={handleConfirmHandover}
                  >
                    <CheckCircle2 size={15} />
                    <span>{actionLoading ? "Processing..." : "Confirm & Accept into Use"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Submit Return Request */}
        {returnModalItem && (
          <div className="eq-modal-overlay" onClick={() => setReturnModalItem(null)}>
            <div className="eq-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="eq-modal-head">
                <div className="eq-modal-title">
                  <RotateCcw size={18} color="#16a34a" />
                  <h2>
                    {isManager
                      ? "Confirm Equipment Return to Inventory"
                      : "Submit Equipment Return Request"}
                  </h2>
                </div>
                <button
                  type="button"
                  className="eq-modal-close-btn"
                  onClick={() => setReturnModalItem(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="eq-modal-content">
                <div className="eq-modal-info-card">
                  <div className="eq-modal-info-title">
                    {returnModalItem.allocatedEquipmentTypeName || "Field Machine"} (
                    {returnModalItem.assetCode || "N/A"})
                  </div>
                  <div className="eq-modal-info-sub">
                    Experiment: {returnModalItem.experimentName || "Assigned Experiment"}
                  </div>
                </div>

                {!isManager && (
                  <div className="eq-form-group">
                    <label>Current Equipment Condition</label>
                    <select
                      value={returnCondition}
                      onChange={(e) => setReturnCondition(e.target.value as EquipmentConditionLevel)}
                    >
                      <option value="Good">Good (Working normally, no defects)</option>
                      <option value="Fair">Fair (Operational, normal wear and tear)</option>
                      <option value="Poor">Poor (Degraded efficiency, needs service)</option>
                      <option value="Critical">Critical / Damaged (Requires repair)</option>
                    </select>
                  </div>
                )}

                <div className="eq-form-group">
                  <label>
                    {isManager ? "Inventory Acceptance Remarks" : "Return Notes for Lead Researcher"}
                  </label>
                  <textarea
                    rows={4}
                    placeholder={
                      isManager
                        ? "Enter inventory check-in remarks..."
                        : "Describe field condition, completed trials, or notes for the Researcher..."
                    }
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                  />
                </div>

                <div className="eq-modal-actions">
                  <button
                    type="button"
                    className="audit-secondary-btn"
                    onClick={() => setReturnModalItem(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="audit-primary-btn"
                    disabled={actionLoading}
                    onClick={handleConfirmReturn}
                  >
                    <Send size={15} />
                    <span>
                      {actionLoading
                        ? "Submitting..."
                        : isManager
                        ? "Confirm Acceptance (Available)"
                        : "Submit Return Request"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
