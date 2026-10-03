import React from "react";
import { FlaskConical, FileCheck, Sparkles, Calendar, AlertCircle } from "lucide-react";

interface ResearcherKpiCardsProps {
  runningExperiments: number;
  planningExperiments: number;
  draftExperiments: number;
  totalExperiments: number;

  pendingPlans: number;
  approvedPlans: number;
  rejectedPlans: number;

  avgFitnessScore: number;
  upcomingTasksCount: number;

  onSelectTab?: (tab: "plans" | "experiments" | "schedules") => void;
}

export const ResearcherKpiCards: React.FC<ResearcherKpiCardsProps> = ({
  runningExperiments,
  planningExperiments,
  draftExperiments,
  totalExperiments,
  pendingPlans,
  approvedPlans,
  rejectedPlans,
  avgFitnessScore,
  upcomingTasksCount,
  onSelectTab,
}) => {
  const formattedScore = avgFitnessScore > 0 ? `${avgFitnessScore.toFixed(1)}/100` : "0/100";

  return (
    <div className="researcher-kpi-grid">
      {/* 1. Active Experiments */}
      <div
        className="researcher-kpi-card"
        onClick={() => onSelectTab?.("experiments")}
        style={{ cursor: "pointer" }}
      >
        <div className="researcher-kpi-header">
          <span className="researcher-kpi-title">My Experiments</span>
          <div className="researcher-kpi-icon icon-emerald">
            <FlaskConical size={18} />
          </div>
        </div>
        <div>
          <div className="researcher-kpi-value">{totalExperiments}</div>
          <div className="researcher-kpi-sub">
            <span style={{ color: "#16a34a", fontWeight: 700 }}>{runningExperiments} Running</span>
            <span>•</span>
            <span>{planningExperiments} Planning</span>
            <span>•</span>
            <span>{draftExperiments} Draft</span>
          </div>
        </div>
      </div>

      {/* 2. Allocation Plans & Approvals */}
      <div
        className="researcher-kpi-card"
        onClick={() => onSelectTab?.("plans")}
        style={{ cursor: "pointer" }}
      >
        <div className="researcher-kpi-header">
          <span className="researcher-kpi-title">Allocation Approvals</span>
          <div className="researcher-kpi-icon icon-amber">
            <FileCheck size={18} />
          </div>
        </div>
        <div>
          <div className="researcher-kpi-value">
            {pendingPlans}
            <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginLeft: 6 }}>
              Pending
            </span>
          </div>
          <div className="researcher-kpi-sub">
            <span style={{ color: "#16a34a", fontWeight: 600 }}>{approvedPlans} Approved</span>
            {rejectedPlans > 0 && (
              <>
                <span>•</span>
                <span style={{ color: "#dc2626", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <AlertCircle size={12} />
                  {rejectedPlans} Rejected
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3. AI Optimization Quality */}
      <div className="researcher-kpi-card">
        <div className="researcher-kpi-header">
          <span className="researcher-kpi-title">Avg. AI Match Score</span>
          <div className="researcher-kpi-icon icon-purple">
            <Sparkles size={18} />
          </div>
        </div>
        <div>
          <div className="researcher-kpi-value" style={{ color: "#7e22ce" }}>
            {formattedScore}
          </div>
          <div className="researcher-kpi-sub">
            <span>Genetic Allocation Quality</span>
          </div>
        </div>
      </div>

      {/* 4. Upcoming Field Tasks */}
      <div
        className="researcher-kpi-card"
        onClick={() => onSelectTab?.("schedules")}
        style={{ cursor: "pointer" }}
      >
        <div className="researcher-kpi-header">
          <span className="researcher-kpi-title">Upcoming Tasks (14d)</span>
          <div className="researcher-kpi-icon icon-blue">
            <Calendar size={18} />
          </div>
        </div>
        <div>
          <div className="researcher-kpi-value">{upcomingTasksCount}</div>
          <div className="researcher-kpi-sub">
            <span>Field phases & schedules</span>
          </div>
        </div>
      </div>
    </div>
  );
};
