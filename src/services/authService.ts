import api from "./api";
import type { LoginRequest, LoginResponse, LoginData } from "../types/auth";

export async function login(data: LoginRequest): Promise<LoginData> {
  const response = await api.post<LoginResponse>("/Auth/login", data);

  return response.data.data;
}