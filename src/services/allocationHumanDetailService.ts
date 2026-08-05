import api from "./api";

import type {
  AllocationHumanDetail,
  AllocationHumanDetailRequest,
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

function validateId(
  id: number,
  fieldName: string
): void {
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      `${fieldName} is invalid.`
    );
  }
}

export async function getAllocationHumanDetails(
  allocationPlanId: number
): Promise<AllocationHumanDetail[]> {
  validateId(
    allocationPlanId,
    "Allocation plan ID"
  );

  const response = await api.get<
    ApiResponse<
      PaginatedResponse<AllocationHumanDetail>
    >
  >(
    "/AllocationHumanDetails",
    {
      params: {
        AllocationPlanId:
          allocationPlanId,

        Page: 1,
        Size: 100,
      },
    }
  );

  return (
    response.data.data?.items ??
    []
  );
}

export async function getAllocationHumanDetailById(
  id: number
): Promise<AllocationHumanDetail> {
  validateId(
    id,
    "Allocation human detail ID"
  );

  const response =
    await api.get<
      ApiResponse<AllocationHumanDetail>
    >(
      `/AllocationHumanDetails/${id}`
    );

  return response.data.data;
}

export async function createAllocationHumanDetail(
  payload: AllocationHumanDetailRequest
): Promise<AllocationHumanDetail> {
  const response =
    await api.post<
      ApiResponse<AllocationHumanDetail>
    >(
      "/AllocationHumanDetails",
      payload
    );

  return response.data.data;
}

export async function updateAllocationHumanDetail(
  id: number,
  payload: AllocationHumanDetailRequest
): Promise<AllocationHumanDetail> {
  validateId(
    id,
    "Allocation human detail ID"
  );

  const response =
    await api.put<
      ApiResponse<AllocationHumanDetail>
    >(
      `/AllocationHumanDetails/${id}`,
      payload
    );

  return response.data.data;
}

export async function deleteAllocationHumanDetail(
  id: number
): Promise<void> {
  validateId(
    id,
    "Allocation human detail ID"
  );

  await api.delete(
    `/AllocationHumanDetails/${id}`
  );
}