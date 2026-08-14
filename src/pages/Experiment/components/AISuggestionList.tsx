import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  Layers,
  Wrench,
  Users,
  RefreshCw,
  Edit3,
  X,
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
      <div className="ai-modal-container">
        {/* Header */}
        <div className="planning-card-header" style={{ marginBottom: "20px" }}>
          <div>
            <h2>
              <Sparkles size={22} color="#16a34a" />
              AI Plan Recommendations
            </h2>
            <p>
              AI generated 5 optimized experiment plan alternatives stored temporarily in memory.
            </p>
          </div>
          <button onClick={onClose} className="planning-modal-close" style={{ position: "relative", top: 0, right: 0 }}>
            <X size={20} />
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div style={{ textAlign: "center", padding: "60px 20px", margin: "auto" }}>
            <div style={{ width: "48px", height: "48px", border: "4px solid #bbf7d0", borderTopColor: "#16a34a", borderRadius: "50%", margin: "0 auto 20px", animation: "spin 1s linear infinite" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 750, color: "#0f172a", marginBottom: "8px" }}>
              Generating 5 AI Plan Suggestions...
            </h3>
            <p style={{ fontSize: "14px", color: "#64748b", maxWidth: "450px", margin: "0 auto" }}>
              Analyzing experiment timeline, equipment availability, personnel skill requirements, and land plot parameters.
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="planning-alert-error" style={{ textAlign: "center", padding: "32px", margin: "auto" }}>
            <X size={32} color="#dc2626" style={{ margin: "0 auto 12px" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 750, color: "#991b1b", marginBottom: "8px" }}>
              AI Generation Issue
            </h3>
            <p style={{ fontSize: "14px", color: "#b91c1c", marginBottom: "20px" }}>{error}</p>
            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
              <button onClick={onRetry} className="btn-primary-green">
                <RefreshCw size={16} /> Retry AI Request
              </button>
              <button onClick={onSwitchToManual} className="btn-secondary-white">
                <Edit3 size={16} /> Use Manual Mode
              </button>
            </div>
          </div>
        )}

        {/* Content View: 5 Suggestions */}
        {!isLoading && !error && suggestions.length > 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
            {/* Suggestion Options List (Fixed at top) */}
            <div className="ai-suggestions-grid" style={{ flexShrink: 0, marginBottom: "16px" }}>
              {suggestions.map((plan, idx) => {
                const isSelected = plan.id === selectedId;

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedId(plan.id)}
                    className={`ai-option-card ${isSelected ? "selected" : ""}`}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 750, color: "#64748b" }}>
                          Option #{idx + 1}
                        </span>
                        {isSelected && <CheckCircle2 size={16} color="#16a34a" />}
                      </div>
                      <h4>{plan.title}</h4>
                      <span className="ai-badge">{plan.strategyBadge}</span>
                    </div>

                    <div style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px solid #e2e8f0", fontSize: "11px", color: "#64748b" }}>
                      <div>⏱️ {plan.estimatedDurationDays} Days</div>
                      <div>⚡ {plan.totalResourceScore} Score</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Plan Detailed View (Scrollable) */}
            {selectedPlan && (
              <div className="planning-item-row" style={{ flex: 1, overflowY: "auto", background: "#f8fafc", padding: "20px", marginBottom: 0 }}>
                <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "14px", marginBottom: "18px" }}>
                  <span className="ai-badge" style={{ fontSize: "12px", padding: "4px 10px" }}>
                    Selected Plan: {selectedPlan.strategyBadge}
                  </span>
                  <h3 style={{ fontSize: "20px", fontWeight: 750, color: "#0f172a", margin: "10px 0 4px" }}>
                    {selectedPlan.title}
                  </h3>
                  <p style={{ fontSize: "14px", color: "#475569", margin: 0 }}>
                    {selectedPlan.description}
                  </p>
                </div>

                {/* AI Rationale & Adjustments Comparison Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "18px" }}>
                  {/* Rationale Box */}
                  <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                    <h4 style={{ fontSize: "12px", fontWeight: 750, textTransform: "uppercase", color: "#64748b", margin: "0 0 10px", display: "flex", alignItems: "center", gap: "6px" }}>
                      💡 AI Optimization Rationale
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "13px", color: "#334155", lineHeight: "1.6" }}>
                      {selectedPlan.rationale.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Changes Summary Box (From -> To) */}
                  <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                    <h4 style={{ fontSize: "12px", fontWeight: 750, textTransform: "uppercase", color: "#16a34a", margin: "0 0 10px", display: "flex", alignItems: "center", gap: "6px" }}>
                      🔄 AI Plan Adjustments (From ➔ To)
                    </h4>
                    {selectedPlan.changesSummary && selectedPlan.changesSummary.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {selectedPlan.changesSummary.map((change, idx) => (
                          <div key={idx} style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: "6px", border: "1px solid #f1f5f9", fontSize: "12px" }}>
                            <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "2px" }}>{change.field}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                              <span style={{ color: "#64748b", background: "#f1f5f9", padding: "1px 5px", borderRadius: "4px", textDecoration: "line-through" }}>
                                {change.from}
                              </span>
                              <span style={{ color: "#15803d", fontWeight: 700, background: "#dcfce7", padding: "1px 6px", borderRadius: "4px" }}>
                                ➔ {change.to}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>Baseline parameters maintained.</p>
                    )}
                  </div>
                </div>

                {/* Breakdown Grid */}
                <div className="planning-form-grid">
                  {/* Phases */}
                  <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                    <h4 style={{ fontSize: "13px", fontWeight: 750, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px", margin: "0 0 12px" }}>
                      <Layers size={16} color="#16a34a" />
                      Phases ({selectedPlan.experimentPhases.length})
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {selectedPlan.experimentPhases.map((p, idx) => (
                        <div key={idx} style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #f1f5f9", fontSize: "13px" }}>
                          <div style={{ fontWeight: 650, color: "#0f172a" }}>
                            #{p.phaseOrder} {p.phaseName}
                          </div>
                          <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                            📅 {p.expectedStartDate} → {p.expectedEndDate}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Equipment & Human Requirements */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                      <h4 style={{ fontSize: "13px", fontWeight: 750, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px", margin: "0 0 12px" }}>
                        <Wrench size={16} color="#0284c7" />
                        Equipment ({selectedPlan.equipmentRequirements.length})
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {selectedPlan.equipmentRequirements.map((e, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12.5px", background: "#f8fafc", padding: "8px 10px", borderRadius: "6px" }}>
                            <span style={{ fontWeight: 600, color: "#0f172a" }}>{e.equipmentTypeName}</span>
                            <span style={{ fontWeight: 700, color: "#0369a1", background: "#e0f2fe", padding: "2px 8px", borderRadius: "4px", fontSize: "11px" }}>
                              Qty: {e.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                      <h4 style={{ fontSize: "13px", fontWeight: 750, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px", margin: "0 0 12px" }}>
                        <Users size={16} color="#7c3aed" />
                        Human Resources ({selectedPlan.humanRequirements.length})
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {selectedPlan.humanRequirements.map((h, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12.5px", background: "#f8fafc", padding: "8px 10px", borderRadius: "6px" }}>
                            <span style={{ fontWeight: 600, color: "#0f172a" }}>{h.roleName}</span>
                            <span style={{ fontWeight: 700, color: "#6d28d9", background: "#f3e8ff", padding: "2px 8px", borderRadius: "4px", fontSize: "11px" }}>
                              {h.quantity} Person(s)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        {!isLoading && !error && selectedPlan && (
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px", marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button type="button" onClick={onSwitchToManual} className="btn-secondary-white" style={{ fontSize: "13px" }}>
              ← Cancel AI Mode & Use Manual Edit
            </button>
            <button
              type="button"
              onClick={() => void handleApply()}
              disabled={submitting}
              className="btn-primary-green"
              style={{ padding: "12px 28px", fontSize: "15px" }}
            >
              {submitting ? (
                <>Applying Plan...</>
              ) : (
                <>
                  <CheckCircle2 size={18} /> Apply & Submit Selected Plan
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
