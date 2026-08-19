import React, { useEffect, useState } from "react";
import { Plus, Trash2, Wrench, Layers } from "lucide-react";
import { getEquipmentTypes } from "../../../services/equipmentService";
import type { EquipmentType } from "../../../types/equipment";
import type { PhaseFormItem } from "./PhasesStep";
import "../PlanningWizard.css";

export interface EquipmentReqFormItem {
  id: string;
  phaseId?: string | number | null;
  phaseName?: string;
  equipmentTypeId: number;
  equipmentTypeName?: string;
  quantity: number;
  allowSubstitute: boolean;
  minAcceptableEfficiency: number;
  note?: string;
}

interface EquipmentReqStepProps {
  phases?: PhaseFormItem[];
  requirements: EquipmentReqFormItem[];
  onChange: (requirements: EquipmentReqFormItem[]) => void;
}

function formatPhaseLabel(phase?: PhaseFormItem, fallbackIndex: number = 1): string {
  if (!phase) return `Phase ${fallbackIndex}`;
  const name = (phase.phaseName || "").trim();
  if (!name) return `Phase ${phase.phaseOrder || fallbackIndex}`;
  if (/^phase\s*\d+/i.test(name)) return name;
  return `Phase ${phase.phaseOrder || fallbackIndex}: ${name}`;
}

