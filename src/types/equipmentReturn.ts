export type EquipmentReturnStatus =
  | "Pending"
  | "Confirmed"
  | "Rejected"
  | "Returned"
  | "Missing";

export interface EquipmentReturn {
  id: number;
  allocationEquipmentDetailId: number;
  equipmentInstanceId?: number | null;
  returnedBy: number;
  receivedBy: number;
  returnDate: string;
  quantity: number;
  conditionAfter?: string | null;
  isDamaged: boolean;
  damageDescription?: string | null;
  note?: string | null;
  status?: string | null;
  confirmedAt?: string | null;

  allocationEquipmentDetail?: {
    id: number;
    quantity?: number;
    equipmentInstanceId?: number | null;
    equipmentInstance?: {
      id: number;
      name?: string;
      code?: string;
      serialNumber?: string;
    };
  };

  returnedByUser?: {
    id: number;
    fullName?: string;
    username?: string;
    email?: string;
  };

  receivedByUser?: {
    id: number;
    fullName?: string;
    username?: string;
    email?: string;
  };
}

export interface EquipmentReturnMineRequest {
  conditionAfter?: string | null;
  isDamaged: boolean;
  damageDescription?: string | null;
  note?: string | null;
}

export interface EquipmentReturnRequest {
  allocationEquipmentDetailId: number;
  equipmentInstanceId?: number | null;
  returnedBy: number;
  receivedBy: number;
  returnDate: string;
  quantity: number;
  conditionAfter?: string | null;
  isDamaged: boolean;
  damageDescription?: string | null;
  note?: string | null;
  status?: string | null;
  confirmedAt?: string | null;
}

export interface RejectReturnRequest {
  reason?: string | null;
}

export interface EquipmentReturnFilter {
  allocationEquipmentDetailId?: number;
  equipmentInstanceId?: number;
  returnedBy?: number;
  receivedBy?: number;
  status?: string;
  isDamaged?: boolean;
  returnDateFrom?: string;
  returnDateTo?: string;
  page?: number;
  size?: number;
}