import apiClient from "./api";
import type {
  HumanResourceProfile,
  HumanResourceProfileRequest,
  HumanResourceSkill,
  HumanResourceSkillRequest,
  Skill,
} from "../types/personnel";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unwrapData(payload: unknown): unknown {
  if (!isRecord(payload)) {
    return payload;
  }

  if (payload.data !== undefined) {
    return unwrapData(payload.data);
  }

  if (payload.result !== undefined) {
    return unwrapData(payload.result);
  }

  return payload;
}

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!isRecord(payload)) {
    return [];
  }

  if (Array.isArray(payload.items)) {
    return payload.items as T[];
  }

  if (payload.data !== undefined) {
    return normalizeList<T>(payload.data);
  }

  if (payload.result !== undefined) {
    return normalizeList<T>(payload.result);
  }

  return [];
}

export async function getHumanResourceProfiles(): Promise<HumanResourceProfile[]> {
  const response = await apiClient.get<unknown>("/HumanResourceProfiles", {
    params: {
      Page: 1,
      Size: 500,
    },
  });

  return normalizeList<HumanResourceProfile>(response.data);
}

export async function createHumanResourceProfile(
  data: HumanResourceProfileRequest
): Promise<HumanResourceProfile> {
  const response = await apiClient.post<unknown>("/HumanResourceProfiles", data);
  return unwrapData(response.data) as HumanResourceProfile;
}

export async function updateHumanResourceProfile(
  id: number,
  data: HumanResourceProfileRequest
): Promise<HumanResourceProfile> {
  const response = await apiClient.put<unknown>(`/HumanResourceProfiles/${id}`, data);
  return unwrapData(response.data) as HumanResourceProfile;
}

export async function deleteHumanResourceProfile(id: number): Promise<void> {
  await apiClient.delete(`/HumanResourceProfiles/${id}`);
}

export async function getSkills(): Promise<Skill[]> {
  const response = await apiClient.get<unknown>("/Skills", {
    params: {
      Page: 1,
      Size: 500,
    },
  });

  return normalizeList<Skill>(response.data);
}

export async function getHumanResourceSkills(): Promise<HumanResourceSkill[]> {
  const response = await apiClient.get<unknown>("/HumanResourceSkills", {
    params: {
      Page: 1,
      Size: 1000,
    },
  });

  return normalizeList<HumanResourceSkill>(response.data);
}

export async function assignHumanResourceSkill(
  data: HumanResourceSkillRequest
): Promise<HumanResourceSkill> {
  const response = await apiClient.post<unknown>("/HumanResourceSkills", data);
  return unwrapData(response.data) as HumanResourceSkill;
}

export async function removeHumanResourceSkill(id: number): Promise<void> {
  await apiClient.delete(`/HumanResourceSkills/${id}`);
}
