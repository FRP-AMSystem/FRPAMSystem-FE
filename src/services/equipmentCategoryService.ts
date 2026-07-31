import api from "./api";

import type {
  EquipmentCategory,
} from "../types/equipment";

export interface EquipmentCategoryRequest {
  categoryName: string;
  description?: string | null;
}

export interface EquipmentCategoryQuery {
  keyword?: string;
  page?: number;
  size?: number;
}

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
    return unwrapResponse<T>(payload.data);
  }

  if (
    "result" in payload &&
    payload.result !== undefined
  ) {
    return unwrapResponse<T>(payload.result);
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

function normalizeEquipmentCategory(
  value: unknown
): EquipmentCategory {
  const item = isRecord(value)
    ? value
    : {};

  const categoryName =
    typeof item.categoryName === "string"
      ? item.categoryName
      : typeof item.equipmentCategoryName ===
          "string"
        ? item.equipmentCategoryName
        : typeof item.name === "string"
          ? item.name
          : "";

  return {
    equipmentCategoryId: Number(
      item.equipmentCategoryId ?? 0
    ),

    categoryName,
    name: categoryName,

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

export async function getEquipmentCategories(
  query: EquipmentCategoryQuery = {}
): Promise<EquipmentCategory[]> {
  const response = await api.get(
    "/EquipmentCategories",
    {
      params: cleanParams({
        Keyword: query.keyword,
        Page: query.page,
        Size: query.size,
      }),
    }
  );

  return normalizeList<unknown>(
    response.data
  ).map(normalizeEquipmentCategory);
}

export async function getEquipmentCategoryById(
  id: number
): Promise<EquipmentCategory> {
  validateId(
    id,
    "Equipment category ID"
  );

  const response = await api.get(
    `/EquipmentCategories/${id}`
  );

  return normalizeEquipmentCategory(
    unwrapResponse<unknown>(response.data)
  );
}

export async function createEquipmentCategory(
  payload: EquipmentCategoryRequest
): Promise<EquipmentCategory> {
  const categoryName =
    payload.categoryName.trim();

  if (!categoryName) {
    throw new Error(
      "Category name is required."
    );
  }

  const response = await api.post(
    "/EquipmentCategories",
    {
      categoryName,
      description:
        payload.description?.trim() ||
        null,
    }
  );

  return normalizeEquipmentCategory(
    unwrapResponse<unknown>(response.data)
  );
}

export async function updateEquipmentCategory(
  id: number,
  payload: EquipmentCategoryRequest
): Promise<EquipmentCategory> {
  validateId(
    id,
    "Equipment category ID"
  );

  const categoryName =
    payload.categoryName.trim();

  if (!categoryName) {
    throw new Error(
      "Category name is required."
    );
  }

  const response = await api.put(
    `/EquipmentCategories/${id}`,
    {
      categoryName,
      description:
        payload.description?.trim() ||
        null,
    }
  );

  return normalizeEquipmentCategory(
    unwrapResponse<unknown>(response.data)
  );
}

export async function deleteEquipmentCategory(
  id: number
): Promise<void> {
  validateId(
    id,
    "Equipment category ID"
  );

  await api.delete(
    `/EquipmentCategories/${id}`
  );
}