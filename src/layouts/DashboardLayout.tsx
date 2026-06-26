import type { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f5f7fa",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: "250px",
          background: "#1E293B",
          color: "white",
          padding: "20px",
        }}
      >
        <h2>FRPAM</h2>
      </aside>

      {/* Main */}
      <main
        style={{
          flex: 1,
          padding: "30px",
        }}
      >
        {children}
      </main>
    </div>
  );
}