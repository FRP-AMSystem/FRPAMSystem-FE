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

/* =========================================================
   COMMON HELPERS
========================================================= */

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
): value is Record<
  string,
  unknown
> {
  return (
    typeof value === "object" &&
    value !== null
  );
}

/**
 * Một số API trả:
 *
 * {
 *   data: {...}
 * }
 *
 * hoặc:
 *
 * {
 *   result: {...}
 * }
 *
 * hoặc trả object trực tiếp.
 *
 * Helper này normalize về object thật.
 */
function unwrapResponse<T>(
  payload: unknown
): T {
  if (!isRecord(payload)) {
    return payload as T;
  }

  if (
    "data" in payload &&
    payload.data !== undefined
  ) {
    return unwrapResponse<T>(
      payload.data
    );
  }

  if (
    "result" in payload &&
    payload.result !== undefined
  ) {
    return unwrapResponse<T>(
      payload.result
    );
  }

  return payload as T;
}

/**
 * Normalize list response.
 *
 * Hỗ trợ:
 *
 * [...]
 *
 * {
 *   items: [...]
 * }
 *
 * {
 *   data: [...]
 * }
 *
 * {
 *   data: {
 *     items: [...]
 *   }
 * }
 *
 * {
 *   result: [...]
 * }
 */
function normalizeList<T>(
  payload: unknown
): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!isRecord(payload)) {
    return [];
  }

  if (
    Array.isArray(
      payload.items
    )
  ) {
    return payload.items as T[];
  }

  if ("data" in payload) {
    const items =
      normalizeList<T>(
        payload.data
      );

    if (
      items.length > 0 ||
      Array.isArray(
        payload.data
      )
    ) {
      return items;
    }
  }

  if ("result" in payload) {
    const items =
      normalizeList<T>(
        payload.result
      );

    if (
      items.length > 0 ||
      Array.isArray(
        payload.result
      )
    ) {
      return items;
    }
  }

  return [];
}

/* =========================================================
   EQUIPMENT ALLOCATION DETAILS
========================================================= */

/**
 * Manager/Admin:
 *
 * Lấy danh sách tất cả Equipment Allocation Details.
 */
export async function getAllocationEquipmentDetails(
  query: AllocationEquipmentDetailQuery = {}
): Promise<
  AllocationEquipmentDetail[]
> {
  const response =
    await api.get(
      "/AllocationEquipmentDetails",
      {
        params: cleanParams({
          Keyword:
            query.keyword,

          AllocationPlanId:
            query.allocationPlanId,

          ExperimentId:
            query.experimentId,

          ExpEquipmentReqId:
            query.expEquipmentReqId,

          PhaseEquipmentReqId:
            query.phaseEquipmentReqId,

          AllocatedEquipmentTypeId:
            query.allocatedEquipmentTypeId,

          EquipmentInstanceId:
            query.equipmentInstanceId,

          IsSubstitute:
            query.isSubstitute,

          Status:
            query.status,

          StartFrom:
            query.startFrom,

          StartTo:
            query.startTo,

          EndFrom:
            query.endFrom,

          EndTo:
            query.endTo,

          Page:
            query.page,

          Size:
            query.size,
        }),
      }
    );

  return normalizeList<
    AllocationEquipmentDetail
  >(response.data);
}

export async function getAllAllocationEquipmentDetails(): Promise<
  AllocationEquipmentDetail[]
> {
  const pageSize = 100;
  const firstResponse = await api.get(
    "/AllocationEquipmentDetails",
    {
      params: {
        Page: 1,
        Size: pageSize,
      },
    }
  );
  const firstPage = unwrapResponse<Record<string, unknown> | AllocationEquipmentDetail[]>(
    firstResponse.data
  );
  const firstItems = normalizeList<AllocationEquipmentDetail>(firstPage);
  const totalPages =
    firstPage && !Array.isArray(firstPage) &&
    typeof firstPage.totalPages === "number"
      ? firstPage.totalPages
      : 1;

  if (totalPages <= 1) return firstItems;

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      getAllocationEquipmentDetails({
        page: index + 2,
        size: pageSize,
      })
    )
  );

  return firstItems.concat(...remainingPages);
}

/**
 * Manager/Admin:
 *
 * Lấy một Equipment Allocation Detail.
 */
export async function getAllocationEquipmentDetailById(
  id: number
): Promise<AllocationEquipmentDetail> {
  validateId(
    id,
    "Allocation equipment detail ID"
  );

  const response =
    await api.get(
      `/AllocationEquipmentDetails/${id}`
    );

  return unwrapResponse<
    AllocationEquipmentDetail
  >(response.data);
}

