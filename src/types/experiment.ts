export interface ExperimentResponse {
  experimentId: number;
  experimentName: string;
  description?: string | null;

  researcherId?: number | null;
  researcherName?: string | null;

  expectStartDate?: string | null;
  expectEndDate?: string | null;
  deadline?: string | null;

  status?: string | null;
  priority?: number | null;

  createdByUserId?: number | null;
  createdByName?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ExperimentCreateRequest {
  experimentName: string;
  description?: string;

  researcherId: number;

  expectStartDate: string;
  expectEndDate: string;
  deadline: string;

  priority: number;
  status: string;
}

export interface ExperimentUpdateRequest {
  experimentName: string;
  description?: string;

  researcherId?: number;

  expectStartDate?: string;
  expectEndDate?: string;
  deadline?: string;

  priority?: number;
  status?: string;
}

export interface ExperimentQuery {
  keyword?: string;
  status?: string;
  priority?: number;
  page?: number;
  size?: number;
}