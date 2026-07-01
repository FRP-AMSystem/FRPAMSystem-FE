export interface AllocationPlan {
  allocationPlanId: number;
  experimentId: number;
  experimentName: string;
  fitnessScore: number;
  createdBy: number;
  createdByName: string;
  approveBy: number | null;
  approveByName: string | null;
  approveStatus: "Pending" | "Approved" | string;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  landDetailCount: number;
  equipmentDetailCount: number;
  humanDetailCount: number;
  scheduleCount: number;
}

export interface AllocationPlanPage {
  size: number;
  page: number;
  total: number;
  totalPages: number;
  items: AllocationPlan[];
}

export interface AllocationPlanResponse {
  success: boolean;
  message: string;
  data: AllocationPlanPage;
}