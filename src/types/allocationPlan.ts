export type AllocationPlanStatus =
  | "Draft"
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Cancelled";

export interface AllocationPlan {
  allocationPlanId: number;
  experimentId: number;
  experimentName: string;

  fitnessScore: number | null;

  createdBy: number;
  createdByName: string;

  approveBy: number | null;
  approveByName: string | null;

  approveStatus: AllocationPlanStatus;

  approvedAt: string | null;
  createdAt: string;
  updatedAt: string | null;

  landDetailCount: number;
  equipmentDetailCount: number;
  humanDetailCount: number;
  scheduleCount: number;
}

export interface AllocationPlanRequest {
  experimentId: number;
  fitnessScore: number | null;
  approveStatus: AllocationPlanStatus;
}

export interface AllocationPlanFilter {
  keyword?: string;
  experimentId?: number;
  createdBy?: number;
  approveBy?: number;
  approveStatus?: AllocationPlanStatus;

  minFitnessScore?: number;
  maxFitnessScore?: number;

  createdFrom?: string;
  createdTo?: string;

  approvedFrom?: string;
  approvedTo?: string;

  page?: number;
  size?: number;
}

export interface AllocationPlanPage {
  size: number;
  page: number;
  total: number;
  totalPages: number;
  items: AllocationPlan[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export type AllocationPlanListResponse =
  | AllocationPlan[]
  | AllocationPlanPage
  | ApiResponse<AllocationPlan[]>
  | ApiResponse<AllocationPlanPage>;

export type AllocationPlanDetailResponse =
  | AllocationPlan
  | ApiResponse<AllocationPlan>;