export type SkillLevel =
  | "Beginner"
  | "Intermediate"
  | "Advanced"
  | "Expert";

export interface HumanResourceSkill {
  humanResourceSkillId: number;

  humanResourceId: number;
  userId?: number | null;

  fullName?: string | null;
  username?: string | null;
  email?: string | null;
  roleName?: string | null;

  skillId: number;
  skillName?: string | null;

  skillLevel: SkillLevel;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface HumanResourceSkillRequest {
  humanResourceId: number;
  skillId: number;
  skillLevel: SkillLevel;
}

export interface HumanResourceSkillQuery {
  keyword?: string;

  humanResourceId?: number;
  userId?: number;
  skillId?: number;

  skillLevel?: SkillLevel;

  page?: number;
  size?: number;
}