import apiClient from "./api";
import type { LoginRequest, LoginResponse } from "../types/auth";

export async function login(
  data: LoginRequest
): Promise<LoginResponse> {
  const response = await apiClient.post<any>("/Auth/login", {
    usernameOrEmail: data.email,
    password: data.password,
  });

  const result = response.data;
  if (result.success && result.data) {
    return {
      token: result.data.accessToken,
      role: result.data.roleName,
      userName: result.data.fullName || result.data.username,
    };
  }
  
  throw new Error(result.message || "Login failed");
}