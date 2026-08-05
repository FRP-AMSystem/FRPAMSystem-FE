import type {
  ReactNode,
} from "react";

import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import LoginPage from "../pages/Login/LoginPage";
import DashboardPage from "../pages/Dashboard/DashboardPage";

import ExperimentList from "../pages/Experiment/ExperimentList";
import CreateExperiment from "../pages/Experiment/CreateExperiment";
import EditExperiment from "../pages/Experiment/EditExperiment";
import ExperimentDetail from "../pages/Experiment/ExperimentDetail";

import ExperimentPhaseList from "../pages/ExperimentPhase/ExperimentPhaseList";
import CreateExperimentPhase from "../pages/ExperimentPhase/CreateExperimentPhase";
import EditExperimentPhase from "../pages/ExperimentPhase/EditExperimentPhase";
import ExperimentPhaseDetail from "../pages/ExperimentPhase/ExperimentPhaseDetail";

import RequirementList from "../pages/ExperimentEquipmentRequirement/RequirementList";
import CreateRequirement from "../pages/ExperimentEquipmentRequirement/CreateRequirement";
import EditRequirement from "../pages/ExperimentEquipmentRequirement/EditRequirement";
import RequirementDetail from "../pages/ExperimentEquipmentRequirement/RequirementDetail";

import HumanRequirementList from "../pages/HumanRequirement/HumanRequirementList";
import CreateHumanRequirement from "../pages/HumanRequirement/CreateHumanRequirement";
import EditHumanRequirement from "../pages/HumanRequirement/EditHumanRequirement";
import HumanRequirementDetail from "../pages/HumanRequirement/HumanRequirementDetail";

import HumanResourceProfileList from "../pages/HumanResourceProfile/HumanResourceProfileList";
import SkillList from "../pages/Skill/SkillList";
import HumanResourceSkillList from "../pages/HumanResourceSkill/HumanResourceSkillList";

import LandRequirementList from "../pages/LandRequirement/LandRequirementList";
import CreateLandRequirement from "../pages/LandRequirement/CreateLandRequirement";
import EditLandRequirement from "../pages/LandRequirement/EditLandRequirement";
import LandRequirementDetail from "../pages/LandRequirement/LandRequirementDetail";

import AllocationList from "../pages/Allocation/AllocationList";
import CreateAllocation from "../pages/Allocation/CreateAllocation";
import EditAllocation from "../pages/Allocation/EditAllocation";
import AllocationDetail from "../pages/Allocation/AllocationDetail";
import AllocationAnalytics from "../pages/Allocation/AllocationAnalytics";

import EquipmentList from "../pages/Equipment/EquipmentList";
import EquipmentCategoryList from "../pages/Equipment/EquipmentCategoryList";
import EquipmentInstanceList from "../pages/Equipment/EquipmentInstanceList";

import EquipmentSubstitutionList from "../pages/EquipmentSubstitution/EquipmentSubstitutionList";
import EquipmentShortageLogList from "../pages/EquipmentShortageLog/EquipmentShortageLogList";

import AreaList from "../pages/Area/AreaList";
import LandResourceList from "../pages/LandResource/LandResourceList";

import ResourceOverview from "../pages/Resource/ResourceOverview";

import ScheduleList from "../pages/Schedule/ScheduleList";
import CreateSchedule from "../pages/Schedule/CreateSchedule";
import EditSchedule from "../pages/Schedule/EditSchedule";
import ScheduleDetail from "../pages/Schedule/ScheduleDetail";

import ConflictList from "../pages/Conflict/ConflictList";

import ReportOverview from "../pages/Report/ReportOverview";

import NotificationList from "../pages/Notifications/NotificationList";

type Role =
  | "Admin"
  | "Manager"
  | "Researcher"
  | "Technician"
  | "Student";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Role[];
}

const allRoles: Role[] = [
  "Admin",
  "Manager",
  "Researcher",
  "Technician",
  "Student",
];

