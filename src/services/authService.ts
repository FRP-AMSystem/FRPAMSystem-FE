import api from "./api";
import type { LoginData, LoginRequest, LoginResponse } from "../types/auth";

export async function login(data: LoginRequest | { email?: string; usernameOrEmail?: string; password: string }): Promise<LoginData> {
  const payload = {
    usernameOrEmail: ("usernameOrEmail" in data && data.usernameOrEmail) ? data.usernameOrEmail : ("email" in data && data.email) ? data.email : "",
    password: data.password,
  };

  const response = await api.post<LoginResponse>("/Auth/login", payload);
  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }
  if (response.data && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data?.message || "Login failed");
}
