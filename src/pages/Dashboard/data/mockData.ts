export interface StatItem {
  id: string;
  title: string;
  value: string;
  subtext?: string;
  trend?: {
    value: string;
    isUp: boolean;
  };
  type: "total-resources" | "utilization" | "active-experiments" | "conflicts";
  percentage?: number; // for utilization progress bar
  conflictCount?: number;
  avatars?: string[];
}

export interface ChartDataPoint {
  month: string;
  load: number;
}

export interface BreakdownItem {
  name: string;
  value: number;
  color: string;
}

export interface ExperimentRequest {
  id: string;
  name: string;
  priority: "URGENT" | "MEDIUM" | "LOW";
  date: string;
  status: "Pending Review" | "Review Started" | "Pending";
}

export const statsData: StatItem[] = [
  {
    id: "stat-1",
    title: "TOTAL RESOURCES",
    value: "450+",
    trend: { value: "12% increase from last quarter", isUp: true },
    type: "total-resources",
  },
  {
    id: "stat-2",
    title: "RESOURCE UTILIZATION",
    value: "88%",
    subtext: "Optimal Performance",
    percentage: 88,
    type: "utilization",
  },
  {
    id: "stat-3",
    title: "ACTIVE EXPERIMENTS",
    value: "12",
    avatars: ["👤", "👤", "+10"], // represents active operators/researchers avatars
    type: "active-experiments",
  },
  {
    id: "stat-4",
    title: "CONFLICT ALERTS",
    value: "3 High",
    type: "conflicts",
    conflictCount: 3,
  },
];

export const allocationTrendData: ChartDataPoint[] = [
  { month: "Jan", load: 25 },
  { month: "Feb", load: 22 },
  { month: "Mar", load: 45 },
  { month: "Apr", load: 30 },
  { month: "May", load: 88 },
  { month: "Jun", load: 65 },
];

export const resourceBreakdownData: BreakdownItem[] = [
  { name: "Equipment", value: 45, color: "#1B5E20" },   // dark green
  { name: "Personnel", value: 30, color: "#556B2F" },   // olive green
  { name: "Land Plots", value: 15, color: "#A9DFBF" },  // light green
];

export const pendingRequestsData: ExperimentRequest[] = [
  {
    id: "EXP-2024-089",
    name: "High-Altitude Sapling Resilience",
    priority: "URGENT",
    date: "Oct 24, 2023",
    status: "Pending Review",
  },
  {
    id: "EXP-2024-092",
    name: "Soil pH Neutralization Pilot",
    priority: "MEDIUM",
    date: "Oct 26, 2023",
    status: "Review Started",
  },
  {
    id: "EXP-2024-095",
    name: "Drought-Resistant Conifer Study",
    priority: "LOW",
    date: "Oct 27, 2023",
    status: "Pending",
  },
  {
    id: "EXP-2024-101",
    name: "Canopy Density Lidar Analysis",
    priority: "MEDIUM",
    date: "Oct 28, 2023",
    status: "Pending",
  },
];
