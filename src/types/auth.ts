export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface LoginData {
  accessToken: string;
  userId: number;
  fullName: string;
  username: string;
  email: string;
  roleId: number;
  roleName: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: LoginData;
}