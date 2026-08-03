import apiClient from "./api";
import type {
  Area,
  LandResource,
  EquipmentCategory,
  EquipmentType,
  EquipmentInstance,
} from "../types/resource";

// ==========================================
// Area APIs
// ==========================================
export async function getAreas(): Promise<Area[]> {
  const response = await apiClient.get<any>("/Areas");
  return response.data?.data?.items || [];
}

export async function getAreaById(id: number): Promise<Area> {
  const response = await apiClient.get<any>(`/Areas/${id}`);
  return response.data?.data;
}

export async function createArea(data: Omit<Area, "areaId">): Promise<Area> {
  const response = await apiClient.post<any>("/Areas", data);
  return response.data?.data;
}

export async function updateArea(id: number, data: Omit<Area, "areaId">): Promise<Area> {
  const response = await apiClient.put<any>(`/Areas/${id}`, data);
  return response.data?.data;
}

export async function deleteArea(id: number): Promise<void> {
  await apiClient.delete(`/Areas/${id}`);
}

// ==========================================
// Land Resource APIs
// ==========================================
export async function getLandResources(): Promise<LandResource[]> {
  const response = await apiClient.get<any>("/LandResources");
  return response.data?.data?.items || [];
}

export async function getLandResourceById(id: number): Promise<LandResource> {
  const response = await apiClient.get<any>(`/LandResources/${id}`);
  return response.data?.data;
}

export async function createLandResource(
  data: Omit<LandResource, "landId">
): Promise<LandResource> {
  const response = await apiClient.post<any>("/LandResources", data);
  return response.data?.data;
}

export async function updateLandResource(
  id: number,
  data: Omit<LandResource, "landId">
): Promise<LandResource> {
  const response = await apiClient.put<any>(`/LandResources/${id}`, data);
  return response.data?.data;
}

export async function deleteLandResource(id: number): Promise<void> {
  await apiClient.delete(`/LandResources/${id}`);
}

// ==========================================
// Equipment Category APIs
// ==========================================
export async function getEquipmentCategories(): Promise<EquipmentCategory[]> {
  const response = await apiClient.get<any>("/EquipmentCategories");
  return response.data?.data?.items || [];
}

// ==========================================
// Equipment Type (Tools or General Types) APIs
// ==========================================
export async function getEquipmentTypes(): Promise<EquipmentType[]> {
  const response = await apiClient.get<any>("/EquipmentTypes");
  return response.data?.data?.items || [];
}

export async function createEquipmentType(
  data: Omit<EquipmentType, "equipmentTypeId">
): Promise<EquipmentType> {
  const response = await apiClient.post<any>("/EquipmentTypes", data);
  return response.data?.data;
}

export async function updateEquipmentType(
  id: number,
  data: Omit<EquipmentType, "equipmentTypeId">
): Promise<EquipmentType> {
  const response = await apiClient.put<any>(`/EquipmentTypes/${id}`, data);
  return response.data?.data;
}

export async function deleteEquipmentType(id: number): Promise<void> {
  await apiClient.delete(`/EquipmentTypes/${id}`);
}

// ==========================================
// Equipment Instance APIs
// ==========================================
export async function getEquipmentInstances(): Promise<EquipmentInstance[]> {
  const response = await apiClient.get<any>("/EquipmentInstances");
  return response.data?.data?.items || [];
}

export async function createEquipmentInstance(
  data: Omit<EquipmentInstance, "equipmentInstanceId">
): Promise<EquipmentInstance> {
  const response = await apiClient.post<any>("/EquipmentInstances", data);
  return response.data?.data;
}

export async function updateEquipmentInstance(
  id: number,
  data: Omit<EquipmentInstance, "equipmentInstanceId">
): Promise<EquipmentInstance> {
  const response = await apiClient.put<any>(`/EquipmentInstances/${id}`, data);
  return response.data?.data;
}

export async function deleteEquipmentInstance(id: number): Promise<void> {
  await apiClient.delete(`/EquipmentInstances/${id}`);
}
