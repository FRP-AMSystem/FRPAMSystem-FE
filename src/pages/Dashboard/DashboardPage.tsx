import DashboardLayout from "../../layouts/DashboardLayout";
import StatisticCard from "./components/StatisticCard";
import LineChartCard from "./components/LineChartCard";
import BreakdownCard from "./components/BreakdownCard";
import RequestTable from "./components/RequestTable";
import {
  statsData,
  allocationTrendData,
  resourceBreakdownData,
  pendingRequestsData,
} from "./data/mockData";
import "./DashboardPage.css";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="dashboard-page-container">
        
        {/* Top Metric Cards Grid */}
        <div className="stats-grid">
          {statsData.map((stat) => (
            <StatisticCard key={stat.id} stat={stat} />
          ))}
        </div>

        {/* Middle Visualization Panels */}
        <div className="charts-grid" style={{ marginTop: "24px" }}>
          {/* Monthly Allocation Trend Area Chart */}
          <LineChartCard data={allocationTrendData} />

          {/* Resource Breakdown Donut Chart */}
          <BreakdownCard data={resourceBreakdownData} />
        </div>

        {/* Bottom Pending Requests Table Panel */}
        <div className="table-row-container" style={{ marginTop: "24px" }}>
          <RequestTable requests={pendingRequestsData} />
        </div>

        {/* Floating Action Button (FAB) matching the bottom-right green circle */}
        <button
          className="dashboard-fab"
          title="Quick Action"
          onClick={() => console.log("Future Floating Action Triggered")}
        >
          +
        </button>
        
      </div>
    </DashboardLayout>
  );
}