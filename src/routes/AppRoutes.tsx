import type {
  ReactNode,
} from "react";

import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import {
  getPermissions,
  getStoredRole,
  isRole,
  type Role,
  type RolePermission,
} from "../config/rolePermissions";

import LoginPage from "../pages/Login/LoginPage";
import DashboardPage from "../pages/Dashboard/DashboardPage";

import UsersPage from "../pages/admin/Users/UsersPage";
import PersonnelPage from "../pages/admin/Personnel/PersonnelPage";
import SettingsPage from "../pages/admin/Settings/SettingsPage";

import ResourcesPage from "../pages/Resources/ResourcesPage";

/* =====================================================
   EXPERIMENT
===================================================== */

import ExperimentList from "../pages/Experiment/ExperimentList";
import CreateExperiment from "../pages/Experiment/CreateExperiment";
import EditExperiment from "../pages/Experiment/EditExperiment";
import ExperimentDetail from "../pages/Experiment/ExperimentDetail";

/* =====================================================
   EXPERIMENT PHASE
===================================================== */

import ExperimentPhaseList from "../pages/ExperimentPhase/ExperimentPhaseList";
import CreateExperimentPhase from "../pages/ExperimentPhase/CreateExperimentPhase";
import EditExperimentPhase from "../pages/ExperimentPhase/EditExperimentPhase";
import ExperimentPhaseDetail from "../pages/ExperimentPhase/ExperimentPhaseDetail";

/* =====================================================
   EQUIPMENT REQUIREMENT
===================================================== */

import RequirementList from "../pages/ExperimentEquipmentRequirement/RequirementList";
import CreateRequirement from "../pages/ExperimentEquipmentRequirement/CreateRequirement";
import EditRequirement from "../pages/ExperimentEquipmentRequirement/EditRequirement";
import RequirementDetail from "../pages/ExperimentEquipmentRequirement/RequirementDetail";

/* =====================================================
   HUMAN REQUIREMENT
===================================================== */

import HumanRequirementList from "../pages/HumanRequirement/HumanRequirementList";
import CreateHumanRequirement from "../pages/HumanRequirement/CreateHumanRequirement";
import EditHumanRequirement from "../pages/HumanRequirement/EditHumanRequirement";
import HumanRequirementDetail from "../pages/HumanRequirement/HumanRequirementDetail";

/* =====================================================
   LAND REQUIREMENT
===================================================== */

import LandRequirementList from "../pages/LandRequirement/LandRequirementList";
import CreateLandRequirement from "../pages/LandRequirement/CreateLandRequirement";
import EditLandRequirement from "../pages/LandRequirement/EditLandRequirement";
import LandRequirementDetail from "../pages/LandRequirement/LandRequirementDetail";

/* =====================================================
   ALLOCATION
===================================================== */

import AllocationList from "../pages/Allocation/AllocationList";
import CreateAllocation from "../pages/Allocation/CreateAllocation";
import EditAllocation from "../pages/Allocation/EditAllocation";
import AllocationDetail from "../pages/Allocation/AllocationDetail";
import AllocationAnalytics from "../pages/Allocation/AllocationAnalytics";

/* =====================================================
   HUMAN RESOURCE
===================================================== */

import HumanResourceProfileList from "../pages/HumanResourceProfile/HumanResourceProfileList";
import SkillList from "../pages/Skill/SkillList";
import HumanResourceSkillList from "../pages/HumanResourceSkill/HumanResourceSkillList";

/* =====================================================
   EQUIPMENT / RESOURCE
===================================================== */

import EquipmentList from "../pages/Equipment/EquipmentList";
import EquipmentCategoryList from "../pages/Equipment/EquipmentCategoryList";
import EquipmentInstanceList from "../pages/Equipment/EquipmentInstanceList";

import EquipmentSubstitutionList from "../pages/EquipmentSubstitution/EquipmentSubstitutionList";
import EquipmentShortageLogList from "../pages/EquipmentShortageLog/EquipmentShortageLogList";

import AreaList from "../pages/Area/AreaList";
import LandResourceList from "../pages/LandResource/LandResourceList";

/* =====================================================
   SCHEDULE
===================================================== */

import ScheduleList from "../pages/Schedule/ScheduleList";
import CreateSchedule from "../pages/Schedule/CreateSchedule";
import EditSchedule from "../pages/Schedule/EditSchedule";
import ScheduleDetail from "../pages/Schedule/ScheduleDetail";

/* =====================================================
   CONFLICT / REPORT
===================================================== */

import ConflictList from "../pages/Conflict/ConflictList";
import ReportOverview from "../pages/Report/ReportOverview";

/* =====================================================
   NOTIFICATION
===================================================== */

import NotificationList from "../pages/Notifications/NotificationList";
import NotificationDetail from "../pages/Notifications/NotificationDetail";

