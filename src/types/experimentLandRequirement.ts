export interface ExperimentLandRequirement {
  expLandReqId: number;

  experimentId: number;
  experimentName?: string;

  requiredArea: number;
  requiredSoilType: string;

  note?: string | null;
  isFixedForExperiment?: boolean;

  createdAt?: string;
  updatedAt?: string | null;
}

export interface ExperimentLandRequirementRequest {
  experimentId: number;
  requiredArea: number;
  requiredSoilType: string;

  note?: string | null;
  isFixedForExperiment?: boolean;
}

export interface ExperimentLandRequirementQuery {
  keyword?: string;
  experimentId?: number;
  requiredSoilType?: string;

  page?: number;
  size?: number;
}

export interface ExperimentLandRequirementPagedResponse {
  items: ExperimentLandRequirement[];

  page?: number;
  size?: number;
  totalItems?: number;
  totalPages?: number;
}