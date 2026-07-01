import api from "./api";
import type { AllocationPlanResponse } from "../types/allocationPlan";

export async function getAllocationPlans() {
  const response = await api.get<AllocationPlanResponse>("/AllocationPlans");
  return response.data.data;
}

export async function createAllocationPlan(payload: unknown) {
  const response = await api.post("/AllocationPlans", payload);
  return response.data;
}
export async function getAllocationPlanById(id: number) {
  const response = await api.get(`/AllocationPlans/${id}`);
  return response.data;
}

export async function updateAllocationPlan(id: number, payload: unknown) {
  const response = await api.put(`/AllocationPlans/${id}`, payload);
  return response.data;
}

export async function deleteAllocationPlan(id: number) {
  const response = await api.delete(`/AllocationPlans/${id}`);
  return response.data;
}