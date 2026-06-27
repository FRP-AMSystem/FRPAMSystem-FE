import {
  AreaChart,
  Area,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartDataPoint {
  month: string;
  load: number;
}

interface LineChartCardProps {
  data: ChartDataPoint[];
}

export default function LineChartCard({ data }: LineChartCardProps) {
  // TODO: Connect chart data to database

  return (
    <div className="dashboard-panel chart-panel">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">Monthly Allocation Trend</h3>
          <p className="panel-subtitle">Resource load distribution over 6 months</p>
        </div>
        <div className="panel-header-action">
          <button className="pill-dropdown-btn">Last 6 Months</button>
        </div>
      </div>

      <div className="chart-wrapper" style={{ height: "240px", marginTop: "16px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1B5E20" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#1B5E20" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              vertical={false}
              stroke="#F3F4F6"
              strokeDasharray="0"
            />

            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={(props) => {
                const { x, y, payload } = props;
                const isHighlighted = payload.value === "Apr";
                
                return (
                  <g transform={`translate(${x},${y})`}>
                    {isHighlighted ? (
                      // Renders the highlighted 'Apr' tag matching the mockup design
                      <g>
                        <rect
                          x="-20"
                          y="6"
                          width="40"
                          height="20"
                          rx="4"
                          fill="#E8F5E9"
                        />
                        <text
                          x="0"
                          y="20"
                          textAnchor="middle"
                          fill="#1B5E20"
                          style={{ fontSize: "11px", fontWeight: 700 }}
                        >
                          {payload.value}
                        </text>
                      </g>
                    ) : (
                      <text
                        x="0"
                        y="20"
                        textAnchor="middle"
                        fill="#9CA3AF"
                        style={{ fontSize: "11px", fontWeight: 500 }}
                      >
                        {payload.value}
                      </text>
                    )}
                  </g>
                );
              }}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div
                      style={{
                        backgroundColor: "#1F2937",
                        color: "#ffffff",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 600,
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      {payload[0].value}% Allocation
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area
              type="monotone"
              dataKey="load"
              stroke="#1B5E20"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#chartGradient)"
              activeDot={{ r: 6, fill: "#1B5E20", stroke: "#ffffff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
