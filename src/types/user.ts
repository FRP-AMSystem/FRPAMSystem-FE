export interface UserRoleObject {
  roleId?: number;
  roleName?: string;
  id?: number;
  name?: string;
}

export interface User {
  id: string;
  userId?: number;
  fullName: string;
  username?: string;
  email: string;
  role: string | UserRoleObject;
  roleId?: number;
  roleName?: string;
  status: string;
  phone?: string;
  avatar?: string;
  createdDate: string;
  createdAt?: string;
}

export interface CreateUserRequest {
  fullName: string;
  username: string;
  email: string;
  password?: string;
  roleId: number;
}