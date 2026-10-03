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

const addDays = (dateStr: string, days: number) => {
  if (!dateStr) return "";

  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);

  return date.toISOString().split("T")[0];
};

export const PhasesStep: React.FC<PhasesStepProps> = ({
  phases,
  onChange,
  baseStartDate = "",
  baseEndDate = "",
}) => {
  const handleAddPhase = () => {
    const newPhaseOrder = phases.length + 1;

    if (phases.length === 0) {
      const newPhase: PhaseFormItem = {
        id: `phase-temp-${Date.now()}-${Math.random()}`,
        phaseName: `Phase ${newPhaseOrder}: `,
        phaseDescription: "",
        phaseOrder: newPhaseOrder,
        expectedStartDate:
          baseStartDate ||
          new Date().toISOString().split("T")[0],
        expectedEndDate:
          baseEndDate ||
          baseStartDate ||
          new Date().toISOString().split("T")[0],
        status: "Planned",
      };

      onChange([newPhase]);
      return;
    }

    const lastPhase = phases[phases.length - 1];

    /*
     * Each new phase must start at least one day after
     * the previous phase ends.
     */
    let newStart = addDays(
      lastPhase.expectedEndDate || baseStartDate,
      1
    );

    /*
     * If the previous phase already reaches the experiment end,
     * split the available experiment period so the new phase
     * still has a different time range.
     *
     * Example:
     * Phase 1: 04/10 -> 01/11
     * Add Phase 2:
     * Phase 1: 04/10 -> 17/10
     * Phase 2: 18/10 -> 01/11
     */
    if (
      baseEndDate &&
      newStart > baseEndDate
    ) {
      const experimentStart =
        baseStartDate ||
        phases[0].expectedStartDate;

      const previousStart =
        lastPhase.expectedStartDate ||
        experimentStart;

      const previousEnd =
        lastPhase.expectedEndDate ||
        baseEndDate;

      const startTime = new Date(
        `${previousStart}T00:00:00`
      ).getTime();

      const endTime = new Date(
        `${previousEnd}T00:00:00`
      ).getTime();

      const availableDays = Math.floor(
        (endTime - startTime) /
          (1000 * 60 * 60 * 24)
      );

      if (availableDays >= 1) {
        const splitOffset = Math.floor(
          availableDays / 2
        );

        const splitDate = addDays(
          previousStart,
          splitOffset
        );

        const newPhaseStart =
          addDays(splitDate, 1);

        const updated = phases.map(
          (phase, index) =>
            index === phases.length - 1
              ? {
                  ...phase,
                  expectedEndDate: splitDate,
                }
              : phase
        );

        const newPhase: PhaseFormItem = {
          id: `phase-temp-${Date.now()}-${Math.random()}`,
          phaseName: `Phase ${newPhaseOrder}: `,
          phaseDescription: "",
          phaseOrder: newPhaseOrder,
          expectedStartDate: newPhaseStart,
          expectedEndDate: baseEndDate,
          status: "Planned",
        };

        onChange([...updated, newPhase]);
        return;
      }

      /*
       * There is no free day left for another phase.
       * Do not create an overlapping phase.
       */
      return;
    }

    const newPhase: PhaseFormItem = {
      id: `phase-temp-${Date.now()}-${Math.random()}`,
      phaseName: `Phase ${newPhaseOrder}: `,
      phaseDescription: "",
      phaseOrder: newPhaseOrder,
      expectedStartDate: newStart,
      expectedEndDate:
        baseEndDate && newStart <= baseEndDate
          ? baseEndDate
          : newStart,
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
    const phaseIndex = phases.findIndex(
      (p) => p.id === id
    );

    if (phaseIndex === -1) return;

    const updated = phases.map((p) =>
      p.id === id ? { ...p, [field]: value } : p
    );

    if (field === "expectedStartDate") {
      let newStart = String(value);

      const previousPhase =
        phases[phaseIndex - 1];

      const nextPhase =
        phases[phaseIndex + 1];

      const minimumStart =
        previousPhase?.expectedEndDate
          ? addDays(
              previousPhase.expectedEndDate,
              1
            )
          : baseStartDate;

      const maximumStart =
        nextPhase?.expectedStartDate
          ? addDays(
              nextPhase.expectedStartDate,
              -1
            )
          : updated[phaseIndex]
                .expectedEndDate ||
            baseEndDate;

      if (
        minimumStart &&
        newStart < minimumStart
      ) {
        newStart = minimumStart;
      }

      if (
        maximumStart &&
        newStart > maximumStart
      ) {
        newStart = maximumStart;
      }

      updated[phaseIndex] = {
        ...updated[phaseIndex],
        expectedStartDate: newStart,
      };

      /*
       * Keep the current phase valid if its start date
       * is moved after its current end date.
       */
      if (
        updated[phaseIndex].expectedEndDate &&
        newStart >
          updated[phaseIndex].expectedEndDate
      ) {
        updated[phaseIndex].expectedEndDate =
          newStart;
      }
    }

    if (field === "expectedEndDate") {
      let newEnd = String(value);

      const currentPhase =
        updated[phaseIndex];

      const nextPhase =
        phases[phaseIndex + 1];

      const minimumEnd =
        currentPhase.expectedStartDate ||
        baseStartDate;

      const maximumEnd =
        nextPhase?.expectedStartDate
          ? addDays(
              nextPhase.expectedStartDate,
              -1
            )
          : baseEndDate;

      if (
        minimumEnd &&
        newEnd < minimumEnd
      ) {
        newEnd = minimumEnd;
      }

      if (
        maximumEnd &&
        newEnd > maximumEnd
      ) {
        newEnd = maximumEnd;
      }

      updated[phaseIndex] = {
        ...updated[phaseIndex],
        expectedEndDate: newEnd,
      };
    }

    onChange(
      updated.map((phase, index) => ({
        ...phase,
        phaseOrder: index + 1,
      }))
    );
  };

  const getMinimumStartDate = (
    index: number
  ): string | undefined => {
    if (index === 0) {
      return baseStartDate || undefined;
    }

    const previousPhase = phases[index - 1];

    return previousPhase.expectedEndDate
      ? addDays(
          previousPhase.expectedEndDate,
          1
        )
      : baseStartDate || undefined;
  };

  const getMaximumStartDate = (
    index: number
  ): string | undefined => {
    const nextPhase = phases[index + 1];

    if (nextPhase?.expectedStartDate) {
      return addDays(
        nextPhase.expectedStartDate,
        -1
      );
    }

    return (
      phases[index].expectedEndDate ||
      baseEndDate ||
      undefined
    );
  };

  const getMaximumEndDate = (
    index: number
  ): string | undefined => {
    const nextPhase = phases[index + 1];

    if (nextPhase?.expectedStartDate) {
      return addDays(
        nextPhase.expectedStartDate,
        -1
      );
    }

    return baseEndDate || undefined;
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
                      handleUpdatePhase(
                        phase.id,
                        "phaseName",
                        e.target.value
                      )
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
                        min={getMinimumStartDate(index)}
                        max={getMaximumStartDate(index)}
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
                        min={
                          phase.expectedStartDate ||
                          getMinimumStartDate(index)
                        }
                        max={getMaximumEndDate(index)}
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
