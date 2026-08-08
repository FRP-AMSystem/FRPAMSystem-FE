export type Role =
  | "Admin"
  | "Manager"
  | "Researcher"
  | "Technician"
  | "Student";

export interface RolePermission {
  canManageUsers: boolean;
  canManageRoles: boolean;
  canManageSystemConfiguration: boolean;
  canViewAuditLogs: boolean;

  canViewExperiments: boolean;
  canCreateExperiment: boolean;
  canEditExperiment: boolean;
  canDeleteExperiment: boolean;
  canSubmitExperiment: boolean;

  canViewExperimentPhases: boolean;
  canCreateExperimentPhase: boolean;
  canEditExperimentPhase: boolean;
  canDeleteExperimentPhase: boolean;

  canViewRequirements: boolean;
  canCreateRequirement: boolean;
  canEditRequirement: boolean;
  canDeleteRequirement: boolean;

  canViewAllocations: boolean;
  canCreateAllocation: boolean;
  canEditAllocation: boolean;
  canDeleteAllocation: boolean;
  canSubmitAllocation: boolean;
  canCancelAllocation: boolean;
  canApproveAllocation: boolean;
  canRejectAllocation: boolean;

  canViewResources: boolean;
  canManageResources: boolean;

  canViewSchedules: boolean;
  canCreateSchedule: boolean;
  canEditSchedule: boolean;
  canDeleteSchedule: boolean;
  canUpdateScheduleStatus: boolean;

  canViewConflicts: boolean;
  canViewReports: boolean;
  canViewNotifications: boolean;
  canViewAnalytics: boolean;
}

export const validRoles: Role[] = [
  "Admin",
  "Manager",
  "Researcher",
  "Technician",
  "Student",
];

export function isRole(
  value: unknown
): value is Role {
  return (
    value === "Admin" ||
    value === "Manager" ||
    value === "Researcher" ||
    value === "Technician" ||
    value === "Student"
  );
}

export function getStoredRole(): Role {
  const storedRole =
    localStorage.getItem("role") ||
    localStorage.getItem("roleName");

  return isRole(storedRole)
    ? storedRole
    : "Student";
}

export function getStoredUserId(): number | null {
  const storedUserId =
    localStorage.getItem("userId");

  if (!storedUserId) {
    return null;
  }

  const userId =
    Number(storedUserId);

  return Number.isInteger(userId) &&
    userId > 0
    ? userId
    : null;
}

export const rolePermissions: Record<
  Role,
  RolePermission
