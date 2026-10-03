import React from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from "recharts";
import type { FitnessBreakdown } from "../../../types/aiSuggestion";

interface AIRadarChartProps {
  breakdown?: FitnessBreakdown;
  finalScore?: number;
}

export const AIRadarChart: React.FC<AIRadarChartProps> = ({
  breakdown,
  finalScore = 0,
}) => {
  const landScore = breakdown?.landScore ?? breakdown?.land?.finalScore ?? 0;
  const humanScore = breakdown?.humanScore ?? breakdown?.human?.finalScore ?? 0;
  const equipmentScore = breakdown?.equipmentScore ?? breakdown?.equipment?.finalScore ?? 0;
  const maintenanceScore =
    breakdown?.maintenanceScore ?? breakdown?.maintenance?.finalScore ?? 100;

  const data = [
    {
      subject: "Đất đai (Land 20%)",
      score: Math.min(100, Math.max(0, landScore)),
      fullMark: 100,
      color: "#10b981",
    },
    {
      subject: "Nhân sự (Human 25%)",
      score: Math.min(100, Math.max(0, humanScore)),
      fullMark: 100,
      color: "#8b5cf6",
    },
    {
      subject: "Thiết bị (Equipment 40%)",
      score: Math.min(100, Math.max(0, equipmentScore)),
      fullMark: 100,
      color: "#0284c7",
    },
    {
      subject: "Bảo trì (Maint 15%)",
      score: Math.min(100, Math.max(0, maintenanceScore)),
      fullMark: 100,
      color: "#f59e0b",
    },
  ];

  return (
    <div className="ai-radar-container">
      <div className="ai-radar-header">
        <div>
          <h4 className="ai-radar-title">Độ Cân Bằng 4 Trụ Cột Đánh Giá</h4>
          <p className="ai-radar-subtitle">
            Phân bổ điểm số theo trọng số tối ưu hóa Genetic Algorithm
          </p>
        </div>
        <div className="ai-radar-score-badge">
          <span className="label">Fitness</span>
          <span className="val">{finalScore.toFixed(1)}/100</span>
        </div>
      </div>

      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "#334155", fontSize: 11.5, fontWeight: 600 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              stroke="#cbd5e1"
            />
            <Radar
              name="Điểm đạt được"
              dataKey="score"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.35}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div
                      style={{
                        background: "#0f172a",
                        color: "#fff",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)",
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: "4px" }}>
                        {item.subject}
                      </div>
                      <div style={{ color: "#34d399", fontWeight: 600 }}>
                        Điểm số: {item.score.toFixed(1)} / 100
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AIRadarChart;
