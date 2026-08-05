import api from "./api";

import type {
  LandResource,
  LandResourceQuery,
  LandResourceRequest,
} from "../types/landResource";

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

  if (
    Array.isArray(
      payload.items
    )
  ) {
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

function validateLandId(
  id: number
): void {
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Land resource ID is invalid."
    );
  }
}

function validatePayload(
  payload: LandResourceRequest
): void {
  if (
    !Number.isInteger(
      payload.areaId
    ) ||
    payload.areaId <= 0
  ) {
    throw new Error(
      "Area ID is invalid."
    );
  }

  if (
    !payload.landCode.trim()
  ) {
    throw new Error(
      "Land code is required."
    );
  }

  if (
    !Number.isFinite(
      payload.areaSize
    ) ||
    payload.areaSize <= 0
  ) {
    throw new Error(
      "Area size must be greater than 0."
    );
  }

  if (
    !payload.soilType.trim()
  ) {
    throw new Error(
      "Soil type is required."
    );
  }
}

export async function getLandResources(
  query: LandResourceQuery = {}
): Promise<LandResource[]> {
  const response =
    await api.get(
      "/LandResources",
      {
        params: cleanParams({
          Keyword:
            query.keyword,

          AreaId:
            query.areaId,

          Status:
            query.status,

          Page:
            query.page ?? 1,

          Size:
            query.size ?? 200,
        }),
      }
    );

  return normalizeList<LandResource>(
    response.data
  );
}

export async function getLandResourceById(
  id: number
): Promise<LandResource> {
  validateLandId(id);

  const response =
    await api.get(
      `/LandResources/${id}`
    );

  return unwrapResponse<LandResource>(
    response.data
  );
}

export async function createLandResource(
  payload: LandResourceRequest
): Promise<LandResource> {
  validatePayload(payload);

  const response =
    await api.post(
      "/LandResources",
      payload
    );

  return unwrapResponse<LandResource>(
    response.data
  );
}

export async function updateLandResource(
  id: number,
  payload: LandResourceRequest
): Promise<LandResource> {
  validateLandId(id);
  validatePayload(payload);

  const response =
    await api.put(
      `/LandResources/${id}`,
      payload
    );

  return unwrapResponse<LandResource>(
    response.data
  );
}

export async function deleteLandResource(
  id: number
): Promise<void> {
  validateLandId(id);

  await api.delete(
    `/LandResources/${id}`
  );
}