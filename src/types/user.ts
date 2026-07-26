export interface User {
  id: string;
  fullName: string;
  username?: string;
  email: string;
  role: string;
  status: string; // E.g., "Active" | "Inactive"
  phone?: string;
  avatar?: string;
  createdDate: string;
}

export interface CreateUserRequest {
  fullName: string;
  username: string;
  email: string;
  password?: string;
  roleId: number;
}
