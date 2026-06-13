const menuItems = [
  "Dashboard",
  "Experiments",
  "Resources",
  "Allocation Planner",
  "Conflict Detection",
  "Schedules",
  "Equipment Tracking",
  "Analytics",
  "Notifications",
  "Settings",
];

export default function Sidebar() {
  return (
    <aside
      style={{
        width: "280px",
        background: "#1B5E20",
        color: "white",
        padding: "24px",
      }}
    >
      <h2>FRPAM</h2>

      <nav style={{ marginTop: "32px" }}>
        {menuItems.map((item) => (
          <div
            key={item}
            style={{
              padding: "12px 16px",
              marginBottom: "8px",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            {item}
          </div>
        ))}
      </nav>
    </aside>
  );
}