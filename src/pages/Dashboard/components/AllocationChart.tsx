import { BarChart3 } from "lucide-react";

interface ChartData {
  label: string;
  value: number; // percentage
  allocated: number;
  total: number;
}

const data: ChartData[] = [
  { label: "Harvesters", value: 85, allocated: 34, total: 40 },
  { label: "Transport", value: 68, allocated: 51, total: 75 },
  { label: "Drones", value: 40, allocated: 8, total: 20 },
  { label: "Surveyors", value: 92, allocated: 11, total: 12 },
  { label: "Planting Teams", value: 75, allocated: 45, total: 60 },
  { label: "Patrol Units", value: 50, allocated: 15, total: 30 },
];

export default function AllocationChart() {
  return (
    <div className="dashboard-card chart-card">
      <div className="dashboard-card-header">
        <div>
          <h3 className="dashboard-card-title">
            <BarChart3 size={20} style={{ color: "var(--brand-primary)" }} />
            Resource Allocation Capacity
          </h3>
          <p className="dashboard-card-subtitle">
            Current active machinery and personnel deployment rate
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexGrow: 1, marginTop: "12px" }}>
        {/* Y-axis Labels */}
        <div className="chart-y-axis">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>

        {/* Bars Container */}
        <div className="chart-wrapper">
          {/* Background Grid Lines */}
          <div
            style={{
              position: "absolute",
              inset: "0 0 40px 0",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  width: "100%",
                  height: "1px",
                  background: "var(--border)",
                  opacity: 0.5,
                }}
              />
            ))}
          </div>

          {/* Bar elements */}
          {data.map((item) => (
            <div key={item.label} className="chart-bar-container" style={{ zIndex: 2 }}>
              <div
                className="chart-bar-fill"
                style={{
                  height: `${item.value}%`,
                  background:
                    item.value > 80
                      ? "linear-gradient(to top, var(--brand-primary), var(--brand-accent))"
                      : "linear-gradient(to top, #3B82F6, #60A5FA)",
                }}
              >
                <div className="chart-bar-tooltip">
                  {item.allocated} / {item.total} Units ({item.value}%)
                </div>
              </div>
              <span className="chart-bar-label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
