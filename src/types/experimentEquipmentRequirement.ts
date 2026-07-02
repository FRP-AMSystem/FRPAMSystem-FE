export interface ExperimentEquipmentRequirement {
  requirementId: number;
  experimentEquipmentRequirementId?: number;

  experimentId: number;
  experimentName?: string | null;

  equipmentTypeId: number;
  equipmentTypeName?: string | null;

  quantity: number;
  allowSubstitute: boolean;
  minAcceptableEfficiency: number;

  note?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ExperimentEquipmentRequirementQuery {
  keyword?: string;
  experimentId?: number;
  equipmentTypeId?: number;
  allowSubstitute?: boolean;
  page?: number;
  size?: number;
}