import type {
  ReactNode,
} from "react";

import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import {
  getStoredRole,
  isRole,
  type Role,
} from "../config/rolePermissions";

import LoginPage from "../pages/Login/LoginPage";
import DashboardPage from "../pages/Dashboard/DashboardPage";

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
   EQUIPMENT AND RESOURCE
===================================================== */

import EquipmentList from "../pages/Equipment/EquipmentList";
import EquipmentCategoryList from "../pages/Equipment/EquipmentCategoryList";
import EquipmentInstanceList from "../pages/Equipment/EquipmentInstanceList";

import EquipmentSubstitutionList from "../pages/EquipmentSubstitution/EquipmentSubstitutionList";
import EquipmentShortageLogList from "../pages/EquipmentShortageLog/EquipmentShortageLogList";

import ResourceOverview from "../pages/Resource/ResourceOverview";

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
   CONFLICT AND REPORT
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
  "Student",
];

const operationalViewRoles: Role[] = [
  "Manager",
  "Researcher",
  "Technician",
  "Student",
];

const researcherOnly: Role[] = [
  "Researcher",
];

const managerOnly: Role[] = [
  "Manager",
];

const analyticsRoles: Role[] = [
  "Manager",
  "Researcher",
];

const conflictRoles: Role[] = [
  "Manager",
  "Researcher",
  "Technician",
];

const reportRoles: Role[] = [
  "Admin",
  "Manager",
  "Researcher",
  "Technician",
];

