export interface ExperimentResponse {
  experimentId: number;
  experimentName: string;
  description?: string;
  researcherId: number;
  researcherName: string;
  expectStartDate: string;
  expectEndDate: string;
  deadline?: string;
  priority: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
}