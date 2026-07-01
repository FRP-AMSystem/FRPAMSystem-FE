import { useEffect, useState } from "react";

import DashboardLayout from "../../layouts/DashboardLayout";
import StatisticCard from "./components/StatisticCard";
import LineChartCard from "./components/LineChartCard";
import BreakdownCard from "./components/BreakdownCard";
import RequestTable from "./components/RequestTable";

import { getAllocationPlans } from "../../services/allocationPlanService";
import type { AllocationPlan } from "../../types/allocationPlan";

import {
  statsData,
  allocationTrendData,
  resourceBreakdownData,
} from "./data/mockData";

import "./DashboardPage.css";

export default function DashboardPage() {
  const [allocationPlans, setAllocationPlans] = useState<AllocationPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllocationPlans = async () => {
      try {
        const data = await getAllocationPlans();
        setAllocationPlans(data.items);
      } catch (error) {
        console.error("Failed to fetch allocation plans:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllocationPlans();
  }, []);

  return (
    <DashboardLayout>
      <div className="dashboard-page-container">
        <div className="stats-grid">
          {statsData.map((stat) => (
            <StatisticCard key={stat.id} stat={stat} />
          ))}
        </div>

        <div className="charts-grid">
          <LineChartCard data={allocationTrendData} />
          <BreakdownCard data={resourceBreakdownData} />
        </div>

        <div className="table-row-container">
          {loading ? (
            <p>Loading allocation plans...</p>
          ) : (
            <RequestTable requests={allocationPlans} />
          )}
        </div>

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