/**
 * Tạo Equipment Allocation Detail.
 *
 * Đây là nghiệp vụ allocation,
 * KHÔNG phải Equipment Return.
 */
export async function createAllocationEquipmentDetail(
  payload: AllocationEquipmentDetailRequest
): Promise<AllocationEquipmentDetail> {
  const response =
    await api.post(
      "/AllocationEquipmentDetails",
      payload
    );

  return unwrapResponse<
    AllocationEquipmentDetail
  >(response.data);
}

/**
 * Update Equipment Allocation Detail.
 *
 * Không dùng hàm này để giả lập:
 *
 * InUse -> Completed
 *
 * khi user submit return.
 *
 * Return phải đi qua EquipmentReturns API.
 */
export async function updateAllocationEquipmentDetail(
  id: number,
  payload: AllocationEquipmentDetailRequest
): Promise<AllocationEquipmentDetail> {
  validateId(
    id,
    "Allocation equipment detail ID"
  );

  const response =
    await api.put(
      `/AllocationEquipmentDetails/${id}`,
      payload
    );

  return unwrapResponse<
    AllocationEquipmentDetail
  >(response.data);
}

/**
 * Xóa Equipment Allocation Detail.
 */
export async function deleteAllocationEquipmentDetail(
  id: number
): Promise<void> {
  validateId(
    id,
    "Allocation equipment detail ID"
  );

  await api.delete(
    `/AllocationEquipmentDetails/${id}`
  );
}

/* =========================================================
   MY EQUIPMENT ALLOCATIONS
========================================================= */

/**
 * Field user:
 *
 * Researcher
 * Technician
 * Student
 * Seasonal
 * ...
 *
 * Lấy equipment allocations thuộc user hiện tại.
 */
export async function getMyAllocationEquipmentDetails(
  query: AllocationEquipmentDetailQuery = {}
): Promise<
  AllocationEquipmentDetail[]
> {
  const response =
    await api.get(
      "/AllocationEquipmentDetails/mine",
      {
        params: cleanParams({
          Keyword:
            query.keyword,

          AllocationPlanId:
            query.allocationPlanId,

          ExperimentId:
            query.experimentId,

          ExpEquipmentReqId:
            query.expEquipmentReqId,

          PhaseEquipmentReqId:
            query.phaseEquipmentReqId,

          AllocatedEquipmentTypeId:
            query.allocatedEquipmentTypeId,

          EquipmentInstanceId:
            query.equipmentInstanceId,

          IsSubstitute:
            query.isSubstitute,

          Status:
            query.status,

          StartFrom:
            query.startFrom,

          StartTo:
            query.startTo,

          EndFrom:
            query.endFrom,

          EndTo:
            query.endTo,

          Page:
            query.page,

          Size:
            query.size,
        }),
      }
    );

  return normalizeList<
    AllocationEquipmentDetail
  >(response.data);
}

/**
 * Field user:
 *
 * Lấy chi tiết một allocation thuộc user hiện tại.
 */
export async function getMyAllocationEquipmentDetailById(
  id: number
): Promise<AllocationEquipmentDetail> {
  validateId(
    id,
    "Allocation equipment detail ID"
  );

  const response =
    await api.get(
      `/AllocationEquipmentDetails/mine/${id}`
    );

  return unwrapResponse<
    AllocationEquipmentDetail
  >(response.data);
}

/* =========================================================
   EQUIPMENT HANDOVER
========================================================= */

/**
 * Payload khi field user xác nhận
 * đã nhận thiết bị.
 */
export interface EquipmentHandoverMinePayload {
  conditionBefore?:
    | string
    | null;

  note?:
    | string
    | null;
}

export interface EquipmentHandoverRecord {
  handoverId: number;
  allocationEquipmentDetailId: number;
  equipmentInstanceId?: number | null;
  handedOverBy: number;
  receivedBy: number;
  handoverDate: string;
  quantity: number;
  conditionBefore?: string | null;
  note?: string | null;
  status: string;
  confirmedAt?: string | null;
}

export interface EquipmentHandoverRequest {
  allocationEquipmentDetailId: number;
  equipmentInstanceId: number | null;
  handedOverBy: number;
  receivedBy: number;
  handoverDate: string;
  quantity: number;
  conditionBefore?: string | null;
  note?: string | null;
  status: "Pending";
  confirmedAt?: null;
}

