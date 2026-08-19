import type { ExperimentCreateRequest } from "./experiment";
import type { ExperimentPhaseRequest } from "./experimentPhase";
import type { ExperimentEquipmentRequirementPayload } from "../services/experimentEquipmentRequirementService";
import type { ExperimentHumanRequirementRequest } from "./experimentHumanRequirement";
import type { ExperimentLandRequirementRequest } from "./experimentLandRequirement";

export interface AISuggestionInput {
  experiment: ExperimentCreateRequest & { experimentId?: number };
  experimentPhases: Array<Omit<ExperimentPhaseRequest, "experimentId"> & { id?: string }>;
  equipmentRequirements: Array<Omit<ExperimentEquipmentRequirementPayload, "experimentId"> & { id?: string; equipmentTypeName?: string }>;
  humanRequirements: Array<Omit<ExperimentHumanRequirementRequest, "experimentId"> & { id?: string; roleName?: string; requiredSkillName?: string }>;
  landRequirements: Array<Omit<ExperimentLandRequirementRequest, "experimentId"> & { id?: string }>;
}

export interface FitnessBreakdown {
  landScore?: number;
  humanScore?: number;
  equipmentScore?: number;
  scheduleScore?: number;
  penaltyScore?: number;
  bonusScore?: number;
  finalScore?: number;
}

export interface ConstraintReport {
  landConflicts?: string[];
  humanConflicts?: string[];
  equipmentConflicts?: string[];
  scheduleConflicts?: string[];
  maintenanceConflicts?: string[];
  skillConflicts?: string[];
  roleConflicts?: string[];
  deadlineConflicts?: string[];
}

export interface AllocatedLandItem {
  phaseId?: number;
  phaseName?: string;
  landId?: number;
  landCode?: string;
  soilType?: string;
  areaSize?: number;
  startDate?: string;
  endDate?: string;
}

export interface AllocatedHumanItem {
  phaseId?: number;
  phaseName?: string;
  humanResourceId?: number;
  fullName?: string;
  roleId?: number;
  roleName?: string;
  currentWorkload?: number;
  startDate?: string;
  endDate?: string;
}

export interface AllocatedEquipmentItem {
  phaseId?: number;
  phaseName?: string;
  equipmentInstanceId?: number;
  assetCode?: string;
  requiredEquipmentTypeId?: number;
  allocatedEquipmentTypeId?: number;
  equipmentTypeName?: string;
  isSubstitute?: boolean;
  efficiencyRate?: number;
  timeMultiplier?: number;
  startDate?: string;
  endDate?: string;
}

export interface TimelinePhaseItem {
  phaseId?: number;
  phaseName?: string;
  startDate?: string;
  endDate?: string;
  durationDays?: number;
}

export interface AISuggestionPhaseItem {
  phaseName: string;
  phaseDescription?: string | null;
  phaseOrder: number;
  expectedStartDate: string;
  expectedEndDate: string;
  status: "Planned";
}

export interface AISuggestionEquipmentItem {
  equipmentTypeId: number;
  equipmentTypeName?: string;
  quantity: number;
  allowSubstitute: boolean;
  minAcceptableEfficiency: number;
  note?: string;
}

export interface AISuggestionHumanItem {
  roleId: number;
  roleName?: string;
  quantity: number;
  requiredSkillId: number | null;
  requiredSkillName?: string;
  workingHoursPerDay: number | null;
  note: string | null;
}

export interface AISuggestionLandItem {
  requiredArea: number;
  requiredSoilType?: string | null;
  note?: string | null;
}

export interface AIChangeItem {
  field: string;
  from: string;
  to: string;
}

export interface AISuggestionPlan {
  id: string;
  rank: number;
  title: string;
  strategyBadge: string;
  description: string;
  fitnessScore: number;
  penaltyScore: number;
  bonusScore: number;
  fitnessBreakdown?: FitnessBreakdown;
  constraintReport?: ConstraintReport;
  conflictCount: number;
  estimatedCompletionTime?: string;
  estimatedDurationDays: number;
  totalResourceScore: number;
  advantages: string[];
  disadvantages: string[];
  rationale: string[];
  changesSummary?: AIChangeItem[];
  allocatedLands: AllocatedLandItem[];
  allocatedHumans: AllocatedHumanItem[];
  allocatedEquipment: AllocatedEquipmentItem[];
  timeline: TimelinePhaseItem[];
  experimentPhases: AISuggestionPhaseItem[];
  equipmentRequirements: AISuggestionEquipmentItem[];
  humanRequirements: AISuggestionHumanItem[];
  landRequirements: AISuggestionLandItem[];
}

export interface AISuggestionResponse {
  suggestions: AISuggestionPlan[];
}
