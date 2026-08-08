import React, { useState, useEffect, useMemo, useCallback } from "react";
import DashboardLayout from "../../../layouts/DashboardLayout";
import {
  ShieldCheck,
  Search,
  RotateCw,
  Download,
  Filter,
  Info,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Activity,
  FileText,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
  Terminal,
} from "lucide-react";
import { getNotifications } from "../../../services/systemService";
import "./AuditLogsPage.css";

export interface AuditLogEntry {
  id: string | number;
  timestamp: string;
  title: string;
  message: string;
  type: "System" | "Info" | "Warning" | "Error" | "Security";
  performedBy: string;
  userRole: string;
  ipAddress: string;
  affectedEntity?: string;
  metadata?: Record<string, any>;
}

const initialAuditLogs: AuditLogEntry[] = [
  {
    id: "log-101",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    title: "User Role Assignment Updated",
    message: "Admin updated role permissions for technician user 'Pham Van Technician' from Student to Technician.",
    type: "Security",
    performedBy: "Le Van Admin",
    userRole: "Admin",
    ipAddress: "192.168.1.105",
    affectedEntity: "User #14 (Pham Van Technician)",
    metadata: {
      action: "UPDATE_ROLE",
      targetUserId: 14,
      previousRole: "Student",
      newRole: "Technician",
    },
  },
  {
    id: "log-102",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    title: "Personnel Directory Profile Created",
    message: "Created personnel record and assigned working hour quota (8 hrs/day) for 'Hoang Thi Student'.",
    type: "Info",
    performedBy: "Le Van Admin",
    userRole: "Admin",
    ipAddress: "192.168.1.105",
    affectedEntity: "Personnel Profile #3",
    metadata: {
      action: "CREATE_PERSONNEL",
      maxHours: 8,
      status: "Available",
    },
  },
  {
    id: "log-103",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    title: "System Settings Modified",
    message: "Updated global conflict resolution strategy parameter to 'Automatic Allocation Prioritization'.",
    type: "System",
    performedBy: "Le Van Admin",
    userRole: "Admin",
    ipAddress: "192.168.1.105",
    affectedEntity: "System Settings",
    metadata: {
      settingKey: "CONFLICT_RESOLUTION_STRATEGY",
      newValue: "AUTO_PRIORITY",
    },
  },
  {
    id: "log-104",
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    title: "Equipment Shortage Warning Logged",
    message: "Shortage of 2 Drone Units detected during automated resource allocation check for Sector B experiment.",
    type: "Warning",
    performedBy: "System Automated Task",
    userRole: "System",
    ipAddress: "127.0.0.1",
    affectedEntity: "Equipment Category #4 (Drones)",
    metadata: {
      required: 5,
      available: 3,
      shortage: 2,
    },
  },
  {
    id: "log-105",
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    title: "Admin User Authentication",
    message: "Successful multi-factor authentication login for administrator account.",
    type: "Security",
    performedBy: "Le Van Admin",
    userRole: "Admin",
    ipAddress: "192.168.1.105",
    affectedEntity: "Auth Session",
    metadata: {
      authMethod: "JWT_BEARER",
      status: "SUCCESS",
    },
  },
  {
    id: "log-106",
    timestamp: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
    title: "Experiment Allocation Plan Executed",
    message: "Manager approved allocation plan #8 for Soil Sampling Study in Zone C.",
    type: "Info",
    performedBy: "Tran Thi Manager",
    userRole: "Manager",
    ipAddress: "192.168.1.112",
    affectedEntity: "Allocation Plan #8",
    metadata: {
      experimentId: 12,
      allocatedItemsCount: 14,
    },
  },
  {
    id: "log-107",
    timestamp: new Date(Date.now() - 1000 * 60 * 1440).toISOString(),
    title: "Failed API Authorization Attempt",
    message: "Unauthorized attempt to access restricted system diagnostic endpoint from external IP.",
    type: "Error",
    performedBy: "Anonymous / Unknown",
    userRole: "Guest",
    ipAddress: "185.220.101.4",
    affectedEntity: "Endpoint /api/Health/system-internal",
    metadata: {
      statusCode: 403,
      errorCode: "FORBIDDEN_ACCESS",
    },
  },
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Load audit logs from systemService and localStorage
  const loadAuditLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get stored logs from localStorage
      const localRaw = localStorage.getItem("app_system_audit_logs");
      let localLogs: AuditLogEntry[] = [];
      if (localRaw) {
        try {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed)) {
            localLogs = parsed.map((item: any, idx: number) => ({
              id: item.notificationId || `local-${idx}-${Date.now()}`,
              timestamp: item.createdAt || new Date().toISOString(),
              title: item.title || "System Activity",
              message: item.message || "",
              type: item.type || "Info",
              performedBy: item.performedBy || "Le Van Admin",
              userRole: item.userRole || "Admin",
              ipAddress: item.ipAddress || "192.168.1.105",
              affectedEntity: item.affectedEntity || "System Registry",
              metadata: item.metadata || {},
            }));
          }
        } catch (e) {
          console.warn("Failed to parse local audit logs", e);
        }
      }

      // Get notifications
      const notifs = await getNotifications();
      const mappedNotifs: AuditLogEntry[] = notifs.map((n) => ({
        id: `notif-${n.notificationId}`,
        timestamp: n.createdAt,
        title: n.title,
        message: n.message,
        type: (n.type as any) === "Info" ? "Info" : (n.type as any) === "Warning" ? "Warning" : (n.type as any) === "Error" ? "Error" : "System",
        performedBy: "System Notification Engine",
        userRole: "System",
        ipAddress: "127.0.0.1",
        affectedEntity: "Notification Service",
      }));

      // Combine local logs, fetched notification logs, and default logs
      const combined = [...localLogs, ...initialAuditLogs, ...mappedNotifs];

      // Remove duplicates by id or timestamp+title
      const uniqueMap = new Map<string, AuditLogEntry>();
      combined.forEach((item) => {
        const key = `${item.title}-${item.timestamp}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        }
      });

      const sorted = Array.from(uniqueMap.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setLogs(sorted);
    } catch (err) {
      console.error("Error loading audit logs:", err);
      setLogs(initialAuditLogs);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Type filter
      if (selectedType !== "ALL" && log.type.toUpperCase() !== selectedType.toUpperCase()) {
        return false;
      }

      // Date filter
      if (dateFilter !== "ALL") {
        const logDate = new Date(log.timestamp).getTime();
        const now = Date.now();
        if (dateFilter === "TODAY") {
          const startOfToday = new Date().setHours(0, 0, 0, 0);
          if (logDate < startOfToday) return false;
        } else if (dateFilter === "7DAYS") {
          if (now - logDate > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (dateFilter === "30DAYS") {
          if (now - logDate > 30 * 24 * 60 * 60 * 1000) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = log.title.toLowerCase().includes(q);
        const matchMessage = log.message.toLowerCase().includes(q);
        const matchUser = log.performedBy.toLowerCase().includes(q);
        const matchIp = log.ipAddress.toLowerCase().includes(q);
        const matchEntity = (log.affectedEntity || "").toLowerCase().includes(q);
        return matchTitle || matchMessage || matchUser || matchIp || matchEntity;
      }

      return true;
    });
  }, [logs, selectedType, dateFilter, searchQuery]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = logs.length;
    const security = logs.filter((l) => l.type === "Security" || l.type === "System").length;
    const warningsAndErrors = logs.filter((l) => l.type === "Warning" || l.type === "Error").length;
    const info = logs.filter((l) => l.type === "Info").length;

    return { total, security, warningsAndErrors, info };
  }, [logs]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ["Timestamp", "Type", "Event Title", "Message", "Performed By", "Role", "IP Address", "Affected Entity"];
    const csvRows = [headers.join(",")];

    filteredLogs.forEach((l) => {
      const row = [
        `"${new Date(l.timestamp).toLocaleString()}"`,
        `"${l.type}"`,
        `"${l.title.replace(/"/g, '""')}"`,
        `"${l.message.replace(/"/g, '""')}"`,
        `"${l.performedBy}"`,
        `"${l.userRole}"`,
        `"${l.ipAddress}"`,
        `"${(l.affectedEntity || "").replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `system_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Type badge styling helper
  const getTypeBadge = (type: AuditLogEntry["type"]) => {
    switch (type) {
      case "Security":
        return {
          bg: "#EEF2FF",
          color: "#4F46E5",
          border: "#C7D2FE",
          icon: <ShieldCheck size={13} />,
        };
      case "System":
        return {
          bg: "#E0F2FE",
          color: "#0369A1",
          border: "#BAE6FD",
          icon: <Terminal size={13} />,
        };
      case "Warning":
        return {
          bg: "#FEF3C7",
          color: "#B45309",
          border: "#FDE68A",
          icon: <AlertTriangle size={13} />,
        };
      case "Error":
        return {
          bg: "#FEE2E2",
          color: "#B91C1C",
          border: "#FCA5A5",
          icon: <XCircle size={13} />,
        };
      case "Info":
      default:
        return {
          bg: "#DCFCE7",
          color: "#15803D",
          border: "#86EFAC",
          icon: <Info size={13} />,
        };
    }
  };

  return (
    <DashboardLayout>
      <div className="audit-logs-container">
        {/* Header Block */}
        <div className="audit-header-panel">
          <div>
            <div className="audit-title-row">
              <ShieldCheck className="audit-title-icon" size={26} />
              <h2>System Audit Logs</h2>
            </div>
            <p className="audit-subtitle">
              Comprehensive audit trail for administrator activities, access controls, security events, and system telemetry.
            </p>
          </div>
          <div className="audit-header-actions">
            <button
              type="button"
              className="audit-btn secondary"
              onClick={loadAuditLogs}
              disabled={isLoading}
            >
              <RotateCw size={14} className={isLoading ? "spin-icon" : ""} />
              <span>Refresh Logs</span>
            </button>
            <button
              type="button"
              className="audit-btn primary"
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="audit-stats-grid">
          <div className="audit-stat-card">
            <div className="stat-icon-wrapper total">
              <Activity size={20} />
            </div>
            <div>
              <div className="stat-label">Total Logged Events</div>
              <div className="stat-value">{stats.total}</div>
            </div>
          </div>
          <div className="audit-stat-card">
            <div className="stat-icon-wrapper security">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="stat-label">Security & System</div>
              <div className="stat-value">{stats.security}</div>
            </div>
          </div>
          <div className="audit-stat-card">
            <div className="stat-icon-wrapper warning">
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="stat-label">Warnings & Errors</div>
              <div className="stat-value">{stats.warningsAndErrors}</div>
            </div>
          </div>
          <div className="audit-stat-card">
            <div className="stat-icon-wrapper info">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="stat-label">Operational Info</div>
              <div className="stat-value">{stats.info}</div>
            </div>
          </div>
        </div>

        {/* Content Block */}
        <div className="audit-content-panel">
          {/* Controls Bar */}
          <div className="audit-control-bar">
            <div className="audit-search-wrapper">
              <Search className="audit-search-icon" size={16} />
              <input
                type="text"
                placeholder="Search audit logs by event, user, IP, entity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" className="clear-search-btn" onClick={() => setSearchQuery("")}>
                  ×
                </button>
              )}
            </div>

            <div className="audit-filters-group">
              <div className="audit-filter-item">
                <Filter size={14} className="filter-icon" />
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="ALL">All Event Types</option>
                  <option value="SECURITY">Security</option>
                  <option value="SYSTEM">System</option>
                  <option value="INFO">Info</option>
                  <option value="WARNING">Warning</option>
                  <option value="ERROR">Error</option>
                </select>
              </div>

              <div className="audit-filter-item">
                <Calendar size={14} className="filter-icon" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <option value="ALL">All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="7DAYS">Last 7 Days</option>
                  <option value="30DAYS">Last 30 Days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          {isLoading ? (
            <div className="skeleton-loading-wrapper" style={{ padding: "40px 0" }}>
              <div className="skeleton-row header"></div>
              <div className="skeleton-row"></div>
              <div className="skeleton-row"></div>
              <div className="skeleton-row"></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="no-data-alert">
              <FileText size={32} style={{ marginBottom: "8px", opacity: 0.5 }} />
              <div>No audit log entries matching the selected criteria.</div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>TIMESTAMP</th>
                    <th>EVENT & DETAILS</th>
                    <th>TYPE / SEVERITY</th>
                    <th>PERFORMED BY</th>
                    <th>IP ADDRESS</th>
                    <th style={{ textAlign: "right" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => {
                    const badge = getTypeBadge(log.type);
                    const formattedDate = new Date(log.timestamp).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    });

                    return (
                      <tr key={log.id}>
                        <td className="time-cell">
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px" }}>
                            <Clock size={13} style={{ color: "#6B7280" }} />
                            <span>{formattedDate}</span>
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, color: "var(--text-h)", fontSize: "14px" }}>
                            {log.title}
                          </div>
                          <div className="log-message-preview">{log.message}</div>
                          {log.affectedEntity && (
                            <div className="log-entity-tag">
                              <Layers size={11} />
                              <span>{log.affectedEntity}</span>
                            </div>
                          )}
                        </td>

                        <td>
                          <span
                            className="audit-type-badge"
                            style={{
                              backgroundColor: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                            }}
                          >
                            {badge.icon}
                            <span>{log.type}</span>
                          </span>
                        </td>

                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div className="user-avatar-circle">
                              <User size={13} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: "13px" }}>{log.performedBy}</div>
                              <span className="user-role-subbadge">{log.userRole}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <code className="ip-code">{log.ipAddress}</code>
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="action-btn-pill view"
                            onClick={() => setSelectedLog(log)}
                            title="View Log Details"
                          >
                            <Eye size={12} />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Audit Log Details */}
        {selectedLog && (
          <div className="audit-modal-overlay" onClick={() => setSelectedLog(null)}>
            <div className="audit-modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="audit-modal-header">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <ShieldCheck size={22} style={{ color: "var(--primary)" }} />
                  <h3 style={{ margin: 0 }}>Audit Log Entry Details</h3>
                </div>
                <button type="button" className="close-modal-btn" onClick={() => setSelectedLog(null)}>
                  ×
                </button>
              </div>

              <div className="audit-modal-body">
                <div className="detail-item">
                  <div className="detail-label">Event Title</div>
                  <div className="detail-value title">{selectedLog.title}</div>
                </div>

                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="detail-label">Severity Level</div>
                    <div>
                      {(() => {
                        const b = getTypeBadge(selectedLog.type);
                        return (
                          <span
                            className="audit-type-badge"
                            style={{
                              backgroundColor: b.bg,
                              color: b.color,
                              border: `1px solid ${b.border}`,
                            }}
                          >
                            {b.icon}
                            <span>{selectedLog.type}</span>
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="detail-item">
                    <div className="detail-label">Exact Timestamp</div>
                    <div className="detail-value">{new Date(selectedLog.timestamp).toISOString()}</div>
                  </div>

                  <div className="detail-item">
                    <div className="detail-label">Performed By</div>
                    <div className="detail-value">
                      {selectedLog.performedBy} ({selectedLog.userRole})
                    </div>
                  </div>

                  <div className="detail-item">
                    <div className="detail-label">Source IP Address</div>
                    <div className="detail-value">
                      <code>{selectedLog.ipAddress}</code>
                    </div>
                  </div>
                </div>

                <div className="detail-item" style={{ marginTop: "12px" }}>
                  <div className="detail-label">Affected Target Entity</div>
                  <div className="detail-value">{selectedLog.affectedEntity || "N/A"}</div>
                </div>

                <div className="detail-item" style={{ marginTop: "12px" }}>
                  <div className="detail-label">Event Log Message</div>
                  <div className="detail-value description-box">{selectedLog.message}</div>
                </div>

                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div className="detail-item" style={{ marginTop: "12px" }}>
                    <div className="detail-label">Structured Metadata Payload</div>
                    <pre className="json-metadata-box">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="audit-modal-footer">
                <button
                  type="button"
                  className="audit-btn secondary"
                  onClick={() => setSelectedLog(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
