export type AllocationDetailStatus =
  | "Proposed"
  | "Reserved"
  | "Allocated"
  | "InUse"
  | "Completed"
  | "Cancelled";

export interface AllocationLandDetail {
  allocationLandDetailId: number;
  allocationPlanId: number;

  experimentId?: number;
  experimentName?: string;

  landId: number;
  landName?: string;
  landCode?: string;

  areaId?: number;
  areaName?: string;
  areaSize?: number;
  location?: string;
  soilType?: string;

  expLandReqId: number;

  startDate: string;
  endDate: string;
  status: AllocationDetailStatus;

  createdAt?: string;
  updatedAt?: string | null;
}

export interface AllocationLandDetailRequest {
  allocationPlanId: number;
  landId: number;
  expLandReqId: number;
  startDate: string;
  endDate: string;
  status: AllocationDetailStatus;
}

export interface AllocationLandDetailQuery {
  keyword?: string;
  allocationPlanId?: number;
  experimentId?: number;
  landId?: number;
  areaId?: number;
  expLandReqId?: number;
  status?: AllocationDetailStatus;
  startFrom?: string;
  startTo?: string;
  endFrom?: string;
  endTo?: string;
  page?: number;
  size?: number;
}

export interface AllocationLandDetailPage {
  items: AllocationLandDetail[];
  page?: number;
  size?: number;
  total?: number;
  totalCount?: number;
  totalPages?: number;
}
