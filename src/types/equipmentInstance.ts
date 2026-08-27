export type EquipmentInstanceStatus =
  | "Available"
  | "Reserved"
  | "InUse"
  | "Maintenance"
  | "Damaged"
  | "Missing"
  | "Returned"
  | "Broken"
  | "Unavailable";

export type EquipmentConditionLevel =
  | "Good"
  | "Fair"
  | "Poor"
  | "Critical"
  | "New"
  | "Damaged";

export interface EquipmentInstance {
  equipmentInstanceId: number;
  equipmentTypeId: number;
  equipmentTypeName?: string | null;
  assetCode: string;
  serialNumber?: string | null;
  totalUsageHours: number;
  usageHours?: number;
  lastMaintenanceDate?: string | null;
  usageHoursSinceMaintenance: number;
  nextMaintenanceDate?: string | null;
  conditionLevel: EquipmentConditionLevel;
  status: EquipmentInstanceStatus;
  effectiveMaintenanceIntervalHours?: number | null;
  maintenanceCount: number;
  note?: string | null;
  assignedToUserId?: number | null;
  assignedToUserName?: string | null;
  receiptConfirmed?: boolean;
  receiptConfirmedAt?: string | null;
  receiptNotes?: string | null;
  receivedCondition?: EquipmentConditionLevel | null;
  efficiencyRate?: number | null;
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
  totalUsageHours?: number;
  usageHours?: number;
  lastMaintenanceDate?: string | null;
  usageHoursSinceMaintenance?: number;
  nextMaintenanceDate?: string | null;
  conditionLevel: EquipmentConditionLevel;
  status: EquipmentInstanceStatus;
  effectiveMaintenanceIntervalHours?: number | null;
  maintenanceCount?: number;
  note?: string | null;
}

export interface EquipmentInstanceQuery {
  keyword?: string;
  equipmentTypeId?: number;
  equipmentCategoryId?: number;
  status?: EquipmentInstanceStatus;
  conditionLevel?: EquipmentConditionLevel;
  page?: number;
  size?: number;
}
