import { AlertTriangle, TrendingUp, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

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
              backgroundColor: "var(--accent)",
              display: "inline-block",
            }}
          />
          <span className="stat-card-subtext" style={{ color: "var(--accent)", fontWeight: 600 }}>
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
        {stat.avatars && stat.avatars.length > 0 && (
          <div className="stat-avatar-row">
            {stat.avatars.map((av, idx) => {
              if (av.startsWith("http")) {
                return (
                  <div key={idx} className="stat-avatar-circle" style={{ overflow: "hidden" }}>
                    <img src={av} alt="User Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                );
              }
              const isPlusBadge = av.startsWith("+");
              return (
                <div
                  key={idx}
                  className={`stat-avatar-circle ${
                    isPlusBadge
                      ? "avatar-plus-count"
                      : idx === 0
                      ? "user-avatar-green"
                      : "user-avatar-grey"
                  }`}
                >
                  {av}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (stat.type === "conflicts") {
    const hasConflicts = (stat.conflictCount && stat.conflictCount > 0) || (stat.value !== "Clear" && !stat.value.includes("Clear"));

    if (!hasConflicts) {
      return (
        <div className="stat-card stat-conflicts-clear">
          <div className="stat-card-header">
            <span className="stat-card-label">
              {stat.title}
            </span>
            <CheckCircle2 size={18} style={{ color: "var(--accent)" }} />
          </div>
          <div className="stat-card-value">
            Clear
          </div>
          <div className="stat-card-action-wrapper">
            <button
              className="stat-card-action-btn clear-btn"
              onClick={() => navigate("/admin/logs")}
            >
              View System Logs
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="stat-card stat-conflicts-active">
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
          <button
            className="stat-card-action-btn alert-btn"
            onClick={() => navigate("/admin/logs")}
          >
            Resolve Now
          </button>
        </div>
      </div>
    );
  }

  return null;
}
