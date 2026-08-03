import apiClient from "./api";
import type {
  HumanResourceProfile,
  Skill,
  HumanResourceSkill,
} from "../types/personnel";

// ==========================================
// Human Resource Profiles APIs
// ==========================================
export async function getHumanResourceProfiles(): Promise<HumanResourceProfile[]> {
  const response = await apiClient.get<any>("/HumanResourceProfiles");
  return response.data?.data?.items || [];
}

export async function createHumanResourceProfile(data: {
  userId: number;
  maxWorkingHoursPerDay: number;
  currentWorkload: number;
  status: string;
}): Promise<HumanResourceProfile> {
  const response = await apiClient.post<any>("/HumanResourceProfiles", data);
  return response.data?.data;
}

export async function updateHumanResourceProfile(
  id: number,
  data: {
    userId: number;
    maxWorkingHoursPerDay: number;
    currentWorkload: number;
    status: string;
  }
): Promise<HumanResourceProfile> {
  const response = await apiClient.put<any>(`/HumanResourceProfiles/${id}`, data);
  return response.data?.data;
}

export async function deleteHumanResourceProfile(id: number): Promise<void> {
  await apiClient.delete(`/HumanResourceProfiles/${id}`);
}

// ==========================================
// Skills (General Categories) APIs
// ==========================================
export async function getSkills(): Promise<Skill[]> {
  const response = await apiClient.get<any>("/Skills");
  return response.data?.data?.items || [];
}

// ==========================================
// Human Resource Skills (Assigned Skills) APIs
// ==========================================
export async function getHumanResourceSkills(): Promise<HumanResourceSkill[]> {
  const response = await apiClient.get<any>("/HumanResourceSkills");
  return response.data?.data?.items || [];
}

export async function assignHumanResourceSkill(data: {
  humanResourceId: number;
  skillId: number;
  skillLevel: string;
}): Promise<HumanResourceSkill> {
  const response = await apiClient.post<any>("/HumanResourceSkills", data);
  return response.data?.data;
}

export async function removeHumanResourceSkill(id: number): Promise<void> {
  await apiClient.delete(`/HumanResourceSkills/${id}`);
}