/* =====================================================
   PROTECTED ROUTE
===================================================== */

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Role[];
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

  const role = getStoredRole();

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
      allowedRoles={operationalViewRoles}
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
          EXPERIMENT
      ========================= */}

      <Route
        path="/experiments"
        element={
          <ProtectedRoute
            allowedRoles={operationalViewRoles}
          >
            <ExperimentList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/experiments/create"
        element={
          <ProtectedRoute
            allowedRoles={researcherOnly}
          >
            <CreateExperiment />
          </ProtectedRoute>
        }
      />

      <Route
        path="/experiments/:id/edit"
        element={
          <ProtectedRoute
            allowedRoles={researcherOnly}
          >
            <EditExperiment />
          </ProtectedRoute>
        }
      />

      <Route
        path="/experiments/:id"
        element={
          <ProtectedRoute
            allowedRoles={operationalViewRoles}
          >
            <ExperimentDetail />
          </ProtectedRoute>
        }
      />

      {/* =========================
          EXPERIMENT PHASE
      ========================= */}

      <Route
        path="/experiment-phases"
        element={
          <ProtectedRoute
            allowedRoles={operationalViewRoles}
          >
            <ExperimentPhaseList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/experiment-phases/create"
        element={
          <ProtectedRoute
            allowedRoles={researcherOnly}
          >
            <CreateExperimentPhase />
          </ProtectedRoute>
        }
      />

      <Route
        path="/experiment-phases/:id/edit"
        element={
          <ProtectedRoute
            allowedRoles={researcherOnly}
          >
            <EditExperimentPhase />
          </ProtectedRoute>
        }
      />

      <Route
        path="/experiment-phases/:id"
        element={
          <ProtectedRoute
            allowedRoles={operationalViewRoles}
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
            allowedRoles={operationalViewRoles}
          >
            <RequirementList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-requirements/create"
        element={
          <ProtectedRoute
            allowedRoles={researcherOnly}
          >
            <CreateRequirement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-requirements/:id/edit"
        element={
          <ProtectedRoute
            allowedRoles={researcherOnly}
          >
            <EditRequirement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-requirements/:id"
        element={
          <ProtectedRoute
            allowedRoles={operationalViewRoles}
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
            allowedRoles={operationalViewRoles}
          >
            <HumanRequirementList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/human-requirements/create"
        element={
          <ProtectedRoute
            allowedRoles={researcherOnly}
          >
            <CreateHumanRequirement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/human-requirements/:id/edit"
        element={
          <ProtectedRoute
            allowedRoles={researcherOnly}
          >
            <EditHumanRequirement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/human-requirements/:id"
        element={
          <ProtectedRoute
            allowedRoles={operationalViewRoles}
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
            allowedRoles={operationalViewRoles}
          >
            <LandRequirementList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/land-requirements/create"
        element={
          <ProtectedRoute
            allowedRoles={researcherOnly}
          >
            <CreateLandRequirement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/land-requirements/:id/edit"
        element={
          <ProtectedRoute
            allowedRoles={researcherOnly}
          >
            <EditLandRequirement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/land-requirements/:id"
        element={
          <ProtectedRoute
            allowedRoles={operationalViewRoles}
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
            allowedRoles={operationalViewRoles}
          >
            <AllocationList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/allocation/create"
        element={
          <ProtectedRoute
            allowedRoles={researcherOnly}
          >
            <CreateAllocation />
          </ProtectedRoute>
        }
      />

      <Route
        path="/allocation-analytics"
        element={
          <ProtectedRoute
            allowedRoles={analyticsRoles}
          >
            <AllocationAnalytics />
          </ProtectedRoute>
        }
      />

      <Route
        path="/allocation/:id/edit"
        element={
          <ProtectedRoute
            allowedRoles={researcherOnly}
          >
            <EditAllocation />
          </ProtectedRoute>
        }
      />

      <Route
        path="/allocation/:id"
        element={
          <ProtectedRoute
            allowedRoles={operationalViewRoles}
          >
            <AllocationDetail />
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
            allowedRoles={operationalViewRoles}
          >
            <HumanResourceProfileList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/skills"
        element={
          <ProtectedRoute
            allowedRoles={operationalViewRoles}
          >
            <SkillList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/human-resource-skills"
        element={
          <ProtectedRoute
            allowedRoles={operationalViewRoles}
          >
            <HumanResourceSkillList />
          </ProtectedRoute>
        }
      />

      {/* =========================
          EQUIPMENT
      ========================= */}

      <Route
        path="/equipment"
        element={
          <ProtectedRoute
            allowedRoles={operationalViewRoles}
          >
            <EquipmentList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-categories"
        element={
          <ProtectedRoute
            allowedRoles={operationalViewRoles}
          >
            <EquipmentCategoryList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-instances"
        element={
          <ProtectedRoute
            allowedRoles={operationalViewRoles}
          >
            <EquipmentInstanceList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-substitutions"
        element={
          <ProtectedRoute
            allowedRoles={operationalViewRoles}
          >
            <EquipmentSubstitutionList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-shortage-logs"
        element={
          <ProtectedRoute
            allowedRoles={operationalViewRoles}
          >
            <EquipmentShortageLogList />
          </ProtectedRoute>
        }
      />

      {/* =========================
          RESOURCE
      ========================= */}

      <Route
        path="/resources"
        element={
          <ProtectedRoute
            allowedRoles={operationalViewRoles}
          >
            <ResourceOverview />
          </ProtectedRoute>
        }
      />

      <Route
        path="/areas"
        element={
          <ProtectedRoute
            allowedRoles={operationalViewRoles}
          >
            <AreaList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/land-resources"
        element={
          <ProtectedRoute
            allowedRoles={operationalViewRoles}
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
            allowedRoles={operationalViewRoles}
          >
            <ScheduleList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/schedules/create"
        element={
          <ProtectedRoute
            allowedRoles={researcherOnly}
          >
            <CreateSchedule />
          </ProtectedRoute>
        }
      />

      <Route
        path="/schedules/:id/edit"
        element={
          <ProtectedRoute
            allowedRoles={researcherOnly}
          >
            <EditSchedule />
          </ProtectedRoute>
        }
      />

      <Route
        path="/schedules/:id"
        element={
          <ProtectedRoute
            allowedRoles={operationalViewRoles}
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
            allowedRoles={conflictRoles}
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
            allowedRoles={reportRoles}
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
            allowedRoles={allRoles}
          >
            <NotificationList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications/:id"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <NotificationDetail />
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