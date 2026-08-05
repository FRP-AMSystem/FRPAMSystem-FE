import api from "./api";

import type {
  AllocationEquipmentDetail,
  AllocationEquipmentDetailQuery,
  AllocationEquipmentDetailRequest,
} from "../types/allocationDetail";

import type {
  AllocationHumanDetail,
  AllocationHumanDetailQuery,
  AllocationHumanDetailRequest,
} from "../types/allocationHumanDetail";

import type {
  AllocationLandDetail,
  AllocationLandDetailQuery,
  AllocationLandDetailRequest,
} from "../types/allocationLand";

function validateId(id: number, fieldName: string): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`${fieldName} is invalid.`);
  }
}

function cleanParams(
  params: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== ""
    )
  );
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unwrapResponse<T>(payload: unknown): T {
  if (!isRecord(payload)) {
    return payload as T;
  }

  if ("data" in payload && payload.data !== undefined) {
    return unwrapResponse<T>(payload.data);
  }

  if ("result" in payload && payload.result !== undefined) {
    return unwrapResponse<T>(payload.result);
  }

  return payload as T;
}

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!isRecord(payload)) {
    return [];
  }

  if (Array.isArray(payload.items)) {
    return payload.items as T[];
  }

  if ("data" in payload) {
    const items = normalizeList<T>(payload.data);

    if (items.length > 0 || Array.isArray(payload.data)) {
      return items;
    }
  }

  if ("result" in payload) {
    const items = normalizeList<T>(payload.result);

    if (
      items.length > 0 ||
      Array.isArray(payload.result)
    ) {
      return items;
    }
  }

  return [];
}

/* =========================================================
   EQUIPMENT ALLOCATION DETAILS
========================================================= */

export async function getAllocationEquipmentDetails(
  query: AllocationEquipmentDetailQuery = {}
): Promise<AllocationEquipmentDetail[]> {
  const response = await api.get(
    "/AllocationEquipmentDetails",
    {
      params: cleanParams({
        Keyword: query.keyword,
        AllocationPlanId: query.allocationPlanId,
        ExperimentId: query.experimentId,
        ExpEquipmentReqId: query.expEquipmentReqId,
        PhaseEquipmentReqId:
          query.phaseEquipmentReqId,
        AllocatedEquipmentTypeId:
          query.allocatedEquipmentTypeId,
        EquipmentInstanceId:
          query.equipmentInstanceId,
        IsSubstitute: query.isSubstitute,
        Status: query.status,
        StartFrom: query.startFrom,
        StartTo: query.startTo,
        EndFrom: query.endFrom,
        EndTo: query.endTo,
        Page: query.page,
        Size: query.size,
      }),
    }
  );

  return normalizeList<AllocationEquipmentDetail>(
    response.data
  );
}

export async function getAllocationEquipmentDetailById(
  id: number
): Promise<AllocationEquipmentDetail> {
  validateId(id, "Allocation equipment detail ID");

  const response = await api.get(
    `/AllocationEquipmentDetails/${id}`
  );

  return unwrapResponse<AllocationEquipmentDetail>(
    response.data
  );
}

export async function createAllocationEquipmentDetail(
  payload: AllocationEquipmentDetailRequest
): Promise<AllocationEquipmentDetail> {
  const response = await api.post(
    "/AllocationEquipmentDetails",
    payload
  );

  return unwrapResponse<AllocationEquipmentDetail>(
    response.data
  );
}

export async function updateAllocationEquipmentDetail(
  id: number,
  payload: AllocationEquipmentDetailRequest
): Promise<AllocationEquipmentDetail> {
  validateId(id, "Allocation equipment detail ID");

  const response = await api.put(
    `/AllocationEquipmentDetails/${id}`,
    payload
  );

  return unwrapResponse<AllocationEquipmentDetail>(
    response.data
  );
}

export async function deleteAllocationEquipmentDetail(
  id: number
): Promise<void> {
  validateId(id, "Allocation equipment detail ID");

  await api.delete(`/AllocationEquipmentDetails/${id}`);
}

/* =========================================================
   HUMAN ALLOCATION DETAILS
========================================================= */

