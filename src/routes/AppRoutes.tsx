import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "../pages/Login/LoginPage";
import DashboardPage from "../pages/Dashboard/DashboardPage";
import UsersPage from "../pages/admin/Users/UsersPage";
import ResourcesPage from "../pages/Resources/ResourcesPage";
import PersonnelPage from "../pages/admin/Personnel/PersonnelPage";
import SettingsPage from "../pages/admin/Settings/SettingsPage";
import LogsPage from "../pages/admin/Logs/LogsPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<LoginPage />} />

      <Route path="/dashboard" element={<DashboardPage />} />

      <Route path="/admin/users" element={<UsersPage />} />

      <Route path="/resources" element={<ResourcesPage />} />

      <Route path="/admin/personnel" element={<PersonnelPage />} />

      <Route path="/admin/settings" element={<SettingsPage />} />

      <Route path="/admin/logs" element={<LogsPage />} />

      <Route path="/notifications" element={<Navigate to="/admin/logs" replace />} />
    </Routes>
  );
}