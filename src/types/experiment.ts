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
  researcherEmail?: string | null;

  expectStartDate?: string | null;
  expectEndDate?: string | null;
  deadline?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;

  status?: ExperimentStatus | string | null;
  priority?: number | null;
  rejectReason?: string | null;

  createdByUserId?: number | null;
  createdByName?: string | null;
  createdByEmail?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ExperimentCreateRequest {
  experimentName: string;
  description?: string | null;

  researcherId: number;

  expectStartDate: string;
  expectEndDate: string;
  deadline: string;
  actualStartDate?: string | null;
  actualEndDate?: string | null;

  priority: number;

  /*
    Default to Draft when creating a new experiment.
    The backend may auto-assign Draft if no status is provided.
  */
  status?: ExperimentStatus | string;
  rejectReason?: string | null;
}

export interface ExperimentUpdateRequest {
  experimentName?: string;
  description?: string | null;

  researcherId?: number | null;

  expectStartDate?: string | null;
  expectEndDate?: string | null;
  deadline?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;

  priority?: number | null;
  status?: ExperimentStatus | string | null;
  rejectReason?: string | null;
}

export interface ExperimentQuery {
  keyword?: string;
  researcherId?: number;
  status?: ExperimentStatus | string;
  priority?: number;
  page?: number;
  size?: number;
}