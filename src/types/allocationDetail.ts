export type AllocationDetailStatus =
  | "Proposed"
  | "Reserved"
  | "Allocated"
  | "InUse"
  | "Completed"
  | "Cancelled";

export interface AllocationEquipmentDetail {
  allocationEquipmentDetailId: number;
  allocationPlanId: number;

  experimentId?: number;
  experimentName?: string;

  expEquipmentReqId: number;
  phaseEquipmentReqId?: number | null;
  phaseId?: number | null;
  phaseName?: string | null;

  requestedEquipmentTypeId?: number;
  requestedEquipmentTypeName?: string;

  allocatedEquipmentTypeId: number;
  allocatedEquipmentTypeName?: string;

  equipmentInstanceId?: number | null;
  equipmentInstanceName?: string;
  assetCode?: string;
  serialNumber?: string | null;

  quantity: number;
  efficiencyRate: number;
  isSubstitute: boolean;

  startDate: string;
  endDate: string;
  status: AllocationDetailStatus;

  createdAt?: string;
  updatedAt?: string | null;
}


export interface AllocationEquipmentDetailRequest {
  allocationPlanId: number;

  expEquipmentReqId: number;
  phaseEquipmentReqId?: number | null;

  allocatedEquipmentTypeId: number;
  equipmentInstanceId?: number | null;

  quantity: number;
  efficiencyRate: number;
  isSubstitute: boolean;

  startDate: string;
  endDate: string;
  status: AllocationDetailStatus;
}

export interface AllocationEquipmentDetailQuery {
  keyword?: string;

  allocationPlanId?: number;
  experimentId?: number;

  expEquipmentReqId?: number;
  phaseEquipmentReqId?: number;

  allocatedEquipmentTypeId?: number;
  equipmentInstanceId?: number;

  isSubstitute?: boolean;
  status?: AllocationDetailStatus;

  startFrom?: string;
  startTo?: string;

  endFrom?: string;
  endTo?: string;

  page?: number;
  size?: number;
}

export interface AllocationEquipmentDetailPage {
  items: AllocationEquipmentDetail[];

  page?: number;
  size?: number;

  total?: number;
  totalCount?: number;
  totalPages?: number;
}
