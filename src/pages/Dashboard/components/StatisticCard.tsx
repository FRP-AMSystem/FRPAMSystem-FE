import { AlertTriangle, TrendingUp } from "lucide-react";

interface StatItem {
  id: string;
  title: string;
  value: string;
  subtext?: string;
  trend?: {
    value: string;
    isUp: boolean;
  };
  type: "total-resources" | "utilization" | "active-experiments" | "conflicts";
  percentage?: number;
  conflictCount?: number;
  avatars?: string[];
}

interface StatisticCardProps {
  stat: StatItem;
}

export default function StatisticCard({ stat }: StatisticCardProps) {
  // TODO: Replace dashboard statistics fetching from backend with real endpoints
  
  if (stat.type === "total-resources") {
    return (
      <div className="stat-card stat-total-resources">
        <div className="stat-card-header">
          <span className="stat-card-label text-white-muted">{stat.title}</span>
        </div>
        <div className="stat-card-value text-white">{stat.value}</div>
        <div className="stat-card-footer text-white-muted" style={{ gap: "6px" }}>
          <TrendingUp size={14} style={{ color: "#E8F5E9" }} />
          <span>{stat.trend?.value}</span>
        </div>

        {/* Small sparkline vector inside the card for premium feel */}
        <div className="stat-sparkline">
          <svg viewBox="0 0 100 40" width="100%" height="100%">
            <path
              d="M 5 35 Q 25 15, 45 25 T 85 5"
              fill="none"
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="85" cy="5" r="3" fill="#ffffff" />
          </svg>
        </div>
      </div>
    );
  }

  if (stat.type === "utilization") {
    return (
      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">{stat.title}</span>
        </div>
        <div className="stat-card-value">{stat.value}</div>
        <div className="stat-progress-container">
          <div
            className="stat-progress-bar"
            style={{ width: `${stat.percentage || 0}%` }}
          />
        </div>
        <div className="stat-card-footer" style={{ gap: "6px" }}>
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#2E7D32",
              display: "inline-block",
            }}
          />
          <span className="stat-card-subtext" style={{ color: "#1B5E20", fontWeight: 600 }}>
            {stat.subtext}
          </span>
        </div>
      </div>
    );
  }

  if (stat.type === "active-experiments") {
    return (
      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">{stat.title}</span>
        </div>
        <div className="stat-card-value">{stat.value}</div>
        <div className="stat-avatar-row">
          {/* Avatar circles representation */}
          <div className="stat-avatar-circle user-avatar-green">👤</div>
          <div className="stat-avatar-circle user-avatar-grey">👤</div>
          <div className="stat-avatar-circle avatar-plus-count">{stat.avatars?.[2]}</div>
        </div>
      </div>
    );
  }

  if (stat.type === "conflicts") {
    return (
      <div className="stat-card stat-conflicts">
        <div className="stat-card-header">
          <span className="stat-card-label" style={{ color: "#991B1B" }}>
            {stat.title}
          </span>
          <AlertTriangle size={18} style={{ color: "#DC2626" }} />
        </div>
        <div className="stat-card-value" style={{ color: "#991B1B" }}>
          {stat.value}
        </div>
        <div className="stat-card-action-wrapper">
          <button className="stat-card-action-btn">Resolve Now</button>
        </div>
      </div>
    );
  }

  return null;
}
