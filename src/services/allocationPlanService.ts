import api from "./api";

import type {
  AllocationPlan,
  AllocationPlanFilter,
  AllocationPlanPage,
  AllocationPlanRequest,
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

/**
 * Backend GET /api/AllocationPlans returns landDetailCount=0, equipmentDetailCount=0, humanDetailCount=0, scheduleCount=0
 * because the backend DTO mapper does not compute these aggregate counts automatically.
 * This enricher dynamically aggregates the real counts from the allocation detail tables and experiment requirements.
 */
async function enrichAllocationPlans(
  plans: AllocationPlan[]
): Promise<AllocationPlan[]> {
  if (!plans || plans.length === 0) return plans;

  try {
    const [
      equipRes,
      humanRes,
      landRes,
      schedRes,
      expEquipRes,
      expHumanRes,
      expLandRes,
    ] = await Promise.allSettled([
      api.get("/AllocationEquipmentDetails"),
      api.get("/AllocationHumanDetails"),
      api.get("/AllocationLandDetails"),
      api.get("/Schedules"),
      api.get("/ExperimentEquipmentRequirements"),
      api.get("/ExperimentHumanRequirements"),
      api.get("/ExperimentLandRequirements"),
    ]);

    const getItems = (res: PromiseSettledResult<any>): any[] => {
      if (res.status !== "fulfilled") return [];
      const unwrapped = unwrapResponse<any>(res.value.data);
      if (Array.isArray(unwrapped)) return unwrapped;
      if (unwrapped && Array.isArray(unwrapped.items)) return unwrapped.items;
      return [];
    };

    const equips = getItems(equipRes);
    const humans = getItems(humanRes);
    const lands = getItems(landRes);
    const scheds = getItems(schedRes);
    const expEquips = getItems(expEquipRes);
    const expHumans = getItems(expHumanRes);
    const expLands = getItems(expLandRes);

    return plans.map((p) => {
      const eDirect = equips.filter(
        (x) =>
          x.allocationPlanId === p.allocationPlanId ||
          (x.experimentId === p.experimentId && p.experimentId)
      ).length;
      const eExp = expEquips.filter(
        (x) => x.experimentId === p.experimentId
      ).length;
      const equipmentDetailCount =
        p.equipmentDetailCount && p.equipmentDetailCount > 0
          ? p.equipmentDetailCount
          : (eDirect || eExp || 0);

      const hDirect = humans.filter(
        (x) =>
          x.allocationPlanId === p.allocationPlanId ||
          (x.experimentId === p.experimentId && p.experimentId)
      ).length;
      const hExp = expHumans.filter(
        (x) => x.experimentId === p.experimentId
      ).length;
      const humanDetailCount =
        p.humanDetailCount && p.humanDetailCount > 0
          ? p.humanDetailCount
          : (hDirect || hExp || 0);

      const lDirect = lands.filter(
        (x) =>
          x.allocationPlanId === p.allocationPlanId ||
          (x.experimentId === p.experimentId && p.experimentId)
      ).length;
      const lExp = expLands.filter(
        (x) => x.experimentId === p.experimentId
      ).length;
      const landDetailCount =
        p.landDetailCount && p.landDetailCount > 0
          ? p.landDetailCount
          : (lDirect || lExp || 0);

      const sDirect = scheds.filter(
        (x) =>
          x.allocationPlanId === p.allocationPlanId ||
          (x.experimentId === p.experimentId && p.experimentId)
      ).length;
      const scheduleCount =
        p.scheduleCount && p.scheduleCount > 0
          ? p.scheduleCount
          : (sDirect || 0);

      return {
        ...p,
        equipmentDetailCount,
        humanDetailCount,
        landDetailCount,
        scheduleCount,
      };
    });
  } catch (err) {
    console.warn("Failed to enrich allocation plan counts:", err);
    return plans;
  }
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

  const rawList = normalizeAllocationPlanList(response.data);
  return enrichAllocationPlans(rawList);
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

  let rawItems: AllocationPlan[] = [];
  let page = filters.page ?? 1;
  let size = filters.size ?? 10;
  let total = 0;
  let totalPages = 1;

  if (Array.isArray(data)) {
    rawItems = data;
    total = data.length;
    size = filters.size ?? data.length;
  } else if (data && typeof data === "object") {
    rawItems = Array.isArray(data.items) ? data.items : [];
    page = data.page ?? filters.page ?? 1;
    size = data.size ?? filters.size ?? 10;
    total = data.total ?? rawItems.length;
    totalPages = data.totalPages ?? 1;
  }

  const enrichedItems = await enrichAllocationPlans(rawItems);

  return {
    items: enrichedItems,
    page,
    size,
    total,
    totalPages,
  };
}

export async function getAllocationPlanById(
  id: number
): Promise<AllocationPlan> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Allocation plan ID is invalid.");
  }

  const response = await api.get(`/AllocationPlans/${id}`);
  const rawPlan = unwrapResponse<AllocationPlan>(response.data);
  const [enriched] = await enrichAllocationPlans([rawPlan]);

  return enriched || rawPlan;
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