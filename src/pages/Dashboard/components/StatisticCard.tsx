import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Gauge,
  Layers3,
} from "lucide-react";

interface DashboardStat {
  id: string;
  title: string;
  value: string;

  subtext?: string;

  trend?: {
    value: string;
    isUp: boolean;
  };

  type:
    | "total-resources"
    | "utilization"
    | "active-experiments"
    | "conflicts";

  percentage?: number;
  conflictCount?: number;
  avatars?: string[];

  actionLabel?: string;
  actionPath?: string;
}

interface StatisticCardProps {
  stat: DashboardStat;
  onAction?: () => void;
}

function clampPercentage(
  value?: number
): number {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, value)
  );
}

function getIcon(
  type: DashboardStat["type"]
) {
  switch (type) {
    case "total-resources":
      return Layers3;

    case "utilization":
      return Gauge;

    case "active-experiments":
      return CheckCircle2;

    case "conflicts":
      return AlertTriangle;
  }
}

function getIconClassName(
  type: DashboardStat["type"]
): string {
  switch (type) {
    case "total-resources":
      return "statistic-icon statistic-icon-blue";

    case "utilization":
      return "statistic-icon statistic-icon-green";

    case "active-experiments":
      return "statistic-icon statistic-icon-purple";

    case "conflicts":
      return "statistic-icon statistic-icon-orange";
  }
}

export default function StatisticCard({
  stat,
  onAction,
}: StatisticCardProps) {
  const Icon =
    getIcon(stat.type);

  const percentage =
    clampPercentage(
      stat.percentage
    );

  return (
    <article className="statistic-card">
      <div className="statistic-card-header">
        <div>
          <p className="statistic-card-title">
            {stat.title}
          </p>

          <h2 className="statistic-card-value">
            {stat.value}
          </h2>
        </div>

        <div
          className={getIconClassName(
            stat.type
          )}
        >
          <Icon size={20} />
        </div>
      </div>

      {stat.trend && (
        <div
          className={[
            "statistic-card-trend",
            stat.trend.isUp
              ? "trend-up"
              : "trend-down",
          ].join(" ")}
        >
          {stat.trend.isUp ? (
            <ArrowUpRight
              size={15}
            />
          ) : (
            <ArrowDownRight
              size={15}
            />
          )}

          <span>
            {stat.trend.value}
          </span>
        </div>
      )}

      {stat.subtext && (
        <p className="statistic-card-subtext">
          {stat.subtext}
        </p>
      )}

      {stat.type ===
        "utilization" && (
        <div className="statistic-progress">
          <div className="statistic-progress-track">
            <div
              className="statistic-progress-value"
              style={{
                width: `${percentage}%`,
              }}
            />
          </div>

          <span>
            {percentage.toFixed(
              percentage % 1 === 0
                ? 0
                : 1
            )}
            %
          </span>
        </div>
      )}

      {stat.avatars &&
        stat.avatars.length >
          0 && (
          <div className="statistic-avatars">
            {stat.avatars.map(
              (
                avatar,
                index
              ) => (
                <div
                  key={`${stat.id}-${index}`}
                  className="statistic-avatar"
                >
                  {avatar ||
                    String(
                      index + 1
                    )}
                </div>
              )
            )}
          </div>
        )}

      {stat.type ===
        "conflicts" &&
        stat.conflictCount !==
          undefined && (
          <div className="statistic-conflict-info">
            <AlertTriangle
              size={15}
            />

            <span>
              {
                stat.conflictCount
              }{" "}
              {stat.conflictCount ===
              1
                ? "item requires attention"
                : "items require attention"}
            </span>
          </div>
        )}

      {stat.actionLabel &&
        onAction && (
          <button
            type="button"
            className="statistic-card-action"
            onClick={onAction}
          >
            {stat.actionLabel}
          </button>
        )}
    </article>
  );
}