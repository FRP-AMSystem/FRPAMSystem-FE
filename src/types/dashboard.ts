export type DashboardStatType =
  | "total-resources"
  | "utilization"
  | "active-experiments"
  | "conflicts"
  | "equipment-fleet"
  | "workforce-load"
  | "land-coverage"
  | "pending-approvals";

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
  actionLabel?: string;
  actionPath?: string;
  badgeText?: string;
  badgeType?: "success" | "warning" | "danger" | "info";
}

export interface BreakdownItem {
  name: string;
  value: number;
  color: string;
  count?: number;
}

export interface ExperimentRequest {
  id: string;
  name: string;
  priority: string;
  date: string;
  status: string;
}

export interface EquipmentOperatingMetric {
  equipmentInstanceId: number;
  assetCode: string;
  equipmentTypeName: string;
  status: string;
  conditionLevel: string;
  totalUsageHours: number;
  usageHoursSinceMaintenance: number;
  effectiveMaintenanceIntervalHours: number;
  remainingHours: number;
  wearPercentage: number;
  isOverdue: boolean;
  isNearThreshold: boolean;
  efficiencyRate: number;
  assignedToUserName?: string | null;
  lastMaintenanceDate?: string | null;
  nextMaintenanceDate?: string | null;
}

export interface ResourceStatusBreakdown {
  category: "Equipment" | "Personnel" | "Land";
  total: number;
  available: number;
  inUse: number;
  maintenanceOrBusy: number;
  unavailableOrDamaged: number;
  utilizationRate: number;
  items: BreakdownItem[];
}

export interface RoleWorkloadMetric {
  roleName: string;
  staffCount: number;
  totalCapacityHours: number;
  totalAssignedHours: number;
  utilizationPercent: number;
}

export interface AllocationTrendMetric {
  monthKey: string;
  month: string;
  approved: number;
  pending: number;
  draft: number;
  rejected: number;
  total: number;
  avgFitnessScore: number;
}

export interface LandUtilizationMetric {
  totalPlots: number;
  totalAreaSize: number;
  inUseAreaSize: number;
  availableAreaSize: number;
  utilizationPercent: number;
  soilTypeDistribution: {
    soilType: string;
    count: number;
    area: number;
  }[];
}

export interface DashboardOverviewData {
  stats: StatItem[];
  equipmentOperatingMetrics: EquipmentOperatingMetric[];
  resourceBreakdowns: {
    equipment: ResourceStatusBreakdown;
    personnel: ResourceStatusBreakdown;
    land: ResourceStatusBreakdown;
  };
  roleWorkloads: RoleWorkloadMetric[];
  allocationTrends: AllocationTrendMetric[];
  landUtilization: LandUtilizationMetric;
  urgentAlertsCount: number;
}