import type { ReactNode } from "react";

import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import LoginPage from "../pages/Login/LoginPage";
import DashboardPage from "../pages/Dashboard/DashboardPage";

import AllocationList from "../pages/Allocation/AllocationList";
import CreateAllocation from "../pages/Allocation/CreateAllocation";
import EditAllocation from "../pages/Allocation/EditAllocation";
import AllocationDetail from "../pages/Allocation/AllocationDetail";

import EquipmentList from "../pages/Equipment/EquipmentList";

import RequirementList from "../pages/ExperimentEquipmentRequirement/RequirementList";
import CreateRequirement from "../pages/ExperimentEquipmentRequirement/CreateRequirement";
import EditRequirement from "../pages/ExperimentEquipmentRequirement/EditRequirement";
import RequirementDetail from "../pages/ExperimentEquipmentRequirement/RequirementDetail";

import HumanRequirementList from "../pages/HumanRequirement/HumanRequirementList";
import CreateHumanRequirement from "../pages/HumanRequirement/CreateHumanRequirement";
import EditHumanRequirement from "../pages/HumanRequirement/EditHumanRequirement";
import HumanRequirementDetail from "../pages/HumanRequirement/HumanRequirementDetail";

import ExperimentList from "../pages/Experiment/ExperimentList";
import CreateExperiment from "../pages/Experiment/CreateExperiment";
import EditExperiment from "../pages/Experiment/EditExperiment";
import ExperimentDetail from "../pages/Experiment/ExperimentDetail";
import CreateLandRequirement from "../pages/LandRequirement/CreateLandRequirement";

type Role =
  | "Manager"
  | "Researcher"
  | "Technician"
  | "Student";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Role[];
}

function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const token = localStorage.getItem("token");

  const role = localStorage.getItem(
    "role"
  ) as Role | null;

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (
    allowedRoles &&
    (!role ||
      !allowedRoles.includes(role))
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
    <ProtectedRoute>
      <div
        style={{
          padding: "32px",
          color: "white",
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
        element={<LoginPage />}
      />

      {/* =========================
          DASHBOARD
      ========================= */}

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
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
            allowedRoles={[
              "Manager",
              "Researcher",
              "Technician",
              "Student",
            ]}
          >
            <AllocationList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/allocation/create"
        element={
          <ProtectedRoute
            allowedRoles={[
              "Researcher",
            ]}
          >
            <CreateAllocation />
          </ProtectedRoute>
        }
      />

      <Route
        path="/allocation/:id/edit"
        element={
          <ProtectedRoute
            allowedRoles={[
              "Researcher",
            ]}
          >
            <EditAllocation />
          </ProtectedRoute>
        }
      />

      <Route
        path="/allocation/:id"
        element={
          <ProtectedRoute
            allowedRoles={[
              "Manager",
              "Researcher",
              "Technician",
              "Student",
            ]}
          >
            <AllocationDetail />
          </ProtectedRoute>
        }
      />

      {/* =========================
          EQUIPMENT ROUTES
      ========================= */}

      <Route
        path="/equipment"
        element={
          <ProtectedRoute
            allowedRoles={[
              "Manager",
              "Researcher",
              "Technician",
              "Student",
            ]}
          >
            <EquipmentList />
          </ProtectedRoute>
        }
      />

      {/* =========================
          EQUIPMENT REQUIREMENT ROUTES
      ========================= */}

      <Route
        path="/equipment-requirements"
        element={
          <ProtectedRoute
            allowedRoles={[
              "Manager",
              "Researcher",
              "Technician",
              "Student",
            ]}
          >
            <RequirementList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-requirements/create"
        element={
          <ProtectedRoute
            allowedRoles={[
              "Researcher",
            ]}
          >
            <CreateRequirement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-requirements/:id/edit"
        element={
          <ProtectedRoute
            allowedRoles={[
              "Researcher",
            ]}
          >
            <EditRequirement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipment-requirements/:id"
        element={
          <ProtectedRoute
            allowedRoles={[
              "Manager",
              "Researcher",
              "Technician",
              "Student",
            ]}
          >
            <RequirementDetail />
          </ProtectedRoute>
        }
      />

      {/* =========================
          HUMAN REQUIREMENT ROUTES
      ========================= */}

      <Route
        path="/human-requirements"
        element={
          <ProtectedRoute
            allowedRoles={[
              "Manager",
              "Researcher",
              "Technician",
              "Student",
            ]}
          >
            <HumanRequirementList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/human-requirements/create"
        element={
          <ProtectedRoute
            allowedRoles={[
              "Researcher",
            ]}
          >
            <CreateHumanRequirement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/human-requirements/:id/edit"
        element={
          <ProtectedRoute
            allowedRoles={[
              "Researcher",
            ]}
          >
            <EditHumanRequirement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/human-requirements/:id"
        element={
          <ProtectedRoute
            allowedRoles={[
              "Manager",
              "Researcher",
              "Technician",
              "Student",
            ]}
          >
            <HumanRequirementDetail />
          </ProtectedRoute>
        }
      />
      {/* =========================
    LAND REQUIREMENT ROUTES
========================= */}

      <Route
        path="/land-requirements"
        element={
          <PlaceholderPage
            title="Land Requirements"
          />
        }
      />

      <Route
        path="/land-requirements/create"
        element={
          <ProtectedRoute
            allowedRoles={[
              "Researcher",
            ]}
          >
            <CreateLandRequirement />
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
            allowedRoles={[
              "Manager",
              "Researcher",
              "Technician",
              "Student",
            ]}
          >
            <ExperimentList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/experiments/create"
        element={
          <ProtectedRoute
            allowedRoles={[
              "Researcher",
            ]}
          >
            <CreateExperiment />
          </ProtectedRoute>
        }
      />

      <Route
        path="/experiments/:id/edit"
        element={
          <ProtectedRoute
            allowedRoles={[
              "Researcher",
            ]}
          >
            <EditExperiment />
          </ProtectedRoute>
        }
      />

      <Route
        path="/experiments/:id"
        element={
          <ProtectedRoute
            allowedRoles={[
              "Manager",
              "Researcher",
              "Technician",
              "Student",
            ]}
          >
            <ExperimentDetail />
          </ProtectedRoute>
        }
      />

      {/* =========================
          PLACEHOLDER ROUTES
      ========================= */}

      <Route
        path="/resources"
        element={
          <PlaceholderPage title="Resources" />
        }
      />

      <Route
        path="/reports"
        element={
          <PlaceholderPage title="Reports" />
        }
      />

      <Route
        path="/schedules"
        element={
          <PlaceholderPage title="Schedules" />
        }
      />

      <Route
        path="/conflicts"
        element={
          <PlaceholderPage title="Conflicts" />
        }
      />

      <Route
        path="/results"
        element={
          <PlaceholderPage title="Results" />
        }
      />

      <Route
        path="/notifications"
        element={
          <PlaceholderPage title="Notifications" />
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