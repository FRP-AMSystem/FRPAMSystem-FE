export type AllocationPlanStatus =
  | "Draft"
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Cancelled";

export interface AllocationPlanRequest {
  experimentId: number;
  fitnessScore?: number;
  approveStatus: AllocationPlanStatus;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}