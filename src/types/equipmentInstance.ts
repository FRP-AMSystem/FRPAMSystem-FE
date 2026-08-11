export type EquipmentInstanceStatus =
  | "Available"
  | "Reserved"
  | "InUse"
  | "Maintenance"
  | "Broken"
  | "Unavailable";

export type EquipmentConditionLevel =
  | "New"
  | "Good"
  | "Fair"
  | "Poor"
  | "Damaged";

export interface EquipmentInstance {
  equipmentInstanceId: number;

  equipmentTypeId: number;
  equipmentTypeName?: string | null;

  assetCode: string;

  serialNumber?: string | null;

  status: EquipmentInstanceStatus;

  conditionLevel: EquipmentConditionLevel;

  usageHours: number;

  lastMaintenanceDate?: string | null;
  nextMaintenanceDate?: string | null;

  note?: string | null;

  assignedToUserId?: number | null;
  assignedToUserName?: string | null;

  receiptConfirmed?: boolean;
  receiptConfirmedAt?: string | null;
  receiptNotes?: string | null;
  receivedCondition?: EquipmentConditionLevel | null;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ConfirmReceiptRequest {
  receivedCondition: EquipmentConditionLevel;
  receiptNotes?: string;
}

export interface EquipmentInstanceRequest {
  equipmentTypeId: number;

  assetCode: string;

  serialNumber?: string | null;

  status: EquipmentInstanceStatus;

  conditionLevel: EquipmentConditionLevel;

  usageHours: number;

  lastMaintenanceDate?: string | null;
  nextMaintenanceDate?: string | null;

  note?: string | null;
}

export interface EquipmentInstanceQuery {
  keyword?: string;

  equipmentTypeId?: number;

  status?: EquipmentInstanceStatus;

  conditionLevel?: EquipmentConditionLevel;

  page?: number;
  size?: number;
}