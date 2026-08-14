import React from "react";
import { Plus, Trash2, Layers, Calendar } from "lucide-react";
import "../PlanningWizard.css";

export interface PhaseFormItem {
  id: string;
  phaseName: string;
  phaseDescription: string;
  phaseOrder: number;
  expectedStartDate: string;
  expectedEndDate: string;
  status: "Planned";
}

interface PhasesStepProps {
  phases: PhaseFormItem[];
  onChange: (phases: PhaseFormItem[]) => void;
  baseStartDate?: string;
  baseEndDate?: string;
}

export const PhasesStep: React.FC<PhasesStepProps> = ({
  phases,
  onChange,
  baseStartDate = "",
  baseEndDate = "",
}) => {
  const handleAddPhase = () => {
    const newPhaseOrder = phases.length + 1;
    const newPhase: PhaseFormItem = {
      id: `phase-temp-${Date.now()}-${Math.random()}`,
      phaseName: `Phase ${newPhaseOrder}: `,
      phaseDescription: "",
      phaseOrder: newPhaseOrder,
      expectedStartDate: baseStartDate || new Date().toISOString().split("T")[0],
      expectedEndDate: baseEndDate || new Date().toISOString().split("T")[0],
      status: "Planned",
    };
    onChange([...phases, newPhase]);
  };

  const handleRemovePhase = (id: string) => {
    const updated = phases
      .filter((p) => p.id !== id)
      .map((p, idx) => ({ ...p, phaseOrder: idx + 1 }));
    onChange(updated);
  };

  const handleUpdatePhase = (
    id: string,
    field: keyof PhaseFormItem,
    value: string | number
  ) => {
    const updated = phases.map((p) =>
      p.id === id ? { ...p, [field]: value } : p
    );
    onChange(updated);
  };

  return (
    <div className="planning-card">
      <div className="planning-card-header">
        <div>
          <h2>
            <Layers size={20} color="#16a34a" />
            Step 2: Experiment Phases
          </h2>
          <p>Break down the experiment into chronological execution phases.</p>
        </div>
        <button
          type="button"
          onClick={handleAddPhase}
          className="btn-primary-green"
        >
          <Plus size={16} /> Add Phase
        </button>
      </div>

      {phases.length === 0 ? (
        <div className="planning-empty-box">
          <Layers size={40} />
          <p>No phases added yet</p>
          <button
            type="button"
            onClick={handleAddPhase}
            className="btn-primary-green"
          >
            + Add First Phase
          </button>
        </div>
      ) : (
        <div>
          {phases.map((phase, index) => (
            <div key={phase.id} className="planning-item-row">
              <div className="planning-item-top">
                <span className="planning-item-badge">
                  Phase #{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemovePhase(phase.id)}
                  className="planning-remove-btn"
                  title="Remove phase"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="planning-form-grid">
                <div className="planning-field-group">
                  <label>
                    Phase Name <span className="planning-required">*</span>
                  </label>
                  <input
                    type="text"
                    value={phase.phaseName}
                    onChange={(e) =>
                      handleUpdatePhase(phase.id, "phaseName", e.target.value)
                    }
                    placeholder="e.g. Site Preparation & Soil Sampling"
                    className="planning-input"
                  />
                </div>

                <div className="planning-form-grid" style={{ gap: "10px" }}>
                  <div className="planning-field-group">
                    <label>
                      Start Date <span className="planning-required">*</span>
                    </label>
                    <div className="planning-date-wrapper">
                      <input
                        type="date"
                        value={phase.expectedStartDate}
                        onChange={(e) =>
                          handleUpdatePhase(
                            phase.id,
                            "expectedStartDate",
                            e.target.value
                          )
                        }
                        className="planning-input"
                      />
                      <div className="planning-date-icon">
                        <Calendar size={16} />
                      </div>
                    </div>
                  </div>
                  <div className="planning-field-group">
                    <label>
                      End Date <span className="planning-required">*</span>
                    </label>
                    <div className="planning-date-wrapper">
                      <input
                        type="date"
                        value={phase.expectedEndDate}
                        onChange={(e) =>
                          handleUpdatePhase(
                            phase.id,
                            "expectedEndDate",
                            e.target.value
                          )
                        }
                        className="planning-input"
                      />
                      <div className="planning-date-icon">
                        <Calendar size={16} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="planning-form-full planning-field-group">
                  <label>Phase Description</label>
                  <input
                    type="text"
                    value={phase.phaseDescription}
                    onChange={(e) =>
                      handleUpdatePhase(
                        phase.id,
                        "phaseDescription",
                        e.target.value
                      )
                    }
                    placeholder="Key tasks, milestones, and expected outputs during this phase..."
                    className="planning-input"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
