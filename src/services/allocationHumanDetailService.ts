import api from "./api";

import type {
  AllocationHumanDetail,
  CreateAllocationHumanDetailPayload,
} from "../types/allocationHumanDetail";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface PaginatedResponse<T> {
  size: number;
  page: number;
  total: number;
  totalPages: number;
  items: T[];
}

export const getAllocationHumanDetails = async (
  allocationPlanId: number
): Promise<AllocationHumanDetail[]> => {
  const response = await api.get<
    ApiResponse<PaginatedResponse<AllocationHumanDetail>>
  >("/AllocationHumanDetails", {
    params: {
      allocationPlanId,
      page: 1,
      size: 100,
    },
  });

  return response.data.data?.items ?? [];
};

export const getAllocationHumanDetailById = async (
  id: number
): Promise<AllocationHumanDetail> => {
  const response = await api.get<ApiResponse<AllocationHumanDetail>>(
    `/AllocationHumanDetails/${id}`
  );

  return response.data.data;
};

export const createAllocationHumanDetail = async (
  payload: CreateAllocationHumanDetailPayload
): Promise<AllocationHumanDetail> => {
  const response = await api.post<ApiResponse<AllocationHumanDetail>>(
    "/AllocationHumanDetails",
    payload
  );

  return response.data.data;
};

export const updateAllocationHumanDetail = async (
  id: number,
  payload: CreateAllocationHumanDetailPayload
): Promise<AllocationHumanDetail> => {
  const response = await api.put<ApiResponse<AllocationHumanDetail>>(
    `/AllocationHumanDetails/${id}`,
    payload
  );

  return response.data.data;
};

export const deleteAllocationHumanDetail = async (
  id: number
): Promise<void> => {
  await api.delete(`/AllocationHumanDetails/${id}`);
};