export interface EquipmentHandoverQuery {
  allocationEquipmentDetailId?: number;
  equipmentInstanceId?: number;
  handedOverBy?: number;
  receivedBy?: number;
  status?: string;
  page?: number;
  size?: number;
}

export async function getEquipmentHandovers(
  query: EquipmentHandoverQuery = {}
): Promise<EquipmentHandoverRecord[]> {
  const response = await api.get("/EquipmentHandovers", {
    params: cleanParams({
      AllocationEquipmentDetailId: query.allocationEquipmentDetailId,
      EquipmentInstanceId: query.equipmentInstanceId,
      HandedOverBy: query.handedOverBy,
      ReceivedBy: query.receivedBy,
      Status: query.status,
      Page: query.page,
      Size: query.size,
    }),
  });

  return normalizeList<EquipmentHandoverRecord>(response.data);
}

export async function createEquipmentHandover(
  payload: EquipmentHandoverRequest
): Promise<EquipmentHandoverRecord> {
  const response = await api.post("/EquipmentHandovers", payload);
  return unwrapResponse<EquipmentHandoverRecord>(response.data);
}

/**
 * Field user xác nhận tiếp nhận thiết bị.
 *
 * Flow:
 *
 * Allocated / Reserved
 *        ↓
 * EquipmentHandovers
 *        ↓
 *      InUse
 *
 * Frontend KHÔNG tự PUT status = InUse.
 */
export async function handoverEquipmentDetail(
  id: number,
  payload: EquipmentHandoverMinePayload = {}
): Promise<AllocationEquipmentDetail> {
  validateId(
    id,
    "Allocation equipment detail ID"
  );

  const response =
    await api.patch(
      `/EquipmentHandovers/mine/${id}/handover`,
      payload
    );

  return unwrapResponse<
    AllocationEquipmentDetail
  >(response.data);
}

/**
 * Field user từ chối tiếp nhận thiết bị.
 *
 * Đây là reject HANDOVER,
 * không phải reject RETURN.
 */
export async function rejectMyEquipmentHandover(
  id: number,
  rejectionReason?: string
): Promise<void> {
  validateId(
    id,
    "Allocation equipment detail ID"
  );

  await api.patch(
    `/EquipmentHandovers/mine/${id}/reject`,
    {
      rejectionReason:
        rejectionReason?.trim() ||
        null,
    }
  );
}

/* =========================================================
   IMPORTANT:
   EQUIPMENT RETURN KHÔNG NẰM TRONG FILE NÀY
========================================================= */

/**
 * Equipment Return đã được tách riêng sang:
 *
 * services/equipmentReturnService.ts
 *
 * Các API:
 *
 * PATCH
 * /EquipmentReturns/mine/{allocationEquipmentDetailId}/return
 *
 * GET
 * /EquipmentReturns
 *
 * GET
 * /EquipmentReturns/{id}
 *
 * PATCH
 * /EquipmentReturns/{id}/confirm
 *
 * PATCH
 * /EquipmentReturns/{id}/reject
 *
 * Không thêm returnEquipmentDetail() trở lại file này,
 * tránh 2 service cùng quản lý Equipment Return.
 */

/* =========================================================
   HUMAN ALLOCATION DETAILS
========================================================= */

/**
 * Lấy danh sách Human Allocation Details.
 */
export async function getAllocationHumanDetails(
  query: AllocationHumanDetailQuery = {}
): Promise<
  AllocationHumanDetail[]
> {
  const response =
    await api.get(
      "/AllocationHumanDetails",
      {
        params: cleanParams({
          Keyword:
            query.keyword,

          AllocationPlanId:
            query.allocationPlanId,

          ExperimentId:
            query.experimentId,

          ExpHumanReqId:
            query.expHumanReqId,

          PhaseHumanReqId:
            query.phaseHumanReqId,

          HumanResourceId:
            query.humanResourceId,

          UserId:
            query.userId,

          RoleId:
            query.roleId,

          RequiredSkillId:
            query.requiredSkillId,

          Status:
            query.status,

          StartFrom:
            query.startFrom,

          StartTo:
            query.startTo,

          EndFrom:
            query.endFrom,

          EndTo:
            query.endTo,

          MinWorkingHours:
            query.minWorkingHours,

          MaxWorkingHours:
            query.maxWorkingHours,

          Page:
            query.page,

          Size:
            query.size,
        }),
      }
    );

  return normalizeList<
    AllocationHumanDetail
  >(response.data);
}

/**
 * Lấy Human Allocation Detail theo ID.
 */
