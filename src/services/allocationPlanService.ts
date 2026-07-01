import api from "./api";
import type { AllocationPlanRequest, ApiResponse } from "../types/allocation";

export async function createAllocationPlan(data: AllocationPlanRequest) {
  const response = await api.post<ApiResponse<unknown>>(
    "/AllocationPlans",
    data
  );

  return response.data;
}