import React from "react";
import { Calendar, User, ArrowRight, Clock, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Schedule } from "../../../types/schedule";

interface ResearcherUpcomingSchedulesProps {
  schedules: Schedule[];
}

function parseDateBadge(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { day: "—", month: "—" };
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  return { day: String(day), month };
}

function formatDateRange(startStr: string, endStr: string) {
  const s = new Date(startStr);
  const e = new Date(endStr);
  if (isNaN(s.getTime())) return "—";
  const startFmt = s.toLocaleDateString("vi-VN");
  const endFmt = isNaN(e.getTime()) ? "" : ` → ${e.toLocaleDateString("vi-VN")}`;
  return `${startFmt}${endFmt}`;
}

export const ResearcherUpcomingSchedules: React.FC<ResearcherUpcomingSchedulesProps> = ({
  schedules,
}) => {
  const navigate = useNavigate();

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const future14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  future14Days.setHours(23, 59, 59, 999);

  const upcomingSchedules = schedules
    .filter((item) => {
      const startDate = new Date(item.startDate);
      const endDate = new Date(item.endDate || item.startDate);
      if (isNaN(startDate.getTime())) return false;

      // Ongoing today or starts in next 14 days, and not completed/cancelled
      const isOngoingOrUpcoming = endDate >= now && startDate <= future14Days;
      const isNotDone = item.status !== "Completed" && item.status !== "Cancelled";

      return isOngoingOrUpcoming && isNotDone;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 6);

  return (
    <div className="researcher-card">
      <div className="researcher-card-header">
        <div>
          <h3 className="researcher-card-title">
            <Calendar size={18} style={{ color: "#2563eb" }} />
            Upcoming Field Tasks & Execution (Next 14 Days)
          </h3>
          <p className="researcher-card-subtitle">
            Timeline of assigned fieldwork phases and active schedule milestones
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/schedules")}
          className="dashboard-btn-secondary"
          style={{ padding: "6px 12px", fontSize: 12 }}
        >
          <span>All Schedules</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {upcomingSchedules.length === 0 ? (
          <div style={{ textAlign: "center", padding: "36px 16px", color: "#94a3b8" }}>
            <Clock size={32} style={{ margin: "0 auto 8px", opacity: 0.6, color: "#16a34a" }} />
            <strong style={{ display: "block", color: "#0f172a", fontSize: "14px", marginBottom: 4 }}>
              Không có lịch thực địa trong 14 ngày tới
            </strong>
            <p style={{ margin: 0, fontSize: "12.5px", color: "#64748b" }}>
              Hiện tại không có giai đoạn hoặc ca làm việc nào cần triển khai trong 14 ngày tới.
            </p>
          </div>
        ) : (
          upcomingSchedules.map((item) => {
            const { day, month } = parseDateBadge(item.startDate);
            const isCompleted = item.status === "Completed";
            const isInProgress = item.status === "InProgress";

            return (
              <div key={item.scheduleId} className="schedule-item-card">
                <div className="schedule-date-badge">
                  <span className="day">{day}</span>
                  <span className="month">{month}</span>
                </div>

                <div className="schedule-content-main">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <strong>{item.title || item.phaseName || `Schedule #${item.scheduleId}`}</strong>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: isCompleted ? "#ecfdf5" : isInProgress ? "#eff6ff" : "#f8fafc",
                        color: isCompleted ? "#059669" : isInProgress ? "#1d4ed8" : "#64748b",
                        border: `1px solid ${isCompleted ? "#a7f3d0" : isInProgress ? "#bfdbfe" : "#e2e8f0"}`,
                      }}
                    >
                      {item.status}
                    </span>
                  </div>

                  <p>
                    {item.allocationPlanName || `Plan #${item.allocationPlanId}`} • {formatDateRange(item.startDate, item.endDate)}
                  </p>

                  {item.assignedHumanResourceName && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "#475569", marginTop: 2 }}>
                      <User size={12} style={{ color: "#059669" }} />
                      <span>Assigned: <strong>{item.assignedHumanResourceName}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
