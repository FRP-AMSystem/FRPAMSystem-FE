import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface BreakdownItem {
  name: string;
  value: number;
  color: string;
}

interface BreakdownCardProps {
  data: BreakdownItem[];
}

export default function BreakdownCard({ data }: BreakdownCardProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const getPercentage = (value: number): number => {
    if (total <= 0) {
      return 0;
    }

    return Number(((value / total) * 100).toFixed(1));
  };

  const chartData =
    total > 0
      ? data
      : [
          {
            name: "No resources",
            value: 1,
            color: "#E5E7EB",
          },
        ];

  return (
    <div className="dashboard-panel breakdown-panel">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">Resource Breakdown</h3>
          <p className="panel-subtitle">Allocated resource detail records</p>
        </div>
      </div>

      <div className="donut-container">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={70}
              paddingAngle={total > 0 ? 2 : 0}
              dataKey="value"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>

            {total > 0 && (
              <Tooltip
                formatter={(value) => [Number(value), "Resources"]}
              />
            )}
          </PieChart>
        </ResponsiveContainer>

        <div
          style={{
            position: "absolute",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "#111827",
              lineHeight: 1,
            }}
          >
            {total}
          </span>
          <span
            style={{
              marginTop: "4px",
              color: "#6B7280",
              fontSize: "11px",
              fontWeight: 500,
            }}
          >
            Total
          </span>
        </div>
      </div>

      <div className="breakdown-list" style={{ marginTop: "16px" }}>
        {data.map((item) => (
          <div
            key={item.name}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 0",
              borderTop: "1px solid #F3F4F6",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: item.color,
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  color: "#4B5563",
                  fontSize: "13.5px",
                  fontWeight: 500,
                }}
              >
                {item.name}
              </span>
            </div>
            <span
              style={{
                color: "#111827",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              {item.value}{" "}
              <small style={{ color: "#6B7280", fontWeight: 500 }}>
                ({getPercentage(item.value)}%)
              </small>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}