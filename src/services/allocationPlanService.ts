import api from "./api";
import type { AllocationPlan } from "../types/allocationPlan";

type ApiResponse<T> = {
  data?: T;
  items?: T;
  result?: T;
  message?: string;
  success?: boolean;
};

function unwrapResponse<T>(responseData: T | ApiResponse<T>): T {
  if (
    responseData &&
    typeof responseData === "object" &&
    "data" in responseData
  ) {
    return (responseData as ApiResponse<T>).data as T;
  }

  if (
    responseData &&
    typeof responseData === "object" &&
    "items" in responseData
  ) {
    return (responseData as ApiResponse<T>).items as T;
  }

  if (
    responseData &&
    typeof responseData === "object" &&
    "result" in responseData
  ) {
    return (responseData as ApiResponse<T>).result as T;
  }

  return responseData as T;
}

export async function getAllocationPlans(): Promise<AllocationPlan[]> {
  const response = await api.get("/AllocationPlans");
  const data = unwrapResponse<AllocationPlan[]>(response.data);

  return Array.isArray(data) ? data : [];
}

export async function getAllocationPlanById(
  id: number
): Promise<AllocationPlan> {
  const response = await api.get(`/AllocationPlans/${id}`);
  return unwrapResponse<AllocationPlan>(response.data);
}

export async function createAllocationPlan(payload: unknown) {
  const response = await api.post("/AllocationPlans", payload);
  return unwrapResponse(response.data);
}

export async function updateAllocationPlan(id: number, payload: unknown) {
  const response = await api.put(`/AllocationPlans/${id}`, payload);
  return unwrapResponse(response.data);
}

export async function deleteAllocationPlan(id: number) {
  const response = await api.delete(`/AllocationPlans/${id}`);
  return unwrapResponse(response.data);
}

export async function approveAllocationPlan(id: number) {
  const response = await api.post(`/AllocationPlans/${id}/approve`);
  return unwrapResponse(response.data);
}

export async function rejectAllocationPlan(id: number) {
  const response = await api.post(`/AllocationPlans/${id}/reject`);
  return unwrapResponse(response.data);
}

export async function cancelAllocationPlan(id: number) {
  const response = await api.post(`/AllocationPlans/${id}/cancel`);
  return unwrapResponse(response.data);
}