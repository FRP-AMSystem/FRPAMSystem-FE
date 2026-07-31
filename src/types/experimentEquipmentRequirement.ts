export interface ExperimentEquipmentRequirement {
  expEquipmentReqId: number;

  experimentId: number;
  experimentName: string;

  equipmentTypeId: number;
  equipmentTypeName: string;

  quantity: number;

  allowSubstitute: boolean;

  minAcceptableEfficiency: number;

  note?: string;

  createdAt?: string;
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