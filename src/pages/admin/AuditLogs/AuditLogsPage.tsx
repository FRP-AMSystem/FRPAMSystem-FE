import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { getAuditLogs } from "../../../services/auditLogService";
import type { AuditLog } from "../../../types/auditLog";
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
 * In BE database, the audit interceptor currently defaults severity = 'WARNING' for all HTTP requests.
 * We evaluate the actual HTTP StatusCode from description/metadata to display accurate colors:
 * - 2xx -> Success / Info (Green / Blue)
 * - 4xx -> Warning (Amber)
 * - 5xx -> Error (Red)
 */
function resolveLogSeverity(log: AuditLog): { label: string; type: "success" | "info" | "warning" | "error" } {
  const meta = parseMetadata(log.metadata);
  const statusCode = Number(meta?.StatusCode ?? meta?.statusCode ?? 0);
  const desc = log.description || "";

  if (statusCode >= 200 && statusCode < 300 || desc.includes("Status 200") || desc.includes("Status 201")) {
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
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

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
  }, [page, pageSize, searchQuery, selectedModule]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  const renderBadge = (log: AuditLog) => {
    const { label, type } = resolveLogSeverity(log);
    switch (type) {
      case "success":
        return (
          <span className="audit-status-badge success">
            <CheckCircle2 size={12} />
            {label}
          </span>
        );
      case "error":
        return (
          <span className="audit-status-badge error">
            <XCircle size={12} />
            {label}
          </span>
        );
      case "warning":
        return (
          <span className="audit-status-badge warning">
            <AlertTriangle size={12} />
            {label}
          </span>
        );
      default:
        return (
          <span className="audit-status-badge info">
            <Info size={12} />
            {label}
          </span>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="audit-logs-page">
        {/* Header matching Allocation / Land / Equipment style */}
        <div className="audit-page-header">
          <div>
            <h1>System Audit Logs</h1>
            <p>
              Traceability and compliance monitoring of all system events, user actions, and API activities.
            </p>
          </div>
          <button
            type="button"
            className="audit-primary-btn"
            onClick={loadLogs}
            disabled={isLoading}
          >
            <RotateCw size={16} className={isLoading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="audit-page-toolbar">
          <form className="audit-toolbar-search" onSubmit={handleSearchSubmit}>
            <div className="audit-input-container">
              <Search size={17} className="audit-search-icon" />
              <input
                type="text"
                placeholder="Search action, description, actor username, or path..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>

          <div className="audit-toolbar-selects">
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
              <option value="Auth">Auth & Users</option>
              <option value="Notifications">Notifications</option>
            </select>
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
                <th style={{ textAlign: "center" }}>Actions</th>
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
                    <span>Try changing your search query or module filter.</span>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.auditLogId}>
                    <td className="audit-time-col">
                      <div className="audit-time-wrap">
                        <Clock size={13} />
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
                    <td>
                      <span className="audit-action-text">{log.action || "Execute"}</span>
                    </td>
                    <td>{renderBadge(log)}</td>
                    <td className="audit-description-col" title={log.description || ""}>
                      {log.description || "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="action-btn-pill edit"
                        onClick={() => setSelectedLog(log)}
                        title="View Detailed Payload"
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
                  <ChevronLeft size={16} /> Prev
                </button>
                <span className="audit-page-number">{page}</span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="audit-page-nav-btn"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal View Detail */}
        {selectedLog && (
          <div className="audit-modal-overlay" onClick={() => setSelectedLog(null)}>
            <div className="audit-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="audit-modal-head">
                <div className="audit-modal-title">
                  <Terminal size={20} color="#16a34a" />
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
                    <label>Status / Severity</label>
                    <div>{renderBadge(selectedLog)}</div>
                  </div>
                  <div className="audit-grid-item">
                    <label>Module</label>
                    <span>{selectedLog.module || "System"}</span>
                  </div>
                  <div className="audit-grid-item">
                    <label>Action</label>
                    <span>{selectedLog.action || "Activity"}</span>
                  </div>
                  <div className="audit-grid-item">
                    <label>Actor</label>
                    <span>
                      {selectedLog.actorFullName || selectedLog.actorUsername || "System"}{" "}
                      {selectedLog.actorRoleName ? `(${selectedLog.actorRoleName})` : ""}
                    </span>
                  </div>
                  <div className="audit-grid-item">
                    <label>Raw BE Severity</label>
                    <span style={{ color: "#64748b" }}>{selectedLog.severity || "WARNING"}</span>
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
                      <Code size={15} color="#475569" />
                      <span>Request Payload & Metadata</span>
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
      </div>
    </DashboardLayout>
  );
}