/* =====================================================
   ROLE GROUPS
===================================================== */

const allRoles: Role[] = [
  "Admin",
  "Manager",
  "Researcher",
  "Technician",
  "Seasonal",
];

const operationalRoles: Role[] = [
  "Manager",
  "Researcher",
  "Technician",
  "Seasonal",
];

const adminOnly: Role[] = [
  "Admin",
];

const adminAndManager: Role[] = [
  "Admin",
  "Manager",
];

/* =====================================================
   AUTHENTICATION GUARD
===================================================== */

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Role[];
  permission?: keyof RolePermission;
}

function clearInvalidAuthentication(): void {
  [
    "token",
    "accessToken",
    "refreshToken",
    "role",
    "roleName",
    "userId",
    "fullName",
    "username",
    "email",
  ].forEach((key) => {
    localStorage.removeItem(key);
  });

  sessionStorage.clear();
}

function ProtectedRoute({
  children,
  allowedRoles,
  permission,
}: ProtectedRouteProps) {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken");

  const storedRole =
    localStorage.getItem("role") ||
    localStorage.getItem("roleName");

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (!isRole(storedRole)) {
    clearInvalidAuthentication();

    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  const role =
    getStoredRole();

  if (
    allowedRoles &&
    !allowedRoles.includes(role)
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  if (
    permission &&
    !getPermissions(role)[permission]
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return children;
}

/* =====================================================
   PLACEHOLDER
===================================================== */

function PlaceholderPage({
  title,
}: {
  title: string;
}) {
  return (
    <ProtectedRoute
      allowedRoles={operationalRoles}
    >
      <div
        style={{
          minHeight: "100vh",
          boxSizing: "border-box",
          padding: "32px",
          background: "#f8fafc",
          color: "#111827",
        }}
      >
        <h1>{title}</h1>

        <p>
          This page is under development.
        </p>
      </div>
    </ProtectedRoute>
  );
}

/* =====================================================
   APP ROUTES
===================================================== */

export default function AppRoutes() {
  return (
    <Routes>
      {/* =========================
          PUBLIC
      ========================= */}

      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      <Route
        path="/login"
        element={
          <LoginPage />
        }
      />

      {/* =========================
          DASHBOARD
      ========================= */}

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* =========================
          EXPERIMENT WORKSPACE
      ========================= */}

      <Route
        path="/experiments"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewExperiments"
          >
            <ExperimentList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/experiments/create"
        element={
          <ProtectedRoute
            permission="canCreateExperiment"
          >
            <CreateExperiment />
          </ProtectedRoute>
        }
      />

      <Route
        path="/experiments/:id/edit"
        element={
          <ProtectedRoute
            permission="canEditExperiment"
          >
            <EditExperiment />
          </ProtectedRoute>
        }
      />

      <Route
        path="/experiments/:id"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewExperiments"
          >
            <ExperimentDetail />
          </ProtectedRoute>
        }
      />

      {/* =========================
          EXPERIMENT PHASE

          These routes remain accessible because the
          Experiment Detail workspace links to them.
          They are intentionally not top-level Sidebar items.
      ========================= */}

      <Route
        path="/experiment-phases"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewExperimentPhases"
          >
            <ExperimentPhaseList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/experiment-phases/create"
        element={
          <ProtectedRoute
            permission="canCreateExperimentPhase"
          >
            <CreateExperimentPhase />
          </ProtectedRoute>
        }
      />

      <Route
        path="/experiment-phases/:id/edit"
        element={
          <ProtectedRoute
            permission="canEditExperimentPhase"
          >
            <EditExperimentPhase />
          </ProtectedRoute>
        }
      />

      <Route
        path="/experiment-phases/:id"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewExperimentPhases"
          >
            <ExperimentPhaseDetail />
          </ProtectedRoute>
        }
      />

      {/* =========================
          EQUIPMENT REQUIREMENT
      ========================= */}

      <Route
        path="/equipment-requirements"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewRequirements"
          >
            <RequirementList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-requirements/create"
        element={
          <ProtectedRoute
            permission="canCreateRequirement"
          >
            <CreateRequirement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-requirements/:id/edit"
        element={
          <ProtectedRoute
            permission="canEditRequirement"
          >
            <EditRequirement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-requirements/:id"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewRequirements"
          >
            <RequirementDetail />
          </ProtectedRoute>
        }
      />

      {/* =========================
          HUMAN REQUIREMENT
      ========================= */}

      <Route
        path="/human-requirements"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewRequirements"
          >
            <HumanRequirementList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/human-requirements/create"
        element={
          <ProtectedRoute
            permission="canCreateRequirement"
          >
            <CreateHumanRequirement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/human-requirements/:id/edit"
        element={
          <ProtectedRoute
            permission="canEditRequirement"
          >
            <EditHumanRequirement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/human-requirements/:id"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewRequirements"
          >
            <HumanRequirementDetail />
          </ProtectedRoute>
        }
      />

      {/* =========================
          LAND REQUIREMENT
      ========================= */}

      <Route
        path="/land-requirements"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewRequirements"
          >
            <LandRequirementList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/land-requirements/create"
        element={
          <ProtectedRoute
            permission="canCreateRequirement"
          >
            <CreateLandRequirement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/land-requirements/:id/edit"
        element={
          <ProtectedRoute
            permission="canEditRequirement"
          >
            <EditLandRequirement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/land-requirements/:id"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewRequirements"
          >
            <LandRequirementDetail />
          </ProtectedRoute>
        }
      />

      {/* =========================
          ALLOCATION
      ========================= */}

      <Route
        path="/allocation"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewAllocations"
          >
            <AllocationList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/allocation/create"
        element={
          <ProtectedRoute
            permission="canCreateAllocation"
          >
            <CreateAllocation />
          </ProtectedRoute>
        }
      />

      <Route
        path="/allocation/:id/edit"
        element={
          <ProtectedRoute
            permission="canEditAllocation"
          >
            <EditAllocation />
          </ProtectedRoute>
        }
      />

      <Route
        path="/allocation/:id"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewAllocations"
          >
            <AllocationDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/allocation-analytics"
        element={
          <ProtectedRoute
            permission="canViewAnalytics"
          >
            <AllocationAnalytics />
          </ProtectedRoute>
        }
      />

      {/* =========================
          HUMAN RESOURCE
      ========================= */}

      <Route
        path="/human-resource-profiles"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewResources"
          >
            <HumanResourceProfileList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/skills"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewResources"
          >
            <SkillList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/human-resource-skills"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewResources"
          >
            <HumanResourceSkillList />
          </ProtectedRoute>
        }
      />

      {/* =========================
          EQUIPMENT / RESOURCE
      ========================= */}

      <Route
        path="/resources"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewResources"
          >
            <ResourcesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewResources"
          >
            <EquipmentList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-categories"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewResources"
          >
            <EquipmentCategoryList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-instances"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewResources"
          >
            <EquipmentInstanceList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-substitutions"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewResources"
          >
            <EquipmentSubstitutionList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-shortage-logs"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewResources"
          >
            <EquipmentShortageLogList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/areas"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewResources"
          >
            <AreaList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/land-resources"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewResources"
          >
            <LandResourceList />
          </ProtectedRoute>
        }
      />

      {/* =========================
          SCHEDULE
      ========================= */}

      <Route
        path="/schedules"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewSchedules"
          >
            <ScheduleList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/schedules/create"
        element={
          <ProtectedRoute
            permission="canCreateSchedule"
          >
            <CreateSchedule />
          </ProtectedRoute>
        }
      />

      <Route
        path="/schedules/:id/edit"
        element={
          <ProtectedRoute
            permission="canEditSchedule"
          >
            <EditSchedule />
          </ProtectedRoute>
        }
      />

      <Route
        path="/schedules/:id"
        element={
          <ProtectedRoute
            allowedRoles={operationalRoles}
            permission="canViewSchedules"
          >
            <ScheduleDetail />
          </ProtectedRoute>
        }
      />

      {/* =========================
          CONFLICT
      ========================= */}

      <Route
        path="/conflicts"
        element={
          <ProtectedRoute
            permission="canViewConflicts"
          >
            <ConflictList />
          </ProtectedRoute>
        }
      />

      {/* =========================
          REPORT
      ========================= */}

      <Route
        path="/reports"
        element={
          <ProtectedRoute
            permission="canViewReports"
          >
            <ReportOverview />
          </ProtectedRoute>
        }
      />

      {/* =========================
          NOTIFICATION
      ========================= */}

      <Route
        path="/notifications"
        element={
          <ProtectedRoute
            permission="canViewNotifications"
          >
            <NotificationList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications/:id"
        element={
          <ProtectedRoute
            permission="canViewNotifications"
          >
            <NotificationDetail />
          </ProtectedRoute>
        }
      />

      {/* =========================
          ADMINISTRATION
      ========================= */}

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute
            allowedRoles={adminOnly}
            permission="canManageUsers"
          >
            <UsersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/personnel"
        element={
          <ProtectedRoute
            allowedRoles={adminAndManager}
          >
            <PersonnelPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute
            allowedRoles={adminOnly}
            permission="canManageSystemConfiguration"
          >
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      {/* =========================
          PLACEHOLDER
      ========================= */}

      <Route
        path="/results"
        element={
          <PlaceholderPage
            title="Results"
          />
        }
      />

      {/* =========================
          FALLBACK
      ========================= */}

      <Route
        path="*"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />
    </Routes>
  );
}
