import { AlertTriangle, Clock, MapPin } from "lucide-react";

interface Conflict {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  resource: string;
  location: string;
  time: string;
}

const conflicts: Conflict[] = [
  {
    id: "1",
    title: "Double-Booked Harvester X200",
    description: "Scheduled for Zone A clearings and Zone C thinning simultaneously.",
    severity: "high",
    resource: "Equipment #X200",
    location: "Zone A / Zone C",
    time: "Today, 14:00",
  },
  {
    id: "2",
    title: "Buffer Zone Overlap Breach",
    description: "Proposed timber skidding route encroaches on a protected riparian buffer.",
    severity: "high",
    resource: "Reforestation Plan v3",
    location: "Riparian Sector E",
    time: "Tomorrow, 08:00",
  },
  {
    id: "3",
    title: "Crew Allocation Shortage",
    description: "Insufficent certified operators assigned for the night haulage crew.",
    severity: "medium",
    resource: "Hauling Team Delta",
    location: "Log Yard B",
    time: "Jun 28, 22:00",
  },
];

export default function ConflictSection() {
  return (
    <div className="dashboard-card conflict-card">
      <div className="dashboard-card-header">
        <div>
          <h3 className="dashboard-card-title">
            <AlertTriangle size={20} style={{ color: "#EF4444" }} />
            Plan Conflict Warnings
          </h3>
          <p className="dashboard-card-subtitle">
            Automated alerts requiring dispatcher intervention
          </p>
        </div>
        <span
          className="badge high"
          style={{ padding: "6px 10px", borderRadius: "20px" }}
        >
          {conflicts.length} Active
        </span>
      </div>

      <div className="conflict-list">
        {conflicts.map((item) => (
          <div key={item.id} className="conflict-item">
            <div className={`conflict-icon ${item.severity}`}>
              <AlertTriangle size={20} />
            </div>

            <div className="conflict-content">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginBottom: "4px",
                }}
              >
                <h4 className="conflict-title">{item.title}</h4>
                <span className={`badge ${item.severity}`}>{item.severity}</span>
              </div>

              <p className="conflict-desc">{item.description}</p>

              <div className="conflict-meta">
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <MapPin size={13} /> {item.location}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Clock size={13} /> {item.time}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    color: "var(--brand-primary)",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Resolve →
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