const adminAndResearcherRoles: Role[] = [
  "Admin",
  "Researcher",
];

const analyticsRoles: Role[] = [
  "Admin",
  "Manager",
  "Researcher",
];

const operationRoles: Role[] = [
  "Admin",
  "Manager",
  "Researcher",
  "Technician",
];

function isValidRole(
  value: string | null
): value is Role {
  return (
    value === "Admin" ||
    value === "Manager" ||
    value === "Researcher" ||
    value === "Technician" ||
    value === "Student"
  );
}

function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const token =
    localStorage.getItem("token");

  const storedRole =
    localStorage.getItem("role");

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (!isValidRole(storedRole)) {
    localStorage.removeItem("token");
    localStorage.removeItem("role");

    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (
    allowedRoles &&
    !allowedRoles.includes(
      storedRole
    )
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

function PlaceholderPage({
  title,
}: {
  title: string;
}) {
  return (
    <ProtectedRoute
      allowedRoles={allRoles}
    >
      <div
        style={{
          minHeight: "100vh",
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

export default function AppRoutes() {
  return (
    <Routes>
      {/* =========================
          PUBLIC ROUTES
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
          EXPERIMENT ROUTES
      ========================= */}

      <Route
        path="/experiments"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <ExperimentList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/experiments/create"
        element={
          <ProtectedRoute
            allowedRoles={
              adminAndResearcherRoles
            }
          >
            <CreateExperiment />
          </ProtectedRoute>
        }
      />

      <Route
        path="/experiments/:id/edit"
        element={
          <ProtectedRoute
            allowedRoles={
              adminAndResearcherRoles
            }
          >
            <EditExperiment />
          </ProtectedRoute>
        }
      />

      <Route
        path="/experiments/:id"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <ExperimentDetail />
          </ProtectedRoute>
        }
      />

      {/* =========================
          EXPERIMENT PHASE ROUTES
      ========================= */}

      <Route
        path="/experiment-phases"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <ExperimentPhaseList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/experiment-phases/create"
        element={
          <ProtectedRoute
            allowedRoles={
              adminAndResearcherRoles
            }
          >
            <CreateExperimentPhase />
          </ProtectedRoute>
        }
      />

      <Route
        path="/experiment-phases/:id/edit"
        element={
          <ProtectedRoute
            allowedRoles={
              adminAndResearcherRoles
            }
          >
            <EditExperimentPhase />
          </ProtectedRoute>
        }
      />

      <Route
        path="/experiment-phases/:id"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <ExperimentPhaseDetail />
          </ProtectedRoute>
        }
      />

      {/* =========================
          EQUIPMENT REQUIREMENTS
      ========================= */}

      <Route
        path="/equipment-requirements"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <RequirementList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-requirements/create"
        element={
          <ProtectedRoute
            allowedRoles={
              adminAndResearcherRoles
            }
          >
            <CreateRequirement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-requirements/:id/edit"
        element={
          <ProtectedRoute
            allowedRoles={
              adminAndResearcherRoles
            }
          >
            <EditRequirement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-requirements/:id"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <RequirementDetail />
          </ProtectedRoute>
        }
      />

      {/* =========================
          HUMAN REQUIREMENTS
      ========================= */}

      <Route
        path="/human-requirements"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <HumanRequirementList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/human-requirements/create"
        element={
          <ProtectedRoute
            allowedRoles={
              adminAndResearcherRoles
            }
          >
            <CreateHumanRequirement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/human-requirements/:id/edit"
        element={
          <ProtectedRoute
            allowedRoles={
              adminAndResearcherRoles
            }
          >
            <EditHumanRequirement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/human-requirements/:id"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <HumanRequirementDetail />
          </ProtectedRoute>
        }
      />

      {/* =========================
          HUMAN RESOURCE MANAGEMENT
      ========================= */}

      <Route
        path="/human-resource-profiles"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <HumanResourceProfileList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/skills"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <SkillList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/human-resource-skills"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <HumanResourceSkillList />
          </ProtectedRoute>
        }
      />

      {/* =========================
          LAND REQUIREMENTS
      ========================= */}

      <Route
        path="/land-requirements"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <LandRequirementList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/land-requirements/create"
        element={
          <ProtectedRoute
            allowedRoles={
              adminAndResearcherRoles
            }
          >
            <CreateLandRequirement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/land-requirements/:id/edit"
        element={
          <ProtectedRoute
            allowedRoles={
              adminAndResearcherRoles
            }
          >
            <EditLandRequirement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/land-requirements/:id"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <LandRequirementDetail />
          </ProtectedRoute>
        }
      />

      {/* =========================
          ALLOCATION ROUTES
      ========================= */}

      <Route
        path="/allocation"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <AllocationList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/allocation/create"
        element={
          <ProtectedRoute
            allowedRoles={
              adminAndResearcherRoles
            }
          >
            <CreateAllocation />
          </ProtectedRoute>
        }
      />

      {/*
        Route cố định phải đặt trước /allocation/:id
        để không bị hiểu "allocation-analytics" là id.
      */}

      <Route
        path="/allocation-analytics"
        element={
          <ProtectedRoute
            allowedRoles={
              analyticsRoles
            }
          >
            <AllocationAnalytics />
          </ProtectedRoute>
        }
      />

      <Route
        path="/allocation/:id/edit"
        element={
          <ProtectedRoute
            allowedRoles={
              adminAndResearcherRoles
            }
          >
            <EditAllocation />
          </ProtectedRoute>
        }
      />

      <Route
        path="/allocation/:id"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <AllocationDetail />
          </ProtectedRoute>
        }
      />

      {/* =========================
          EQUIPMENT MANAGEMENT
      ========================= */}

      <Route
        path="/equipment"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <EquipmentList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-categories"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <EquipmentCategoryList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-instances"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <EquipmentInstanceList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-substitutions"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <EquipmentSubstitutionList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-shortage-logs"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <EquipmentShortageLogList />
          </ProtectedRoute>
        }
      />

      {/* =========================
          AREA AND LAND RESOURCES
      ========================= */}

      <Route
        path="/areas"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <AreaList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/land-resources"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <LandResourceList />
          </ProtectedRoute>
        }
      />

      {/* =========================
          RESOURCE OVERVIEW
      ========================= */}

      <Route
        path="/resources"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <ResourceOverview />
          </ProtectedRoute>
        }
      />

      {/* =========================
          SCHEDULE ROUTES
      ========================= */}

      <Route
        path="/schedules"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <ScheduleList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/schedules/create"
        element={
          <ProtectedRoute
            allowedRoles={
              adminAndResearcherRoles
            }
          >
            <CreateSchedule />
          </ProtectedRoute>
        }
      />

      <Route
        path="/schedules/:id/edit"
        element={
          <ProtectedRoute
            allowedRoles={
              adminAndResearcherRoles
            }
          >
            <EditSchedule />
          </ProtectedRoute>
        }
      />

      <Route
        path="/schedules/:id"
        element={
          <ProtectedRoute
            allowedRoles={allRoles}
          >
            <ScheduleDetail />
          </ProtectedRoute>
        }
      />

      {/* =========================
          CONFLICT ROUTES
      ========================= */}

      <Route
        path="/conflicts"
        element={
          <ProtectedRoute
            allowedRoles={
              operationRoles
            }
          >
            <ConflictList />
          </ProtectedRoute>
        }
      />

      {/* =========================
          REPORT ROUTES
      ========================= */}

      <Route
        path="/reports"
        element={
          <ProtectedRoute
            allowedRoles={
              operationRoles
            }
          >
            <ReportOverview />
          </ProtectedRoute>
        }
      />

      {/* =========================
          NOTIFICATIONS
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

      {/* =========================
          PLACEHOLDER ROUTES
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