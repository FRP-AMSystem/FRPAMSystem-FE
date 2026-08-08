export interface Skill {
  skillId: number;

  skillName: string;

  description?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export type SkillResponse = Skill;

export interface SkillRequest {
  skillName: string;

  description?: string | null;
}

export interface SkillQuery {
  keyword?: string;

  page?: number;
  size?: number;
}