export async function getAllocationHumanDetailById(
  id: number
): Promise<AllocationHumanDetail> {
  validateId(
    id,
    "Allocation human detail ID"
  );

  const response =
    await api.get(
      `/AllocationHumanDetails/${id}`
    );

  return unwrapResponse<
    AllocationHumanDetail
  >(response.data);
}

/**
 * Tạo Human Allocation Detail.
 */
export async function createAllocationHumanDetail(
  payload: AllocationHumanDetailRequest
): Promise<AllocationHumanDetail> {
  const response =
    await api.post(
      "/AllocationHumanDetails",
      payload
    );

  return unwrapResponse<
    AllocationHumanDetail
  >(response.data);
}

/**
 * Update Human Allocation Detail.
 */
export async function updateAllocationHumanDetail(
  id: number,
  payload: AllocationHumanDetailRequest
): Promise<AllocationHumanDetail> {
  validateId(
    id,
    "Allocation human detail ID"
  );

  const response =
    await api.put(
      `/AllocationHumanDetails/${id}`,
      payload
    );

  return unwrapResponse<
    AllocationHumanDetail
  >(response.data);
}

/**
 * Xóa Human Allocation Detail.
 */
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

/* =========================================================
   LAND ALLOCATION DETAILS
========================================================= */

/**
 * Lấy danh sách Land Allocation Details.
 */
export async function getAllocationLandDetails(
  query: AllocationLandDetailQuery = {}
): Promise<
  AllocationLandDetail[]
> {
  const response =
    await api.get(
      "/AllocationLandDetails",
      {
        params: cleanParams({
          Keyword:
            query.keyword,

          AllocationPlanId:
            query.allocationPlanId,

          ExperimentId:
            query.experimentId,

          LandId:
            query.landId,

          AreaId:
            query.areaId,

          ExpLandReqId:
            query.expLandReqId,

          Status:
            query.status,

          StartFrom:
            query.startFrom,

          StartTo:
            query.startTo,

          EndFrom:
            query.endFrom,

          EndTo:
            query.endTo,

          Page:
            query.page,

          Size:
            query.size,
        }),
      }
    );

  return normalizeList<
    AllocationLandDetail
  >(response.data);
}

export async function getAllAllocationLandDetails(): Promise<
  AllocationLandDetail[]
> {
  const pageSize = 100;
  const firstResponse = await api.get(
    "/AllocationLandDetails",
    {
      params: {
        Page: 1,
        Size: pageSize,
      },
    }
  );
  const firstPage = unwrapResponse<Record<string, unknown> | AllocationLandDetail[]>(
    firstResponse.data
  );
  const firstItems = normalizeList<AllocationLandDetail>(firstPage);
  const totalPages =
    firstPage && !Array.isArray(firstPage) &&
    typeof firstPage.totalPages === "number"
      ? firstPage.totalPages
      : 1;

  if (totalPages <= 1) return firstItems;

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      getAllocationLandDetails({
        page: index + 2,
        size: pageSize,
      })
    )
  );

  return firstItems.concat(...remainingPages);
}

/**
 * Lấy Land Allocation Detail theo ID.
 */
export async function getAllocationLandDetailById(
  id: number
): Promise<AllocationLandDetail> {
  validateId(
    id,
    "Allocation land detail ID"
  );

  const response =
    await api.get(
      `/AllocationLandDetails/${id}`
    );

  return unwrapResponse<
    AllocationLandDetail
  >(response.data);
}

/**
 * Tạo Land Allocation Detail.
 */
export async function createAllocationLandDetail(
  payload: AllocationLandDetailRequest
): Promise<AllocationLandDetail> {
  const response =
    await api.post(
      "/AllocationLandDetails",
      payload
    );

  return unwrapResponse<
    AllocationLandDetail
  >(response.data);
}

/**
 * Update Land Allocation Detail.
 */
export async function updateAllocationLandDetail(
  id: number,
  payload: AllocationLandDetailRequest
): Promise<AllocationLandDetail> {
  validateId(
    id,
    "Allocation land detail ID"
  );

  const response =
    await api.put(
      `/AllocationLandDetails/${id}`,
      payload
    );

  return unwrapResponse<
    AllocationLandDetail
  >(response.data);
}

/**
 * Xóa Land Allocation Detail.
 */
export async function deleteAllocationLandDetail(
  id: number
): Promise<void> {
  validateId(
    id,
    "Allocation land detail ID"
  );

  await api.delete(
    `/AllocationLandDetails/${id}`
  );
}