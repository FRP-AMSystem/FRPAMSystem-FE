import api from "./api";

import type {
  RoleQuery,
  RoleResponse,
} from "../types/role";

function normalizeRoleList(
  value: unknown
): RoleResponse[] {
  if (Array.isArray(value)) {
    return value as RoleResponse[];
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    const response = value as {
      data?: unknown;
      items?: unknown;
    };

    if (Array.isArray(response.items)) {
      return response.items as RoleResponse[];
    }

    if (Array.isArray(response.data)) {
      return response.data as RoleResponse[];
    }

    if (
      typeof response.data === "object" &&
      response.data !== null
    ) {
      const nestedData = response.data as {
        items?: unknown;
        data?: unknown;
      };

      if (Array.isArray(nestedData.items)) {
        return nestedData.items as RoleResponse[];
      }

      if (Array.isArray(nestedData.data)) {
        return nestedData.data as RoleResponse[];
      }
    }
  }

  return [];
}

export async function getRoles(
  query: RoleQuery = {}
): Promise<RoleResponse[]> {
  const response = await api.get(
    "/Roles",
    {
      params: {
        Keyword:
          query.keyword || undefined,
        Page: query.page ?? 1,
        Size: query.size ?? 100,
      },
    }
  );

  return normalizeRoleList(
    response.data
  );
}