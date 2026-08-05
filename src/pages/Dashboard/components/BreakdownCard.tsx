import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface BreakdownItem {
  name: string;
  value: number;
  color: string;
}

interface BreakdownCardProps {
  data: BreakdownItem[];
}

export default function BreakdownCard({ data }: BreakdownCardProps) {
  // Calculate dynamic total percentage from actual data props
  const totalPercentage = Math.min(
    100,
    data.reduce((acc, item) => acc + (item.value || 0), 0)
  );

  return (
    <div className="dashboard-panel breakdown-panel">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">Resource Breakdown</h3>
        </div>
      </div>

      {/* Donut chart area */}
      <div className="donut-container">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Donut Center Text */}
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
              color: "var(--text-h)",
              lineHeight: 1,
            }}
          >
            {totalPercentage > 0 ? `${totalPercentage}%` : "0%"}
          </span>
          <span style={{ fontSize: "11px", color: "var(--text)", fontWeight: 500, marginTop: "4px" }}>
            Total
          </span>
        </div>
      </div>

      {/* Categories list */}
      <div className="breakdown-list" style={{ marginTop: "16px" }}>
        {data.map((item) => (
          <div
            key={item.name}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 0",
              borderTop: "1px solid var(--border)",
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
              <span style={{ fontSize: "13.5px", fontWeight: 500, color: "var(--text)" }}>
                {item.name}
              </span>
            </div>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-h)" }}>
              {item.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
