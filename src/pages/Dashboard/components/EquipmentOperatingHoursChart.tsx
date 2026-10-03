import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";
import { AlertTriangle, CheckCircle, Clock, Wrench } from "lucide-react";
import type { EquipmentOperatingMetric } from "../../../types/dashboard";

interface EquipmentOperatingHoursChartProps {
  data: EquipmentOperatingMetric[];
  onSelectEquipment?: (equipmentId: number) => void;
}

export default function EquipmentOperatingHoursChart({
  data,
  onSelectEquipment,
}: EquipmentOperatingHoursChartProps) {
  const [displayCount, setDisplayCount] = useState<"5" | "10" | "all">("10");
  const [filterCondition, setFilterCondition] = useState<string>("all");

  const filteredData = useMemo(() => {
    let list = [...data];

    if (filterCondition !== "all") {
      list = list.filter((item) => {
        if (filterCondition === "urgent") {
          return item.isOverdue || item.isNearThreshold;
        }
        if (filterCondition === "inUse") {
          return item.status === "InUse" || item.status === "Operating";
        }
        if (filterCondition === "maintenance") {
          return item.status === "Maintenance";
        }
        return true;
      });
    }

    if (displayCount === "5") return list.slice(0, 5);
    if (displayCount === "10") return list.slice(0, 10);
    return list.slice(0, 20);
  }, [data, displayCount, filterCondition]);

  const urgentCount = useMemo(
    () => data.filter((d) => d.isOverdue || d.isNearThreshold).length,
    [data]
  );

  const avgWear = useMemo(() => {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, curr) => acc + curr.wearPercentage, 0);
    return Math.round(sum / data.length);
  }, [data]);

  const chartData = useMemo(() => {
    return filteredData.map((item) => ({
      name: item.assetCode,
      fullName: `${item.assetCode} (${item.equipmentTypeName})`,
      equipmentInstanceId: item.equipmentInstanceId,
      usedHours: item.usageHoursSinceMaintenance,
      remainingHours: item.remainingHours,
      interval: item.effectiveMaintenanceIntervalHours,
      totalHours: item.totalUsageHours,
      wearPercentage: item.wearPercentage,
      isOverdue: item.isOverdue,
      isNearThreshold: item.isNearThreshold,
      status: item.status,
      condition: item.conditionLevel,
    }));
  }, [filteredData]);

  // Light theme custom tooltip with system font (no monospace typewriter font)
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div
          style={{
            background: "#ffffff",
            color: "#0f172a",
            padding: "14px 16px",
            borderRadius: "14px",
            boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.14), 0 8px 10px -6px rgba(15, 23, 42, 0.08)",
            border: "1px solid #e2e8f0",
            fontSize: "12.5px",
            minWidth: "260px",
            fontFamily: "var(--sans, 'Inter', -apple-system, sans-serif)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #f1f5f9",
              paddingBottom: "8px",
              marginBottom: "10px",
              gap: "8px",
            }}
          >
            <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px", fontFamily: "var(--heading, sans-serif)" }}>
              {d.fullName}
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "9999px",
                whiteSpace: "nowrap",
                background: d.isOverdue
                  ? "#fef2f2"
                  : d.isNearThreshold
                    ? "#fffbeb"
                    : "#f0fdf4",
                color: d.isOverdue ? "#b91c1c" : d.isNearThreshold ? "#b45309" : "#15803d",
                border: `1px solid ${d.isOverdue ? "#fecaca" : d.isNearThreshold ? "#fde68a" : "#bbf7d0"
                  }`,
              }}
            >
              {d.isOverdue
                ? "OVERDUE SERVICE"
                : d.isNearThreshold
                  ? "NEAR THRESHOLD"
                  : "HEALTHY"}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
              <span>Hours since last service:</span>
              <strong style={{ color: "#d97706", fontWeight: 700 }}>{d.usedHours} hrs</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
              <span>Safe remaining hours:</span>
              <strong
                style={{
                  color: d.isOverdue ? "#dc2626" : "#16a34a",
                  fontWeight: 700,
                }}
              >
                {d.remainingHours} hrs
              </strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
              <span>Maintenance interval:</span>
              <span style={{ color: "#334155", fontWeight: 600 }}>{d.interval} hrs</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
              <span>Lifetime total hours:</span>
              <span style={{ color: "#2563eb", fontWeight: 600 }}>{d.totalHours} hrs</span>
            </div>

            <div
              style={{
                marginTop: "6px",
                paddingTop: "8px",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ color: "#64748b", fontWeight: 600 }}>Wear & Tear Cycle:</span>
              <strong
                style={{
                  color: d.isOverdue ? "#dc2626" : d.isNearThreshold ? "#d97706" : "#16a34a",
                  fontSize: "13px",
                  fontWeight: 800,
                }}
              >
                {d.wearPercentage}%
              </strong>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard-card" style={{ height: "100%" }}>
      {/* Header */}
      <div className="dashboard-card-header">
        <div className="card-title-group">
          <div className="card-title-icon icon-amber-soft">
            <Wrench size={18} />
          </div>
          <div>
            <h3 className="dashboard-card-title">
              Equipment Operating Lifespan & Service Threshold
            </h3>
            <p className="dashboard-card-subtitle">
              Hours used vs safe remaining hours before scheduled maintenance
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <div className="dashboard-filter-btn-group">
            <button
              type="button"
              onClick={() => setFilterCondition("all")}
              className={`dashboard-chip-btn ${filterCondition === "all" ? "active" : ""}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterCondition("urgent")}
              className={`dashboard-chip-btn ${filterCondition === "urgent" ? "urgent-active" : ""
                }`}
            >
              <AlertTriangle size={12} />
              <span>Urgent ({urgentCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterCondition("inUse")}
              className={`dashboard-chip-btn ${filterCondition === "inUse" ? "active" : ""}`}
            >
              In Use
            </button>
          </div>

          <select
            value={displayCount}
            onChange={(e) => setDisplayCount(e.target.value as "5" | "10" | "all")}
            className="dashboard-select"
          >
            <option value="5">Top 5</option>
            <option value="10">Top 10</option>
            <option value="all">Top 20</option>
          </select>
        </div>
      </div>

      {/* Summary Micro-Badges */}
      <div className="dashboard-micro-summary">
        <div className="micro-summary-item">
          <div className="micro-label">
            <Clock size={14} style={{ color: "#3b82f6" }} />
            <span>Average Fleet Wear</span>
          </div>
          <div className="micro-val">{avgWear}%</div>
          <div className="micro-sub">Across active machinery</div>
        </div>

        <div className="micro-summary-item micro-item-urgent">
          <div className="micro-label" style={{ color: "#b91c1c" }}>
            <AlertTriangle size={14} style={{ color: "#ef4444" }} />
            <span>Maintenance Urgency</span>
          </div>
          <div className="micro-val" style={{ color: "#b91c1c" }}>
            {urgentCount} Units
          </div>
          <div className="micro-sub" style={{ color: "#dc2626" }}>
            Need service soon/now
          </div>
        </div>

        <div className="micro-summary-item micro-item-success">
          <div className="micro-label" style={{ color: "#15803d" }}>
            <CheckCircle size={14} style={{ color: "#16a34a" }} />
            <span>Optimal Machinery</span>
          </div>
          <div className="micro-val" style={{ color: "#15803d" }}>
            {Math.max(0, data.length - urgentCount)} Units
          </div>
          <div className="micro-sub" style={{ color: "#16a34a" }}>
            &gt; 25% safe hours left
          </div>
        </div>
      </div>

      {/* Recharts Container with generous left width for full names */}
      <div style={{ width: "100%", height: "290px", marginTop: "8px" }}>
        {chartData.length === 0 ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
            }}
          >
            <CheckCircle size={32} style={{ color: "#cbd5e1", marginBottom: 8 }} />
            <p style={{ fontSize: "12px" }}>No equipment matching the selected filter</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} horizontal={false} />
              <XAxis
                type="number"
                unit="h"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "#334155", fontWeight: 650 }}
                width={115}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                formatter={(value) => (
                  <span style={{ color: "#475569", fontSize: "11px", fontWeight: 600 }}>
                    {value === "usedHours" ? "Hours Used Since Service" : "Safe Remaining Hours"}
                  </span>
                )}
              />
              <Bar
                dataKey="usedHours"
                name="usedHours"
                stackId="a"
                radius={[0, 0, 0, 0]}
                onClick={(item) => {
                  if (item?.payload?.equipmentInstanceId) {
                    onSelectEquipment?.(item.payload.equipmentInstanceId);
                  }
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`used-${index}`}
                    fill={entry.isOverdue ? "#EF4444" : entry.isNearThreshold ? "#F59E0B" : "#3B82F6"}
                  />
                ))}
              </Bar>
              <Bar
                dataKey="remainingHours"
                name="remainingHours"
                stackId="a"
                fill="#10B981"
                fillOpacity={0.7}
                radius={[0, 4, 4, 0]}
                onClick={(item) => {
                  if (item?.payload?.equipmentInstanceId) {
                    onSelectEquipment?.(item.payload.equipmentInstanceId);
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
