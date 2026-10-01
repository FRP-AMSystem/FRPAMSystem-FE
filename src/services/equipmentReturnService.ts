import apiClient from "./api";

import type {
  EquipmentReturn,
  EquipmentReturnFilter,
  EquipmentReturnMineRequest,
  EquipmentReturnRequest,
  RejectReturnRequest,
} from "../types/equipmentReturn";

/**
 * ============================================================
 * GET EQUIPMENT RETURNS
 * ============================================================
 *
 * GET /api/EquipmentReturns
 */
export async function getEquipmentReturns(
  filters: EquipmentReturnFilter = {}
): Promise<EquipmentReturn[]> {
  const params: Record<string, unknown> = {};

  if (
    filters.allocationEquipmentDetailId !==
    undefined
  ) {
    params.AllocationEquipmentDetailId =
      filters.allocationEquipmentDetailId;
  }

  if (
    filters.equipmentInstanceId !==
    undefined
  ) {
    params.EquipmentInstanceId =
      filters.equipmentInstanceId;
  }

  if (
    filters.returnedBy !==
    undefined
  ) {
    params.ReturnedBy =
      filters.returnedBy;
  }

  if (
    filters.receivedBy !==
    undefined
  ) {
    params.ReceivedBy =
      filters.receivedBy;
  }

  if (
    filters.status !==
    undefined &&
    filters.status !== ""
  ) {
    params.Status =
      filters.status;
  }

  if (
    filters.isDamaged !==
    undefined
  ) {
    params.IsDamaged =
      filters.isDamaged;
  }

  if (
    filters.returnDateFrom !==
    undefined &&
    filters.returnDateFrom !== ""
  ) {
    params.ReturnDateFrom =
      filters.returnDateFrom;
  }

  if (
    filters.returnDateTo !==
    undefined &&
    filters.returnDateTo !== ""
  ) {
    params.ReturnDateTo =
      filters.returnDateTo;
  }

  if (
    filters.page !==
    undefined
  ) {
    params.Page =
      filters.page;
  }

  if (
    filters.size !==
    undefined
  ) {
    params.Size =
      filters.size;
  }

  const response =
    await apiClient.get(
      "/EquipmentReturns",
      {
        params,
      }
    );

  const extractItems = (payload: unknown): unknown[] => {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (!payload || typeof payload !== "object") {
      return [];
    }

    const result = payload as Record<string, unknown>;
    for (const key of ["data", "result", "items", "records"]) {
      if (key in result) {
        const items = extractItems(result[key]);
        if (items.length > 0 || Array.isArray(result[key])) {
          return items;
        }
      }
    }

    return [];
  };

  return extractItems(response.data).map((item) => {
    const record = item as Record<string, unknown>;
    return {
      ...record,
      id: Number(record.id ?? record.returnId),
    } as unknown as EquipmentReturn;
  });
}

/**
 * ============================================================
 * GET EQUIPMENT RETURN BY ID
 * ============================================================
 *
 * GET /api/EquipmentReturns/{id}
 */
export async function getEquipmentReturnById(
  id: number
): Promise<EquipmentReturn> {
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Equipment return ID is invalid."
    );
  }

  const response =
    await apiClient.get(
      `/EquipmentReturns/${id}`
    );

  const data = response.data;

  if (
    data &&
    data.data !== undefined
  ) {
    return data.data as EquipmentReturn;
  }

  return data as EquipmentReturn;
}

/**
 * ============================================================
 * CREATE EQUIPMENT RETURN
 * ============================================================
 *
 * POST /api/EquipmentReturns
 *
 * Giữ lại function này vì project
 * đang có EquipmentReturnRequest.
 */
export async function createEquipmentReturn(
  payload: EquipmentReturnRequest
): Promise<EquipmentReturn> {
  const response =
    await apiClient.post(
      "/EquipmentReturns",
      payload
    );

  const data = response.data;

  if (
    data &&
    data.data !== undefined
  ) {
    return data.data as EquipmentReturn;
  }

  return data as EquipmentReturn;
}

/**
 * ============================================================
 * UPDATE EQUIPMENT RETURN
 * ============================================================
 *
 * PUT /api/EquipmentReturns/{id}
 */
