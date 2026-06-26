import type { LoginRequest, LoginResponse } from "../types/auth";

export async function login(
  data: LoginRequest
): Promise<LoginResponse> {
  console.log(data);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    token: "abc123",
    role: "Admin",
    userName: "Administrator",
  };
}