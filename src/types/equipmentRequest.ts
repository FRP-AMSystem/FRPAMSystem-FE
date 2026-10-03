export interface EquipmentExtensionRequest {
  id: number;
  allocationEquipmentDetailId: number;
  requestedBy: number;
  requestedEndDate: string;
  reason?: string | null;
  status?: string | null;
  createdAt?: string | null;
}

export interface EquipmentExtensionRequestPayload {
  allocationEquipmentDetailId: number;
  requestedEndDate: string;
  reason?: string | null;
}

export interface EquipmentChangeRequest {
  id: number;
  allocationEquipmentDetailId: number;
  requestedBy: number;
  requestedEquipmentTypeId: number;
  requestedEquipmentInstanceId?: number | null;
  reason?: string | null;
  status?: string | null;
  createdAt?: string | null;
}

export interface EquipmentChangeRequestPayload {
  allocationEquipmentDetailId: number;
  requestedEquipmentTypeId: number;
  requestedEquipmentInstanceId?: number | null;
  reason?: string | null;
}

export interface EquipmentRequestQuery {
  allocationEquipmentDetailId?: number;
  requestedBy?: number;
  status?: string;
  page?: number;
  size?: number;
}
