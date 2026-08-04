export interface EquipmentCategory {
  equipmentCategoryId: number;

  equipmentCategoryName: string;

  description?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface EquipmentCategoryRequest {
  equipmentCategoryName: string;

  description?: string | null;
}

export interface EquipmentCategoryQuery {
  keyword?: string;

  page?: number;
  size?: number;
}