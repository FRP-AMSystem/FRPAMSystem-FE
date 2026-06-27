import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import type { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-content">
        <Topbar />

        <main className="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
}