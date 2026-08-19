export type AllocationDetailStatus =
  | "Proposed"
  | "Reserved"
  | "Allocated"
  | "InUse"
  | "Completed"
  | "Cancelled";

export interface AllocationHumanDetail {
  allocationHumanDetailId: number;
  allocationPlanId: number;

  experimentId?: number;
  experimentName?: string;

  expHumanReqId?: number | null;
  phaseHumanReqId?: number | null;
  phaseId?: number | null;
  phaseName?: string | null;

  humanResourceId: number;
  humanResourceName?: string;

  userId?: number;
  fullName?: string;
  username?: string;
  email?: string;

  roleId?: number;
  roleName?: string;
  humanResourceRoleId?: number;
  humanResourceRoleName?: string;

  requiredSkillId?: number | null;
  requiredSkillName?: string;
  skillName?: string;
  skillLevel?: string;

  workingHours: number;
  allocatedHoursPerDay?: number;
  maxWorkingHoursPerDay?: number;
  currentWorkload?: number;
  startDate: string;
  endDate: string;
  status: AllocationDetailStatus;

  createdAt?: string;
  updatedAt?: string | null;
}

export interface AllocationHumanDetailRequest {
  allocationPlanId: number;
  expHumanReqId: number | null;
  phaseHumanReqId: number | null;
  humanResourceId: number;
  workingHours: number;
  startDate: string;
  endDate: string;
  status: AllocationDetailStatus;
}

export interface AllocationHumanDetailQuery {
  keyword?: string;
  allocationPlanId?: number;
  experimentId?: number;
  expHumanReqId?: number;
  phaseHumanReqId?: number;
  humanResourceId?: number;
  userId?: number;
  roleId?: number;
  requiredSkillId?: number;
  status?: AllocationDetailStatus;
  startFrom?: string;
  startTo?: string;
  endFrom?: string;
  endTo?: string;
  minWorkingHours?: number;
  maxWorkingHours?: number;
  page?: number;
  size?: number;
}

export interface AllocationHumanDetailPage {
  items: AllocationHumanDetail[];
  page?: number;
  size?: number;
  total?: number;
  totalCount?: number;
  totalPages?: number;
}