> = {
  Admin: {
    canManageUsers: true,
    canManageRoles: true,
    canManageSystemConfiguration: true,
    canViewAuditLogs: true,

    canViewExperiments: false,
    canCreateExperiment: false,
    canEditExperiment: false,
    canDeleteExperiment: false,
    canSubmitExperiment: false,

    canViewExperimentPhases: false,
    canCreateExperimentPhase: false,
    canEditExperimentPhase: false,
    canDeleteExperimentPhase: false,

    canViewRequirements: false,
    canCreateRequirement: false,
    canEditRequirement: false,
    canDeleteRequirement: false,

    canViewAllocations: false,
    canCreateAllocation: false,
    canEditAllocation: false,
    canDeleteAllocation: false,
    canSubmitAllocation: false,
    canCancelAllocation: false,
    canApproveAllocation: false,
    canRejectAllocation: false,

    canViewResources: false,
    canManageResources: false,

    canViewSchedules: false,
    canCreateSchedule: false,
    canEditSchedule: false,
    canDeleteSchedule: false,
    canUpdateScheduleStatus: false,

    canViewConflicts: false,
    canViewReports: true,
    canViewNotifications: true,
    canViewAnalytics: false,
  },

  Manager: {
    canManageUsers: false,
    canManageRoles: false,
    canManageSystemConfiguration: false,
    canViewAuditLogs: false,

    canViewExperiments: true,
    canCreateExperiment: false,
    canEditExperiment: false,
    canDeleteExperiment: false,
    canSubmitExperiment: false,

    canViewExperimentPhases: true,
    canCreateExperimentPhase: false,
    canEditExperimentPhase: false,
    canDeleteExperimentPhase: false,

    canViewRequirements: true,
    canCreateRequirement: false,
    canEditRequirement: false,
    canDeleteRequirement: false,

    canViewAllocations: true,
    canCreateAllocation: false,
    canEditAllocation: false,
    canDeleteAllocation: false,
    canSubmitAllocation: false,
    canCancelAllocation: false,
    canApproveAllocation: true,
    canRejectAllocation: true,

    canViewResources: true,
    canManageResources: true,

    canViewSchedules: true,
    canCreateSchedule: false,
    canEditSchedule: false,
    canDeleteSchedule: false,
    canUpdateScheduleStatus: false,

    canViewConflicts: true,
    canViewReports: true,
    canViewNotifications: true,
    canViewAnalytics: true,
  },

  Researcher: {
    canManageUsers: false,
    canManageRoles: false,
    canManageSystemConfiguration: false,
    canViewAuditLogs: false,

    canViewExperiments: true,
    canCreateExperiment: true,
    canEditExperiment: true,
    canDeleteExperiment: true,
    canSubmitExperiment: true,

    canViewExperimentPhases: true,
    canCreateExperimentPhase: true,
    canEditExperimentPhase: true,
    canDeleteExperimentPhase: true,

    canViewRequirements: true,
    canCreateRequirement: true,
    canEditRequirement: true,
    canDeleteRequirement: true,

    canViewAllocations: true,
    canCreateAllocation: true,
    canEditAllocation: true,
    canDeleteAllocation: false,
    canSubmitAllocation: true,
    canCancelAllocation: true,
    canApproveAllocation: false,
    canRejectAllocation: false,

    canViewResources: true,
    canManageResources: false,

    canViewSchedules: true,
    canCreateSchedule: true,
    canEditSchedule: true,
    canDeleteSchedule: false,
    canUpdateScheduleStatus: false,

    canViewConflicts: true,
    canViewReports: true,
    canViewNotifications: true,
    canViewAnalytics: true,
  },

  Technician: {
    canManageUsers: false,
    canManageRoles: false,
    canManageSystemConfiguration: false,
    canViewAuditLogs: false,

    canViewExperiments: true,
    canCreateExperiment: false,
    canEditExperiment: false,
    canDeleteExperiment: false,
    canSubmitExperiment: false,

    canViewExperimentPhases: true,
    canCreateExperimentPhase: false,
    canEditExperimentPhase: false,
    canDeleteExperimentPhase: false,

    canViewRequirements: true,
    canCreateRequirement: false,
    canEditRequirement: false,
    canDeleteRequirement: false,

    canViewAllocations: true,
    canCreateAllocation: false,
    canEditAllocation: false,
    canDeleteAllocation: false,
    canSubmitAllocation: false,
    canCancelAllocation: false,
    canApproveAllocation: false,
    canRejectAllocation: false,

    canViewResources: true,
    canManageResources: false,

    canViewSchedules: true,
    canCreateSchedule: false,
    canEditSchedule: false,
    canDeleteSchedule: false,
    canUpdateScheduleStatus: true,

    canViewConflicts: true,
    canViewReports: true,
    canViewNotifications: true,
    canViewAnalytics: false,
  },

  Student: {
    canManageUsers: false,
    canManageRoles: false,
    canManageSystemConfiguration: false,
    canViewAuditLogs: false,

    canViewExperiments: true,
    canCreateExperiment: false,
    canEditExperiment: false,
    canDeleteExperiment: false,
    canSubmitExperiment: false,

    canViewExperimentPhases: true,
    canCreateExperimentPhase: false,
    canEditExperimentPhase: false,
    canDeleteExperimentPhase: false,

    canViewRequirements: true,
    canCreateRequirement: false,
    canEditRequirement: false,
    canDeleteRequirement: false,

    canViewAllocations: true,
    canCreateAllocation: false,
    canEditAllocation: false,
    canDeleteAllocation: false,
    canSubmitAllocation: false,
    canCancelAllocation: false,
    canApproveAllocation: false,
    canRejectAllocation: false,

    canViewResources: true,
    canManageResources: false,

    canViewSchedules: true,
    canCreateSchedule: false,
    canEditSchedule: false,
    canDeleteSchedule: false,
    canUpdateScheduleStatus: false,

    canViewConflicts: false,
    canViewReports: false,
    canViewNotifications: true,
    canViewAnalytics: false,
  },
};

export function getPermissions(
  role: Role = getStoredRole()
): RolePermission {
  return rolePermissions[role];
}

export function hasPermission(
  permission: keyof RolePermission,
  role: Role = getStoredRole()
): boolean {
  return rolePermissions[role][permission];
}