import api from "./api";

import type {
  Area,
  AreaQuery,
  AreaRequest,
} from "../types/area";

function isRecord(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value === "object" &&
    value !== null
  );
}

function unwrap<T>(
  value: unknown
): T {
  if (!isRecord(value)) {
    return value as T;
  }

  if (
    "data" in value &&
    value.data !== undefined
  ) {
    return unwrap<T>(
      value.data
    );
  }

  if (
    "result" in value &&
    value.result !== undefined
  ) {
    return unwrap<T>(
      value.result
    );
  }

  return value as T;
}

function normalizeList<T>(
  value: unknown
): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (!isRecord(value)) {
    return [];
  }

  if (
    Array.isArray(
      value.items
    )
  ) {
    return value.items as T[];
  }

  if ("data" in value) {
    return normalizeList<T>(
      value.data
    );
  }

  if ("result" in value) {
    return normalizeList<T>(
      value.result
    );
  }

  return [];
}

function validateId(
  id: number
): void {
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Area ID is invalid."
    );
  }
}

function cleanParams(
  params: Record<
    string,
    unknown
  >
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(
      params
    ).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== ""
    )
  );
}

export async function getAreas(
  query: AreaQuery = {}
): Promise<Area[]> {
  const response =
    await api.get(
      "/Areas",
      {
        params: cleanParams({
          Keyword:
            query.keyword,

          Page:
            query.page ??
            1,

          Size:
            query.size ??
            200,
        }),
      }
    );

  return normalizeList<Area>(
    response.data
  );
}

export async function getAreaById(
  id: number
): Promise<Area> {
  validateId(id);

  const response =
    await api.get(
      `/Areas/${id}`
    );

  return unwrap<Area>(
    response.data
  );
}

export async function createArea(
  payload: AreaRequest
): Promise<Area> {
  const response =
    await api.post(
      "/Areas",
      payload
    );

  return unwrap<Area>(
    response.data
  );
}

export async function updateArea(
  id: number,
  payload: AreaRequest
): Promise<Area> {
  validateId(id);

  const response =
    await api.put(
      `/Areas/${id}`,
      payload
    );

  return unwrap<Area>(
    response.data
  );
}

export async function deleteArea(
  id: number
): Promise<void> {
  validateId(id);

  await api.delete(
    `/Areas/${id}`
  );
}