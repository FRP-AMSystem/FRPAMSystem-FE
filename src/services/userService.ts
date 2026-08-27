import apiClient from "./api";

import type {
  User,
  UserRoleObject,
  CreateUserRequest,
} from "../types/user";

export interface UpdateUserRequest {
  fullName: string;
  username: string;
  roleId: number;
  email: string;
  password?: string;
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toStringValue(
  value: unknown,
  fallback = ""
): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return fallback;
}

function toPositiveNumber(
  value: unknown
): number | undefined {
  const numberValue = Number(value);

  if (
    Number.isFinite(numberValue) &&
    Number.isInteger(numberValue) &&
    numberValue > 0
  ) {
    return numberValue;
  }

  return undefined;
}

function getRoleObject(
  value: unknown
): UserRoleObject | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    roleId: toPositiveNumber(
      value.roleId ?? value.id
    ),

    roleName: toStringValue(
      value.roleName ?? value.name
    ),
  };
}

function getRoleName(
  item: Record<string, unknown>
): string {
  if (typeof item.role === "string") {
    return item.role.trim();
  }

  if (typeof item.roleName === "string") {
    return item.roleName.trim();
  }

  const roleObject = getRoleObject(item.role);

  if (roleObject?.roleName) {
    return roleObject.roleName;
  }

  return "";
}

function getRoleId(
  item: Record<string, unknown>
): number | undefined {
  const directRoleId = toPositiveNumber(
    item.roleId
  );

  if (directRoleId) {
    return directRoleId;
  }

  const roleObject = getRoleObject(item.role);

  return roleObject?.roleId;
}

function normalizeUser(
  value: unknown
): User {
  const item = isRecord(value) ? value : {};

  const numericUserId = toPositiveNumber(
    item.userId ?? item.id
  );

  const rawId =
    item.id ??
    item.userId ??
    "";

  const id = numericUserId
    ? String(numericUserId)
    : toStringValue(rawId);

  const roleName = getRoleName(item);

  const roleId = getRoleId(item);

  const fullName =
    toStringValue(item.fullName) ||
    toStringValue(item.name) ||
    toStringValue(item.username) ||
    (numericUserId
      ? `User #${numericUserId}`
      : "Unknown User");

  const createdDate =
    toStringValue(item.createdDate) ||
    toStringValue(item.createdAt) ||
    toStringValue(item.created_at) ||
    new Date().toISOString();

  return {
    id,

    userId: numericUserId,

    fullName,

    username: toStringValue(
      item.username
    ),

    email: toStringValue(
      item.email
    ),

    role: roleName,

    roleId,

    roleName,

    status:
      toStringValue(
        item.status,
        "Active"
      ) || "Active",

    phone:
      toStringValue(item.phone) ||
      undefined,

    avatar:
      toStringValue(item.avatar) ||
      undefined,

    createdDate,

    createdAt:
      toStringValue(item.createdAt) ||
      undefined,
  };
}

function extractUserList(
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

  if (payload.data !== undefined) {
    const nested = extractUserList(
      payload.data
    );

    if (
      nested.length > 0 ||
      Array.isArray(payload.data)
    ) {
      return nested;
    }

    if (
      isRecord(payload.data) &&
      Array.isArray(payload.data.items)
    ) {
      return payload.data.items;
    }
  }

  if (payload.result !== undefined) {
    const nested = extractUserList(
      payload.result
    );

    if (
      nested.length > 0 ||
      Array.isArray(payload.result)
    ) {
      return nested;
    }
  }

  if (Array.isArray(payload.users)) {
    return payload.users;
  }

  return [];
}

function extractSingleUser(
  payload: unknown
): unknown {
  if (!isRecord(payload)) {
    return payload;
  }

  if (payload.data !== undefined) {
    return extractSingleUser(
      payload.data
    );
  }

  if (payload.result !== undefined) {
    return extractSingleUser(
      payload.result
    );
  }

  return payload;
}

export async function getUsers(): Promise<User[]> {
  try {
    const response = await apiClient.get(
      "/Users"
    );

    console.info(
      "GET /Users raw response:",
      response.data
    );

    const rawUsers = extractUserList(
      response.data
    );

    console.info(
      "GET /Users extracted list:",
      rawUsers
    );

    const users = rawUsers
      .map((item) => normalizeUser(item))
      .filter((user) => Boolean(user.id));

    console.info(
      "getUsers normalized:",
      {
        count: users.length,

        users: users.map((user) => ({
          id: user.id,
          userId: user.userId,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          roleId: user.roleId,
          roleName: user.roleName,
          status: user.status,
        })),
      }
    );

    return users;
  } catch (error) {
    console.error(
      "GET /Users failed:",
      error
    );

    return [];
  }
}

export async function getUserById(
  id: string
): Promise<User> {
  const response = await apiClient.get(
    `/Users/${id}`
  );

  return normalizeUser(
    extractSingleUser(response.data)
  );
}

export async function createUser(
  data: CreateUserRequest
): Promise<User> {
  const response = await apiClient.post(
    "/Users",
    data
  );

  return normalizeUser(
    extractSingleUser(response.data)
  );
}

export async function updateUser(
  id: string,
  data: UpdateUserRequest
): Promise<User> {
  const response = await apiClient.put(
    `/Users/${id}`,
    data
  );

  return normalizeUser(
    extractSingleUser(response.data)
  );
}

export async function getCurrentProfile(): Promise<User> {
  const response = await apiClient.get(
    "/Users/me"
  );

  return normalizeUser(
    extractSingleUser(response.data)
  );
}