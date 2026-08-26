import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Eye,
  Layers,
  PackageCheck,
  RotateCw,
  Search,
  Send,
  Sparkles,
  Truck,
  User,
  X,
  XCircle,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import ToastPopup, { type ToastType } from "../../components/common/ToastPopup";
import { useNotification } from "../../context/NotificationContext";

import {
  getAllocationEquipmentDetails,
  returnEquipmentDetail,
} from "../../services/allocationDetailService";
import {
  reportEquipmentInstances,
  confirmEquipmentInstances,
} from "../../services/equipmentInstanceService";
import { getExperiments } from "../../services/experimentService";
import { getCurrentUserTokenInfo } from "../../utils/storage";

import type { AllocationEquipmentDetail } from "../../types/allocationDetail";
import type { EquipmentConditionLevel } from "../../types/equipmentInstance";
import type { ExperimentResponse } from "../../types/experiment";

import "./EquipmentControlPage.css";

type TabFilter = "all" | "pending_return" | "inuse" | "completed";

function formatDate(val?: string | null): string {
  if (!val) return "-";
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? val : d.toLocaleDateString("vi-VN");
}

export default function EquipmentControlPage() {
  const currentUser = useMemo(() => getCurrentUserTokenInfo(), []);
  const { sendLocalNotification, fetchUnreadCount } = useNotification();

  const [items, setItems] = useState<AllocationEquipmentDetail[]>([]);
  const [experiments, setExperiments] = useState<ExperimentResponse[]>([]);
  const [selectedExpFilter, setSelectedExpFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tabFilter, setTabFilter] = useState<TabFilter>("all");

  // Verification Modal State
  const [verifyModalItem, setVerifyModalItem] = useState<AllocationEquipmentDetail | null>(null);
  const [verifiedCondition, setVerifiedCondition] = useState<EquipmentConditionLevel>("Good");
  const [verificationNotes, setVerificationNotes] = useState("");
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

      const [expList, allEquipList] = await Promise.all([
        getExperiments().catch(() => []),
        getAllocationEquipmentDetails({ size: 400 }).catch(() => []),
      ]);

      // Filter experiments belonging to this researcher
      const myExpList = expList.filter((e) => {
        if (currentUser.userId && e.researcherId === currentUser.userId) return true;
        if (
          currentUser.fullName &&
          e.researcherName?.toLowerCase().includes(currentUser.fullName.toLowerCase())
        ) {
          return true;
        }
        return false;
      });

      setExperiments(myExpList.length > 0 ? myExpList : expList);

      const myExpIds = new Set((myExpList.length > 0 ? myExpList : expList).map((e) => e.experimentId));

      // Filter equipment allocated to these experiments
      const filteredEquip = (allEquipList || []).filter((eq) => {
        if (eq.experimentId && myExpIds.has(eq.experimentId)) return true;
        return true;
      });

      setItems(filteredEquip);
    } catch (err: any) {
      showToast(err?.message || "Failed to load equipment control records.", "error");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Statistics
  const stats = useMemo(() => {
    const total = items.length;
    const pendingReturn = items.filter(
      (i) =>
        i.status === "InUse" ||
        (i.note && i.note.toLowerCase().includes("return"))
    ).length;
    const inUse = items.filter((i) => i.status === "InUse").length;
    const completed = items.filter((i) => i.status === "Completed").length;

    return { total, pendingReturn, inUse, completed };
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Experiment selector filter
      if (selectedExpFilter !== "ALL" && String(item.experimentId) !== selectedExpFilter) {
        return false;
      }

      const status = item.status || "Allocated";
      const isPending =
        status === "InUse" &&
        Boolean(item.note && item.note.toLowerCase().includes("return"));

      if (tabFilter === "pending_return" && !isPending && status !== "InUse") {
        return false;
      }
      if (tabFilter === "inuse" && status !== "InUse") {
        return false;
      }
      if (tabFilter === "completed" && status !== "Completed") {
        return false;
      }

      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase();
      const name = (item.allocatedEquipmentTypeName || "").toLowerCase();
      const instName = (item.equipmentInstanceName || "").toLowerCase();
      const code = (item.assetCode || "").toLowerCase();
      const exp = (item.experimentName || "").toLowerCase();

      return name.includes(q) || instName.includes(q) || code.includes(q) || exp.includes(q);
    });
  }, [items, selectedExpFilter, tabFilter, searchTerm]);

  // Researcher Verification Handler
  const handleVerifyReturn = async () => {
    if (!verifyModalItem) return;

    try {
      setActionLoading(true);

      const targetInstanceId = verifyModalItem.equipmentInstanceId;
      const ids = targetInstanceId ? [targetInstanceId] : [];

      const notePayload = `[Researcher Verified by ${currentUser.fullName || "Lead Researcher"}]: Condition: ${verifiedCondition}. ${verificationNotes}`.trim();

      let success = false;
      let lastErrorMessage = "";

      // Method 1: Update via AllocationEquipmentDetail return endpoint
      try {
        await returnEquipmentDetail(
          verifyModalItem.allocationEquipmentDetailId,
          notePayload
        );
        success = true;
      } catch (err: any) {
        lastErrorMessage = err?.response?.data?.message || err?.message || "";
      }

      // Method 2: Attempt reportEquipmentInstances if method 1 failed
      if (!success) {
        try {
          await reportEquipmentInstances({
            allocationPlanId: verifyModalItem.allocationPlanId,
            equipmentInstanceIds: ids,
            reportType: "Return",
            note: notePayload,
          });
          success = true;
        } catch (repErr: any) {
          lastErrorMessage = repErr?.response?.data?.message || repErr?.message || lastErrorMessage;
        }
      }

      // If backend rejected all requests, raise the error so it shows Error Toast, NOT Success Toast!
      if (!success) {
        throw new Error(
          lastErrorMessage ||
            "Hệ thống không thể xử lý yêu cầu xác nhận trả thiết bị (403 Forbidden hoặc lỗi máy chủ)."
        );
      }

      sendLocalNotification({
        title: "Equipment Return Verified",
        message: `Equipment "${verifyModalItem.equipmentInstanceName || verifyModalItem.assetCode}" verified and forwarded to Resource Manager for final check-in!`,
        notificationType: "Info",
        referenceType: "AllocationEquipmentDetail",
        referenceId: verifyModalItem.allocationEquipmentDetailId,
      });
      void fetchUnreadCount();

      showToast(
        `Equipment "${verifyModalItem.equipmentInstanceName || verifyModalItem.assetCode}" has been verified and forwarded to the Resource Manager.`,
        "success",
        "Verification Forwarded"
      );

      setVerifyModalItem(null);
      setVerificationNotes("");
      await loadData();
    } catch (err: any) {
      showToast(err?.message || "Failed to verify equipment return.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="equipment-control-page">
        {/* Toast */}
        <ToastPopup
          visible={toast.visible}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
        />

        {/* Header */}
        <header className="eq-control-header">
          <div>
            <p className="eq-control-breadcrumb">Operations / Field Equipment Control</p>
            <h1>Equipment Control & Return Verification</h1>
            <p className="eq-control-description">
              Monitor field machines allocated to your active research experiments, review equipment return requests from Seasonal and Technician staff, and forward verified returns to the Resource Manager.
            </p>
          </div>

          <div>
            <button
              type="button"
              className="audit-primary-btn"
              onClick={loadData}
              disabled={loading}
            >
              <RotateCw size={15} className={loading ? "spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="eq-control-stats-grid">
          <div className="eq-control-stat-card">
            <div className="eq-stat-icon-wrapper eq-stat-icon-all">
              <Cpu size={22} />
            </div>
            <div className="eq-stat-info">
              <span className="eq-stat-label">Total Allocated Equipment</span>
              <span className="eq-stat-value">{stats.total}</span>
            </div>
          </div>

          <div className="eq-control-stat-card">
            <div className="eq-stat-icon-wrapper eq-stat-icon-pending">
              <PackageCheck size={22} />
            </div>
            <div className="eq-stat-info">
              <span className="eq-stat-label">Pending Verification (Return Requests)</span>
              <span className="eq-stat-value" style={{ color: "#d97706" }}>
                {stats.pendingReturn}
              </span>
            </div>
          </div>

          <div className="eq-control-stat-card">
            <div className="eq-stat-icon-wrapper eq-stat-icon-inuse">
              <Truck size={22} />
            </div>
            <div className="eq-stat-info">
              <span className="eq-stat-label">In Active Field Use</span>
              <span className="eq-stat-value" style={{ color: "#2563eb" }}>
                {stats.inUse}
              </span>
            </div>
          </div>

          <div className="eq-control-stat-card">
            <div className="eq-stat-icon-wrapper eq-stat-icon-completed">
              <CheckCircle2 size={22} />
            </div>
            <div className="eq-stat-info">
              <span className="eq-stat-label">Returned to Inventory</span>
              <span className="eq-stat-value" style={{ color: "#16a34a" }}>
                {stats.completed}
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="eq-control-toolbar">
          <div className="eq-control-search-box">
            <Search size={16} className="eq-control-search-icon" />
            <input
              type="text"
              placeholder="Search equipment, asset code, experiment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <select
              value={selectedExpFilter}
              onChange={(e) => setSelectedExpFilter(e.target.value)}
              className="eq-control-select"
            >
              <option value="ALL">All Target Experiments</option>
              {experiments.map((exp) => (
                <option key={exp.experimentId} value={String(exp.experimentId)}>
                  {exp.experimentName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="eq-control-tabs">
          <button
            type="button"
            className={`eq-control-tab-btn ${tabFilter === "all" ? "active" : ""}`}
            onClick={() => setTabFilter("all")}
          >
            All Equipment
            <span className="eq-control-tab-badge">{stats.total}</span>
          </button>

          <button
            type="button"
            className={`eq-control-tab-btn ${tabFilter === "pending_return" ? "active" : ""}`}
            onClick={() => setTabFilter("pending_return")}
          >
            Return Requests
            <span className="eq-control-tab-badge">{stats.pendingReturn}</span>
          </button>

          <button
            type="button"
            className={`eq-control-tab-btn ${tabFilter === "inuse" ? "active" : ""}`}
            onClick={() => setTabFilter("inuse")}
          >
            In Active Use
            <span className="eq-control-tab-badge">{stats.inUse}</span>
          </button>

          <button
            type="button"
            className={`eq-control-tab-btn ${tabFilter === "completed" ? "active" : ""}`}
            onClick={() => setTabFilter("completed")}
          >
            Returned
            <span className="eq-control-tab-badge">{stats.completed}</span>
          </button>
        </div>

        {/* Table */}
        <div className="eq-control-table-wrapper">
          <table className="eq-control-table">
            <thead>
              <tr>
                <th>Equipment Name & Asset Code</th>
                <th>Target Experiment</th>
                <th>Usage Period</th>
                <th>Efficiency</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="eq-empty-state">
                    <div className="audit-spinner" />
                    <span>Loading equipment records...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="eq-empty-state">
                    <PackageCheck size={36} color="#94a3b8" />
                    <p>No equipment records found.</p>
                    <span>Try changing your search term or experiment filter.</span>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const status = item.status || "Allocated";
                  const isPending =
                    status === "InUse" &&
                    Boolean(item.note && item.note.toLowerCase().includes("return"));

                  return (
                    <tr key={item.allocationEquipmentDetailId}>
                      <td>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>
                          {item.equipmentInstanceName || item.assetCode || "Field Equipment"}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                          Type: {item.allocatedEquipmentTypeName || "Standard Machine"}
                          {item.assetCode ? ` • Code: ${item.assetCode}` : ""}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 500, color: "#0f172a" }}>
                          {item.experimentName || "Target Experiment"}
                        </div>
                        {item.phaseName && (
                          <div style={{ fontSize: "11px", color: "#16a34a" }}>
                            Phase: {item.phaseName}
                          </div>
                        )}
                      </td>

                      <td>
                        <div style={{ fontSize: "12px", color: "#475569" }}>
                          {formatDate(item.startDate)} → {formatDate(item.endDate)}
                        </div>
                      </td>

                      <td>
                        <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: 600 }}>
                          {Math.round((item.efficiencyRate ?? 1) * 100)}% Eff.
                        </span>
                      </td>

                      <td>
                        {isPending ? (
                          <span className="eq-status-badge pending-return">
                            Return Requested
                          </span>
                        ) : status === "InUse" ? (
                          <span className="eq-status-badge inuse">In Use</span>
                        ) : status === "Completed" ? (
                          <span className="eq-status-badge completed">Returned</span>
                        ) : (
                          <span className="eq-status-badge allocated">{status}</span>
                        )}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        {status === "InUse" ? (
                          <button
                            type="button"
                            className="eq-action-btn verify"
                            onClick={() => setVerifyModalItem(item)}
                            title="Verify equipment condition and forward return to Resource Manager"
                          >
                            <Send size={13} />
                            <span>Verify & Forward</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#94a3b8" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal: Verify Equipment Return */}
        {verifyModalItem && (
          <div className="eq-modal-overlay" onClick={() => setVerifyModalItem(null)}>
            <div className="eq-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="eq-modal-head">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle2 size={18} color="#16a34a" />
                  <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 650, color: "#0f172a" }}>
                    Verify Field Equipment Return
                  </h2>
                </div>
                <button
                  type="button"
                  className="eq-modal-close-btn"
                  onClick={() => setVerifyModalItem(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="eq-modal-content">
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderLeft: "3px solid #16a34a",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "13.5px" }}>
                    {verifyModalItem.equipmentInstanceName || verifyModalItem.assetCode || "Field Equipment"}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
                    Experiment: {verifyModalItem.experimentName || "Target Experiment"}
                  </div>
                </div>

                <div className="eq-form-group">
                  <label>Verified Condition Level</label>
                  <select
                    value={verifiedCondition}
                    onChange={(e) => setVerifiedCondition(e.target.value as EquipmentConditionLevel)}
                  >
                    <option value="Good">Good (Ready for next trial)</option>
                    <option value="Fair">Fair (Minor wear, operational)</option>
                    <option value="Poor">Poor (Requires maintenance check)</option>
                    <option value="Critical">Critical / Damaged</option>
                  </select>
                </div>

                <div className="eq-form-group">
                  <label>Researcher Verification Notes</label>
                  <textarea
                    rows={4}
                    placeholder="Enter inspection remarks, trial outcome, or notes for the Resource Manager..."
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                  />
                </div>

                <div className="eq-modal-actions">
                  <button
                    type="button"
                    className="audit-secondary-btn"
                    onClick={() => setVerifyModalItem(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="audit-primary-btn"
                    disabled={actionLoading}
                    onClick={handleVerifyReturn}
                  >
                    <CheckCircle2 size={15} />
                    <span>{actionLoading ? "Forwarding..." : "Confirm & Forward to Manager"}</span>
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
