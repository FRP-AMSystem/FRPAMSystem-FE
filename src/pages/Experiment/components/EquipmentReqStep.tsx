import React, { useEffect, useState } from "react";
import { Plus, Trash2, Wrench } from "lucide-react";
import { getEquipmentCategories } from "../../../services/equipmentCategoryService";
import type { EquipmentCategory } from "../../../types/equipmentCategory";
import "../PlanningWizard.css";

export interface EquipmentReqFormItem {
  id: string;
  equipmentTypeId: number;
  equipmentTypeName?: string;
  quantity: number;
  allowSubstitute: boolean;
  minAcceptableEfficiency: number;
  note?: string;
}

interface EquipmentReqStepProps {
  requirements: EquipmentReqFormItem[];
  onChange: (requirements: EquipmentReqFormItem[]) => void;
}

export const EquipmentReqStep: React.FC<EquipmentReqStepProps> = ({
  requirements,
  onChange,
}) => {
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await getEquipmentCategories({ size: 100 });
        setCategories(data);
      } catch (err) {
        console.error("Failed to load equipment categories", err);
      }
    }
    void loadCategories();
  }, []);

  const handleAddRequirement = () => {
    const defaultCategory = categories[0];
    const newReq: EquipmentReqFormItem = {
      id: `equip-temp-${Date.now()}-${Math.random()}`,
      equipmentTypeId: defaultCategory ? defaultCategory.equipmentCategoryId : 1,
      equipmentTypeName: defaultCategory ? defaultCategory.equipmentCategoryName : "",
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
        const cat = categories.find((c) => c.equipmentCategoryId === selectedId);
        return {
          ...r,
          equipmentTypeId: selectedId,
          equipmentTypeName: cat ? cat.equipmentCategoryName : r.equipmentTypeName,
        };
      }
      return { ...r, [field]: value };
    });
    onChange(updated);
  };

  return (
    <div className="planning-card">
      <div className="planning-card-header">
        <div>
          <h2>
            <Wrench size={20} color="#16a34a" />
            Step 3: Equipment Requirements
          </h2>
          <p>Specify required equipment categories, quantities, and efficiency standards.</p>
        </div>
        <button
          type="button"
          onClick={handleAddRequirement}
          className="btn-primary-green"
        >
          <Plus size={16} /> Add Equipment Need
        </button>
      </div>

      {requirements.length === 0 ? (
        <div className="planning-empty-box">
          <Wrench size={40} />
          <p>No equipment requirements added yet</p>
          <button
            type="button"
            onClick={handleAddRequirement}
            className="btn-primary-green"
          >
            + Add Equipment Requirement
          </button>
        </div>
      ) : (
        <div>
          {requirements.map((req, index) => (
            <div key={req.id} className="planning-item-row">
              <div className="planning-item-top">
                <span className="planning-item-badge">
                  Equipment Req #{index + 1}
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
                    Equipment Category / Type <span className="planning-required">*</span>
                  </label>
                  <select
                    value={req.equipmentTypeId}
                    onChange={(e) =>
                      handleUpdateRequirement(req.id, "equipmentTypeId", e.target.value)
                    }
                    className="planning-select"
                  >
                    {categories.length > 0 ? (
                      categories.map((c) => (
                        <option key={c.equipmentCategoryId} value={c.equipmentCategoryId}>
                          {c.equipmentCategoryName}
                        </option>
                      ))
                    ) : (
                      <option value={req.equipmentTypeId}>
                        {req.equipmentTypeName || `Category #${req.equipmentTypeId}`}
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
