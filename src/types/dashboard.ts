export type DashboardStatType =
  | "total-resources"
  | "utilization"
  | "active-experiments"
  | "conflicts";

export interface StatItem {
  id: string;
  title: string;
  value: string;

  subtext?: string;

  trend?: {
    value: string;
    isUp: boolean;
  };

  type: DashboardStatType;

  percentage?: number;
  conflictCount?: number;
  avatars?: string[];
}

export interface BreakdownItem {
  name: string;
  value: number;
  color: string;
}

export interface ExperimentRequest {
  id: string;
  name: string;
  priority: string;
  date: string;
  status: string;
}