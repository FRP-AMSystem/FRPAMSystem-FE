import { useState, useMemo } from "react";
import {
  Search,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { EquipmentOperatingMetric } from "../../../types/dashboard";

interface EquipmentLifespanTableProps {
  data: EquipmentOperatingMetric[];
}

export default function EquipmentLifespanTable({
  data,
}: EquipmentLifespanTableProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [urgencyOnly, setUrgencyOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchSearch =
        item.assetCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.equipmentTypeName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === "all" || item.status.toLowerCase() === statusFilter.toLowerCase();

      const matchCondition =
        conditionFilter === "all" ||
        item.conditionLevel.toLowerCase() === conditionFilter.toLowerCase();

      const matchUrgency = !urgencyOnly || item.isOverdue || item.isNearThreshold;

      return matchSearch && matchStatus && matchCondition && matchUrgency;
    });
  }, [data, searchTerm, statusFilter, conditionFilter, urgencyOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Available":
        return "badge-success";
      case "InUse":
      case "Operating":
        return "badge-info";
      case "Reserved":
        return "badge-info";
      case "Maintenance":
        return "badge-warning";
      case "Damaged":
      case "Broken":
        return "badge-danger";
      default:
        return "badge-info";
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "Good":
      case "New":
        return { color: "#16a34a", background: "#f0fdf4" };
      case "Fair":
        return { color: "#2563eb", background: "#eff6ff" };
      case "Poor":
        return { color: "#d97706", background: "#fffbeb" };
      case "Critical":
      case "Damaged":
        return { color: "#dc2626", background: "#fef2f2" };
      default:
        return { color: "#64748b", background: "#f8fafc" };
    }
  };

  return (
    <div className="dashboard-card">
      {/* Table Filter Bar */}
      <div className="table-filter-bar">
        <div className="card-title-group">
          <div className="card-title-icon icon-amber-soft">
            <Clock size={18} />
          </div>
          <div>
            <h3 className="dashboard-card-title">
              Detailed Equipment Operating Hours & Health Matrix
            </h3>
            <p className="dashboard-card-subtitle">
              Complete wear-and-tear tracking, safe remaining hours, and condition levels
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="table-filter-inputs">
          {/* Search box */}
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              type="text"
              placeholder="Search code, model, staff..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="table-search-input"
            />
          </div>

          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="dashboard-select"
          >
            <option value="all">All Statuses</option>
            <option value="Available">Available</option>
            <option value="InUse">In Use</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Damaged">Damaged/Broken</option>
          </select>

          {/* Condition selector */}
          <select
            value={conditionFilter}
            onChange={(e) => {
              setConditionFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="dashboard-select"
          >
            <option value="all">All Conditions</option>
            <option value="Good">Good / New</option>
            <option value="Fair">Fair</option>
            <option value="Poor">Poor</option>
            <option value="Critical">Critical</option>
          </select>

          {/* Urgent button */}
          <button
            type="button"
            onClick={() => {
              setUrgencyOnly(!urgencyOnly);
              setCurrentPage(1);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 12px",
              fontSize: "11px",
              fontWeight: 700,
              borderRadius: "8px",
              border: urgencyOnly ? "1px solid #ef4444" : "1px solid #cbd5e1",
              background: urgencyOnly ? "#ef4444" : "#ffffff",
              color: urgencyOnly ? "#ffffff" : "#475569",
              cursor: "pointer",
            }}
          >
            <AlertTriangle size={13} />
            <span>Service Required</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table className="dashboard-data-table">
          <thead>
            <tr>
              <th>Asset Code & Type</th>
              <th>Status</th>
              <th>Condition</th>
              <th>Lifetime Usage</th>
              <th>Service Cycle & Remaining Hours</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
                  No equipment records matched the criteria.
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => {
                const condStyle = getConditionColor(item.conditionLevel);
                return (
                  <tr key={item.equipmentInstanceId}>
                    {/* Asset Code & Model */}
                    <td>
                      <div style={{ fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 6, fontSize: "13px" }}>
                        <span>{item.assetCode}</span>
                        {item.isOverdue && (
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "9999px",
                              background: "#ef4444",
                              display: "inline-block",
                            }}
                          />
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: 2 }}>
                        {item.equipmentTypeName}
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`kpi-badge ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>

                    {/* Condition */}
                    <td>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: condStyle.color,
                          background: condStyle.background,
                        }}
                      >
                        {item.conditionLevel}
                      </span>
                    </td>

                    {/* Total Usage Hours */}
                    <td style={{ fontWeight: 650, color: "#1e293b", fontSize: "13px" }}>
                      {item.totalUsageHours.toLocaleString()} hrs
                    </td>

                    {/* Service Progress */}
                    <td>
                      <div className="table-progress-box">
                        <div className="table-progress-meta">
                          <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 500 }}>
                            {item.usageHoursSinceMaintenance}h / {item.effectiveMaintenanceIntervalHours}h
                          </span>
                          <strong
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: item.isOverdue
                                ? "#dc2626"
                                : item.isNearThreshold
                                ? "#d97706"
                                : "#16a34a",
                            }}
                          >
                            {item.isOverdue ? "OVERDUE" : `${item.remainingHours}h left`}
                          </strong>
                        </div>

                        <div className="table-progress-track">
                          <div
                            className="table-progress-fill"
                            style={{
                              width: `${Math.min(100, item.wearPercentage)}%`,
                              background: item.isOverdue
                                ? "#ef4444"
                                : item.isNearThreshold
                                ? "#f59e0b"
                                : "#3b82f6",
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => navigate(`/equipment?keyword=${encodeURIComponent(item.assetCode)}`)}
                        style={{
                          border: "none",
                          background: "none",
                          color: "#16a34a",
                          fontWeight: 650,
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span>View</span>
                        <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="table-pagination-bar">
        <div>
          Showing {paginatedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
          {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} equipment
        </div>

        <div className="pagination-controls">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="pagination-btn"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="pagination-page-indicator">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="pagination-btn"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
