import api from "./api";

import type {
  EquipmentSubstitution,
  EquipmentSubstitutionQuery,
  EquipmentSubstitutionRequest,
} from "../types/equipmentSubstitution";

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

function normalizeEquipmentSubstitution(
  value: unknown,
  fallbackIndex: number = 0
): EquipmentSubstitution {
  const item =
    isRecord(value)
      ? value
      : {};

  const id =
    item.equipmentSubstitutionId ??
    item.EquipmentSubstitutionId ??
    item.equipmentSubstitutionID ??
    item.EquipmentSubstitutionID ??
    item.substitutionId ??
    item.SubstitutionId ??
    item.id ??
    item.Id ??
    item.ID ??
    (fallbackIndex + 1);

  const primaryTypeId =
    item.primaryEquipmentTypeId ??
    item.PrimaryEquipmentTypeId ??
    item.primaryEquipmentID ??
    item.PrimaryEquipmentID ??
    0;

  const subTypeId =
    item.subEquipmentTypeId ??
    item.SubEquipmentTypeId ??
    item.subEquipmentID ??
    item.SubEquipmentID ??
    0;

  return {
    equipmentSubstitutionId: Number(id),

    primaryEquipmentTypeId: Number(primaryTypeId),

    primaryEquipmentTypeName:
      normalizeNullableString(
        item.primaryEquipmentTypeName ??
          item.PrimaryEquipmentTypeName
      ),

    subEquipmentTypeId: Number(subTypeId),

    subEquipmentTypeName:
      normalizeNullableString(
        item.subEquipmentTypeName ??
          item.SubEquipmentTypeName
      ),

    efficiencyRate:
      Number(
        item.efficiencyRate ??
          item.EfficiencyRate ??
          0
      ),

    timeMultiplier:
      Number(
        item.timeMultiplier ??
          item.TimeMultiplier ??
          1
      ),

    note:
      normalizeNullableString(
        item.note ?? item.Note
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
  id: number
): void {
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Equipment substitution ID is invalid."
    );
  }
}

function validatePayload(
  payload: EquipmentSubstitutionRequest
): void {
  if (
    !Number.isInteger(
      payload.primaryEquipmentTypeId
    ) ||
    payload.primaryEquipmentTypeId <= 0
  ) {
    throw new Error(
      "Primary equipment type ID is invalid."
    );
  }

  if (
    !Number.isInteger(
      payload.subEquipmentTypeId
    ) ||
    payload.subEquipmentTypeId <= 0
  ) {
    throw new Error(
      "Substitute equipment type ID is invalid."
    );
  }

  if (
    payload.primaryEquipmentTypeId ===
    payload.subEquipmentTypeId
  ) {
    throw new Error(
      "Primary and substitute equipment types must be different."
    );
  }

  if (
    !Number.isFinite(
      payload.efficiencyRate
    ) ||
    payload.efficiencyRate <= 0 ||
    payload.efficiencyRate > 1
  ) {
    throw new Error(
      "Efficiency rate must be greater than 0 and less than or equal to 1."
    );
  }

  if (
    !Number.isFinite(
      payload.timeMultiplier
    ) ||
    payload.timeMultiplier <= 0
  ) {
    throw new Error(
      "Time multiplier must be greater than 0."
    );
  }
}

export async function getEquipmentSubstitutions(
  query: EquipmentSubstitutionQuery = {}
): Promise<EquipmentSubstitution[]> {
  const response =
    await api.get(
      "/EquipmentSubstitutions",
      {
        params: cleanParams({
          Keyword:
            query.keyword,

          PrimaryEquipmentTypeId:
            query.primaryEquipmentTypeId,

          SubEquipmentTypeId:
            query.subEquipmentTypeId,

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
    normalizeEquipmentSubstitution
  );
}

export async function getEquipmentSubstitutionById(
  id: number
): Promise<EquipmentSubstitution> {
  validateId(id);

  const response =
    await api.get(
      `/EquipmentSubstitutions/${id}`
    );

  return normalizeEquipmentSubstitution(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function createEquipmentSubstitution(
  payload: EquipmentSubstitutionRequest
): Promise<EquipmentSubstitution> {
  validatePayload(payload);

  const response =
    await api.post(
      "/EquipmentSubstitutions",
      payload
    );

  return normalizeEquipmentSubstitution(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function updateEquipmentSubstitution(
  id: number,
  payload: EquipmentSubstitutionRequest
): Promise<EquipmentSubstitution> {
  validateId(id);
  validatePayload(payload);

  const response =
    await api.put(
      `/EquipmentSubstitutions/${id}`,
      payload
    );

  return normalizeEquipmentSubstitution(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function deleteEquipmentSubstitution(
  id: number
): Promise<void> {
  validateId(id);

  await api.delete(
    `/EquipmentSubstitutions/${id}`
  );
}