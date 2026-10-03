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
  return typeof value === "object" && value !== null;
}

function unwrapResponse<T>(
  payload: unknown
): T {
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

function normalizeList(
  payload: unknown
): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if ("data" in payload) {
    return normalizeList(payload.data);
  }

  if ("result" in payload) {
    return normalizeList(payload.result);
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
    case "Damaged":
    case "Missing":
    case "Returned":
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
    case "Fair":
    case "Poor":
    case "Critical":
    case "New":
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
  const item = isRecord(value) ? value : {};

  const totalUsageHours = Number(
    item.totalUsageHours ??
    item.usageHours ??
    0
  );

  return {
    equipmentInstanceId: Number(
      item.equipmentInstanceId ??
      item.instanceId ??
      item.id ??
      0
    ),

    equipmentTypeId: Number(
      item.equipmentTypeId ?? 0
    ),

    equipmentTypeName:
      normalizeNullableString(
        item.equipmentTypeName
      ),

    assetCode:
      typeof item.assetCode === "string"
        ? item.assetCode
        : "",

    serialNumber:
      normalizeNullableString(
        item.serialNumber
      ),

    totalUsageHours,
    usageHours: totalUsageHours,

    lastMaintenanceDate:
      normalizeNullableString(
        item.lastMaintenanceDate
      ),

    usageHoursSinceMaintenance:
      Number(
        item.usageHoursSinceMaintenance ??
        0
      ),

    nextMaintenanceDate:
      normalizeNullableString(
        item.nextMaintenanceDate
      ),

    conditionLevel:
      normalizeCondition(
        item.conditionLevel ??
        item.condition
      ),

    status:
      normalizeStatus(
        item.status
      ),

    effectiveMaintenanceIntervalHours:
      item.effectiveMaintenanceIntervalHours === null ||
        item.effectiveMaintenanceIntervalHours === undefined
        ? null
        : Number(
          item.effectiveMaintenanceIntervalHours
        ),

    maintenanceCount:
      Number(
        item.maintenanceCount ?? 0
      ),

    note:
      normalizeNullableString(
        item.note
      ),

    assignedToUserId:
      item.assignedToUserId === null ||
        item.assignedToUserId === undefined
        ? null
        : Number(
          item.assignedToUserId
        ),

    assignedToUserName:
      normalizeNullableString(
        item.assignedToUserName
      ),

    receiptConfirmed:
      Boolean(
        item.receiptConfirmed
      ),

    receiptConfirmedAt:
      normalizeNullableString(
        item.receiptConfirmedAt
      ),

    receiptNotes:
      normalizeNullableString(
        item.receiptNotes
      ),

    receivedCondition:
      item.receivedCondition
        ? normalizeCondition(
          item.receivedCondition
        )
        : null,

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
  id: number,
  fieldName = "Equipment instance ID"
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

function toApiPayload(
  payload: EquipmentInstanceRequest
) {
  validateEquipmentTypeId(
    payload.equipmentTypeId
  );

  return {
    equipmentTypeId:
      payload.equipmentTypeId,

    assetCode:
      payload.assetCode.trim() ||
      null,

    serialNumber:
      payload.serialNumber?.trim() ||
      null,

    totalUsageHours:
      Number(
        payload.totalUsageHours ??
        payload.usageHours ??
        0
      ),

    lastMaintenanceDate:
      payload.lastMaintenanceDate ||
      null,

    usageHoursSinceMaintenance:
      Number(
        payload.usageHoursSinceMaintenance ??
        0
      ),

    nextMaintenanceDate:
      payload.nextMaintenanceDate ||
      null,

    conditionLevel:
      payload.conditionLevel,

    status:
      payload.status,

    effectiveMaintenanceIntervalHours:
      payload.effectiveMaintenanceIntervalHours ??
      null,

    maintenanceCount:
      Number(
        payload.maintenanceCount ??
        0
      ),

    note:
      payload.note?.trim() ||
      null,
  };
}

export async function getEquipmentInstances(
  query: EquipmentInstanceQuery = {}
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
    toApiPayload(payload)
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

  const response = await api.put(
    `/EquipmentInstances/${id}`,
    toApiPayload(payload)
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
    note?: string;
  } = {}
): Promise<void> {
  validateId(id);

  await api.post(
    "/EquipmentInstances/confirm",
    {
      equipmentInstanceIds: [
        id,
      ],
      confirmAction:
        "Confirm",
      note:
        payload.note?.trim() ||
        null,
    }
  );
}

export async function returnEquipmentInstance(
  id: number,
  payload: {
    returnCondition: EquipmentConditionLevel;
    returnNotes?: string;
    usageHoursIncrement?: number;
  }
): Promise<EquipmentInstance> {
  validateId(
    id,
    "Equipment instance ID"
  );

  const instance =
    await getEquipmentInstanceById(id);

  const nextUsage =
    instance.totalUsageHours +
    (payload.usageHoursIncrement ??
      0);

  return updateEquipmentInstance(
    id,
    {
      equipmentTypeId:
        instance.equipmentTypeId,

      assetCode:
        instance.assetCode,

      serialNumber:
        instance.serialNumber,

      totalUsageHours:
        nextUsage,

      lastMaintenanceDate:
        instance.lastMaintenanceDate,

      usageHoursSinceMaintenance:
        instance.usageHoursSinceMaintenance,

      nextMaintenanceDate:
        instance.nextMaintenanceDate,

      conditionLevel:
        payload.returnCondition,

      status:
        "Available",

      effectiveMaintenanceIntervalHours:
        instance.effectiveMaintenanceIntervalHours,

      maintenanceCount:
        instance.maintenanceCount,

      note:
        payload.returnNotes
          ? `[Returned]: ${payload.returnNotes}\n${instance.note || ""}`.trim()
          : instance.note,
    }
  );
}
