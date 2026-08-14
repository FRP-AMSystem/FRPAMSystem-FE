import React from "react";
import { Plus, Trash2, MapPin } from "lucide-react";
import "../PlanningWizard.css";

export interface LandReqFormItem {
  id: string;
  requiredArea: number;
  requiredSoilType?: string | null;
  note?: string | null;
}

interface LandReqStepProps {
  requirements: LandReqFormItem[];
  onChange: (requirements: LandReqFormItem[]) => void;
}

const COMMON_SOIL_TYPES = [
  "Sandy Loam",
  "Clay Loam",
  "Acrisol (Ferreous Soil)",
  "Ferralsol (Red Basalt Soil)",
  "Podzol (Forest Sandy Soil)",
  "Peat Soil",
  "Alluvial Soil",
];

export const LandReqStep: React.FC<LandReqStepProps> = ({
  requirements,
  onChange,
}) => {
  const handleAddRequirement = () => {
    const newReq: LandReqFormItem = {
      id: `land-temp-${Date.now()}-${Math.random()}`,
      requiredArea: 100,
      requiredSoilType: COMMON_SOIL_TYPES[0],
      note: "",
    };
    onChange([...requirements, newReq]);
  };

  const handleRemoveRequirement = (id: string) => {
    onChange(requirements.filter((r) => r.id !== id));
  };

  const handleUpdateRequirement = (
    id: string,
    field: keyof LandReqFormItem,
    value: unknown
  ) => {
    const updated = requirements.map((r) =>
      r.id === id ? { ...r, [field]: value } : r
    );
    onChange(updated);
  };

  return (
    <div className="planning-card">
      <div className="planning-card-header">
        <div>
          <h2>
            <MapPin size={20} color="#16a34a" />
            Step 5: Land & Soil Requirements
          </h2>
          <p>Specify plot surface area (m²), soil type, and spatial site constraints.</p>
        </div>
        <button
          type="button"
          onClick={handleAddRequirement}
          className="btn-primary-green"
        >
          <Plus size={16} /> Add Land Need
        </button>
      </div>

      {requirements.length === 0 ? (
        <div className="planning-empty-box">
          <MapPin size={40} />
          <p>No land requirements added yet</p>
          <button
            type="button"
            onClick={handleAddRequirement}
            className="btn-primary-green"
          >
            + Add Land Requirement
          </button>
        </div>
      ) : (
        <div>
          {requirements.map((req, index) => (
            <div key={req.id} className="planning-item-row">
              <div className="planning-item-top">
                <span className="planning-item-badge">
                  Land Plot Req #{index + 1}
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
                <div className="planning-field-group">
                  <label>
                    Required Area (m²) <span className="planning-required">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={req.requiredArea}
                    onChange={(e) =>
                      handleUpdateRequirement(
                        req.id,
                        "requiredArea",
                        Math.max(1, parseFloat(e.target.value) || 1)
                      )
                    }
                    placeholder="e.g. 500"
                    className="planning-input"
                  />
                </div>

                <div className="planning-field-group">
                  <label>Required Soil Type</label>
                  <input
                    type="text"
                    list="soil-type-options"
                    value={req.requiredSoilType || ""}
                    onChange={(e) =>
                      handleUpdateRequirement(req.id, "requiredSoilType", e.target.value)
                    }
                    placeholder="e.g. Ferralsol (Red Basalt)"
                    className="planning-input"
                  />
                  <datalist id="soil-type-options">
                    {COMMON_SOIL_TYPES.map((st) => (
                      <option key={st} value={st} />
                    ))}
                  </datalist>
                </div>

                <div className="planning-form-full planning-field-group">
                  <label>Site Requirements / Notes</label>
                  <input
                    type="text"
                    value={req.note || ""}
                    onChange={(e) =>
                      handleUpdateRequirement(req.id, "note", e.target.value)
                    }
                    placeholder="e.g. Must be within Compartment 4B, slope < 15 degrees..."
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
