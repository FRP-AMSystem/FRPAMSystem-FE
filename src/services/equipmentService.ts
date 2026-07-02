import api from "./api";
import type {
  EquipmentCategory,
  EquipmentInstance,
  EquipmentType,
} from "../types/equipment";

type ApiResponse<T> = {
  data?: T;
  items?: T;
  result?: T;
};

function unwrapResponse<T>(responseData: T | ApiResponse<T>): T {
  if (
    responseData &&
    typeof responseData === "object" &&
    "data" in responseData
  ) {
    return (responseData as ApiResponse<T>).data as T;
  }

  if (
    responseData &&
    typeof responseData === "object" &&
    "items" in responseData
  ) {
    return (responseData as ApiResponse<T>).items as T;
  }

  if (
    responseData &&
    typeof responseData === "object" &&
    "result" in responseData
  ) {
    return (responseData as ApiResponse<T>).result as T;
  }

  return responseData as T;
}

export async function getEquipmentCategories(): Promise<EquipmentCategory[]> {
  const response = await api.get("/EquipmentCategories");
  const data = unwrapResponse<EquipmentCategory[]>(response.data);

  return Array.isArray(data) ? data : [];
}

export async function getEquipmentTypes(): Promise<EquipmentType[]> {
  const response = await api.get("/EquipmentTypes");
  const data = unwrapResponse<EquipmentType[]>(response.data);

  return Array.isArray(data) ? data : [];
}

export async function getEquipmentInstances(): Promise<EquipmentInstance[]> {
  const response = await api.get("/EquipmentInstances");
  const data = unwrapResponse<EquipmentInstance[]>(response.data);

  return Array.isArray(data) ? data : [];
}

export async function getEquipmentInstanceById(
  id: number
): Promise<EquipmentInstance> {
  const response = await api.get(`/EquipmentInstances/${id}`);
  return unwrapResponse<EquipmentInstance>(response.data);
}

export async function createEquipmentInstance(payload: unknown) {
  const response = await api.post("/EquipmentInstances", payload);
  return unwrapResponse(response.data);
}

export async function updateEquipmentInstance(id: number, payload: unknown) {
  const response = await api.put(`/EquipmentInstances/${id}`, payload);
  return unwrapResponse(response.data);
}

export async function deleteEquipmentInstance(id: number) {
  const response = await api.delete(`/EquipmentInstances/${id}`);
  return unwrapResponse(response.data);
}