export async function getAllocationHumanDetails(
  query: AllocationHumanDetailQuery = {}
): Promise<AllocationHumanDetail[]> {
  const response = await api.get(
    "/AllocationHumanDetails",
    {
      params: cleanParams({
        Keyword: query.keyword,
        AllocationPlanId: query.allocationPlanId,
        ExperimentId: query.experimentId,
        ExpHumanReqId: query.expHumanReqId,
        PhaseHumanReqId: query.phaseHumanReqId,
        HumanResourceId: query.humanResourceId,
        UserId: query.userId,
        RoleId: query.roleId,
        RequiredSkillId: query.requiredSkillId,
        Status: query.status,
        StartFrom: query.startFrom,
        StartTo: query.startTo,
        EndFrom: query.endFrom,
        EndTo: query.endTo,
        MinWorkingHours: query.minWorkingHours,
        MaxWorkingHours: query.maxWorkingHours,
        Page: query.page,
        Size: query.size,
      }),
    }
  );

  return normalizeList<AllocationHumanDetail>(
    response.data
  );
}

export async function getAllocationHumanDetailById(
  id: number
): Promise<AllocationHumanDetail> {
  validateId(id, "Allocation human detail ID");

  const response = await api.get(
    `/AllocationHumanDetails/${id}`
  );

  return unwrapResponse<AllocationHumanDetail>(
    response.data
  );
}

export async function createAllocationHumanDetail(
  payload: AllocationHumanDetailRequest
): Promise<AllocationHumanDetail> {
  const response = await api.post(
    "/AllocationHumanDetails",
    payload
  );

  return unwrapResponse<AllocationHumanDetail>(
    response.data
  );
}

export async function updateAllocationHumanDetail(
  id: number,
  payload: AllocationHumanDetailRequest
): Promise<AllocationHumanDetail> {
  validateId(id, "Allocation human detail ID");

  const response = await api.put(
    `/AllocationHumanDetails/${id}`,
    payload
  );

  return unwrapResponse<AllocationHumanDetail>(
    response.data
  );
}

export async function deleteAllocationHumanDetail(
  id: number
): Promise<void> {
  validateId(id, "Allocation human detail ID");

  await api.delete(`/AllocationHumanDetails/${id}`);
}

/* =========================================================
   LAND ALLOCATION DETAILS
========================================================= */

export async function getAllocationLandDetails(
  query: AllocationLandDetailQuery = {}
): Promise<AllocationLandDetail[]> {
  const response = await api.get(
    "/AllocationLandDetails",
    {
      params: cleanParams({
        Keyword: query.keyword,
        AllocationPlanId: query.allocationPlanId,
        ExperimentId: query.experimentId,
        LandId: query.landId,
        AreaId: query.areaId,
        ExpLandReqId: query.expLandReqId,
        Status: query.status,
        StartFrom: query.startFrom,
        StartTo: query.startTo,
        EndFrom: query.endFrom,
        EndTo: query.endTo,
        Page: query.page,
        Size: query.size,
      }),
    }
  );

  return normalizeList<AllocationLandDetail>(
    response.data
  );
}

export async function getAllocationLandDetailById(
  id: number
): Promise<AllocationLandDetail> {
  validateId(id, "Allocation land detail ID");

  const response = await api.get(
    `/AllocationLandDetails/${id}`
  );

  return unwrapResponse<AllocationLandDetail>(
    response.data
  );
}

export async function createAllocationLandDetail(
  payload: AllocationLandDetailRequest
): Promise<AllocationLandDetail> {
  const response = await api.post(
    "/AllocationLandDetails",
    payload
  );

  return unwrapResponse<AllocationLandDetail>(
    response.data
  );
}

export async function updateAllocationLandDetail(
  id: number,
  payload: AllocationLandDetailRequest
): Promise<AllocationLandDetail> {
  validateId(id, "Allocation land detail ID");

  const response = await api.put(
    `/AllocationLandDetails/${id}`,
    payload
  );

  return unwrapResponse<AllocationLandDetail>(
    response.data
  );
}

export async function deleteAllocationLandDetail(
  id: number
): Promise<void> {
  validateId(id, "Allocation land detail ID");

  await api.delete(`/AllocationLandDetails/${id}`);
}
