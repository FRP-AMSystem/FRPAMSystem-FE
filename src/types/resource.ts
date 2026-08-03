export interface Area {
  areaId: number;
  areaName: string;
  description?: string;
}

export type LandResourceStatus = "Available" | "Allocated" | "Maintenance";

export interface LandResource {
  landId: number;
  areaId: number;
  landCode: string;
  areaSize: number;
  location?: string;
  soilType?: string;
  status: LandResourceStatus;
}

export interface EquipmentCategory {
  equipmentCategoryId: number;
  categoryName: string;
  description?: string;
}

export type EquipmentTrackingType = "QuantityBased" | "Individual";

export interface EquipmentType {
  equipmentTypeId: number;
  equipmentCategoryId: number;
  name: string;
  trackingType: EquipmentTrackingType;
  baseMaintenanceIntervalHours?: number;
  totalQuantity: number;
  description?: string;
}

export type EquipmentConditionLevel = "Excellent" | "Good" | "Fair" | "Poor" | "Unusable";
export type EquipmentInstanceStatus = "Available" | "InUse" | "Maintenance" | "Retired";

export interface EquipmentInstance {
  equipmentInstanceId: number;
  equipmentTypeId: number;
  assetCode: string;
  serialNumber: string;
  totalUsageHours: number;
  lastMaintenanceDate?: string;
  usageHoursSinceMaintenance: number;
  nextMaintenanceDate?: string;
  conditionLevel: EquipmentConditionLevel;
  status: EquipmentInstanceStatus;
  effectiveMaintenanceIntervalHours?: number;
  maintenanceCount: number;
  note?: string;
}
