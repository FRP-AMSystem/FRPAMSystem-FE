import api from "./api";

import type {
  AllocationPlan,
  AllocationPlanFilter,
  AllocationPlanPage,
  AllocationPlanRequest,
  ApiResponse,
} from "../types/allocationPlan";

type WrappedResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  result?: T;
  items?: T;
};

function unwrapResponse<T>(responseData: unknown): T {
  if (responseData === null || responseData === undefined) {
    return responseData as T;
  }

  if (typeof responseData !== "object") {
    return responseData as T;
  }

  const wrapped = responseData as WrappedResponse<T>;

  if (wrapped.data !== undefined) {
    return wrapped.data;
  }

  if (wrapped.result !== undefined) {
    return wrapped.result;
  }

  if (wrapped.items !== undefined) {
    return wrapped.items;
  }

  return responseData as T;
}

function normalizeAllocationPlanList(
  responseData: unknown
): AllocationPlan[] {
  const unwrapped = unwrapResponse<
    AllocationPlan[] | AllocationPlanPage
  >(responseData);

  if (Array.isArray(unwrapped)) {
    return unwrapped;
  }

  if (
    unwrapped &&
    typeof unwrapped === "object" &&
    Array.isArray(unwrapped.items)
  ) {
    return unwrapped.items;
  }

  return [];
}

function removeUndefinedValues<T extends object>(
  params: T
): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== ""
    )
  ) as Partial<T>;
}

export async function getAllocationPlans(
  filters: AllocationPlanFilter = {}
): Promise<AllocationPlan[]> {
  const params = removeUndefinedValues({
    Keyword: filters.keyword,
    ExperimentId: filters.experimentId,
    CreatedBy: filters.createdBy,
    ApproveBy: filters.approveBy,
    ApproveStatus: filters.approveStatus,
    MinFitnessScore: filters.minFitnessScore,
    MaxFitnessScore: filters.maxFitnessScore,
    CreatedFrom: filters.createdFrom,
    CreatedTo: filters.createdTo,
    ApprovedFrom: filters.approvedFrom,
    ApprovedTo: filters.approvedTo,
    Page: filters.page,
    Size: filters.size,
  });

  const response = await api.get("/AllocationPlans", {
    params,
  });

  return normalizeAllocationPlanList(response.data);
}
export async function submitAllocationPlan(
  id: number
) {
  const response = await api.post(
    `/AllocationPlans/${id}/submit`
  );

  return response.data;
}

export async function getAllocationPlanPage(
  filters: AllocationPlanFilter = {}
): Promise<AllocationPlanPage> {
  const params = removeUndefinedValues({
    Keyword: filters.keyword,
    ExperimentId: filters.experimentId,
    CreatedBy: filters.createdBy,
    ApproveBy: filters.approveBy,
    ApproveStatus: filters.approveStatus,
    MinFitnessScore: filters.minFitnessScore,
    MaxFitnessScore: filters.maxFitnessScore,
    CreatedFrom: filters.createdFrom,
    CreatedTo: filters.createdTo,
    ApprovedFrom: filters.approvedFrom,
    ApprovedTo: filters.approvedTo,
    Page: filters.page,
    Size: filters.size,
  });

  const response = await api.get("/AllocationPlans", {
    params,
  });

  const data = unwrapResponse<
    AllocationPlanPage | AllocationPlan[]
  >(response.data);

  if (Array.isArray(data)) {
    return {
      items: data,
      page: filters.page ?? 1,
      size: filters.size ?? data.length,
      total: data.length,
      totalPages: 1,
    };
  }

  return {
    items: Array.isArray(data?.items) ? data.items : [],
    page: data?.page ?? filters.page ?? 1,
    size: data?.size ?? filters.size ?? 10,
    total: data?.total ?? data?.items?.length ?? 0,
    totalPages: data?.totalPages ?? 1,
  };
}

export async function getAllocationPlanById(
  id: number
): Promise<AllocationPlan> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Allocation plan ID is invalid.");
  }

  const response = await api.get(`/AllocationPlans/${id}`);

  return unwrapResponse<AllocationPlan>(response.data);
}

export async function createAllocationPlan(
  payload: AllocationPlanRequest
): Promise<AllocationPlan> {
  const response = await api.post(
    "/AllocationPlans",
    payload
  );

  return unwrapResponse<AllocationPlan>(response.data);
}

export async function updateAllocationPlan(
  id: number,
  payload: AllocationPlanRequest
): Promise<AllocationPlan> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Allocation plan ID is invalid.");
  }

  const response = await api.put(
    `/AllocationPlans/${id}`,
    payload
  );

  return unwrapResponse<AllocationPlan>(response.data);
}

export async function deleteAllocationPlan(
  id: number
): Promise<void> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Allocation plan ID is invalid.");
  }

  await api.delete(`/AllocationPlans/${id}`);
}

export async function approveAllocationPlan(
  id: number
): Promise<AllocationPlan> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Allocation plan ID is invalid.");
  }

  const response = await api.post(
    `/AllocationPlans/${id}/approve`
  );

  return unwrapResponse<AllocationPlan>(response.data);
}

export async function rejectAllocationPlan(
  id: number
): Promise<AllocationPlan> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Allocation plan ID is invalid.");
  }

  const response = await api.post(
    `/AllocationPlans/${id}/reject`
  );

  return unwrapResponse<AllocationPlan>(response.data);
}

export async function cancelAllocationPlan(
  id: number
): Promise<AllocationPlan> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Allocation plan ID is invalid.");
  }

  const response = await api.post(
    `/AllocationPlans/${id}/cancel`
  );

  return unwrapResponse<AllocationPlan>(response.data);
}

export type {
  AllocationPlan,
  AllocationPlanFilter,
  AllocationPlanPage,
  AllocationPlanRequest,
  ApiResponse,
};