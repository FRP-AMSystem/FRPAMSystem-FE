import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  trend?: {
    value: string;
    isUp: boolean;
  };
  subtext?: string;
  themeColor?: string;
}

export default function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  subtext,
  themeColor = "var(--brand-primary)",
}: MetricCardProps) {
  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <h4 className="metric-card-title">{title}</h4>
        <div
          className="metric-card-icon"
          style={{
            background: `${themeColor}15`, // 15% opacity
            color: themeColor,
          }}
        >
          <Icon size={20} />
        </div>
      </div>

      <div className="metric-card-value">{value}</div>

      <div className="metric-card-footer">
        {trend && (
          <span className={`metric-card-trend ${trend.isUp ? "up" : "down"}`}>
            {trend.isUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {trend.value}
          </span>
        )}
        {subtext && <span className="metric-card-subtext">{subtext}</span>}
      </div>
    </div>
  );
}
