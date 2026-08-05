import api from "./api";

export type EquipmentTrackingType =
  | "QuantityBased"
  | "Individual";

export interface EquipmentType {
  equipmentTypeId: number;
  equipmentCategoryId: number;

  equipmentCategoryName?: string;

  name: string;
  equipmentTypeName: string;

  trackingType: EquipmentTrackingType;
  baseMaintenanceIntervalHours?: number | null;
  totalQuantity: number;
  description?: string | null;

  createdAt?: string;
  updatedAt?: string | null;
}

export interface EquipmentTypeRequest {
  equipmentCategoryId: number;
  name: string;
  trackingType: EquipmentTrackingType;
  baseMaintenanceIntervalHours?: number | null;
  totalQuantity: number;
  description?: string | null;
}

export interface EquipmentTypeQuery {
  keyword?: string;
  equipmentCategoryId?: number;
  trackingType?: EquipmentTrackingType;
  page?: number;
  size?: number;
}

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

function normalizeEquipmentType(
  value: unknown
): EquipmentType {
  const item = isRecord(value) ? value : {};

  const name =
    typeof item.name === "string"
      ? item.name
      : typeof item.equipmentTypeName === "string"
        ? item.equipmentTypeName
        : "";

  return {
    ...(item as unknown as EquipmentType),
    equipmentTypeId: Number(item.equipmentTypeId ?? 0),
    equipmentCategoryId: Number(
      item.equipmentCategoryId ?? 0
    ),
    name,
    equipmentTypeName: name,
    trackingType:
      item.trackingType === "Individual"
        ? "Individual"
        : "QuantityBased",
    totalQuantity: Number(item.totalQuantity ?? 0),
    baseMaintenanceIntervalHours:
      item.baseMaintenanceIntervalHours === null ||
      item.baseMaintenanceIntervalHours === undefined
        ? null
        : Number(item.baseMaintenanceIntervalHours),
    description:
      typeof item.description === "string"
        ? item.description
        : null,
  };
}

export async function getEquipmentTypes(
  query: EquipmentTypeQuery = {}
): Promise<EquipmentType[]> {
  const response = await api.get("/EquipmentTypes", {
    params: cleanParams({
      Keyword: query.keyword,
      EquipmentCategoryId: query.equipmentCategoryId,
      TrackingType: query.trackingType,
      Page: query.page,
      Size: query.size,
    }),
  });

  return normalizeList<unknown>(response.data).map(
    normalizeEquipmentType
  );
}

export async function getEquipmentTypeById(
  id: number
): Promise<EquipmentType> {
  validateId(id, "Equipment type ID");

  const response = await api.get(`/EquipmentTypes/${id}`);

  return normalizeEquipmentType(
    unwrapResponse<unknown>(response.data)
  );
}

export async function createEquipmentType(
  payload: EquipmentTypeRequest
): Promise<EquipmentType> {
  const response = await api.post(
    "/EquipmentTypes",
    payload
  );

  return normalizeEquipmentType(
    unwrapResponse<unknown>(response.data)
  );
}

export async function updateEquipmentType(
  id: number,
  payload: EquipmentTypeRequest
): Promise<EquipmentType> {
  validateId(id, "Equipment type ID");

  const response = await api.put(
    `/EquipmentTypes/${id}`,
    payload
  );

  return normalizeEquipmentType(
    unwrapResponse<unknown>(response.data)
  );
}

export async function deleteEquipmentType(
  id: number
): Promise<void> {
  validateId(id, "Equipment type ID");

  await api.delete(`/EquipmentTypes/${id}`);
}
