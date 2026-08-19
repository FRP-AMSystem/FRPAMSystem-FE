import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Wrench,
  Users,
  MapPin,
  Clock,
  Layers,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Info,
} from "lucide-react";
import type { AISuggestionPlan } from "../../../types/aiSuggestion";
import "../PlanningWizard.css";

interface AISuggestionListProps {
  suggestions: AISuggestionPlan[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSwitchToManual: () => void;
  onConfirmSelection: (selectedPlan: AISuggestionPlan) => Promise<void>;
  onClose: () => void;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export const AISuggestionList: React.FC<AISuggestionListProps> = ({
  suggestions,
  isLoading,
  error,
  onRetry,
  onSwitchToManual,
  onConfirmSelection,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    suggestions[0]?.id || ""
  );
  const [activeTab, setActiveTab] = useState<
    "overview" | "equipment" | "humans" | "lands" | "conflicts"
  >("overview");
  const [submitting, setSubmitting] = useState(false);

  // Synchronize selection when suggestions load
  React.useEffect(() => {
    if (suggestions.length > 0 && !selectedId) {
      setSelectedId(suggestions[0].id);
    }
  }, [suggestions, selectedId]);

  const selectedPlan = suggestions.find((s) => s.id === selectedId);

  const handleApply = async () => {
    if (!selectedPlan) return;
    try {
      setSubmitting(true);
      await onConfirmSelection(selectedPlan);
    } catch (err) {
      console.error("Failed to apply AI suggestion", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="planning-modal-overlay">
      <div className="ai-modal-container" style={{ maxWidth: "1140px" }}>
        {/* Header */}
        <div className="planning-card-header" style={{ marginBottom: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #16a34a 0%, #0d9488 100%)",
                  color: "#fff",
                }}
              >
                <Sparkles size={16} />
              </div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 750, color: "#0f172a" }}>
                AI Allocation Suggestions
              </h2>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "12px",
                  background: "#dcfce7",
                  color: "#15803d",
                  border: "1px solid #bbf7d0",
                }}
              >
                {suggestions.length} Candidates Evaluated
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "13.5px", color: "#64748b" }}>
              Genetic algorithm evaluated resource allocations and constraints for this experiment.
            </p>
          </div>
          <button
            onClick={onClose}
            className="planning-modal-close"
            style={{ position: "relative", top: 0, right: 0 }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div style={{ textAlign: "center", padding: "70px 20px", margin: "auto" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                border: "4px solid #bbf7d0",
                borderTopColor: "#16a34a",
                borderRadius: "50%",
                margin: "0 auto 20px",
                animation: "spin 1s linear infinite",
              }}
            />
            <h3 style={{ fontSize: "18px", fontWeight: 750, color: "#0f172a", marginBottom: "8px" }}>
              Running Genetic Algorithm Optimization...
            </h3>
            <p style={{ fontSize: "14px", color: "#64748b", maxWidth: "500px", margin: "0 auto" }}>
              Evaluating population schedules, resolving land soil types, assigning available equipment,
              and balancing personnel shifts against experiment constraints.
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="planning-alert-error" style={{ textAlign: "center", padding: "36px", margin: "auto" }}>
            <AlertTriangle size={36} color="#b91c1c" style={{ margin: "0 auto 12px" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 750, color: "#991b1b", marginBottom: "8px" }}>
              AI Optimization Request Issue
            </h3>
            <p style={{ fontSize: "14px", color: "#b91c1c", marginBottom: "20px", maxWidth: "500px", margin: "0 auto 20px" }}>
              {error}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
              <button onClick={onRetry} className="btn-primary-green">
                Retry Optimization
              </button>
              <button onClick={onSwitchToManual} className="btn-secondary-white">
                Use Manual Planning Mode
              </button>
            </div>
          </div>
        )}

        {/* Content View: Suggestions Available */}
        {!isLoading && !error && suggestions.length > 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
            {/* Top 5 Candidates Card Grid */}
            <div className="ai-suggestions-grid" style={{ flexShrink: 0, marginBottom: "16px" }}>
              {suggestions.map((plan) => {
                const isSelected = plan.id === selectedId;
                const isTop = plan.rank === 1;
                const hasConflicts = plan.conflictCount > 0;

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(plan.id);
                    }}
                    className={`ai-option-card ${isSelected ? "selected" : ""}`}
                    style={{
                      borderWidth: isSelected ? "2px" : "1.5px",
                      borderColor: isSelected ? "#16a34a" : "#e2e8f0",
                      background: isSelected ? "#f0fdf4" : "#ffffff",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "6px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            color: isTop ? "#15803d" : "#475569",
                            background: isTop ? "#dcfce7" : "#f1f5f9",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          Rank #{plan.rank}
                        </span>
                        {isSelected && (
                          <span style={{ fontSize: "11px", fontWeight: 750, color: "#16a34a" }}>
                            Active
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: "13px", fontWeight: 750, color: "#0f172a", marginBottom: "4px" }}>
                        Fitness: {plan.fitnessScore.toFixed(1)}%
                      </div>

                      {hasConflicts ? (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "10.5px",
                            fontWeight: 700,
                            color: "#b45309",
                            background: "#fef3c7",
                            padding: "1px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          <AlertTriangle size={11} />
                          {plan.conflictCount} Conflicts
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "10.5px",
                            fontWeight: 700,
                            color: "#15803d",
                            background: "#dcfce7",
                            padding: "1px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          <CheckCircle2 size={11} />
                          Clean
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        marginTop: "10px",
                        paddingTop: "8px",
                        borderTop: "1px solid #e2e8f0",
                        fontSize: "11px",
                        color: "#64748b",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>{plan.estimatedDurationDays} Days</span>
                      <span>End: {formatDate(plan.estimatedCompletionTime)}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Plan Details Area */}
            {selectedPlan && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  overflow: "hidden",
                }}
              >
                {/* Plan Header Summary Bar */}
                <div
                  style={{
                    background: "#ffffff",
                    padding: "16px 20px",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span
                        style={{
                          fontSize: "11.5px",
                          fontWeight: 750,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          background: selectedPlan.rank === 1 ? "#dcfce7" : "#f1f5f9",
                          color: selectedPlan.rank === 1 ? "#15803d" : "#334155",
                          border: selectedPlan.rank === 1 ? "1px solid #bbf7d0" : "1px solid #cbd5e1",
                        }}
                      >
                        Option #{selectedPlan.rank} • {selectedPlan.strategyBadge}
                      </span>
                      <span style={{ fontSize: "13px", color: "#64748b" }}>
                        Est. Completion: <strong>{formatDate(selectedPlan.estimatedCompletionTime)}</strong>
                      </span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 750, color: "#0f172a" }}>
                      {selectedPlan.title}
                    </h3>
                  </div>

                  {/* Summary Metric Badges */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <div
                      style={{
                        background: "#f1f5f9",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ color: "#64748b", fontSize: "10.5px", fontWeight: 650 }}>FITNESS</div>
                      <div style={{ fontWeight: 800, color: "#0f172a" }}>
                        {selectedPlan.fitnessScore.toFixed(1)}%
                      </div>
                    </div>

                    <div
                      style={{
                        background: selectedPlan.penaltyScore < 0 ? "#fee2e2" : "#f1f5f9",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ color: "#64748b", fontSize: "10.5px", fontWeight: 650 }}>PENALTY</div>
                      <div style={{ fontWeight: 800, color: selectedPlan.penaltyScore < 0 ? "#b91c1c" : "#0f172a" }}>
                        {selectedPlan.penaltyScore}
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#f0fdf4",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ color: "#64748b", fontSize: "10.5px", fontWeight: 650 }}>BONUS</div>
                      <div style={{ fontWeight: 800, color: "#15803d" }}>
                        +{selectedPlan.bonusScore}
                      </div>
                    </div>

                    <div
                      style={{
                        background: selectedPlan.conflictCount > 0 ? "#fef3c7" : "#dcfce7",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ color: "#64748b", fontSize: "10.5px", fontWeight: 650 }}>CONFLICTS</div>
                      <div
                        style={{
                          fontWeight: 800,
                          color: selectedPlan.conflictCount > 0 ? "#b45309" : "#15803d",
                        }}
                      >
                        {selectedPlan.conflictCount}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-Navigation Tabs */}
                <div
                  style={{
                    display: "flex",
                    gap: "4px",
                    padding: "8px 16px 0",
                    background: "#ffffff",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab("overview")}
                    style={{
                      padding: "8px 14px",
                      border: "none",
                      background: "transparent",
                      fontSize: "13px",
                      fontWeight: activeTab === "overview" ? 750 : 600,
                      color: activeTab === "overview" ? "#15803d" : "#64748b",
                      borderBottom: activeTab === "overview" ? "2.5px solid #16a34a" : "2.5px solid transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <TrendingUp size={15} />
                    Overview & Scores
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("equipment")}
                    style={{
                      padding: "8px 14px",
                      border: "none",
                      background: "transparent",
                      fontSize: "13px",
                      fontWeight: activeTab === "equipment" ? 750 : 600,
                      color: activeTab === "equipment" ? "#15803d" : "#64748b",
                      borderBottom: activeTab === "equipment" ? "2.5px solid #16a34a" : "2.5px solid transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Wrench size={15} />
                    Allocated Equipment ({selectedPlan.allocatedEquipment?.length || 0})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("humans")}
                    style={{
                      padding: "8px 14px",
                      border: "none",
                      background: "transparent",
                      fontSize: "13px",
                      fontWeight: activeTab === "humans" ? 750 : 600,
                      color: activeTab === "humans" ? "#15803d" : "#64748b",
                      borderBottom: activeTab === "humans" ? "2.5px solid #16a34a" : "2.5px solid transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Users size={15} />
                    Personnel Assigned ({selectedPlan.allocatedHumans?.length || 0})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("lands")}
                    style={{
                      padding: "8px 14px",
                      border: "none",
                      background: "transparent",
                      fontSize: "13px",
                      fontWeight: activeTab === "lands" ? 750 : 600,
                      color: activeTab === "lands" ? "#15803d" : "#64748b",
                      borderBottom: activeTab === "lands" ? "2.5px solid #16a34a" : "2.5px solid transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <MapPin size={15} />
                    Plots & Land ({selectedPlan.allocatedLands?.length || 0})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("conflicts")}
                    style={{
                      padding: "8px 14px",
                      border: "none",
                      background: "transparent",
                      fontSize: "13px",
                      fontWeight: activeTab === "conflicts" ? 750 : 600,
                      color: activeTab === "conflicts" ? "#b45309" : "#64748b",
                      borderBottom: activeTab === "conflicts" ? "2.5px solid #d97706" : "2.5px solid transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <ShieldAlert size={15} />
                    Warnings & Conflicts ({selectedPlan.conflictCount})
                  </button>
                </div>

                {/* Tab Body Scrollable Container */}
                <div style={{ flex: 1, overflowY: "auto", padding: "18px" }}>
                  {/* TAB 1: OVERVIEW */}
                  {activeTab === "overview" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {/* Fitness Breakdown 4-Card Grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                        <div
                          style={{
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                            padding: "12px 14px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                            <span>🏞️ Land Score</span>
                            <strong>{selectedPlan.fitnessBreakdown?.landScore ?? 0}/100</strong>
                          </div>
                          <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                            <div
                              style={{
                                height: "100%",
                                width: `${Math.min(100, selectedPlan.fitnessBreakdown?.landScore ?? 0)}%`,
                                background: "#10b981",
                                borderRadius: "3px",
                              }}
                            />
                          </div>
                        </div>

                        <div
                          style={{
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                            padding: "12px 14px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                            <span>👥 Human Score</span>
                            <strong>{selectedPlan.fitnessBreakdown?.humanScore ?? 0}/100</strong>
                          </div>
                          <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                            <div
                              style={{
                                height: "100%",
                                width: `${Math.min(100, selectedPlan.fitnessBreakdown?.humanScore ?? 0)}%`,
                                background: "#8b5cf6",
                                borderRadius: "3px",
                              }}
                            />
                          </div>
                        </div>

                        <div
                          style={{
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                            padding: "12px 14px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                            <span>🚜 Equipment Score</span>
                            <strong>{selectedPlan.fitnessBreakdown?.equipmentScore?.toFixed(1) ?? 0}/100</strong>
                          </div>
                          <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                            <div
                              style={{
                                height: "100%",
                                width: `${Math.min(100, selectedPlan.fitnessBreakdown?.equipmentScore ?? 0)}%`,
                                background: "#0284c7",
                                borderRadius: "3px",
                              }}
                            />
                          </div>
                        </div>

                        <div
                          style={{
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                            padding: "12px 14px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                            <span>📅 Schedule Score</span>
                            <strong>{selectedPlan.fitnessBreakdown?.scheduleScore?.toFixed(1) ?? 0}/100</strong>
                          </div>
                          <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                            <div
                              style={{
                                height: "100%",
                                width: `${Math.min(100, selectedPlan.fitnessBreakdown?.scheduleScore ?? 0)}%`,
                                background: "#f59e0b",
                                borderRadius: "3px",
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Advantages & Conflict Highlights */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                        {/* Advantages Box */}
                        <div
                          style={{
                            background: "#ffffff",
                            border: "1px solid #dcfce7",
                            borderRadius: "10px",
                            padding: "14px",
                          }}
                        >
                          <h4
                            style={{
                              fontSize: "12.5px",
                              fontWeight: 750,
                              color: "#15803d",
                              margin: "0 0 8px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <CheckCircle2 size={16} /> Advantages & Strengths
                          </h4>
                          {selectedPlan.advantages && selectedPlan.advantages.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "#334155", lineHeight: "1.6" }}>
                              {selectedPlan.advantages.map((adv, idx) => (
                                <li key={idx}>{adv}</li>
                              ))}
                            </ul>
                          ) : (
                            <p style={{ margin: 0, fontSize: "12.5px", color: "#64748b" }}>
                              Candidate generated from available resources and requirements.
                            </p>
                          )}
                        </div>

                        {/* Disadvantages / Warnings Box */}
                        <div
                          style={{
                            background: "#ffffff",
                            border: "1px solid #fef3c7",
                            borderRadius: "10px",
                            padding: "14px",
                          }}
                        >
                          <h4
                            style={{
                              fontSize: "12.5px",
                              fontWeight: 750,
                              color: "#b45309",
                              margin: "0 0 8px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <AlertTriangle size={16} /> Potential Bottlenecks ({selectedPlan.conflictCount})
                          </h4>
                          {selectedPlan.disadvantages && selectedPlan.disadvantages.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "#451a03", lineHeight: "1.6" }}>
                              {selectedPlan.disadvantages.slice(0, 4).map((dis, idx) => (
                                <li key={idx}>{dis}</li>
                              ))}
                              {selectedPlan.disadvantages.length > 4 && (
                                <li style={{ color: "#b45309", fontWeight: 700 }}>
                                  +{selectedPlan.disadvantages.length - 4} more warnings in Warnings Tab
                                </li>
                              )}
                            </ul>
                          ) : (
                            <p style={{ margin: 0, fontSize: "12.5px", color: "#15803d", fontWeight: 650 }}>
                              No hard constraint conflicts detected.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Phases Timeline Card */}
                      <div
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "10px",
                          padding: "16px",
                        }}
                      >
                        <h4
                          style={{
                            fontSize: "13px",
                            fontWeight: 750,
                            color: "#0f172a",
                            margin: "0 0 12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <Calendar size={16} color="#16a34a" /> Phase Timeline Execution
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {(selectedPlan.timeline && selectedPlan.timeline.length > 0
                            ? selectedPlan.timeline
                            : selectedPlan.experimentPhases
                          ).map((phase, pIdx) => {
                            const pName = "phaseName" in phase ? phase.phaseName : `Phase ${pIdx + 1}`;
                            const pStart = "startDate" in phase && phase.startDate ? formatDate(phase.startDate) : "expectedStartDate" in phase && phase.expectedStartDate ? formatDate(phase.expectedStartDate) : "-";
                            const pEnd = "endDate" in phase && phase.endDate ? formatDate(phase.endDate) : "expectedEndDate" in phase && phase.expectedEndDate ? formatDate(phase.expectedEndDate) : "-";
                            const pDuration = "durationDays" in phase ? phase.durationDays : undefined;

                            return (
                              <div
                                key={pIdx}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "10px 14px",
                                  background: "#f8fafc",
                                  borderRadius: "8px",
                                  border: "1px solid #f1f5f9",
                                  fontSize: "13px",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <span
                                    style={{
                                      width: "24px",
                                      height: "24px",
                                      borderRadius: "50%",
                                      background: "#16a34a",
                                      color: "#ffffff",
                                      fontSize: "11px",
                                      fontWeight: 750,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    {pIdx + 1}
                                  </span>
                                  <strong style={{ color: "#0f172a" }}>{pName}</strong>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "14px", color: "#64748b" }}>
                                  <span>
                                    {pStart} <ArrowRight size={12} style={{ verticalAlign: "middle" }} /> {pEnd}
                                  </span>
                                  {pDuration !== undefined && (
                                    <span
                                      style={{
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        background: "#e2e8f0",
                                        padding: "2px 8px",
                                        borderRadius: "4px",
                                        color: "#334155",
                                      }}
                                    >
                                      {pDuration} Days
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: ALLOCATED EQUIPMENT */}
                  {activeTab === "equipment" && (
                    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: 750, color: "#0f172a", margin: "0 0 12px" }}>
                        Allocated Equipment Instances ({selectedPlan.allocatedEquipment?.length || 0})
                      </h4>
                      {selectedPlan.allocatedEquipment && selectedPlan.allocatedEquipment.length > 0 ? (
                        <div className="experiment-phase-table-wrapper">
                          <table className="experiment-phase-table" style={{ width: "100%", fontSize: "12.5px" }}>
                            <thead>
                              <tr>
                                <th>Asset Code</th>
                                <th>Equipment Type</th>
                                <th>Phase</th>
                                <th>Substitute</th>
                                <th>Efficiency</th>
                                <th>Time Multiplier</th>
                                <th>Schedule</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedPlan.allocatedEquipment.map((eq, eIdx) => (
                                <tr key={eIdx}>
                                  <td>
                                    <strong style={{ color: "#0284c7" }}>
                                      {eq.assetCode || `Item #${eq.equipmentInstanceId}`}
                                    </strong>
                                  </td>
                                  <td>{eq.equipmentTypeName || `Type #${eq.allocatedEquipmentTypeId}`}</td>
                                  <td>{eq.phaseName || `Phase #${eq.phaseId}`}</td>
                                  <td>
                                    {eq.isSubstitute ? (
                                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800">
                                        Substitute
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                                        Exact Match
                                      </span>
                                    )}
                                  </td>
                                  <td>{Math.round((eq.efficiencyRate ?? 1) * 100)}%</td>
                                  <td>{eq.timeMultiplier ? `${eq.timeMultiplier}x` : "1.0x"}</td>
                                  <td>
                                    {formatDate(eq.startDate)} → {formatDate(eq.endDate)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p style={{ color: "#64748b", margin: 0 }}>No equipment instances allocated for this plan.</p>
                      )}
                    </div>
                  )}

                  {/* TAB 3: ALLOCATED PERSONNEL */}
                  {activeTab === "humans" && (
                    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: 750, color: "#0f172a", margin: "0 0 12px" }}>
                        Assigned Personnel ({selectedPlan.allocatedHumans?.length || 0})
                      </h4>
                      {selectedPlan.allocatedHumans && selectedPlan.allocatedHumans.length > 0 ? (
                        <div className="experiment-phase-table-wrapper">
                          <table className="experiment-phase-table" style={{ width: "100%", fontSize: "12.5px" }}>
                            <thead>
                              <tr>
                                <th>Full Name</th>
                                <th>Phase</th>
                                <th>Current Workload</th>
                                <th>Assignment Period</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedPlan.allocatedHumans.map((h, hIdx) => (
                                <tr key={hIdx}>
                                  <td>
                                    <strong style={{ color: "#7c3aed" }}>
                                      {h.fullName || `Staff #${h.humanResourceId}`}
                                    </strong>
                                  </td>
                                  <td>{h.phaseName || `Phase #${h.phaseId}`}</td>
                                  <td>
                                    <span style={{ fontWeight: 650, color: "#334155" }}>
                                      {h.currentWorkload ?? 0} active assignments
                                    </span>
                                  </td>
                                  <td>
                                    {formatDate(h.startDate)} → {formatDate(h.endDate)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p style={{ color: "#64748b", margin: 0 }}>No personnel assigned for this plan.</p>
                      )}
                    </div>
                  )}

                  {/* TAB 4: ALLOCATED LANDS */}
                  {activeTab === "lands" && (
                    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: 750, color: "#0f172a", margin: "0 0 12px" }}>
                        Allocated Land Plots ({selectedPlan.allocatedLands?.length || 0})
                      </h4>
                      {selectedPlan.allocatedLands && selectedPlan.allocatedLands.length > 0 ? (
                        <div className="experiment-phase-table-wrapper">
                          <table className="experiment-phase-table" style={{ width: "100%", fontSize: "12.5px" }}>
                            <thead>
                              <tr>
                                <th>Plot Code</th>
                                <th>Soil Type</th>
                                <th>Area Size (m²)</th>
                                <th>Phase</th>
                                <th>Usage Period</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedPlan.allocatedLands.map((l, lIdx) => (
                                <tr key={lIdx}>
                                  <td>
                                    <strong style={{ color: "#15803d" }}>
                                      {l.landCode || `Plot #${l.landId}`}
                                    </strong>
                                  </td>
                                  <td>
                                    <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                      {l.soilType || "-"}
                                    </span>
                                  </td>
                                  <td>
                                    <strong>{l.areaSize?.toLocaleString()} m²</strong>
                                  </td>
                                  <td>{l.phaseName || `Phase #${l.phaseId}`}</td>
                                  <td>
                                    {formatDate(l.startDate)} → {formatDate(l.endDate)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p style={{ color: "#64748b", margin: 0 }}>No land plots allocated for this plan.</p>
                      )}
                    </div>
                  )}

                  {/* TAB 5: WARNINGS & CONFLICTS */}
                  {activeTab === "conflicts" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      <div
                        style={{
                          background: selectedPlan.conflictCount > 0 ? "#fffbeb" : "#f0fdf4",
                          border: `1px solid ${selectedPlan.conflictCount > 0 ? "#fef3c7" : "#dcfce7"}`,
                          borderRadius: "10px",
                          padding: "16px",
                        }}
                      >
                        <h4
                          style={{
                            fontSize: "14px",
                            fontWeight: 750,
                            color: selectedPlan.conflictCount > 0 ? "#b45309" : "#15803d",
                            margin: "0 0 6px",
                          }}
                        >
                          Total Detected Issues: {selectedPlan.conflictCount}
                        </h4>
                        <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                          The genetic algorithm applied soft and hard constraint penalties to calculate the final fitness score.
                        </p>
                      </div>

                      {/* Constraint Report Categorized Breakdown */}
                      {selectedPlan.constraintReport ? (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          {selectedPlan.constraintReport.landConflicts && selectedPlan.constraintReport.landConflicts.length > 0 && (
                            <div style={{ background: "#ffffff", border: "1px solid #fee2e2", borderRadius: "8px", padding: "12px" }}>
                              <strong style={{ fontSize: "12.5px", color: "#991b1b", display: "block", marginBottom: "6px" }}>
                                🏞️ Land Conflicts ({selectedPlan.constraintReport.landConflicts.length})
                              </strong>
                              <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", color: "#7f1d1d" }}>
                                {selectedPlan.constraintReport.landConflicts.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {selectedPlan.constraintReport.humanConflicts && selectedPlan.constraintReport.humanConflicts.length > 0 && (
                            <div style={{ background: "#ffffff", border: "1px solid #fee2e2", borderRadius: "8px", padding: "12px" }}>
                              <strong style={{ fontSize: "12.5px", color: "#991b1b", display: "block", marginBottom: "6px" }}>
                                👥 Human Workload Conflicts ({selectedPlan.constraintReport.humanConflicts.length})
                              </strong>
                              <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", color: "#7f1d1d" }}>
                                {selectedPlan.constraintReport.humanConflicts.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {selectedPlan.constraintReport.equipmentConflicts && selectedPlan.constraintReport.equipmentConflicts.length > 0 && (
                            <div style={{ background: "#ffffff", border: "1px solid #fee2e2", borderRadius: "8px", padding: "12px" }}>
                              <strong style={{ fontSize: "12.5px", color: "#991b1b", display: "block", marginBottom: "6px" }}>
                                🚜 Equipment Conflicts ({selectedPlan.constraintReport.equipmentConflicts.length})
                              </strong>
                              <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", color: "#7f1d1d" }}>
                                {selectedPlan.constraintReport.equipmentConflicts.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {selectedPlan.constraintReport.scheduleConflicts && selectedPlan.constraintReport.scheduleConflicts.length > 0 && (
                            <div style={{ background: "#ffffff", border: "1px solid #fee2e2", borderRadius: "8px", padding: "12px" }}>
                              <strong style={{ fontSize: "12.5px", color: "#991b1b", display: "block", marginBottom: "6px" }}>
                                📅 Schedule Overlap Conflicts ({selectedPlan.constraintReport.scheduleConflicts.length})
                              </strong>
                              <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", color: "#7f1d1d" }}>
                                {selectedPlan.constraintReport.scheduleConflicts.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {selectedPlan.constraintReport.skillConflicts && selectedPlan.constraintReport.skillConflicts.length > 0 && (
                            <div style={{ background: "#ffffff", border: "1px solid #fee2e2", borderRadius: "8px", padding: "12px" }}>
                              <strong style={{ fontSize: "12.5px", color: "#991b1b", display: "block", marginBottom: "6px" }}>
                                🎓 Skill Mismatch Conflicts ({selectedPlan.constraintReport.skillConflicts.length})
                              </strong>
                              <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", color: "#7f1d1d" }}>
                                {selectedPlan.constraintReport.skillConflicts.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {selectedPlan.constraintReport.roleConflicts && selectedPlan.constraintReport.roleConflicts.length > 0 && (
                            <div style={{ background: "#ffffff", border: "1px solid #fee2e2", borderRadius: "8px", padding: "12px" }}>
                              <strong style={{ fontSize: "12.5px", color: "#991b1b", display: "block", marginBottom: "6px" }}>
                                🏷️ Role Missing Conflicts ({selectedPlan.constraintReport.roleConflicts.length})
                              </strong>
                              <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", color: "#7f1d1d" }}>
                                {selectedPlan.constraintReport.roleConflicts.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {selectedPlan.constraintReport.deadlineConflicts && selectedPlan.constraintReport.deadlineConflicts.length > 0 && (
                            <div style={{ background: "#ffffff", border: "1px solid #fee2e2", borderRadius: "8px", padding: "12px" }}>
                              <strong style={{ fontSize: "12.5px", color: "#991b1b", display: "block", marginBottom: "6px" }}>
                                ⏰ Deadline Breach Conflicts ({selectedPlan.constraintReport.deadlineConflicts.length})
                              </strong>
                              <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", color: "#7f1d1d" }}>
                                {selectedPlan.constraintReport.deadlineConflicts.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px" }}>
                          <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "13px", color: "#334155" }}>
                            {selectedPlan.disadvantages?.map((dis, idx) => (
                              <li key={idx}>{dis}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        {!isLoading && !error && selectedPlan && (
          <div
            style={{
              borderTop: "1px solid #e2e8f0",
              paddingTop: "16px",
              marginTop: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={onSwitchToManual}
              className="btn-secondary-white"
              style={{ fontSize: "13px" }}
            >
              ← Cancel AI Mode & Use Manual Edit
            </button>
            <button
              type="button"
              onClick={() => void handleApply()}
              disabled={submitting}
              className="btn-primary-green"
              style={{ padding: "11px 24px", fontSize: "14px" }}
            >
              {submitting
                ? "Applying Plan..."
                : `Apply & Save Candidate #${selectedPlan.rank}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
