import { getUsers } from "./userService";
import { getHumanResourceProfiles } from "./personnelService";
import { getLandResources, getEquipmentInstances, getEquipmentTypes } from "./resourceService";
import { getNotifications, type SystemNotification } from "./systemService";
import type {
  StatItem,
  BreakdownItem,
  ExperimentRequest,
} from "../types/dashboard";

export interface DashboardData {
  stats: StatItem[];
  resourceBreakdown: BreakdownItem[];
  recentRequests: ExperimentRequest[];
  isLoading: boolean;
}

export async function fetchLiveDashboardData(): Promise<{
  stats: StatItem[];
  resourceBreakdown: BreakdownItem[];
  recentRequests: ExperimentRequest[];
}> {
  try {
    // Fetch all resources with individual error handling so one failing API does not crash the others
    const [users, personnel, lands, machinery, tools, notifications] = await Promise.all([
      getUsers().catch((err) => {
        console.error("Error fetching users for dashboard:", err);
        return [];
      }),
      getHumanResourceProfiles().catch((err) => {
        console.error("Error fetching personnel profiles for dashboard:", err);
        return [];
      }),
      getLandResources().catch((err) => {
        console.error("Error fetching land resources for dashboard:", err);
        return [];
      }),
      getEquipmentInstances().catch((err) => {
        console.error("Error fetching equipment instances for dashboard:", err);
        return [];
      }),
      getEquipmentTypes().catch((err) => {
        console.error("Error fetching equipment types for dashboard:", err);
        return [];
      }),
      getNotifications().catch((err) => {
        console.error("Error fetching notifications for dashboard:", err);
        return [];
      }),
    ]);

    const totalLand = Array.isArray(lands) ? lands.length : 0;
    const totalMachinery = Array.isArray(machinery) ? machinery.length : 0;
    const totalToolsTypes = Array.isArray(tools) ? tools.length : 0;

    // Total resource categories count from real backend items
    const totalResourceCategories = totalLand + totalMachinery + totalToolsTypes;

    const activePersonnelCount = Array.isArray(personnel) ? personnel.length : 0;
    const totalUsersCount = Array.isArray(users) ? users.length : 0;

    // Calculate real percentages for Resource Breakdown Donut Chart
    const totalBreakdownCount = totalLand + totalMachinery + activePersonnelCount;

    let equipPercent = 0;
    let personnelPercent = 0;
    let landPercent = 0;

    if (totalBreakdownCount > 0) {
      equipPercent = Math.round((totalMachinery / totalBreakdownCount) * 100);
      personnelPercent = Math.round((activePersonnelCount / totalBreakdownCount) * 100);
      landPercent = Math.max(0, 100 - equipPercent - personnelPercent);
    }

    // Real Resource Utilization Calculation based on backend status
    const activePersonnelBusy = Array.isArray(personnel)
      ? personnel.filter((p: any) => p.status === "Busy" || p.status === "Assigned").length
      : 0;
    const activeMachineryInUse = Array.isArray(machinery)
      ? machinery.filter((m: any) => m.status === "In Use" || m.status === "Active" || m.status === "Operating").length
      : 0;

    const totalAllocatedAssets = activePersonnelBusy + activeMachineryInUse;
    const totalAllocatableAssets = activePersonnelCount + totalMachinery;

    let utilizationPercentage = 0;
    let utilizationSubtext = "No utilization data";

    if (totalAllocatableAssets > 0) {
      utilizationPercentage = Math.round((totalAllocatedAssets / totalAllocatableAssets) * 100);
      utilizationSubtext = totalAllocatedAssets > 0
        ? `${totalAllocatedAssets} of ${totalAllocatableAssets} assets in active use`
        : "0 assets currently allocated";
    }

    // Calculate warning / error system alerts count from real notifications
    const warningLogs = Array.isArray(notifications)
      ? notifications.filter((n: SystemNotification) => n.type === "Warning" || n.type === "Error")
      : [];
    const conflictCount = warningLogs.length;

    // Extract real user avatars if available
    const realAvatars: string[] = [];
    if (Array.isArray(users) && users.length > 0) {
      users.slice(0, 3).forEach((u: any) => {
        if (u.avatar) {
          realAvatars.push(u.avatar);
        } else if (u.fullName || u.userName || u.username) {
          const name = u.fullName || u.userName || u.username;
          realAvatars.push(name.trim().charAt(0).toUpperCase());
        }
      });
      if (users.length > 3) {
        realAvatars.push(`+${users.length - 3}`);
      }
    }

    const stats: StatItem[] = [
      {
        id: "stat-1",
        title: "TOTAL RESOURCES",
        value: `${totalResourceCategories}`,
        trend: {
          value: totalResourceCategories > 0
            ? `${totalLand} Lands, ${totalMachinery} Machines, ${totalToolsTypes} Tool Types`
            : "0 Lands, 0 Machines, 0 Tool Types",
          isUp: totalResourceCategories > 0,
        },
        type: "total-resources",
      },
      {
        id: "stat-2",
        title: "RESOURCE UTILIZATION",
        value: `${utilizationPercentage}%`,
        subtext: utilizationSubtext,
        percentage: utilizationPercentage,
        type: "utilization",
      },
      {
        id: "stat-3",
        title: "ACTIVE USERS & STAFF",
        value: `${totalUsersCount}`,
        avatars: realAvatars,
        type: "active-experiments",
      },
      {
        id: "stat-4",
        title: "SYSTEM ALERTS",
        value: conflictCount > 0 ? `${conflictCount} Active` : "Clear",
        type: "conflicts",
        conflictCount: conflictCount,
      },
    ];

    const resourceBreakdown: BreakdownItem[] = [
      { name: "Equipment & Tools", value: equipPercent, color: "#16A34A" },
      { name: "Personnel", value: personnelPercent, color: "#15803D" },
      { name: "Land Plots", value: landPercent, color: "#86EFAC" },
    ];

    // Convert real backend notifications to recent requests format
    const recentRequests: ExperimentRequest[] = Array.isArray(notifications)
      ? notifications.slice(0, 5).map((n: SystemNotification, idx: number) => ({
        id: `NOTIF-${n.notificationId || idx + 1}`,
        name: n.title || n.message || "System Alert",
        priority: n.type === "Error" || n.type === "Warning" ? "URGENT" : idx % 2 === 0 ? "MEDIUM" : "LOW",
        date: n.createdAt
          ? new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "—",
        status: n.isRead ? "Review Started" : "Pending Review",
      }))
      : [];

    return {
      stats,
      resourceBreakdown,
      recentRequests,
    };
  } catch (error) {
    console.error("Error fetching live dashboard metrics:", error);
    return {
      stats: [
        {
          id: "stat-1",
          title: "TOTAL RESOURCES",
          value: "0",
          trend: { value: "0 Lands, 0 Machines, 0 Tool Types", isUp: false },
          type: "total-resources",
        },
        {
          id: "stat-2",
          title: "RESOURCE UTILIZATION",
          value: "0%",
          subtext: "No utilization data",
          percentage: 0,
          type: "utilization",
        },
        {
          id: "stat-3",
          title: "ACTIVE USERS & STAFF",
          value: "0",
          avatars: [],
          type: "active-experiments",
        },
        {
          id: "stat-4",
          title: "SYSTEM ALERTS",
          value: "Clear",
          type: "conflicts",
          conflictCount: 0,
        },
      ],
      resourceBreakdown: [
        { name: "Equipment & Tools", value: 0, color: "#16A34A" },
        { name: "Personnel", value: 0, color: "#15803D" },
        { name: "Land Plots", value: 0, color: "#86EFAC" },
      ],
      recentRequests: [],
    };
  }
}

