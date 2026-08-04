export interface ExperimentLandRequirement {
  expLandReqId: number;

  experimentId: number;
  experimentName?: string;

  requiredArea: number;
  requiredSoilType?: string | null;

  note?: string | null;

  createdAt?: string;
  updatedAt?: string | null;
}

export interface ExperimentLandRequirementRequest {
  experimentId: number;
  requiredArea: number;
  requiredSoilType?: string | null;
  note?: string | null;
}

export interface ExperimentLandRequirementQuery {
  keyword?: string;
  experimentId?: number;
  requiredSoilType?: string;
  page?: number;
  size?: number;
}