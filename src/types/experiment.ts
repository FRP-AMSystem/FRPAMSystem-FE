export interface ExperimentResponse {
  experimentId: number;
  experimentName: string;
  description?: string | null;

  startDate?: string | null;
  endDate?: string | null;

  status?: string | null;
  priority?: string | null;

  createdByUserId?: number | null;
  createdByName?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ExperimentCreateRequest {
  experimentName: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  priority?: string;
}

export interface ExperimentUpdateRequest {
  experimentName: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  priority?: string;
}

export interface ExperimentQuery {
  keyword?: string;
  status?: string;
  priority?: string;
  page?: number;
  size?: number;
}