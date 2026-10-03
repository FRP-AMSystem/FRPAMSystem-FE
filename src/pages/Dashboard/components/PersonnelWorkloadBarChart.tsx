import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Users } from "lucide-react";
import type { RoleWorkloadMetric } from "../../../types/dashboard";

interface PersonnelWorkloadBarChartProps {
  data: RoleWorkloadMetric[];
}

export default function PersonnelWorkloadBarChart({
  data,
}: PersonnelWorkloadBarChartProps) {
  const chartData = data.map((d) => ({
    name: d.roleName,
    assigned: d.totalAssignedHours,
    capacity: d.totalCapacityHours,
    utilization: d.utilizationPercent,
    staffCount: d.staffCount,
  }));

  // Clean Light theme custom tooltip with unified system font
  const CustomTooltip = ({ active, payload, label }: any) => {
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
            minWidth: "220px",
            fontFamily: "var(--sans, 'Inter', -apple-system, sans-serif)",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: "13.5px",
              color: "#0f172a",
              fontFamily: "var(--heading, sans-serif)",
              borderBottom: "1px solid #f1f5f9",
              paddingBottom: "8px",
              marginBottom: "10px",
            }}
          >
            Role: {label}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#64748b" }}>
              <span>Active Staff:</span>
              <strong style={{ color: "#0f172a", fontWeight: 700 }}>{d.staffCount} persons</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#64748b" }}>
              <span>Assigned Workload:</span>
              <strong style={{ color: "#2563eb", fontWeight: 700 }}>{d.assigned} hrs/day</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#64748b" }}>
              <span>Maximum Capacity:</span>
              <span style={{ color: "#475569", fontWeight: 600 }}>{d.capacity} hrs/day</span>
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
              <span style={{ color: "#64748b", fontWeight: 600 }}>Workload Ratio:</span>
              <strong
                style={{
                  color: d.utilization > 90 ? "#dc2626" : d.utilization > 75 ? "#d97706" : "#16a34a",
                  fontSize: "13.5px",
                  fontWeight: 800,
                }}
              >
                {d.utilization}%
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
          <div className="card-title-icon icon-green-soft">
            <Users size={18} />
          </div>
          <div>
            <h3 className="dashboard-card-title">
              Workforce Capacity & Role Workload
            </h3>
            <p className="dashboard-card-subtitle">
              Assigned daily hours vs maximum capacity per department / role
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: "100%", height: "280px", marginTop: "14px" }}>
        {chartData.length === 0 ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              color: "#94a3b8",
            }}
          >
            No personnel role data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 15, right: 20, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                unit="h"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                formatter={(value) => (
                  <span style={{ color: "#475569", fontSize: "11px", fontWeight: 600 }}>
                    {value === "assigned" ? "Assigned Hours/Day" : "Max Working Capacity"}
                  </span>
                )}
              />
              <Bar
                dataKey="assigned"
                name="assigned"
                fill="#3B82F6"
                barSize={20}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="capacity"
                name="capacity"
                fill="#94A3B8"
                fillOpacity={0.4}
                barSize={20}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
