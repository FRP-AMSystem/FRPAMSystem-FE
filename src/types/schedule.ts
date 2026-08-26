export type ScheduleStatus =
  | "Planned"
  | "InProgress"
  | "Completed"
  | "Cancelled";

export interface Schedule {
  scheduleId: number;

  allocationPlanId: number;
  allocationPlanName?: string | null;

  phaseId?: number | null;
  phaseName?: string | null;

  title?: string | null;
  description?: string | null;

  startDate: string;
  endDate: string;

  status: ScheduleStatus;

  createdBy?: number | null;
  createdByName?: string | null;

  assignedHumanResourceId?: number | null;
  assignedHumanResourceName?: string | null;

  notes?: string | null;

  priority: number;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ScheduleRequest {
  allocationPlanId: number;

  phaseId: number | null;

  title: string | null;
  description: string | null;

  startDate: string;
  endDate: string;

  status: ScheduleStatus;

  createdBy: number | null;

  assignedHumanResourceId: number | null;

  notes: string | null;

  priority: number;
}

export interface ScheduleQuery {
  keyword?: string;

  allocationPlanId?: number;
  phaseId?: number;

  assignedHumanResourceId?: number;
  createdBy?: number;

  status?: ScheduleStatus;

  startDateFrom?: string;
  startDateTo?: string;

  dateFrom?: string;
  dateTo?: string;

  page?: number;
  size?: number;
}