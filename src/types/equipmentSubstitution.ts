export interface EquipmentSubstitution {
  equipmentSubstitutionId: number;

  primaryEquipmentTypeId: number;
  primaryEquipmentTypeName?: string | null;

  subEquipmentTypeId: number;
  subEquipmentTypeName?: string | null;

  efficiencyRate: number;

  timeMultiplier: number;

  note?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface EquipmentSubstitutionRequest {
  primaryEquipmentTypeId: number;

  subEquipmentTypeId: number;

  efficiencyRate: number;

  timeMultiplier: number;

  note?: string | null;
}

export interface EquipmentSubstitutionQuery {
  keyword?: string;

  primaryEquipmentTypeId?: number;

  subEquipmentTypeId?: number;

  page?: number;

  size?: number;
}