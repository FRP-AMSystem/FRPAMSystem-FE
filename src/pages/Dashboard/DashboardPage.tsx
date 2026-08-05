import { useState, useEffect } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import StatisticCard from "./components/StatisticCard";
import LineChartCard from "./components/LineChartCard";
import BreakdownCard from "./components/BreakdownCard";
import RequestTable from "./components/RequestTable";
import {
  allocationTrendData,
  type StatItem,
  type BreakdownItem,
  type ExperimentRequest,
} from "./data/mockData";
import { fetchLiveDashboardData } from "../../services/dashboardService";
import "./DashboardPage.css";

const initialZeroStats: StatItem[] = [
  {
    id: "stat-1",
    title: "TOTAL RESOURCES",
    value: "0",
    trend: { value: "0 Lands, 0 Machines, 0 Tool Types", isUp: false },
    type: "total-resources",
  },
  {
    id: "stat-2",
    title: "RESOURCE UTILIZATION",
    value: "0%",
    subtext: "No utilization data",
    percentage: 0,
    type: "utilization",
  },
  {
    id: "stat-3",
    title: "ACTIVE USERS & STAFF",
    value: "0",
    avatars: [],
    type: "active-experiments",
  },
  {
    id: "stat-4",
    title: "SYSTEM ALERTS",
    value: "Clear",
    conflictCount: 0,
    type: "conflicts",
  },
];

const initialZeroBreakdown: BreakdownItem[] = [
  { name: "Equipment & Tools", value: 0, color: "#16A34A" },
  { name: "Personnel", value: 0, color: "#15803D" },
  { name: "Land Plots", value: 0, color: "#86EFAC" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<StatItem[]>(initialZeroStats);
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>(initialZeroBreakdown);
  const [requests, setRequests] = useState<ExperimentRequest[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const liveData = await fetchLiveDashboardData();
        if (isMounted) {
          setStats(liveData.stats);
          setBreakdown(liveData.resourceBreakdown);
          setRequests(liveData.recentRequests);
        }
      } catch (err) {
        console.warn("Error fetching live dashboard metrics:", err);
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="dashboard-page-container">
        
        {/* Top Metric Cards Grid */}
        <div className="stats-grid">
          {stats.map((stat) => (
            <StatisticCard key={stat.id} stat={stat} />
          ))}
        </div>

        {/* Middle Visualization Panels */}
        <div className="charts-grid">
          {/* Monthly Allocation Trend Area Chart */}
          <LineChartCard data={allocationTrendData} />

          {/* Resource Breakdown Donut Chart */}
          <BreakdownCard data={breakdown} />
        </div>

        {/* Bottom Pending Requests Table Panel */}
        <div className="table-row-container">
          <RequestTable requests={requests} />
        </div>

        {/* Floating Action Button (FAB) */}
        <button
          className="dashboard-fab"
          title="Quick Action"
          onClick={() => window.location.href = "/resources"}
        >
          +
        </button>
        
      </div>
    </DashboardLayout>
  );
}