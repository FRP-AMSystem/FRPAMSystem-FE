import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { TrendingUp, Sparkles, CheckCircle2 } from "lucide-react";
import type { AllocationTrendMetric } from "../../../types/dashboard";

interface AllocationTrendComposedChartProps {
  data: AllocationTrendMetric[];
}

export default function AllocationTrendComposedChart({
  data,
}: AllocationTrendComposedChartProps) {
  const totalPlans = useMemo(() => data.reduce((acc, curr) => acc + curr.total, 0), [data]);
  const totalApproved = useMemo(() => data.reduce((acc, curr) => acc + curr.approved, 0), [data]);
  const approvalRate = totalPlans > 0 ? Math.round((totalApproved / totalPlans) * 100) : 0;

  const avgFitness = useMemo(() => {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, curr) => acc + curr.avgFitnessScore, 0);
    return Math.round(sum / data.length);
  }, [data]);

  // Clean Light theme custom tooltip with unified system font
  const CustomTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
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
            Month: {label}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#64748b" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <span style={{ width: 8, height: 8, borderRadius: "9999px", background: "#10b981", display: "inline-block" }} />
                Approved Plans:
              </span>
              <strong style={{ color: "#16a34a", fontWeight: 700 }}>{p.approved}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#64748b" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <span style={{ width: 8, height: 8, borderRadius: "9999px", background: "#f59e0b", display: "inline-block" }} />
                Pending Review:
              </span>
              <strong style={{ color: "#d97706", fontWeight: 700 }}>{p.pending}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#64748b" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <span style={{ width: 8, height: 8, borderRadius: "9999px", background: "#94a3b8", display: "inline-block" }} />
                Draft Plans:
              </span>
              <span style={{ color: "#475569", fontWeight: 600 }}>{p.draft}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#64748b" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <span style={{ width: 8, height: 8, borderRadius: "9999px", background: "#ef4444", display: "inline-block" }} />
                Rejected:
              </span>
              <span style={{ color: "#dc2626", fontWeight: 600 }}>{p.rejected}</span>
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
              <span style={{ color: "#7e22ce", display: "flex", alignItems: "center", gap: "5px", fontWeight: 650 }}>
                <Sparkles size={13} /> AI Fitness Score:
              </span>
              <strong style={{ color: "#7e22ce", fontSize: "13.5px", fontWeight: 800 }}>
                {p.avgFitnessScore}%
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
          <div className="card-title-icon icon-blue-soft">
            <TrendingUp size={18} />
          </div>
          <div>
            <h3 className="dashboard-card-title">
              Allocation Plan Volume & AI Fitness Trend
            </h3>
            <p className="dashboard-card-subtitle">
              6-Month historical planning throughput and genetic algorithm optimization scores
            </p>
          </div>
        </div>

        {/* Highlight Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              background: "#f0fdf4",
              color: "#15803d",
              borderRadius: "8px",
              fontSize: "11px",
              fontWeight: 700,
              border: "1px solid #bbf7d0",
            }}
          >
            <CheckCircle2 size={13} />
            <span>{approvalRate}% Approval</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              background: "#faf5ff",
              color: "#7e22ce",
              borderRadius: "8px",
              fontSize: "11px",
              fontWeight: 700,
              border: "1px solid #e9d5ff",
            }}
          >
            <Sparkles size={13} />
            <span>{avgFitness}% Fitness Score Average</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: "100%", height: "280px", marginTop: "14px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 15, right: 20, bottom: 5, left: -10 }}>
            <defs>
              <linearGradient id="approvedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            {/* Left Y Axis: Volume */}
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            {/* Right Y Axis: AI Fitness Score (0-100%) */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              unit="%"
              tick={{ fontSize: 10, fill: "#8b5cf6" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTrendTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
              formatter={(value) => {
                const map: Record<string, string> = {
                  approved: "Approved Plans",
                  pending: "Pending Review",
                  draft: "Drafts",
                  avgFitnessScore: "AI Fitness Score (%)",
                };
                return <span style={{ color: "#475569", fontSize: "11px", fontWeight: 600 }}>{map[value] || value}</span>;
              }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="approved"
              fill="url(#approvedGradient)"
              stroke="#10B981"
              strokeWidth={2}
            />
            <Bar
              yAxisId="left"
              dataKey="pending"
              fill="#F59E0B"
              barSize={18}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="left"
              dataKey="draft"
              fill="#94A3B8"
              barSize={14}
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgFitnessScore"
              stroke="#8B5CF6"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#8B5CF6", strokeWidth: 1.5, stroke: "#fff" }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
