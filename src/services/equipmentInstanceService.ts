import api from "./api";

import type {
  EquipmentConditionLevel,
  EquipmentInstance,
  EquipmentInstanceFilter,
  EquipmentInstanceRequest,
  EquipmentInstanceStatus,
} from "../types/equipment";

function validateId(
  id: number,
  fieldName: string
): void {
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
  return (
    typeof value === "object" &&
    value !== null
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

function normalizeList<T>(
  payload: unknown
): T[] {
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
    const items = normalizeList<T>(
      payload.data
    );

    if (
      items.length > 0 ||
      Array.isArray(payload.data)
    ) {
      return items;
    }
  }

  if ("result" in payload) {
    const items = normalizeList<T>(
      payload.result
    );

    if (
      items.length > 0 ||
      Array.isArray(payload.result)
    ) {
      return items;
    }
  }

  return [];
}

function normalizeConditionLevel(
  value: unknown
): EquipmentConditionLevel {
  if (
    value === "Good" ||
    value === "Fair" ||
    value === "Poor" ||
    value === "Broken"
  ) {
    return value;
  }

  return "Good";
}

function normalizeStatus(
  value: unknown
): EquipmentInstanceStatus {
  if (
    value === "Available" ||
    value === "Reserved" ||
    value === "InUse" ||
    value === "Maintenance" ||
    value === "Damaged" ||
    value === "Missing"
  ) {
    return value;
  }

  return "Available";
}

function normalizeOptionalNumber(
  value: unknown
): number | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : null;
}

function normalizeEquipmentInstance(
  value: unknown
): EquipmentInstance {
  const item = isRecord(value)
    ? value
    : {};

  const equipmentTypeName =
    typeof item.equipmentTypeName ===
    "string"
      ? item.equipmentTypeName
      : typeof item.typeName === "string"
        ? item.typeName
        : typeof item.name === "string"
          ? item.name
          : "";

  const equipmentCategoryName =
    typeof item.equipmentCategoryName ===
    "string"
      ? item.equipmentCategoryName
      : typeof item.categoryName ===
          "string"
        ? item.categoryName
        : "";

  const assetCode =
    typeof item.assetCode === "string"
      ? item.assetCode
      : typeof item.code === "string"
        ? item.code
        : null;

  const instanceName =
    typeof item.instanceName === "string"
      ? item.instanceName
      : assetCode ||
        equipmentTypeName ||
        "";

  return {
    equipmentInstanceId: Number(
      item.equipmentInstanceId ?? 0
    ),

    equipmentTypeId: Number(
      item.equipmentTypeId ?? 0
    ),

    equipmentTypeName,
    typeName: equipmentTypeName,

    equipmentCategoryId:
      normalizeOptionalNumber(
        item.equipmentCategoryId
      ) ?? undefined,

    equipmentCategoryName,

    instanceName,

    assetCode,
    code: assetCode,

    serialNumber:
      typeof item.serialNumber === "string"
        ? item.serialNumber
        : null,

    totalUsageHours: Number(
      item.totalUsageHours ?? 0
    ),

    usageHoursSinceMaintenance: Number(
      item.usageHoursSinceMaintenance ?? 0
    ),

    lastMaintenanceDate:
      typeof item.lastMaintenanceDate ===
      "string"
        ? item.lastMaintenanceDate
        : null,

    nextMaintenanceDate:
      typeof item.nextMaintenanceDate ===
      "string"
        ? item.nextMaintenanceDate
        : null,

    conditionLevel:
      normalizeConditionLevel(
        item.conditionLevel
      ),

    status: normalizeStatus(
      item.status
    ),

    effectiveMaintenanceIntervalHours:
      normalizeOptionalNumber(
        item.effectiveMaintenanceIntervalHours
      ),

    maintenanceCount: Number(
      item.maintenanceCount ?? 0
    ),

    location:
      typeof item.location === "string"
        ? item.location
        : null,

    note:
      typeof item.note === "string"
        ? item.note
        : null,

    description:
      typeof item.description === "string"
        ? item.description
        : null,

    createdAt:
      typeof item.createdAt === "string"
        ? item.createdAt
        : null,

    updatedAt:
      typeof item.updatedAt === "string"
        ? item.updatedAt
        : null,
  };
}

function normalizeRequest(
  payload: EquipmentInstanceRequest
): EquipmentInstanceRequest {
  validateId(
    payload.equipmentTypeId,
    "Equipment type ID"
  );

  return {
    equipmentTypeId:
      payload.equipmentTypeId,

    assetCode:
      payload.assetCode?.trim() ||
      null,

    serialNumber:
      payload.serialNumber?.trim() ||
      null,

    totalUsageHours: Number(
      payload.totalUsageHours
    ),

    lastMaintenanceDate:
      payload.lastMaintenanceDate ||
      null,

    usageHoursSinceMaintenance:
      Number(
        payload.usageHoursSinceMaintenance
      ),

    nextMaintenanceDate:
      payload.nextMaintenanceDate ||
      null,

    conditionLevel:
      payload.conditionLevel,

    status:
      payload.status,

    effectiveMaintenanceIntervalHours:
      payload.effectiveMaintenanceIntervalHours ===
        null ||
      payload.effectiveMaintenanceIntervalHours ===
        undefined
        ? null
        : Number(
            payload.effectiveMaintenanceIntervalHours
          ),

    maintenanceCount: Number(
      payload.maintenanceCount
    ),

    note:
      payload.note?.trim() ||
      null,
  };
}

export async function getEquipmentInstances(
  query: EquipmentInstanceFilter = {}
): Promise<EquipmentInstance[]> {
  const response = await api.get(
    "/EquipmentInstances",
    {
      params: cleanParams({
        Keyword:
          query.keyword,

        EquipmentTypeId:
          query.equipmentTypeId,

        EquipmentCategoryId:
          query.equipmentCategoryId,

        ConditionLevel:
          query.conditionLevel,

        Status:
          query.status,

        Page:
          query.page,

        Size:
          query.size,
      }),
    }
  );

  return normalizeList<unknown>(
    response.data
  ).map(normalizeEquipmentInstance);
}

export async function getAvailableEquipmentInstances(
  equipmentTypeId?: number
): Promise<EquipmentInstance[]> {
  return getEquipmentInstances({
    equipmentTypeId,
    status: "Available",
    page: 1,
    size: 100,
  });
}

export async function getEquipmentInstanceById(
  id: number
): Promise<EquipmentInstance> {
  validateId(
    id,
    "Equipment instance ID"
  );

  const response = await api.get(
    `/EquipmentInstances/${id}`
  );

  return normalizeEquipmentInstance(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function createEquipmentInstance(
  payload: EquipmentInstanceRequest
): Promise<EquipmentInstance> {
  const response = await api.post(
    "/EquipmentInstances",
    normalizeRequest(payload)
  );

  return normalizeEquipmentInstance(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function updateEquipmentInstance(
  id: number,
  payload: EquipmentInstanceRequest
): Promise<EquipmentInstance> {
  validateId(
    id,
    "Equipment instance ID"
  );

  const response = await api.put(
    `/EquipmentInstances/${id}`,
    normalizeRequest(payload)
  );

  return normalizeEquipmentInstance(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function deleteEquipmentInstance(
  id: number
): Promise<void> {
  validateId(
    id,
    "Equipment instance ID"
  );

  await api.delete(
    `/EquipmentInstances/${id}`
  );
}