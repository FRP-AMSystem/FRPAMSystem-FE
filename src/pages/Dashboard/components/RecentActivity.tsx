import { History } from "lucide-react";

interface Activity {
  id: string;
  text: string;
  time: string;
  type: "success" | "warning" | "info";
}

const activities: Activity[] = [
  {
    id: "1",
    text: "Plan #440-A approved for harvest in concessions unit 5",
    time: "12 mins ago",
    type: "success",
  },
  {
    id: "2",
    text: "Riparian buffer warning raised for Skidding Route E-4",
    time: "2 hours ago",
    type: "warning",
  },
  {
    id: "3",
    text: "Lumber truck GPS tracker #77B back online after telemetry sync",
    time: "4 hours ago",
    type: "info",
  },
  {
    id: "4",
    text: "Drone survey flight completed in North Pine compartment",
    time: "1 day ago",
    type: "success",
  },
  {
    id: "5",
    text: "Emergency equipment servicing scheduled for Skidder #XS-9",
    time: "1 day ago",
    type: "warning",
  },
];

export default function RecentActivity() {
  return (
    <div className="dashboard-card activity-card">
      <div className="dashboard-card-header">
        <div>
          <h3 className="dashboard-card-title">
            <History size={20} style={{ color: "var(--brand-primary)" }} />
            Recent Activity
          </h3>
          <p className="dashboard-card-subtitle">
            Planners audit trail and telemetry events
          </p>
        </div>
      </div>

      <div className="activity-list">
        {activities.map((item) => (
          <div key={item.id} className="activity-item">
            <div className={`activity-dot ${item.type}`} />
            <div className="activity-info">
              <span className="activity-text">{item.text}</span>
              <span className="activity-time">{item.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
