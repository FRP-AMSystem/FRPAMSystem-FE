import apiClient from "./api";
import type { Role } from "../types/role";

export async function getRoles(): Promise<Role[]> {
  const response = await apiClient.get<any>("/Roles");
  const items = response.data?.data?.items || [];
  return items.map((r: any) => ({
    id: (r.roleId ?? r.id)?.toString() || "",
    name: r.roleName || "",
  }));
}

