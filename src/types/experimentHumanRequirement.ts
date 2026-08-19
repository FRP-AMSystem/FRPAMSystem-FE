export interface ExperimentHumanRequirement {
  expHumanReqId: number;

  experimentId: number;
  experimentName?: string | null;

  roleId: number;
  roleName?: string | null;

  quantity: number;

  requiredSkillId?: number | null;
  requiredSkillName?: string | null;

  workingHoursPerDay?: number | null;

  note?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export type ExperimentHumanRequirementResponse = ExperimentHumanRequirement;

export interface ExperimentHumanRequirementRequest {
  experimentId: number;
  roleId: number;
  quantity: number;
  requiredSkillId: number | null;
  workingHoursPerDay: number | null;
  note: string | null;
}

export interface ExperimentHumanRequirementQuery {
  keyword?: string;
  experimentId?: number;
  roleId?: number;
  requiredSkillId?: number;
  page?: number;
  size?: number;
}

export interface ExperimentHumanRequirementPagedResponse {
  items: ExperimentHumanRequirement[];
  page?: number;
  size?: number;
  totalItems?: number;
  totalPages?: number;
}