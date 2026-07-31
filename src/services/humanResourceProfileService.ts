import api from "./api";

export type HumanResourceStatus =
  | "Available"
  | "Busy"
  | "Inactive";

export interface HumanResourceProfile {
  humanResourceId: number;
  userId: number;

  fullName?: string;
  username?: string;
  email?: string;

  roleId?: number;
  roleName?: string;

  maxWorkingHoursPerDay: number;
  currentWorkload: number;
  status: HumanResourceStatus;

  createdAt?: string;
  updatedAt?: string | null;
}

export interface HumanResourceProfileRequest {
  userId: number;
  maxWorkingHoursPerDay: number;
  currentWorkload: number;
  status: HumanResourceStatus;
}

export interface HumanResourceProfileQuery {
  keyword?: string;
  userId?: number;
  roleId?: number;
  status?: HumanResourceStatus;
  minMaxWorkingHoursPerDay?: number;
  maxMaxWorkingHoursPerDay?: number;
  minCurrentWorkload?: number;
  maxCurrentWorkload?: number;
  page?: number;
  size?: number;
}

interface ApiEnvelope<T> {
  data?: T;
  result?: T;
  items?: T[];
  page?: number;
  size?: number;
  total?: number;
  totalCount?: number;
  totalPages?: number;
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

export async function getHumanResourceProfiles(
  query: HumanResourceProfileQuery = {}
): Promise<HumanResourceProfile[]> {
  const response = await api.get("/HumanResourceProfiles", {
    params: cleanParams({
      Keyword: query.keyword,
      UserId: query.userId,
      RoleId: query.roleId,
      Status: query.status,
      MinMaxWorkingHoursPerDay:
        query.minMaxWorkingHoursPerDay,
      MaxMaxWorkingHoursPerDay:
        query.maxMaxWorkingHoursPerDay,
      MinCurrentWorkload: query.minCurrentWorkload,
      MaxCurrentWorkload: query.maxCurrentWorkload,
      Page: query.page,
      Size: query.size,
    }),
  });

  return normalizeList<HumanResourceProfile>(
    response.data
  );
}

export async function getHumanResourceProfileById(
  id: number
): Promise<HumanResourceProfile> {
  validateId(id, "Human resource profile ID");

  const response = await api.get(
    `/HumanResourceProfiles/${id}`
  );

  return unwrapResponse<HumanResourceProfile>(
    response.data
  );
}

export async function createHumanResourceProfile(
  payload: HumanResourceProfileRequest
): Promise<HumanResourceProfile> {
  const response = await api.post(
    "/HumanResourceProfiles",
    payload
  );

  return unwrapResponse<HumanResourceProfile>(
    response.data
  );
}

export async function updateHumanResourceProfile(
  id: number,
  payload: HumanResourceProfileRequest
): Promise<HumanResourceProfile> {
  validateId(id, "Human resource profile ID");

  const response = await api.put(
    `/HumanResourceProfiles/${id}`,
    payload
  );

  return unwrapResponse<HumanResourceProfile>(
    response.data
  );
}

export async function deleteHumanResourceProfile(
  id: number
): Promise<void> {
  validateId(id, "Human resource profile ID");

  await api.delete(`/HumanResourceProfiles/${id}`);
}
