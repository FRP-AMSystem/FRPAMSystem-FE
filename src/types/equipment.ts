export type EquipmentTrackingType =
  | "QuantityBased"
  | "Individual";

export type EquipmentConditionLevel =
  | "Good"
  | "Fair"
  | "Poor"
  | "Broken";

export type EquipmentInstanceStatus =
  | "Available"
  | "Reserved"
  | "InUse"
  | "Maintenance"
  | "Damaged"
  | "Missing";

export interface EquipmentCategory {
  equipmentCategoryId: number;

  categoryName?: string | null;
  name?: string | null;

  description?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface EquipmentType {
  equipmentTypeId: number;
  equipmentCategoryId: number;

  categoryName?: string | null;
  equipmentCategoryName?: string | null;

  typeName?: string | null;
  equipmentTypeName?: string | null;
  name?: string | null;

  trackingType?: EquipmentTrackingType;

  baseMaintenanceIntervalHours?: number | null;
  totalQuantity?: number;

  description?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface EquipmentInstance {
  equipmentInstanceId: number;
  equipmentTypeId: number;

  equipmentTypeName?: string | null;
  typeName?: string | null;

  equipmentCategoryId?: number;
  equipmentCategoryName?: string | null;

  instanceName?: string | null;

  assetCode?: string | null;
  code?: string | null;

  serialNumber?: string | null;

  totalUsageHours?: number;
  usageHoursSinceMaintenance?: number;

  lastMaintenanceDate?: string | null;
  nextMaintenanceDate?: string | null;

  conditionLevel?: EquipmentConditionLevel;
  status?: EquipmentInstanceStatus;

  effectiveMaintenanceIntervalHours?: number | null;
  maintenanceCount?: number;

  location?: string | null;
  note?: string | null;
  description?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface EquipmentInstanceFilter {
  keyword?: string;
  equipmentTypeId?: number;
  equipmentCategoryId?: number;
  conditionLevel?: EquipmentConditionLevel;
  status?: EquipmentInstanceStatus;
  page?: number;
  size?: number;
}

export interface EquipmentInstanceRequest {
  equipmentTypeId: number;

  assetCode: string | null;
  serialNumber: string | null;

  totalUsageHours: number;

  lastMaintenanceDate: string | null;
  usageHoursSinceMaintenance: number;
  nextMaintenanceDate: string | null;

  conditionLevel: EquipmentConditionLevel;
  status: EquipmentInstanceStatus;

  effectiveMaintenanceIntervalHours: number | null;
  maintenanceCount: number;

  note: string | null;
}