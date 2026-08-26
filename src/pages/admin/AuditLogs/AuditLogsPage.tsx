import React, { useState, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "../../../layouts/DashboardLayout";
import {
  ShieldCheck,
  Search,
  RotateCw,
  Info,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Eye,
  ChevronLeft,
  ChevronRight,
  Terminal,
  X,
  Code,
  CheckCircle2,
  Trash2,
  PlusCircle,
  Pencil,
  Sliders,
  Sparkles,
  Calendar,
  Send,
  Ban,
  LogIn,
} from "lucide-react";
import {
  getAuditLogs,
  getRetentionConfig,
  saveRetentionConfig,
  purgeAuditLogsManual,
} from "../../../services/auditLogService";
import type { AuditLog, AuditRetentionConfig } from "../../../types/auditLog";
import "./AuditLogsPage.css";

function parseMetadata(metaStr?: string | null): Record<string, unknown> | null {
  if (!metaStr) return null;
  try {
    return JSON.parse(metaStr);
  } catch {
    return { raw: metaStr };
  }
}

/**
 * Intelligent severity helper:
 * Evaluates HTTP StatusCode and log properties to display accurate colors:
 * - 2xx -> Success / Info (Green / Blue)
 * - 4xx -> Warning (Amber)
 * - 5xx -> Error (Red)
 */
function resolveLogSeverity(log: AuditLog): { label: string; type: "success" | "info" | "warning" | "error" } {
  const meta = parseMetadata(log.metadata);
  const statusCode = log.httpStatusCode || Number(meta?.StatusCode ?? meta?.statusCode ?? 0);
  const desc = log.description || "";

  if ((statusCode >= 200 && statusCode < 300) || desc.includes("Status 200") || desc.includes("Status 201")) {
    return { label: "SUCCESS", type: "success" };
  }
  if (statusCode >= 500 || desc.includes("Status 500") || desc.toLowerCase().includes("error")) {
    return { label: "ERROR", type: "error" };
  }
  if (statusCode >= 400 || desc.includes("Status 40") || desc.toLowerCase().includes("warning")) {
    return { label: "WARNING", type: "warning" };
  }

  const rawSev = (log.severity || "INFO").toUpperCase();
  if (rawSev === "ERROR") return { label: "ERROR", type: "error" };
  if (rawSev === "WARNING" || rawSev === "WARN") return { label: "WARNING", type: "warning" };
  return { label: "INFO", type: "info" };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [selectedAction, setSelectedAction] = useState<string>("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Retention Config & Modal
  const [retentionConfig, setRetentionConfig] = useState<AuditRetentionConfig>(() => getRetentionConfig());
  const [showRetentionModal, setShowRetentionModal] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeDays, setPurgeDays] = useState(30);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Load audit logs from real API
  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAuditLogs({
        page,
        pageSize,
        search: searchQuery.trim() || undefined,
        module: selectedModule !== "ALL" ? selectedModule : undefined,
        action: selectedAction !== "ALL" ? selectedAction : undefined,
      });

      setLogs(res.items);
      setTotalItems(res.total);
      setTotalPages(Math.max(1, res.totalPages));
    } catch (err) {
      console.error("Failed to load audit logs from API:", err);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, searchQuery, selectedModule, selectedAction]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  const handleSaveRetention = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveRetentionConfig(retentionConfig);
    setRetentionConfig(updated);
    setShowRetentionModal(false);
    setFeedbackMsg(`Auto-retention policy updated: keeping logs for ${updated.retentionDays} days.`);
    setPage(1);
    loadLogs();
    setTimeout(() => setFeedbackMsg(""), 4000);
  };

  const handleExecutePurge = async () => {
    await purgeAuditLogsManual(purgeDays);
    setShowPurgeModal(false);
    setFeedbackMsg(`Successfully cleaned up and purged audit logs older than ${purgeDays} days.`);
    setPage(1);
    loadLogs();
    setTimeout(() => setFeedbackMsg(""), 4000);
  };

  const renderActionBadge = (log: AuditLog) => {
    const act = (log.normalizedAction || log.action || "EXECUTE").toUpperCase();
    if (act === "DELETE") {
      return (
        <span className="audit-action-badge delete">
          <Trash2 size={12} /> DELETE
        </span>
      );
    }
    if (act === "CREATE") {
      return (
        <span className="audit-action-badge create">
          <PlusCircle size={12} /> CREATE
        </span>
      );
    }
    if (act === "UPDATE") {
      return (
        <span className="audit-action-badge update">
          <Pencil size={12} /> UPDATE
        </span>
      );
    }
    if (act === "SUBMIT") {
      return (
        <span className="audit-action-badge submit">
          <Send size={12} /> SUBMIT
        </span>
      );
    }
    if (act === "APPROVE") {
      return (
        <span className="audit-action-badge approve">
          <CheckCircle2 size={12} /> APPROVE
        </span>
      );
    }
    if (act === "REJECT") {
      return (
        <span className="audit-action-badge reject">
          <XCircle size={12} /> REJECT
        </span>
      );
    }
    if (act === "CANCEL") {
      return (
        <span className="audit-action-badge cancel">
          <Ban size={12} /> CANCEL
        </span>
      );
    }
    if (act === "LOGIN") {
      return (
        <span className="audit-action-badge login">
          <LogIn size={12} /> LOGIN
        </span>
      );
    }

    return (
      <span className="audit-action-badge execute">
        {log.action || "EXECUTE"}
      </span>
    );
  };

  const renderStatusBadge = (log: AuditLog) => {
    const { label, type } = resolveLogSeverity(log);
    switch (type) {
      case "success":
        return (
          <span className="audit-status-badge success">
            <CheckCircle2 size={11} />
            {label}
          </span>
        );
      case "error":
        return (
          <span className="audit-status-badge error">
            <XCircle size={11} />
            {label}
          </span>
        );
      case "warning":
        return (
          <span className="audit-status-badge warning">
            <AlertTriangle size={11} />
            {label}
          </span>
        );
      default:
        return (
          <span className="audit-status-badge info">
            <Info size={11} />
            {label}
          </span>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="audit-logs-page">
        {/* Header */}
        <div className="audit-page-header">
          <div>
            <h1>System Audit Logs</h1>
            <p>
              Traceability and compliance monitoring of all system events, DELETE actions, user operations, and API activities.
            </p>
          </div>

          <div className="audit-header-actions">
            <button
              type="button"
              className="audit-secondary-btn"
              onClick={() => setShowRetentionModal(true)}
              title="Configure Retention & Auto-Delete Policy"
            >
              <Sliders size={15} />
              <span>Retention Policy</span>
            </button>

            <button
              type="button"
              className="audit-danger-btn"
              onClick={() => setShowPurgeModal(true)}
              title="Clean Up Outdated Logs"
            >
              <Trash2 size={15} />
              <span>Purge Old Logs</span>
            </button>

            <button
              type="button"
              className="audit-primary-btn"
              onClick={loadLogs}
              disabled={isLoading}
            >
              <RotateCw size={15} className={isLoading ? "spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div className="audit-retention-banner" style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}>
            <div className="audit-retention-info" style={{ color: "#1e40af" }}>
              <Sparkles size={16} />
              <span>{feedbackMsg}</span>
            </div>
          </div>
        )}

        {/* Retention Policy Status Banner */}
        <div className="audit-retention-banner">
          <div className="audit-retention-info">
            <ShieldCheck size={16} />
            <span>
              {retentionConfig.autoDeleteEnabled
                ? `Auto-Retention Active: System automatically retains audit logs for the last ${retentionConfig.retentionDays} days.`
                : "Auto-Retention Inactive: Retaining all historical audit logs without time restriction."}
            </span>
          </div>

          <button
            type="button"
            className="audit-retention-btn-link"
            onClick={() => setShowRetentionModal(true)}
          >
            Configure Retention Settings
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="audit-page-toolbar">
          <form className="audit-toolbar-search" onSubmit={handleSearchSubmit}>
            <div className="audit-input-container">
              <Search size={16} className="audit-search-icon" />
              <input
                type="text"
                placeholder="Search action, description, username, DELETE events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>

          {/* Module Filter */}
          <div>
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setPage(1);
              }}
              className="audit-toolbar-select"
            >
              <option value="ALL">All Modules</option>
              <option value="Experiments">Experiments</option>
              <option value="ExperimentPhases">Phases</option>
              <option value="ExperimentEquipmentRequirements">Equipment Requirements</option>
              <option value="ExperimentHumanRequirements">Human Requirements</option>
              <option value="ExperimentLandRequirements">Land Requirements</option>
              <option value="AllocationPlans">Allocation Plans</option>
              <option value="EquipmentInstances">Equipment Instances</option>
              <option value="LandResources">Land Resources</option>
              <option value="HumanResourceProfiles">Human Resources</option>
              <option value="Auth">Auth & Users</option>
              <option value="Notifications">Notifications</option>
            </select>
          </div>

          {/* Action Filter (Highlighting DELETE) */}
          <div>
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(1);
              }}
              className="audit-toolbar-select"
            >
              <option value="ALL">All Actions</option>
              <option value="DELETE">🗑️ DELETE (Xóa dữ liệu)</option>
              <option value="CREATE">➕ CREATE (Tạo mới / POST)</option>
              <option value="UPDATE">✏️ UPDATE (Cập nhật / PUT)</option>
              <option value="SUBMIT">🚀 SUBMIT (Gửi duyệt)</option>
              <option value="APPROVE">✅ APPROVE (Phê duyệt)</option>
              <option value="REJECT">❌ REJECT (Từ chối)</option>
              <option value="CANCEL">⛔ CANCEL (Hủy bỏ)</option>
              <option value="LOGIN">🔑 LOGIN (Đăng nhập)</option>
            </select>
          </div>

          <div>
            <button
              type="button"
              className="audit-secondary-btn"
              style={{ height: "40px" }}
              onClick={() => {
                setSearchQuery("");
                setSelectedModule("ALL");
                setSelectedAction("ALL");
                setPage(1);
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Table Card */}
        <div className="audit-page-table-card">
          <table className="audit-main-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor / User</th>
                <th>Module</th>
                <th>Action</th>
                <th>Status</th>
                <th>Description</th>
                <th style={{ textAlign: "center" }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="audit-table-state">
                    <div className="audit-spinner" />
                    <span>Loading audit records from server...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="audit-table-state">
                    <ShieldCheck size={36} color="#94a3b8" />
                    <p>No audit records found.</p>
                    <span>Try changing your search query, module, or action filter.</span>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.auditLogId}>
                    <td>
                      <div className="audit-time-wrap">
                        <Clock size={12} />
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </td>
                    <td>
                      <div className="audit-user-cell">
                        <User size={14} color="#64748b" />
                        <div>
                          <span className="audit-user-fullname">
                            {log.actorFullName || log.actorUsername || "System / Anonymous"}
                          </span>
                          {log.actorRoleName && (
                            <span className="audit-user-rolename">{log.actorRoleName}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="audit-module-tag">{log.module || "General"}</span>
                    </td>
                    <td>{renderActionBadge(log)}</td>
                    <td>{renderStatusBadge(log)}</td>
                    <td className="audit-description-col" title={log.description || ""}>
                      {log.description || "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="action-btn-pill"
                        onClick={() => setSelectedLog(log)}
                        title="View Detailed Payload & Metadata"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="audit-page-pagination">
              <span className="audit-pagination-info">
                Showing {logs.length} of {totalItems} total logs (Page {page} of {totalPages})
              </span>
              <div className="audit-pagination-controls">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="audit-page-nav-btn"
                >
                  <ChevronLeft size={15} /> Prev
                </button>
                <span className="audit-page-number">{page}</span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="audit-page-nav-btn"
                >
                  Next <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal: View Log Details */}
        {selectedLog && (
          <div className="audit-modal-overlay" onClick={() => setSelectedLog(null)}>
            <div className="audit-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="audit-modal-head">
                <div className="audit-modal-title">
                  <Terminal size={18} color="#16a34a" />
                  <h2>Audit Log Record #{selectedLog.auditLogId}</h2>
                </div>
                <button
                  type="button"
                  className="audit-modal-close-btn"
                  onClick={() => setSelectedLog(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="audit-modal-content">
                <div className="audit-detail-grid">
                  <div className="audit-grid-item">
                    <label>Timestamp</label>
                    <span>{new Date(selectedLog.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="audit-grid-item">
                    <label>Status / Result</label>
                    <div>{renderStatusBadge(selectedLog)}</div>
                  </div>
                  <div className="audit-grid-item">
                    <label>Module</label>
                    <span>{selectedLog.module || "System"}</span>
                  </div>
                  <div className="audit-grid-item">
                    <label>Action & Method</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {renderActionBadge(selectedLog)}
                      {selectedLog.httpMethod && (
                        <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>
                          ({selectedLog.httpMethod})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="audit-grid-item">
                    <label>Actor</label>
                    <span>
                      {selectedLog.actorFullName || selectedLog.actorUsername || "System"}{" "}
                      {selectedLog.actorRoleName ? `(${selectedLog.actorRoleName})` : ""}
                    </span>
                  </div>
                  <div className="audit-grid-item">
                    <label>HTTP Status Code</label>
                    <span style={{ color: "#0f172a", fontWeight: 600 }}>
                      {selectedLog.httpStatusCode || 200}
                    </span>
                  </div>
                  <div className="audit-grid-item full">
                    <label>Description</label>
                    <div className="audit-desc-display">{selectedLog.description || "No description provided."}</div>
                  </div>
                </div>

                {/* Metadata */}
                {selectedLog.metadata && (
                  <div className="audit-metadata-wrapper">
                    <div className="audit-meta-title">
                      <Code size={14} color="#475569" />
                      <span>Request Payload & Technical Metadata</span>
                    </div>
                    <pre className="audit-meta-code">
                      {JSON.stringify(parseMetadata(selectedLog.metadata), null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Retention Settings */}
        {showRetentionModal && (
          <div className="audit-modal-overlay" onClick={() => setShowRetentionModal(false)}>
            <div className="audit-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
              <div className="audit-modal-head">
                <div className="audit-modal-title">
                  <Sliders size={18} color="#16a34a" />
                  <h2>Audit Log Retention & Auto-Delete</h2>
                </div>
                <button
                  type="button"
                  className="audit-modal-close-btn"
                  onClick={() => setShowRetentionModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveRetention} className="audit-modal-content">
                <div className="audit-retention-form">
                  <div className="audit-form-group">
                    <label className="audit-checkbox-label">
                      <input
                        type="checkbox"
                        checked={retentionConfig.autoDeleteEnabled}
                        onChange={(e) =>
                          setRetentionConfig((prev) => ({
                            ...prev,
                            autoDeleteEnabled: e.target.checked,
                          }))
                        }
                      />
                      <span>Enable Automatic Log Retention & Cleanup</span>
                    </label>
                    <p style={{ marginTop: "4px" }}>
                      When enabled, audit logs older than the configured threshold will be automatically pruned.
                    </p>
                  </div>

                  <div className="audit-form-group">
                    <label>Retention Period (Days)</label>
                    <select
                      value={retentionConfig.retentionDays}
                      disabled={!retentionConfig.autoDeleteEnabled}
                      onChange={(e) =>
                        setRetentionConfig((prev) => ({
                          ...prev,
                          retentionDays: Number(e.target.value),
                        }))
                      }
                      className="audit-toolbar-select"
                    >
                      <option value={7}>7 Days (1 Week)</option>
                      <option value={15}>15 Days (Half Month)</option>
                      <option value={30}>30 Days (1 Month - Recommended)</option>
                      <option value={60}>60 Days (2 Months)</option>
                      <option value={90}>90 Days (1 Quarter)</option>
                      <option value={180}>180 Days (6 Months)</option>
                      <option value={365}>365 Days (1 Year)</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                    <button
                      type="button"
                      className="audit-secondary-btn"
                      onClick={() => setShowRetentionModal(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="audit-primary-btn">
                      Save Policy
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Manual Purge Logs */}
        {showPurgeModal && (
          <div className="audit-modal-overlay" onClick={() => setShowPurgeModal(false)}>
            <div className="audit-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
              <div className="audit-modal-head">
                <div className="audit-modal-title">
                  <Trash2 size={18} color="#dc2626" />
                  <h2>Purge Outdated Audit Logs</h2>
                </div>
                <button
                  type="button"
                  className="audit-modal-close-btn"
                  onClick={() => setShowPurgeModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="audit-modal-content">
                <p style={{ fontSize: "13.5px", color: "#475569", lineHeight: 1.5, margin: "0 0 16px" }}>
                  This will clean up and purge audit log records older than the selected timeframe. This action helps maintain optimal database performance and compliance.
                </p>

                <div className="audit-form-group">
                  <label>Purge records older than:</label>
                  <select
                    value={purgeDays}
                    onChange={(e) => setPurgeDays(Number(e.target.value))}
                    className="audit-toolbar-select"
                  >
                    <option value={7}>Older than 7 Days</option>
                    <option value={15}>Older than 15 Days</option>
                    <option value={30}>Older than 30 Days (Recommended)</option>
                    <option value={60}>Older than 60 Days</option>
                    <option value={90}>Older than 90 Days</option>
                  </select>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                  <button
                    type="button"
                    className="audit-secondary-btn"
                    onClick={() => setShowPurgeModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="audit-danger-btn"
                    onClick={handleExecutePurge}
                  >
                    <Trash2 size={14} />
                    <span>Confirm & Purge Logs</span>
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
