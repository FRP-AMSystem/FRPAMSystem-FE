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
  title: string;
  strategyBadge: string;
  description: string;
  estimatedDurationDays: number;
  totalResourceScore: number;
  rationale: string[];
  changesSummary?: AIChangeItem[];
  experimentPhases: AISuggestionPhaseItem[];
  equipmentRequirements: AISuggestionEquipmentItem[];
  humanRequirements: AISuggestionHumanItem[];
  landRequirements: AISuggestionLandItem[];
}

export interface AISuggestionResponse {
  suggestions: AISuggestionPlan[];
}
