import type {
  Schedule,
} from "./schedule";

export type ScheduleConflictType =
  | "HumanResourceOverlap"
  | "AllocationOverlap"
  | "PhaseOverlap";

export type ScheduleConflictSeverity =
  | "Low"
  | "Medium"
  | "High";

export interface ScheduleConflict {
  conflictId: string;

  conflictType: ScheduleConflictType;
  severity: ScheduleConflictSeverity;

  title: string;
  description: string;

  resourceId?: number | null;
  resourceName?: string | null;

  firstSchedule: Schedule;
  secondSchedule: Schedule;

  overlapStart: string;
  overlapEnd: string;
}

export interface ScheduleConflictQuery {
  keyword?: string;

  conflictType?: ScheduleConflictType;

  severity?: ScheduleConflictSeverity;

  startDateFrom?: string;
  startDateTo?: string;
}