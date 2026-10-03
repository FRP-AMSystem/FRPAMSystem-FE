import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Gauge,
  Layers3,
  Wrench,
  Users,
  MapPin,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { StatItem, DashboardStatType } from "../../../types/dashboard";

interface StatisticCardProps {
  stat: StatItem;
  onAction?: () => void;
}

function clampPercentage(value?: number): number {
  if (value === undefined || !Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

function renderStatIcon(type: DashboardStatType) {
  switch (type) {
    case "equipment-fleet":
      return <Wrench size={20} />;
    case "workforce-load":
      return <Users size={20} />;
    case "land-coverage":
      return <MapPin size={20} />;
    case "pending-approvals":
    case "conflicts":
      return <Clock size={20} />;
    case "total-resources":
      return <Layers3 size={20} />;
    case "utilization":
      return <Gauge size={20} />;
    case "active-experiments":
      return <CheckCircle2 size={20} />;
    default:
      return <Gauge size={20} />;
  }
}

function getIconTheme(type: DashboardStatType) {
  switch (type) {
    case "equipment-fleet":
      return { iconClass: "kpi-icon-blue", fillClass: "fill-blue" };
    case "workforce-load":
      return { iconClass: "kpi-icon-green", fillClass: "fill-green" };
    case "land-coverage":
      return { iconClass: "kpi-icon-amber", fillClass: "fill-amber" };
    case "pending-approvals":
    case "conflicts":
      return { iconClass: "kpi-icon-purple", fillClass: "fill-purple" };
    default:
      return { iconClass: "kpi-icon-blue", fillClass: "fill-blue" };
  }
}

export default function StatisticCard({ stat, onAction }: StatisticCardProps) {
  const navigate = useNavigate();
  const percentage = clampPercentage(stat.percentage);
  const theme = getIconTheme(stat.type);

  const handleCardClick = () => {
    if (onAction) {
      onAction();
    } else if (stat.actionPath) {
      navigate(stat.actionPath);
    }
  };

  const getBadgeClass = () => {
    switch (stat.badgeType) {
      case "danger":
        return "badge-danger";
      case "warning":
        return "badge-warning";
      case "success":
        return "badge-success";
      default:
        return "badge-info";
    }
  };

  return (
    <article className="dashboard-kpi-card">
      <div>
        <div className="kpi-card-header">
          <div>
            <h4 className="kpi-title">{stat.title}</h4>
            <div className="kpi-value">{stat.value}</div>
          </div>

          <div className={`kpi-icon-wrapper ${theme.iconClass}`}>
            {renderStatIcon(stat.type)}
          </div>
        </div>

        {stat.subtext && <p className="kpi-subtext">{stat.subtext}</p>}
      </div>

      {stat.percentage !== undefined && (
        <div className="kpi-progress-track">
          <div
            className={`kpi-progress-fill ${theme.fillClass}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      <div className="kpi-footer">
        {stat.trend ? (
          <div className="kpi-trend">
            {stat.trend.isUp ? (
              <ArrowUpRight size={14} style={{ color: "#16a34a", flexShrink: 0 }} />
            ) : (
              <ArrowDownRight size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
            )}
            <span>{stat.trend.value}</span>
          </div>
        ) : (
          <div />
        )}

        {stat.badgeText && (
          <span className={`kpi-badge ${getBadgeClass()}`}>
            {stat.badgeText}
          </span>
        )}

        {stat.actionLabel && (
          <button
            type="button"
            onClick={handleCardClick}
            style={{
              border: "none",
              background: "none",
              color: "#16a34a",
              fontWeight: 700,
              fontSize: 11,
              cursor: "pointer",
              padding: 0,
            }}
          >
            {stat.actionLabel} &rarr;
          </button>
        )}
      </div>
    </article>
  );
}