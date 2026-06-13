export default function Topbar() {
  return (
    <header
      style={{
        height: "72px",
        background: "white",
        borderBottom: "1px solid #E5E7EB",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
      }}
    >
      <h3>Dashboard</h3>

      <div
        style={{
          display: "flex",
          gap: "16px",
        }}
      >
        <span>🔔</span>
        <span>🤖</span>
        <span>👤</span>
      </div>
    </header>
  );
}