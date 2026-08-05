export type LandResourceStatus =
  | "Available"
  | "Reserved"
  | "InUse"
  | "Maintenance"
  | "Unavailable";

export interface LandResource {
  landId: number;

  areaId: number;
  areaName?: string | null;

  landCode: string;

  areaSize: number;

  location?: string | null;

  soilType: string;

  status: LandResourceStatus;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface LandResourceRequest {
  areaId: number;

  landCode: string;

  areaSize: number;

  location?: string | null;

  soilType: string;

  status: LandResourceStatus;
}

export interface LandResourceQuery {
  keyword?: string;

  areaId?: number;

  status?: LandResourceStatus;

  page?: number;

  size?: number;
}