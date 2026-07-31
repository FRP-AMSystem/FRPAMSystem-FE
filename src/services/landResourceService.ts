import api from "./api";

export type LandResourceStatus =
  | "Available"
  | "Reserved"
  | "InUse"
  | "Maintenance"
  | "Unavailable";

export interface LandResource {
  landId: number;
  areaId: number;

  areaName?: string;

  landCode: string;
  areaSize: number;
  location: string;
  soilType: string;
  status: LandResourceStatus;

  createdAt?: string;
  updatedAt?: string | null;
}

export interface LandResourceRequest {
  areaId: number;
  landCode: string;
  areaSize: number;
  location: string;
  soilType: string;
  status: LandResourceStatus;
}

export interface LandResourceQuery {
  keyword?: string;
  areaId?: number;
  soilType?: string;
  status?: LandResourceStatus;
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

function isRecord(value: unknown): value is Record<string, unknown> {
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
    const dataItems = normalizeList<T>(payload.data);

    if (dataItems.length > 0 || Array.isArray(payload.data)) {
      return dataItems;
    }
  }

  if ("result" in payload) {
    const resultItems = normalizeList<T>(payload.result);

    if (resultItems.length > 0 || Array.isArray(payload.result)) {
      return resultItems;
    }
  }

  return [];
}

export async function getLandResources(
  query: LandResourceQuery = {}
): Promise<LandResource[]> {
  const response = await api.get("/LandResources", {
    params: cleanParams({
      Keyword: query.keyword,
      AreaId: query.areaId,
      SoilType: query.soilType,
      Status: query.status,
      Page: query.page,
      Size: query.size,
    }),
  });

  return normalizeList<LandResource>(response.data);
}

export async function getLandResourceById(
  id: number
): Promise<LandResource> {
  validateId(id, "Land resource ID");

  const response = await api.get(`/LandResources/${id}`);

  return unwrapResponse<LandResource>(response.data);
}

export async function createLandResource(
  payload: LandResourceRequest
): Promise<LandResource> {
  const response = await api.post(
    "/LandResources",
    payload
  );

  return unwrapResponse<LandResource>(response.data);
}

export async function updateLandResource(
  id: number,
  payload: LandResourceRequest
): Promise<LandResource> {
  validateId(id, "Land resource ID");

  const response = await api.put(
    `/LandResources/${id}`,
    payload
  );

  return unwrapResponse<LandResource>(response.data);
}

export async function deleteLandResource(
  id: number
): Promise<void> {
  validateId(id, "Land resource ID");

  await api.delete(`/LandResources/${id}`);
}