export const EquipmentReqStep: React.FC<EquipmentReqStepProps> = ({
  phases = [],
  requirements,
  onChange,
}) => {
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [activePhaseId, setActivePhaseId] = useState<string>(() =>
    phases[0] ? String(phases[0].id) : ""
  );

  useEffect(() => {
    async function loadEquipmentTypes() {
      try {
        const data = await getEquipmentTypes({ size: 100 });
        setEquipmentTypes(data || []);
      } catch (err) {
        console.error("Failed to load equipment types", err);
      }
    }
    void loadEquipmentTypes();
  }, []);

  // Ensure activePhaseId is valid and defaults to first phase
  useEffect(() => {
    if (phases.length > 0) {
      const exists = phases.some((p) => String(p.id) === String(activePhaseId));
      if (!exists) {
        setActivePhaseId(String(phases[0].id));
      }
    }
  }, [phases, activePhaseId]);

  const currentPhase =
    phases.find((p) => String(p.id) === String(activePhaseId)) || phases[0];
  const currentPhaseIdStr = currentPhase ? String(currentPhase.id) : "";

  const handleAddRequirement = () => {
    const defaultType = equipmentTypes[0];
    const targetPhase = currentPhase || phases[0];

    const newReq: EquipmentReqFormItem = {
      id: `equip-temp-${Date.now()}-${Math.random()}`,
      phaseId: targetPhase ? targetPhase.id : null,
      phaseName: targetPhase ? targetPhase.phaseName : "",
      equipmentTypeId: defaultType ? defaultType.equipmentTypeId : 1,
      equipmentTypeName: defaultType ? (defaultType.equipmentTypeName || defaultType.typeName || defaultType.name || "") : "",
      quantity: 1,
      allowSubstitute: true,
      minAcceptableEfficiency: 80,
      note: "",
    };
    onChange([...requirements, newReq]);
  };

  const handleRemoveRequirement = (id: string) => {
    onChange(requirements.filter((r) => r.id !== id));
  };

  const handleUpdateRequirement = (
    id: string,
    field: keyof EquipmentReqFormItem,
    value: unknown
  ) => {
    const updated = requirements.map((r) => {
      if (r.id !== id) return r;
      if (field === "equipmentTypeId") {
        const selectedId = Number(value);
        const eqType = equipmentTypes.find((t) => t.equipmentTypeId === selectedId);
        return {
          ...r,
          equipmentTypeId: selectedId,
          equipmentTypeName: eqType ? (eqType.equipmentTypeName || eqType.typeName || eqType.name || "") : (r.equipmentTypeName || ""),
        };
      }
      return { ...r, [field]: value };
    });
    onChange(updated);
  };

  // Filter strictly by the current selected phase
  const filteredRequirements = requirements.filter(
    (r) =>
      String(r.phaseId || "") === currentPhaseIdStr ||
      (!r.phaseId && currentPhaseIdStr === String(phases[0]?.id))
  );

  return (
    <div className="planning-card">
      <div className="planning-card-header">
        <div>
          <h2>
            <Wrench size={20} color="#16a34a" />
            Step 3: Equipment Requirements (By Phase)
          </h2>
          <p>
            Configure required equipment and machinery for each experiment phase.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddRequirement}
          className="btn-primary-green"
        >
          <Plus size={16} /> Add Equipment Need
        </button>
      </div>

      {/* Phase Selection Tabs */}
      {phases.length > 0 ? (
        <div className="planning-phases-overview">
          <div className="planning-phases-overview-title">
            <Layers size={16} color="#16a34a" />
            Active Phase:
          </div>
          <div className="planning-phase-chips-row">
            {phases.map((p, idx) => {
              const count = requirements.filter(
                (r) =>
                  String(r.phaseId || "") === String(p.id) ||
                  (!r.phaseId && idx === 0) ||
                  r.phaseName === p.phaseName
              ).length;
              const isActive = String(activePhaseId) === String(p.id);
              const label = formatPhaseLabel(p, idx + 1);

              return (
                <button
                  key={p.id || idx}
                  type="button"
                  className={`planning-phase-chip ${isActive ? "active" : ""}`}
                  onClick={() => setActivePhaseId(String(p.id))}
                >
                  <span>{label}</span>
                  <span className="chip-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="planning-alert-error" style={{ marginBottom: "16px" }}>
          No phases were configured in Step 2. Please go back to Step 2 to add phases first.
        </div>
      )}

      {filteredRequirements.length === 0 ? (
        <div className="planning-empty-box">
          <Wrench size={40} />
          <p>
            No equipment requirements added for {formatPhaseLabel(currentPhase)} yet.
          </p>
          <button
            type="button"
            onClick={handleAddRequirement}
            className="btn-primary-green"
          >
            + Add Equipment to {formatPhaseLabel(currentPhase)}
          </button>
        </div>
      ) : (
        <div>
          {filteredRequirements.map((req, index) => (
            <div key={req.id} className="planning-item-row">
              <div className="planning-item-top">
                <span className="planning-item-badge">
                  [{formatPhaseLabel(currentPhase)}] Equipment Req #{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveRequirement(req.id)}
                  className="planning-remove-btn"
                  title="Remove requirement"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="planning-form-grid">
                {/* Read-Only Assigned Phase */}
                <div className="planning-field-group">
                  <label>Assigned Phase</label>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={formatPhaseLabel(currentPhase)}
                    className="planning-input"
                    style={{
                      background: "#f1f5f9",
                      cursor: "not-allowed",
                      fontWeight: 600,
                      color: "#334155",
                    }}
                  />
                </div>

                <div className="planning-field-group">
                  <label>
                    Equipment Type <span className="planning-required">*</span>
                  </label>
                  <select
                    value={req.equipmentTypeId}
                    onChange={(e) =>
                      handleUpdateRequirement(req.id, "equipmentTypeId", e.target.value)
                    }
                    className="planning-select"
                  >
                    {equipmentTypes.length > 0 ? (
                      equipmentTypes.map((t) => (
                        <option key={t.equipmentTypeId} value={t.equipmentTypeId}>
                          {t.name} ({t.equipmentCategoryName || "Equipment"})
                        </option>
                      ))
                    ) : (
                      <option value={req.equipmentTypeId}>
                        {req.equipmentTypeName || `Type #${req.equipmentTypeId}`}
                      </option>
                    )}
                  </select>
                </div>

                <div className="planning-field-group">
                  <label>
                    Quantity Required <span className="planning-required">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={req.quantity}
                    onChange={(e) =>
                      handleUpdateRequirement(
                        req.id,
                        "quantity",
                        Math.max(1, parseInt(e.target.value, 10) || 1)
                      )
                    }
                    className="planning-input"
                  />
                </div>

                <div className="planning-field-group">
                  <label>Min Efficiency (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={req.minAcceptableEfficiency}
                    onChange={(e) =>
                      handleUpdateRequirement(
                        req.id,
                        "minAcceptableEfficiency",
                        Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0))
                      )
                    }
                    className="planning-input"
                  />
                </div>

                <div className="planning-field-group" style={{ justifyContent: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={req.allowSubstitute}
                      onChange={(e) =>
                        handleUpdateRequirement(
                          req.id,
                          "allowSubstitute",
                          e.target.checked
                        )
                      }
                      style={{ width: "18px", height: "18px", accentColor: "#16a34a" }}
                    />
                    Allow Substitution if unavailable
                  </label>
                </div>

                <div className="planning-form-full planning-field-group">
                  <label>Notes & Special Requirements</label>
                  <input
                    type="text"
                    value={req.note || ""}
                    onChange={(e) =>
                      handleUpdateRequirement(req.id, "note", e.target.value)
                    }
                    placeholder="e.g. Must include digital GPS logger attachment..."
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
