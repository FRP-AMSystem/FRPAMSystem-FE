import React from "react";
import { Edit3, Sparkles, X } from "lucide-react";
import "../PlanningWizard.css";

interface PlanningMethodSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectManual: () => void;
  onSelectAI: () => void;
}

export const PlanningMethodSelector: React.FC<PlanningMethodSelectorProps> = ({
  isOpen,
  onClose,
  onSelectManual,
  onSelectAI,
}) => {
  if (!isOpen) return null;

  return (
    <div className="planning-modal-overlay">
      <div className="planning-modal-container">
        <button onClick={onClose} className="planning-modal-close">
          <X size={20} />
        </button>

        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <span className="planning-draft-badge">Draft Experiment Plan</span>
          <h2 style={{ fontSize: "24px", fontWeight: 750, color: "#0f172a", margin: "12px 0 6px" }}>
            Choose Planning Method
          </h2>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
            How would you like to refine and finalize your experiment plan before submitting for review?
          </p>
        </div>

        <div className="planning-method-cards">
          {/* Manual Option */}
          <div onClick={onSelectManual} className="planning-method-card">
            <div>
              <div className="planning-method-icon">
                <Edit3 size={24} />
              </div>
              <h3>Manual Planning</h3>
              <p>
                Review, edit, and fine-tune your draft requirements manually before sending to Manager.
              </p>
            </div>
            <button className="btn-secondary-white" style={{ marginTop: "20px", width: "100%" }}>
              Select Manual Mode
            </button>
          </div>

          {/* AI Suggestion Option */}
          <div onClick={onSelectAI} className="planning-method-card ai-card">
            <span
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "#16a34a",
                color: "#ffffff",
                fontSize: "10px",
                fontWeight: 750,
                padding: "3px 8px",
                borderRadius: "4px",
                textTransform: "uppercase",
              }}
            >
              Recommended
            </span>
            <div>
              <div className="planning-method-icon">
                <Sparkles size={24} />
              </div>
              <h3>AI Suggestion</h3>
              <p>
                Generate 5 optimized plan alternatives in RAM. Compare strategies, select the best fit, and submit.
              </p>
            </div>
            <button className="btn-primary-green" style={{ marginTop: "20px", width: "100%" }}>
              Generate 5 AI Suggestions
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
          >
            Cancel & Stay on Details
          </button>
        </div>
      </div>
    </div>
  );
};
