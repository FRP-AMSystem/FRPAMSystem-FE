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

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 16, right: 16, left: 16, bottom: 16 }}
          >
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
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
                          fill="var(--accent-bg)"
                        />
                        <text
                          x="0"
                          y="20"
                          textAnchor="middle"
                          fill="var(--accent)"
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
                        fill="var(--text)"
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
                        backgroundColor: "var(--card-bg)",
                        color: "var(--text-h)",
                        border: "1px solid var(--border)",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 600,
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
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
              stroke="var(--accent)"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#chartGradient)"
              activeDot={{ r: 6, fill: "var(--accent)", stroke: "var(--card-bg)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
