import api from "./api";

import type {
  HumanResourceProfile,
  HumanResourceProfileQuery,
  HumanResourceProfileRequest,
  HumanResourceStatus,
} from "../types/humanResourceProfile";

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

function normalizeNullableNumber(
  value: unknown
): number | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : null;
}

function normalizeStatus(
  value: unknown
): HumanResourceStatus {
  switch (value) {
    case "Busy":
    case "Unavailable":
    case "Inactive":
      return value;

    case "Available":
    default:
      return "Available";
  }
}

function normalizeHumanResourceProfile(
  value: unknown
): HumanResourceProfile {
  const item =
    isRecord(value)
      ? value
      : {};

  return {
    humanResourceId: Number(
      item.humanResourceId ??
      item.human_resource_id ??
      item.id ??
      0
    ),

    userId: Number(
      item.userId ??
      item.user_id ??
      0
    ),

    fullName:
      normalizeNullableString(
        item.fullName ??
        item.full_name
      ),

    username:
      normalizeNullableString(
        item.username
      ),

    email:
      normalizeNullableString(
        item.email
      ),

    roleId:
      normalizeNullableNumber(
        item.roleId ??
        item.role_id
      ),

    roleName:
      normalizeNullableString(
        item.roleName ??
        item.role_name
      ),

    maxWorkingHoursPerDay: Number(
      item.maxWorkingHoursPerDay ??
      item.max_working_hours_per_day ??
      0
    ),

    currentWorkload: Number(
      item.currentWorkload ??
      item.current_workload ??
      0
    ),

    status:
      normalizeStatus(
        item.status
      ),

    createdAt:
      normalizeNullableString(
        item.createdAt ??
        item.created_at
      ),

    updatedAt:
      normalizeNullableString(
        item.updatedAt ??
        item.updated_at
      ),
  };
}

function validateId(
  id: number,
  fieldName: string
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

export async function getHumanResourceProfiles(
  query: HumanResourceProfileQuery = {}
): Promise<HumanResourceProfile[]> {
  const response =
    await api.get(
      "/HumanResourceProfiles",
      {
        params: cleanParams({
          Keyword:
            query.keyword,

          UserId:
            query.userId,

          RoleId:
            query.roleId,

          Status:
            query.status,

          MinMaxWorkingHoursPerDay:
            query.minMaxWorkingHoursPerDay,

          MaxMaxWorkingHoursPerDay:
            query.maxMaxWorkingHoursPerDay,

          MinCurrentWorkload:
            query.minCurrentWorkload,

          MaxCurrentWorkload:
            query.maxCurrentWorkload,

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
    normalizeHumanResourceProfile
  );
}

export async function getHumanResourceProfileById(
  id: number
): Promise<HumanResourceProfile> {
  validateId(
    id,
    "Human resource profile ID"
  );

  const response =
    await api.get(
      `/HumanResourceProfiles/${id}`
    );

  return normalizeHumanResourceProfile(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function createHumanResourceProfile(
  payload: HumanResourceProfileRequest
): Promise<HumanResourceProfile> {
  const response =
    await api.post(
      "/HumanResourceProfiles",
      payload
    );

  return normalizeHumanResourceProfile(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function updateHumanResourceProfile(
  id: number,
  payload: HumanResourceProfileRequest
): Promise<HumanResourceProfile> {
  validateId(
    id,
    "Human resource profile ID"
  );

  const response =
    await api.put(
      `/HumanResourceProfiles/${id}`,
      payload
    );

  return normalizeHumanResourceProfile(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function deleteHumanResourceProfile(
  id: number
): Promise<void> {
  validateId(
    id,
    "Human resource profile ID"
  );

  await api.delete(
    `/HumanResourceProfiles/${id}`
  );
}