export async function updateEquipmentReturn(
  id: number,
  payload: EquipmentReturnRequest
): Promise<EquipmentReturn> {
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Equipment return ID is invalid."
    );
  }

  const response =
    await apiClient.put(
      `/EquipmentReturns/${id}`,
      payload
    );

  const data = response.data;

  if (
    data &&
    data.data !== undefined
  ) {
    return data.data as EquipmentReturn;
  }

  return data as EquipmentReturn;
}

/**
 * ============================================================
 * DELETE EQUIPMENT RETURN
 * ============================================================
 *
 * DELETE /api/EquipmentReturns/{id}
 */
export async function deleteEquipmentReturn(
  id: number
): Promise<void> {
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Equipment return ID is invalid."
    );
  }

  await apiClient.delete(
    `/EquipmentReturns/${id}`
  );
}

/**
 * ============================================================
 * SUBMIT MY EQUIPMENT RETURN
 * ============================================================
 *
 * PATCH
 * /api/EquipmentReturns/mine/{allocationEquipmentDetailId}/return
 *
 * Body:
 *
 * {
 *   conditionAfter?: string | null;
 *   isDamaged: boolean;
 *   damageDescription?: string | null;
 *   note?: string | null;
 * }
 */
export async function submitMyEquipmentReturn(
  allocationEquipmentDetailId: number,
  payload: EquipmentReturnMineRequest
): Promise<EquipmentReturn> {
  if (
    !Number.isInteger(
      allocationEquipmentDetailId
    ) ||
    allocationEquipmentDetailId <= 0
  ) {
    throw new Error(
      "Allocation equipment detail ID is invalid."
    );
  }

  const response =
    await apiClient.patch(
      `/EquipmentReturns/mine/${allocationEquipmentDetailId}/return`,
      payload
    );

  const data = response.data;

  if (
    data &&
    data.data !== undefined
  ) {
    return data.data as EquipmentReturn;
  }

  return data as EquipmentReturn;
}

/**
 * ============================================================
 * CONFIRM EQUIPMENT RETURN
 * ============================================================
 *
 * PATCH
 * /api/EquipmentReturns/{id}/confirm
 */
export async function confirmEquipmentReturn(
  id: number
): Promise<EquipmentReturn | void> {
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Equipment return ID is invalid."
    );
  }

  const response =
    await apiClient.patch(
      `/EquipmentReturns/${id}/confirm`
    );

  const data = response.data;

  if (
    data &&
    data.data !== undefined
  ) {
    return data.data as EquipmentReturn;
  }

  if (
    data &&
    typeof data === "object"
  ) {
    return data as EquipmentReturn;
  }

  return;
}

/**
 * ============================================================
 * REJECT EQUIPMENT RETURN
 * ============================================================
 *
 * PATCH
 * /api/EquipmentReturns/{id}/reject
 *
 * Body:
 *
 * {
 *   reason?: string | null;
 * }
 */
export async function rejectEquipmentReturn(
  id: number,
  payload: RejectReturnRequest
): Promise<EquipmentReturn | void> {
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Equipment return ID is invalid."
    );
  }

  const response =
    await apiClient.patch(
      `/EquipmentReturns/${id}/reject`,
      payload
    );

  const data = response.data;

  if (
    data &&
    data.data !== undefined
  ) {
    return data.data as EquipmentReturn;
  }

  if (
    data &&
    typeof data === "object"
  ) {
    return data as EquipmentReturn;
  }

  return;
}

/**
 * ============================================================
 * DEFAULT SERVICE
 * ============================================================
 *
 * Có thể dùng theo 2 cách:
 *
 * 1. Named import:
 *
 * import {
 *   getEquipmentReturns,
 *   rejectEquipmentReturn
 * } from "...";
 *
 * 2. Default import:
 *
 * import equipmentReturnService from "...";
 */
const equipmentReturnService = {
  getEquipmentReturns,
  getEquipmentReturnById,
  createEquipmentReturn,
  updateEquipmentReturn,
  deleteEquipmentReturn,
  submitMyEquipmentReturn,
  confirmEquipmentReturn,
  rejectEquipmentReturn,
};

export default equipmentReturnService;