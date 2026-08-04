export interface Area {
  areaId: number;

  areaName: string;

  description?: string | null;

  createdAt?: string | null;

  updatedAt?: string | null;
}

export interface AreaRequest {
  areaName: string;

  description?: string | null;
}

export interface AreaQuery {
  keyword?: string;

  page?: number;

  size?: number;
}