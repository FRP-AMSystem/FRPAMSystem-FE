export type ExperimentPhaseStatus =
  | "Planned"
  | "InProgress"
  | "Completed"
  | "Cancelled";

export interface ExperimentPhase {
  experimentPhaseId: number;

  experimentId: number;
  experimentName: string;

  phaseName: string;
  phaseDescription?: string | null;

  phaseOrder: number;

  expectedStartDate: string;
  expectedEndDate: string;

  status: ExperimentPhaseStatus;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ExperimentPhaseRequest {
  experimentId: number;

  phaseName: string;

  phaseDescription?: string | null;

  phaseOrder: number;

  expectedStartDate: string;
  expectedEndDate: string;

  status: ExperimentPhaseStatus;
}

export interface ExperimentPhaseQuery {
  keyword?: string;

  experimentId?: number;

  status?: ExperimentPhaseStatus;

  expectedStartDateFrom?: string;
  expectedStartDateTo?: string;

  page?: number;
  size?: number;
}