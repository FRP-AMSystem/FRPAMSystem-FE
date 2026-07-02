export type EquipmentCategory = {
  equipmentCategoryId: number;
  categoryName: string;
  description?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type EquipmentType = {
  equipmentTypeId: number;
  equipmentCategoryId: number;
  categoryName?: string | null;
  typeName: string;
  description?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type EquipmentInstance = {
  equipmentInstanceId: number;
  equipmentTypeId: number;
  equipmentTypeName?: string | null;
  equipmentCategoryName?: string | null;
  instanceName: string;
  code?: string | null;
  status?: string | null;
  location?: string | null;
  description?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};