export type HumanResourceStatus =
  | "Available"
  | "Busy"
  | "Inactive";

export interface HumanResourceProfile {
  humanResourceId: number;

  userId: number;

  fullName?: string | null;
  username?: string | null;
  email?: string | null;

  roleId?: number | null;
  roleName?: string | null;

  maxWorkingHoursPerDay: number;

  currentWorkload: number;

  status: HumanResourceStatus;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface HumanResourceProfileRequest {
  userId: number;

  maxWorkingHoursPerDay: number;

  currentWorkload: number;

  status: HumanResourceStatus;
}

export interface HumanResourceProfileQuery {
  keyword?: string;

  userId?: number;

  roleId?: number;

  status?: HumanResourceStatus;

  minMaxWorkingHoursPerDay?: number;
  maxMaxWorkingHoursPerDay?: number;

  minCurrentWorkload?: number;
  maxCurrentWorkload?: number;

  page?: number;
  size?: number;
}

export type HumanResourceProfileSkillLevel =
  | "Beginner"
  | "Intermediate"
  | "Advanced"
  | "Expert";

export interface HumanResourceProfileSkillSyncItem {
  skillId: number;
  skillLevel: HumanResourceProfileSkillLevel;
}

export interface SyncHumanResourceProfileSkillsRequest {
  skills: HumanResourceProfileSkillSyncItem[];
}
