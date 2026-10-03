import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Users,
  Layers,
  Wrench,
  Clock,
  ShieldAlert,
  Info,
} from "lucide-react";
import type { ConstraintReport } from "../../../types/aiSuggestion";

interface AIConstraintReportCardProps {
  constraintReport?: ConstraintReport;
  conflictCount?: number;
}

export const AIConstraintReportCard: React.FC<AIConstraintReportCardProps> = ({
  constraintReport,
  conflictCount = 0,
}) => {
  const hardViolations = constraintReport?.hardViolationCount ?? 0;
  const softViolations = constraintReport?.softViolationCount ?? 0;
  const isFeasible =
    constraintReport?.isFeasible ??
    (hardViolations === 0 && conflictCount === 0);

  const landConflicts = constraintReport?.landConflicts ?? [];
  const humanConflicts = constraintReport?.humanConflicts ?? [];
  const equipmentConflicts = constraintReport?.equipmentConflicts ?? [];
  const maintenanceConflicts = constraintReport?.maintenanceConflicts ?? [];
  const skillConflicts = constraintReport?.skillConflicts ?? [];
  const roleConflicts = constraintReport?.roleConflicts ?? [];
  const deadlineConflicts = constraintReport?.deadlineConflicts ?? [];
  const scheduleConflicts = constraintReport?.scheduleConflicts ?? [];

  const allHumanIssues = [
    ...humanConflicts,
    ...roleConflicts.map((c) =>
      c.startsWith("Role") ? c : `[Role Mismatch] ${c}`
    ),
    ...skillConflicts.map((c) =>
      c.startsWith("Skill") ? c : `[Skill Mismatch] ${c}`
    ),
  ];

  const allScheduleIssues = [...deadlineConflicts, ...scheduleConflicts];

  return (
    <div className="ai-constraint-report-container">
      {/* Feasibility Status Banner */}
      <div
        className={`ai-feasibility-banner ${
          isFeasible ? "feasible" : "infeasible"
        }`}
      >
        <div className="banner-icon">
          {isFeasible ? (
            <CheckCircle2 size={22} className="text-emerald-600" />
          ) : (
            <XCircle size={22} className="text-rose-600" />
          )}
        </div>
        <div className="banner-content">
          <div className="banner-title">
            {isFeasible
              ? "Allocation Plan Feasible"
              : "Allocation Plan Infeasible (Action Required)"}
          </div>
          <p className="banner-desc">
            {isFeasible
              ? "This allocation plan satisfies all mandatory hard constraints and is ready for submission."
              : `Detected ${hardViolations} hard constraint violation(s) and ${softViolations} soft constraint warning(s). Hard violations must be resolved before the plan can proceed.`}
          </p>
        </div>
        <div className="banner-tags">
          <span
            className={`violation-pill hard ${
              hardViolations > 0 ? "has-error" : ""
            }`}
          >
            <strong>{hardViolations}</strong> Hard Violations
          </span>
          <span
            className={`violation-pill soft ${
              softViolations > 0 ? "has-warn" : ""
            }`}
          >
            <strong>{softViolations}</strong> Soft Violations
          </span>
        </div>
      </div>

      {/* Hard vs Soft Explanation Cards */}
      <div className="ai-constraint-types-grid">
        <div className="constraint-type-card hard">
          <div className="card-top">
            <div className="badge-icon red">
              <ShieldAlert size={15} />
            </div>
            <h5>Hard Constraints</h5>
            <span className="count-badge red">{hardViolations} issue(s)</span>
          </div>
          <p className="card-sub">
            Mandatory execution criteria (valid land plots, required roles, skills, and equipment units). Plans cannot execute with unresolved hard violations.
          </p>
        </div>

        <div className="constraint-type-card soft">
          <div className="card-top">
            <div className="badge-icon amber">
              <AlertTriangle size={15} />
            </div>
            <h5>Soft Constraints</h5>
            <span className="count-badge amber">{softViolations} warning(s)</span>
          </div>
          <p className="card-sub">
            Optimization preferences (workload balance, equipment substitute efficiency, schedule shifts). Violations apply penalty points to the fitness score.
          </p>
        </div>
      </div>

      {/* Categorized Conflict Details */}
      <div className="ai-conflict-categories">
        <h4 className="section-heading">
          Constraint Violations & Diagnostics by Resource Type
        </h4>

        {/* 1. Land Conflicts */}
        {landConflicts.length > 0 && (
          <div className="conflict-category-card land">
            <div className="category-header">
              <div className="cat-title">
                <Layers size={16} className="text-emerald-600" />
                <span>Land Resource Constraints</span>
              </div>
              <span className="cat-badge">{landConflicts.length} issue(s)</span>
            </div>
            <ul className="conflict-list">
              {landConflicts.map((item, idx) => (
                <li key={idx} className="conflict-item">
                  <span className="item-text">{item}</span>
                  <span className="action-hint">
                    Resolution: Allocate an available land plot matching required soil type and area size.
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 2. Human & Role & Skill Conflicts */}
        {allHumanIssues.length > 0 && (
          <div className="conflict-category-card human">
            <div className="category-header">
              <div className="cat-title">
                <Users size={16} className="text-emerald-600" />
                <span>Personnel, Role & Skill Constraints</span>
              </div>
              <span className="cat-badge">{allHumanIssues.length} issue(s)</span>
            </div>
            <ul className="conflict-list">
              {allHumanIssues.map((item, idx) => (
                <li key={idx} className="conflict-item">
                  <span className="item-text">{item}</span>
                  <span className="action-hint">
                    Resolution: Assign personnel matching the required Role ID and Skill ID for this phase.
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 3. Equipment Conflicts */}
        {equipmentConflicts.length > 0 && (
          <div className="conflict-category-card equipment">
            <div className="category-header">
              <div className="cat-title">
                <Wrench size={16} className="text-emerald-600" />
                <span>Equipment & Machinery Constraints</span>
              </div>
              <span className="cat-badge">{equipmentConflicts.length} issue(s)</span>
            </div>
            <ul className="conflict-list">
              {equipmentConflicts.map((item, idx) => (
                <li key={idx} className="conflict-item">
                  <span className="item-text">{item}</span>
                  <span className="action-hint">
                    Resolution: Assign available equipment instances or allow compatible substitute types.
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 4. Schedule & Timeline Conflicts */}
        {allScheduleIssues.length > 0 && (
          <div className="conflict-category-card schedule">
            <div className="category-header">
              <div className="cat-title">
                <Clock size={16} className="text-emerald-600" />
                <span>Schedule & Timeline Constraints</span>
              </div>
              <span className="cat-badge">{allScheduleIssues.length} issue(s)</span>
            </div>
            <ul className="conflict-list">
              {allScheduleIssues.map((item, idx) => (
                <li key={idx} className="conflict-item">
                  <span className="item-text">{item}</span>
                  <span className="action-hint">
                    Resolution: Adjust phase start/end dates to eliminate timeline overlaps.
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 5. Maintenance Conflicts */}
        {maintenanceConflicts.length > 0 && (
          <div className="conflict-category-card maintenance">
            <div className="category-header">
              <div className="cat-title">
                <Wrench size={16} className="text-emerald-600" />
                <span>Equipment Maintenance Overlap</span>
              </div>
              <span className="cat-badge">{maintenanceConflicts.length} issue(s)</span>
            </div>
            <ul className="conflict-list">
              {maintenanceConflicts.map((item, idx) => (
                <li key={idx} className="conflict-item">
                  <span className="item-text">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Empty state: No conflicts */}
        {landConflicts.length === 0 &&
          allHumanIssues.length === 0 &&
          equipmentConflicts.length === 0 &&
          allScheduleIssues.length === 0 &&
          maintenanceConflicts.length === 0 && (
            <div className="no-conflicts-box">
              <CheckCircle2 size={32} className="text-emerald-600" />
              <h5>No Constraint Violations Detected</h5>
              <p>All land plots, personnel assignments, equipment instances, and schedule dates are fully compatible.</p>
            </div>
          )}
      </div>

      {/* Info Note */}
      <div className="ai-constraint-footer-note">
        <Info size={15} className="text-slate-400" />
        <span>
          <strong>Genetic Algorithm Optimization:</strong> The solver iteratively evaluates resource combinations to eliminate hard constraint violations and maximize the overall fitness score.
        </span>
      </div>
    </div>
  );
};

export default AIConstraintReportCard;
