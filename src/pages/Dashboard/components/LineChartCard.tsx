import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ChartDataPoint {
  month: string;
  load: number;
}

interface LineChartCardProps {
  data: ChartDataPoint[];
}

export default function LineChartCard({ data }: LineChartCardProps) {
  const totalPlans = data.reduce((sum, item) => sum + item.load, 0);

  return (
    <div className="dashboard-panel chart-panel">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">Monthly Allocation Trend</h3>

          <p className="panel-subtitle">
            {totalPlans} allocation {totalPlans === 1 ? "plan" : "plans"}{" "}
            created in the last 6 months
          </p>
        </div>

        <div className="panel-header-action">
          <span className="pill-dropdown-btn">Last 6 Months</span>
        </div>
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 16,
              right: 16,
              left: 0,
              bottom: 16,
            }}
          >
            <defs>
              <linearGradient
                id="allocationChartGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} stroke="#E5E7EB" />

            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "#6B7280",
                fontSize: 11,
              }}
            />

            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              width={28}
              tick={{
                fill: "#9CA3AF",
                fontSize: 11,
              }}
            />

            <Tooltip
              formatter={(value) => [`${Number(value)} plans`, "Allocations"]}
              labelFormatter={(label) => `Month: ${label}`}
              contentStyle={{
                border: "none",
                borderRadius: "8px",
                background: "#1F2937",
                color: "#ffffff",
                fontSize: "12px",
              }}
            />

            <Area
              type="monotone"
              dataKey="load"
              stroke="#16a34a"
              strokeWidth={2.5}
              fill="url(#allocationChartGradient)"
              activeDot={{
                r: 6,
                fill: "#16a34a",
                stroke: "#ffffff",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}