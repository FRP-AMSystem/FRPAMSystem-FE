export type HumanResourceStatus = "Available" | "Busy" | "Inactive";

export interface HumanResourceProfile {
  humanResourceId: number;
  userId: number;
  fullName: string;
  username: string;
  email: string;
  roleId?: number | null;
  roleName: string;
  maxWorkingHoursPerDay: number;
  currentWorkload: number;
  status: HumanResourceStatus;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface Skill {
  skillId: number;
  skillName: string;
  description?: string;
}

export type SkillLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert";

export interface HumanResourceSkill {
  humanResourceSkillId: number;
  humanResourceId: number;
  userId: number;
  fullName: string;
  username: string;
  email: string;
  skillId: number;
  skillName: string;
  skillDescription?: string;
  skillLevel: SkillLevel;
}
