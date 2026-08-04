import api from "./api";

import type {
  EquipmentCategory,
  EquipmentCategoryQuery,
  EquipmentCategoryRequest,
} from "../types/equipmentCategory";

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
    return normalizeList<T>(
      payload.data
    );
  }

  if ("result" in payload) {
    return normalizeList<T>(
      payload.result
    );
  }

  return [];
}

function normalizeEquipmentCategory(
  value: unknown
): EquipmentCategory {
  const item =
    isRecord(value)
      ? value
      : {};

  const equipmentCategoryName =
    typeof item.equipmentCategoryName ===
    "string"
      ? item.equipmentCategoryName
      : typeof item.categoryName ===
          "string"
        ? item.categoryName
        : typeof item.name ===
            "string"
          ? item.name
          : "";

  return {
    equipmentCategoryId: Number(
      item.equipmentCategoryId ??
        item.categoryId ??
        item.id ??
        0
    ),

    equipmentCategoryName,

    description:
      typeof item.description ===
      "string"
        ? item.description
        : null,

    createdAt:
      typeof item.createdAt ===
      "string"
        ? item.createdAt
        : null,

    updatedAt:
      typeof item.updatedAt ===
      "string"
        ? item.updatedAt
        : null,
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
      "Equipment category ID is invalid."
    );
  }
}

export async function getEquipmentCategories(
  query: EquipmentCategoryQuery = {}
): Promise<EquipmentCategory[]> {
  const response =
    await api.get(
      "/EquipmentCategories",
      {
        params: cleanParams({
          Keyword:
            query.keyword,

          Page:
            query.page ?? 1,

          Size:
            query.size ?? 200,
        }),
      }
    );

  return normalizeList<unknown>(
    response.data
  ).map(
    normalizeEquipmentCategory
  );
}

export async function getEquipmentCategoryById(
  id: number
): Promise<EquipmentCategory> {
  validateId(id);

  const response =
    await api.get(
      `/EquipmentCategories/${id}`
    );

  return normalizeEquipmentCategory(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function createEquipmentCategory(
  payload: EquipmentCategoryRequest
): Promise<EquipmentCategory> {
  const response =
    await api.post(
      "/EquipmentCategories",
      payload
    );

  return normalizeEquipmentCategory(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function updateEquipmentCategory(
  id: number,
  payload: EquipmentCategoryRequest
): Promise<EquipmentCategory> {
  validateId(id);

  const response =
    await api.put(
      `/EquipmentCategories/${id}`,
      payload
    );

  return normalizeEquipmentCategory(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function deleteEquipmentCategory(
  id: number
): Promise<void> {
  validateId(id);

  await api.delete(
    `/EquipmentCategories/${id}`
  );
}