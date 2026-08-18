import type { ReactNode } from "react";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import NotificationToast from "../components/common/NotificationToast";
import "./DashboardLayout.css";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <div className="dashboard-content-wrapper">
          <Topbar />
          <NotificationToast />
          <div className="dashboard-content">{children}</div>
        </div>
      </main>
    </div>
  );
}