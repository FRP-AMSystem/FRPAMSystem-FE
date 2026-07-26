import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "../pages/Login/LoginPage";
import DashboardPage from "../pages/Dashboard/DashboardPage";
import UsersPage from "../pages/admin/Users/UsersPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<LoginPage />} />

      <Route path="/dashboard" element={<DashboardPage />} />

      <Route path="/admin/users" element={<UsersPage />} />
    </Routes>
  );
}