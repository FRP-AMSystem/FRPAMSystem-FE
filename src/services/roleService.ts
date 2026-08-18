import api from "./api";
import type { Role, RoleQuery, RoleResponse } from "../types/role";

export type RoleItem = RoleResponse & Role;

export function normalizeRoleName(name: string): string {
  if (!name) return "Seasonal";
  const lower = name.toLowerCase().trim();
  if (lower === "student" || lower === "seasonal") {
    return "Seasonal";
  }
  return name.trim();
}

function normalizeRoleList(value: unknown): RoleItem[] {
  let list: any[] = [];
  if (Array.isArray(value)) {
    list = value;
  } else if (typeof value === "object" && value !== null) {
    const response = value as { data?: unknown; items?: unknown };
    if (Array.isArray(response.items)) list = response.items;
    else if (Array.isArray(response.data)) list = response.data;
    else if (typeof response.data === "object" && response.data !== null) {
      const nestedData = response.data as { items?: unknown; data?: unknown };
      if (Array.isArray(nestedData.items)) list = nestedData.items;
      else if (Array.isArray(nestedData.data)) list = nestedData.data;
    }
  }

  return list.map((r: any) => {
    const roleId = Number(r.roleId ?? r.id ?? 0);
    const rawRoleName = String(r.roleName ?? r.name ?? "");
    const roleName = normalizeRoleName(rawRoleName);
    return {
      roleId,
      roleName,
      id: String(roleId),
      name: roleName,
      createdAt: r.createdAt ?? null,
      updatedAt: r.updatedAt ?? null,
    };
  });
}

export async function getRoles(query: RoleQuery = {}): Promise<RoleItem[]> {
  const response = await api.get("/Roles", {
    params: {
      Keyword: query.keyword || undefined,
      Page: query.page ?? 1,
      Size: query.size ?? 100,
    },
  });

  return normalizeRoleList(response.data);
}
