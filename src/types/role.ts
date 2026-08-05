export interface RoleResponse {
  roleId: number;
  roleName: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface RoleQuery {
  keyword?: string;
  page?: number;
  size?: number;
}

export interface Role {
  id: string;
  name: string;
}

