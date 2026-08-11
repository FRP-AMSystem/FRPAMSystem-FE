import api from "./api";

import type {
  EquipmentConditionLevel,
  EquipmentInstance,
  EquipmentInstanceQuery,
  EquipmentInstanceRequest,
  EquipmentInstanceStatus,
} from "../types/equipmentInstance";

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

function normalizeStatus(
  value: unknown
): EquipmentInstanceStatus {
  switch (value) {
    case "Reserved":
    case "InUse":
    case "Maintenance":
    case "Broken":
    case "Unavailable":
      return value;

    case "Available":
    default:
      return "Available";
  }
}

function normalizeCondition(
  value: unknown
): EquipmentConditionLevel {
  switch (value) {
    case "New":
    case "Fair":
    case "Poor":
    case "Damaged":
      return value;

    case "Good":
    default:
      return "Good";
  }
}

function normalizeEquipmentInstance(
  value: unknown
): EquipmentInstance {
  const item =
    isRecord(value)
      ? value
      : {};

  return {
    equipmentInstanceId:
      Number(
        item.equipmentInstanceId ??
          item.instanceId ??
          item.id ??
          0
      ),

    equipmentTypeId:
      Number(
        item.equipmentTypeId ??
          0
      ),

    equipmentTypeName:
      normalizeNullableString(
        item.equipmentTypeName
      ),

    assetCode:
      typeof item.assetCode ===
      "string"
        ? item.assetCode
        : "",

    serialNumber:
      normalizeNullableString(
        item.serialNumber
      ),

    status:
      normalizeStatus(
        item.status
      ),

    conditionLevel:
      normalizeCondition(
        item.conditionLevel ??
          item.condition
      ),

    usageHours:
      Number(
        item.usageHours ??
          item.totalUsageHours ??
          0
      ),

    lastMaintenanceDate:
      normalizeNullableString(
        item.lastMaintenanceDate
      ),

    nextMaintenanceDate:
      normalizeNullableString(
        item.nextMaintenanceDate
      ),

    note:
      normalizeNullableString(
        item.note
      ),

    assignedToUserId:
      item.assignedToUserId ? Number(item.assignedToUserId) : null,

    assignedToUserName:
      normalizeNullableString(
        item.assignedToUserName
      ),

    receiptConfirmed:
      Boolean(item.receiptConfirmed),

    receiptConfirmedAt:
      normalizeNullableString(
        item.receiptConfirmedAt
      ),

    receiptNotes:
      normalizeNullableString(
        item.receiptNotes
      ),

    receivedCondition:
      item.receivedCondition ? normalizeCondition(item.receivedCondition) : null,

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

function validateId(
  id: number
): void {
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Equipment instance ID is invalid."
    );
  }
}

function validateEquipmentTypeId(
  equipmentTypeId: number
): void {
  if (
    !Number.isInteger(
      equipmentTypeId
    ) ||
    equipmentTypeId <= 0
  ) {
    throw new Error(
      "Equipment type ID is invalid."
    );
  }
}

export async function getEquipmentInstances(
  query: EquipmentInstanceQuery = {}
): Promise<EquipmentInstance[]> {
  const response =
    await api.get(
      "/EquipmentInstances",
      {
        params: cleanParams({
          Keyword:
            query.keyword,

          EquipmentTypeId:
            query.equipmentTypeId,

          EquipmentCategoryId:
            undefined,

          Status:
            query.status,

          ConditionLevel:
            query.conditionLevel,

          Page:
            query.page ?? 1,

          Size:
            query.size ?? 200,
        }),
      }
    );

  return normalizeList(
    response.data
  ).map(
    normalizeEquipmentInstance
  );
}

export async function getAvailableEquipmentInstances(
  equipmentTypeId: number
): Promise<EquipmentInstance[]> {
  validateEquipmentTypeId(
    equipmentTypeId
  );

  const instances =
    await getEquipmentInstances({
      equipmentTypeId,
      status: "Available",
      page: 1,
      size: 300,
    });

  return instances.filter(
    (instance) =>
      instance.equipmentTypeId ===
        equipmentTypeId &&
      instance.status ===
        "Available"
  );
}

export async function getEquipmentInstanceById(
  id: number
): Promise<EquipmentInstance> {
  validateId(id);

  const response =
    await api.get(
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
  const response =
    await api.post(
      "/EquipmentInstances",
      payload
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
  validateId(id);

  const response =
    await api.put(
      `/EquipmentInstances/${id}`,
      payload
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
  validateId(id);

  await api.delete(
    `/EquipmentInstances/${id}`
  );
}

export async function confirmEquipmentReceipt(
  id: number,
  payload: {
    receivedCondition: EquipmentConditionLevel;
    receiptNotes?: string;
  }
): Promise<EquipmentInstance> {
  validateId(id);

  try {
    const response = await api.post(
      `/EquipmentInstances/${id}/confirm-receipt`,
      payload
    );
    return normalizeEquipmentInstance(unwrapResponse<unknown>(response.data));
  } catch {
    // Fallback: update status and condition if direct receipt API endpoint is not present on backend
    const instance = await getEquipmentInstanceById(id);
    const updated = await updateEquipmentInstance(id, {
      equipmentTypeId: instance.equipmentTypeId,
      assetCode: instance.assetCode,
      serialNumber: instance.serialNumber,
      status: "InUse",
      conditionLevel: payload.receivedCondition,
      usageHours: instance.usageHours,
      lastMaintenanceDate: instance.lastMaintenanceDate,
      nextMaintenanceDate: instance.nextMaintenanceDate,
      note: payload.receiptNotes
        ? `[Receipt Confirmed]: ${payload.receiptNotes}`
        : instance.note,
    });

    return {
      ...updated,
      receiptConfirmed: true,
      receiptConfirmedAt: new Date().toISOString(),
      receiptNotes: payload.receiptNotes || null,
      receivedCondition: payload.receivedCondition,
    };
  }
}