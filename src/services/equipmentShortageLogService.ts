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
  value: unknown,
  fallbackIndex: number = 0
): EquipmentShortageLog {
  const item =
    isRecord(value)
      ? value
      : {};

  const id =
    item.equipmentShortageLogId ??
    item.EquipmentShortageLogId ??
    item.equipmentShortageLogID ??
    item.EquipmentShortageLogID ??
    item.shortageLogId ??
    item.ShortageLogId ??
    item.id ??
    item.Id ??
    item.ID ??
    (fallbackIndex + 1);

  return {
    equipmentShortageLogId: Number(id),

    allocationPlanId: Number(
      item.allocationPlanId ??
        item.AllocationPlanId ??
        0
    ),

    allocationPlanName:
      normalizeNullableString(
        item.allocationPlanName ??
          item.AllocationPlanName
      ),

    experimentId:
      normalizeNullableNumber(
        item.experimentId ??
          item.ExperimentId
      ),

    experimentName:
      normalizeNullableString(
        item.experimentName ??
          item.ExperimentName
      ),

    expEquipmentReqId:
      normalizeNullableNumber(
        item.expEquipmentReqId ??
          item.ExpEquipmentReqId ??
          item.experimentRequirementId ??
          item.ExperimentRequirementId
      ),

    phaseEquipmentReqId:
      normalizeNullableNumber(
        item.phaseEquipmentReqId ??
          item.PhaseEquipmentReqId ??
          item.phaseRequirementId ??
          item.PhaseRequirementId
      ),

    phaseId:
      normalizeNullableNumber(
        item.phaseId ?? item.PhaseId
      ),

    phaseName:
      normalizeNullableString(
        item.phaseName ?? item.PhaseName
      ),

    equipmentTypeId:
      normalizeNullableNumber(
        item.equipmentTypeId ??
          item.EquipmentTypeId
      ),

    equipmentTypeName:
      normalizeNullableString(
        item.equipmentTypeName ??
          item.EquipmentTypeName
      ),

    requiredQuantity:
      normalizeNullableNumber(
        item.requiredQuantity ??
          item.RequiredQuantity
      ),

    allocatedQuantity:
      normalizeNullableNumber(
        item.allocatedQuantity ??
          item.AllocatedQuantity
      ),

    shortageQuantity: Number(
      item.shortageQuantity ??
        item.ShortageQuantity ??
        0
    ),

    createdAt:
      normalizeNullableString(
        item.createdAt ?? item.CreatedAt
      ),

    updatedAt:
      normalizeNullableString(
        item.updatedAt ?? item.UpdatedAt
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
  ).map((item, index) =>
    normalizeEquipmentShortageLog(item, index)
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