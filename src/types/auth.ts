export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginData {
  token: string;
  role: string;
  userName: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: LoginData;
}