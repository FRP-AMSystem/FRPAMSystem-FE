export type ExperimentStatus =
  | "Draft"
  | "Submitted"
  | "Planning"
  | "Ready"
  | "Running"
  | "Completed"
  | "Cancelled";

export interface ExperimentResponse {
  experimentId: number;
  experimentName: string;
  description?: string | null;

  researcherId?: number | null;
  researcherName?: string | null;

  expectStartDate?: string | null;
  expectEndDate?: string | null;
  deadline?: string | null;

  status?: ExperimentStatus | string | null;
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

  /*
    Default to Draft when creating a new experiment.
    The backend may auto-assign Draft if no status is provided.
  */
  status: ExperimentStatus | string;
}

export interface ExperimentUpdateRequest {
  experimentName: string;
  description?: string;

  researcherId?: number;

  expectStartDate?: string;
  expectEndDate?: string;
  deadline?: string;

  priority?: number;
  status?: ExperimentStatus | string;
}

export interface ExperimentQuery {
  keyword?: string;
  status?: ExperimentStatus | string;
  priority?: number;
  page?: number;
  size?: number;
}