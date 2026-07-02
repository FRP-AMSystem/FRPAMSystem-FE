import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../../layouts/DashboardLayout";
import StatisticCard from "./components/StatisticCard";
import LineChartCard from "./components/LineChartCard";
import BreakdownCard from "./components/BreakdownCard";
import RequestTable from "./components/RequestTable";

import type { AllocationPlan } from "../../types/allocationPlan";
import { getAllocationPlans } from "../../services/allocationPlanService";

import {
  allocationTrendData,
  resourceBreakdownData,
} from "./data/mockData";

import "./DashboardPage.css";

type Role = "Manager" | "Researcher" | "Technician" | "Student";

type DashboardStat = {
  id: string;
  title: string;
  value: string;
  subtext?: string;
  trend?: {
    value: string;
    isUp: boolean;
  };
  type: "total-resources" | "utilization" | "active-experiments" | "conflicts";
  percentage?: number;
  conflictCount?: number;
  avatars?: string[];
};

export default function DashboardPage() {
  const navigate = useNavigate();

  const role = (localStorage.getItem("role") || "Student") as Role;
  const fullName = localStorage.getItem("fullName") || "User";

  const [allocationPlans, setAllocationPlans] = useState<AllocationPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllocationPlans = async () => {
      try {
        const data = await getAllocationPlans();
        setAllocationPlans(data);
      } catch (error) {
        console.error("Failed to fetch allocation plans:", error);
        setAllocationPlans([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllocationPlans();
  }, []);

  const totalPlans = allocationPlans.length;

  const approvedPlans = allocationPlans.filter(
    (plan) => plan.approveStatus === "Approved"
  ).length;

  const pendingPlans = allocationPlans.filter(
    (plan) => plan.approveStatus === "Pending"
  ).length;

  const averageFitness =
    totalPlans > 0
      ? Number(
        (
          allocationPlans.reduce(
            (sum, plan) => sum + plan.fitnessScore,
            0
          ) / totalPlans
        ).toFixed(1)
      )
      : 0;

  const managerStats: DashboardStat[] = [
    {
      id: "1",
      title: "Total Plans",
      value: String(totalPlans),
      trend: { value: "+12% from last month", isUp: true },
      type: "total-resources",
    },
    {
      id: "2",
      title: "Average Fitness",
      value: `${averageFitness}%`,
      subtext: "Resource utilization score",
      percentage: averageFitness,
      type: "utilization",
    },
    {
      id: "3",
      title: "Approved Plans",
      value: String(approvedPlans),
      avatars: ["", "", `+${approvedPlans}`],
      type: "active-experiments",
    },
    {
      id: "4",
      title: "Pending Plans",
      value: String(pendingPlans),
      conflictCount: pendingPlans,
      type: "conflicts",
    },
  ];

  const researcherStats: DashboardStat[] = [
    {
      id: "1",
      title: "My Allocations",
      value: String(totalPlans),
      trend: { value: "+4% this week", isUp: true },
      type: "total-resources",
    },
    {
      id: "2",
      title: "Average Fitness",
      value: `${averageFitness}%`,
      subtext: "Experiment allocation score",
      percentage: averageFitness,
      type: "utilization",
    },
    {
      id: "3",
      title: "Approved Allocations",
      value: String(approvedPlans),
      avatars: ["", "", `+${approvedPlans}`],
      type: "active-experiments",
    },
    {
      id: "4",
      title: "Pending Review",
      value: String(pendingPlans),
      conflictCount: pendingPlans,
      type: "conflicts",
    },
  ];

  const technicianStats: DashboardStat[] = [
    {
      id: "1",
      title: "Assigned Plans",
      value: String(totalPlans),
      trend: { value: "+5% this week", isUp: true },
      type: "total-resources",
    },
    {
      id: "2",
      title: "Equipment Tasks",
      value: String(
        allocationPlans.reduce(
          (sum, plan) => sum + plan.equipmentDetailCount,
          0
        )
      ),
      subtext: "Equipment usage",
      percentage: 70,
      type: "utilization",
    },
    {
      id: "3",
      title: "Schedules",
      value: String(
        allocationPlans.reduce((sum, plan) => sum + plan.scheduleCount, 0)
      ),
      avatars: ["", "", "+2"],
      type: "active-experiments",
    },
    {
      id: "4",
      title: "Pending Tasks",
      value: String(pendingPlans),
      conflictCount: pendingPlans,
      type: "conflicts",
    },
  ];

  const studentStats: DashboardStat[] = [
    {
      id: "1",
      title: "Assigned Experiments",
      value: String(totalPlans),
      trend: { value: "+3% this week", isUp: true },
      type: "total-resources",
    },
    {
      id: "2",
      title: "Average Result",
      value: `${averageFitness}%`,
      subtext: "Learning and experiment progress",
      percentage: averageFitness,
      type: "utilization",
    },
    {
      id: "3",
      title: "Completed Tasks",
      value: String(approvedPlans),
      avatars: ["", "", `+${approvedPlans}`],
      type: "active-experiments",
    },
    {
      id: "4",
      title: "Pending Tasks",
      value: String(pendingPlans),
      conflictCount: pendingPlans,
      type: "conflicts",
    },
  ];

  const getStatsByRole = (): DashboardStat[] => {
    switch (role) {
      case "Manager":
        return managerStats;
      case "Researcher":
        return researcherStats;
      case "Technician":
        return technicianStats;
      case "Student":
        return studentStats;
      default:
        return studentStats;
    }
  };

  const renderRoleTitle = () => {
    switch (role) {
      case "Manager":
        return "Manager Dashboard";
      case "Researcher":
        return "Researcher Dashboard";
      case "Technician":
        return "Technician Dashboard";
      case "Student":
        return "Student Dashboard";
      default:
        return "Dashboard";
    }
  };

  const renderRoleDescription = () => {
    switch (role) {
      case "Manager":
        return "Manage allocation plans, approvals, resources, and operational performance.";
      case "Researcher":
        return "Track experiments and allocation approval progress.";
      case "Technician":
        return "View assigned equipment, schedules, and operational tasks.";
      case "Student":
        return "View assigned experiments, schedules, and learning results.";
      default:
        return "Welcome to the forestry planning system.";
    }
  };

  return (
    <DashboardLayout>
      <div className="dashboard-page-container">
        <div className="dashboard-header">
          <div>
            <h1>{renderRoleTitle()}</h1>
            <p>
              Welcome back, {fullName}. {renderRoleDescription()}
            </p>
          </div>

          {role === "Manager" && (
            <button
              className="dashboard-create-btn"
              onClick={() => navigate("/allocation/create")}
            >
              + Create Allocation
            </button>
          )}
        </div>

        <div className="stats-grid">
          {getStatsByRole().map((stat) => (
            <StatisticCard key={stat.id} stat={stat} />
          ))}
        </div>

        {role === "Manager" && (
          <div className="charts-grid">
            <LineChartCard data={allocationTrendData} />
            <BreakdownCard data={resourceBreakdownData} />
          </div>
        )}

        {role === "Researcher" && (
          <div className="role-section-card">
            <h3>Researcher Workspace</h3>
            <p>
              You can view allocation results related to experiments and track
              approval status. You do not have permission to approve, reject, or
              delete allocation plans.
            </p>

            <button onClick={() => navigate("/allocation")}>
              View My Allocations
            </button>
          </div>
        )}

        {role === "Technician" && (
          <div className="role-section-card">
            <h3>Technician Workspace</h3>
            <p>
              You can view assigned equipment, schedules, and resource usage
              information for approved plans.
            </p>

            <button onClick={() => navigate("/equipment")}>
              View Equipment
            </button>
          </div>
        )}

        {role === "Student" && (
          <div className="role-section-card">
            <h3>Student Workspace</h3>
            <p>
              You can view assigned experiments, schedules, and allocation
              results. Your account is read-only.
            </p>

            <button onClick={() => navigate("/results")}>
              View Results
            </button>
          </div>
        )}

        {role === "Manager" && (
          <div className="table-row-container">
            {loading ? (
              <p>Loading allocation plans...</p>
            ) : (
              <RequestTable requests={allocationPlans} />
            )}
          </div>
        )}

        {role === "Manager" && (
          <button
            className="dashboard-fab"
            title="Create Allocation"
            onClick={() => navigate("/allocation/create")}
          >
            +
          </button>
        )}
      </div>
    </DashboardLayout>
  );
}