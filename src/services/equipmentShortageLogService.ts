import api from "./api";

import type {
  EquipmentShortageLog,
  EquipmentShortageLogQuery,
  EquipmentShortageLogRequest,
} from "../types/equipmentShortageLog";

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null
  );
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

function normalizeList(
  payload: unknown
): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  if (
    Array.isArray(
      payload.items
    )
  ) {
    return payload.items;
  }

  if ("data" in payload) {
    return normalizeList(
      payload.data
    );
  }

  if ("result" in payload) {
    return normalizeList(
      payload.result
    );
  }

  return [];
}

function normalizeNullableString(
  value: unknown
): string | null {
  return typeof value === "string"
    ? value
    : null;
}

function normalizeNullableNumber(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const normalizedValue =
    Number(value);

  return Number.isFinite(
    normalizedValue
  )
    ? normalizedValue
    : null;
}

function normalizeEquipmentShortageLog(
  value: unknown
): EquipmentShortageLog {
  const item =
    isRecord(value)
      ? value
      : {};

  return {
    equipmentShortageLogId: Number(
      item.equipmentShortageLogId ??
        item.shortageLogId ??
        item.id ??
        0
    ),

    allocationPlanId: Number(
      item.allocationPlanId ??
        0
    ),

    allocationPlanName:
      normalizeNullableString(
        item.allocationPlanName
      ),

    experimentId:
      normalizeNullableNumber(
        item.experimentId
      ),

    experimentName:
      normalizeNullableString(
        item.experimentName
      ),

    expEquipmentReqId:
      normalizeNullableNumber(
        item.expEquipmentReqId
      ),

    phaseEquipmentReqId:
      normalizeNullableNumber(
        item.phaseEquipmentReqId
      ),

    phaseId:
      normalizeNullableNumber(
        item.phaseId
      ),

    phaseName:
      normalizeNullableString(
        item.phaseName
      ),

    equipmentTypeId:
      normalizeNullableNumber(
        item.equipmentTypeId
      ),

    equipmentTypeName:
      normalizeNullableString(
        item.equipmentTypeName
      ),

    requiredQuantity:
      normalizeNullableNumber(
        item.requiredQuantity
      ),

    allocatedQuantity:
      normalizeNullableNumber(
        item.allocatedQuantity
      ),

    shortageQuantity: Number(
      item.shortageQuantity ??
        0
    ),

    createdAt:
      normalizeNullableString(
        item.createdAt
      ),

    updatedAt:
      normalizeNullableString(
        item.updatedAt
      ),
  };
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

function validatePayload(
  payload: EquipmentShortageLogRequest
): void {
  validateId(
    payload.allocationPlanId,
    "Allocation plan ID"
  );

  if (
    payload.expEquipmentReqId !==
      null &&
    payload.expEquipmentReqId !==
      undefined
  ) {
    validateId(
      payload.expEquipmentReqId,
      "Experiment equipment requirement ID"
    );
  }

  if (
    payload.phaseEquipmentReqId !==
      null &&
    payload.phaseEquipmentReqId !==
      undefined
  ) {
    validateId(
      payload.phaseEquipmentReqId,
      "Phase equipment requirement ID"
    );
  }

  const hasExperimentRequirement =
    payload.expEquipmentReqId !==
      null &&
    payload.expEquipmentReqId !==
      undefined;

  const hasPhaseRequirement =
    payload.phaseEquipmentReqId !==
      null &&
    payload.phaseEquipmentReqId !==
      undefined;

  if (
    hasExperimentRequirement ===
    hasPhaseRequirement
  ) {
    throw new Error(
      "Select exactly one experiment or phase equipment requirement."
    );
  }

  if (
    !Number.isInteger(
      payload.shortageQuantity
    ) ||
    payload.shortageQuantity <= 0
  ) {
    throw new Error(
      "Shortage quantity must be a positive integer."
    );
  }
}

export async function getEquipmentShortageLogs(
  query: EquipmentShortageLogQuery = {}
): Promise<EquipmentShortageLog[]> {
  const response =
    await api.get(
      "/EquipmentShortageLogs",
      {
        params: cleanParams({
          AllocationPlanId:
            query.allocationPlanId,

          ExpEquipmentReqId:
            query.expEquipmentReqId,

          PhaseEquipmentReqId:
            query.phaseEquipmentReqId,

          Page:
            query.page ?? 1,

          Size:
            query.size ?? 300,
        }),
      }
    );

  return normalizeList(
    response.data
  ).map(
    normalizeEquipmentShortageLog
  );
}

export async function getEquipmentShortageLogById(
  id: number
): Promise<EquipmentShortageLog> {
  validateId(
    id,
    "Equipment shortage log ID"
  );

  const response =
    await api.get(
      `/EquipmentShortageLogs/${id}`
    );

  return normalizeEquipmentShortageLog(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function createEquipmentShortageLog(
  payload: EquipmentShortageLogRequest
): Promise<EquipmentShortageLog> {
  validatePayload(payload);

  const response =
    await api.post(
      "/EquipmentShortageLogs",
      payload
    );

  return normalizeEquipmentShortageLog(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function updateEquipmentShortageLog(
  id: number,
  payload: EquipmentShortageLogRequest
): Promise<EquipmentShortageLog> {
  validateId(
    id,
    "Equipment shortage log ID"
  );

  validatePayload(payload);

  const response =
    await api.put(
      `/EquipmentShortageLogs/${id}`,
      payload
    );

  return normalizeEquipmentShortageLog(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function deleteEquipmentShortageLog(
  id: number
): Promise<void> {
  validateId(
    id,
    "Equipment shortage log ID"
  );

  await api.delete(
    `/EquipmentShortageLogs/${id}`
  );
}