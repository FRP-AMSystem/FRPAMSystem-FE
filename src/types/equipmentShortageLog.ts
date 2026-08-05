export interface EquipmentShortageLog {
  equipmentShortageLogId: number;

  allocationPlanId: number;
  allocationPlanName?: string | null;

  experimentId?: number | null;
  experimentName?: string | null;

  expEquipmentReqId?: number | null;
  phaseEquipmentReqId?: number | null;

  phaseId?: number | null;
  phaseName?: string | null;

  equipmentTypeId?: number | null;
  equipmentTypeName?: string | null;

  requiredQuantity?: number | null;
  allocatedQuantity?: number | null;

  shortageQuantity: number;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface EquipmentShortageLogRequest {
  allocationPlanId: number;

  expEquipmentReqId?: number | null;

  phaseEquipmentReqId?: number | null;

  shortageQuantity: number;
}

export interface EquipmentShortageLogQuery {
  allocationPlanId?: number;

  expEquipmentReqId?: number;

  phaseEquipmentReqId?: number;

  page?: number;

  size?: number;
}