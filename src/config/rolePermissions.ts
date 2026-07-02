export const rolePermissions = {
  Admin: {
    canViewAllocation: true,
    canCreateAllocation: true,
    canEditAllocation: true,
    canDeleteAllocation: true,
    canApproveAllocation: true,
    canRejectAllocation: true,
    dashboardType: "admin",
  },

  Manager: {
    canViewAllocation: true,
    canCreateAllocation: true,
    canEditAllocation: true,
    canDeleteAllocation: true,
    canApproveAllocation: true,
    canRejectAllocation: true,
    dashboardType: "manager",
  },

  Researcher: {
    canViewAllocation: true,
    canCreateAllocation: false,
    canEditAllocation: false,
    canDeleteAllocation: false,
    canApproveAllocation: false,
    canRejectAllocation: false,
    dashboardType: "researcher",
  },

  Technician: {
    canViewAllocation: true,
    canCreateAllocation: false,
    canEditAllocation: false,
    canDeleteAllocation: false,
    canApproveAllocation: false,
    canRejectAllocation: false,
    dashboardType: "technician",
  },
};