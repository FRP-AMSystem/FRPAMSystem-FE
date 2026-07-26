import apiClient from "./api";
import type { User, CreateUserRequest } from "../types/user";

export async function getUsers(): Promise<User[]> {
  const response = await apiClient.get<any>("/Users");
  return response.data?.data || [];
}

export async function getUserById(id: string): Promise<User> {
  const response = await apiClient.get<any>(`/Users/${id}`);
  return response.data?.data;
}

export async function createUser(data: CreateUserRequest): Promise<User> {
  const response = await apiClient.post<any>("/Users", data);
  return response.data?.data;
}

export interface UpdateUserRequest {
  fullName: string;
  username: string;
  roleId: number;
  email: string;
  password?: string;
}

export async function updateUser(id: string, data: UpdateUserRequest): Promise<User> {
  const response = await apiClient.put<any>(`/Users/${id}`, data);
  return response.data?.data;
}

export async function getCurrentProfile(): Promise<User> {
  const response = await apiClient.get<any>("/Users/me");
  return response.data?.data;
}

