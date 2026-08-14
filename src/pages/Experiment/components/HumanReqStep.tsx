import React, { useEffect, useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { getRoles, type RoleItem } from "../../../services/roleService";
import { getSkills } from "../../../services/skillService";
import type { Skill } from "../../../types/skill";
import "../PlanningWizard.css";

export interface HumanReqFormItem {
  id: string;
  roleId: number;
  roleName?: string;
  quantity: number;
  requiredSkillId: number | null;
  requiredSkillName?: string;
  workingHoursPerDay: number | null;
  note: string | null;
}

interface HumanReqStepProps {
  requirements: HumanReqFormItem[];
  onChange: (requirements: HumanReqFormItem[]) => void;
}

export const HumanReqStep: React.FC<HumanReqStepProps> = ({
  requirements,
  onChange,
}) => {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [rolesData, skillsData] = await Promise.all([
          getRoles({ size: 100 }),
          getSkills({ size: 100 }),
        ]);
        setRoles(rolesData);
        setSkills(skillsData);
      } catch (err) {
        console.error("Failed to load roles or skills", err);
      }
    }
    void loadOptions();
  }, []);

  const handleAddRequirement = () => {
    const defaultRole = roles[0];
    const newReq: HumanReqFormItem = {
      id: `human-temp-${Date.now()}-${Math.random()}`,
      roleId: defaultRole ? defaultRole.roleId : 3,
      roleName: defaultRole ? defaultRole.roleName : "Researcher",
      quantity: 1,
      requiredSkillId: null,
      requiredSkillName: "",
      workingHoursPerDay: 8,
      note: "",
    };
    onChange([...requirements, newReq]);
  };

  const handleRemoveRequirement = (id: string) => {
    onChange(requirements.filter((r) => r.id !== id));
  };

  const handleUpdateRequirement = (
    id: string,
    field: keyof HumanReqFormItem,
    value: unknown
  ) => {
    const updated = requirements.map((r) => {
      if (r.id !== id) return r;
      if (field === "roleId") {
        const selectedId = Number(value);
        const roleObj = roles.find((rl) => rl.roleId === selectedId);
        return {
          ...r,
          roleId: selectedId,
          roleName: roleObj ? roleObj.roleName : r.roleName,
        };
      }
      if (field === "requiredSkillId") {
        const selectedId = value ? Number(value) : null;
        const skillObj = skills.find((sk) => sk.skillId === selectedId);
        return {
          ...r,
          requiredSkillId: selectedId,
          requiredSkillName: skillObj ? skillObj.skillName : "",
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
            <Users size={20} color="#16a34a" />
            Step 4: Human Resource Requirements
          </h2>
          <p>Define required roles, skills, personnel counts, and daily work hours.</p>
        </div>
        <button
          type="button"
          onClick={handleAddRequirement}
          className="btn-primary-green"
        >
          <Plus size={16} /> Add Personnel Need
        </button>
      </div>

      {requirements.length === 0 ? (
        <div className="planning-empty-box">
          <Users size={40} />
          <p>No personnel requirements added yet</p>
          <button
            type="button"
            onClick={handleAddRequirement}
            className="btn-primary-green"
          >
            + Add Human Requirement
          </button>
        </div>
      ) : (
        <div>
          {requirements.map((req, index) => (
            <div key={req.id} className="planning-item-row">
              <div className="planning-item-top">
                <span className="planning-item-badge">
                  Human Req #{index + 1}
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
                    Role <span className="planning-required">*</span>
                  </label>
                  <select
                    value={req.roleId}
                    onChange={(e) =>
                      handleUpdateRequirement(req.id, "roleId", e.target.value)
                    }
                    className="planning-select"
                  >
                    {roles.length > 0 ? (
                      roles.map((r) => (
                        <option key={r.roleId} value={r.roleId}>
                          {r.roleName}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value={3}>Researcher</option>
                        <option value={4}>Technician</option>
                        <option value={2}>Manager</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="planning-field-group">
                  <label>Required Skill (Optional)</label>
                  <select
                    value={req.requiredSkillId ?? ""}
                    onChange={(e) =>
                      handleUpdateRequirement(
                        req.id,
                        "requiredSkillId",
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="planning-select"
                  >
                    <option value="">-- No Specific Skill Required --</option>
                    {skills.map((s) => (
                      <option key={s.skillId} value={s.skillId}>
                        {s.skillName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="planning-field-group">
                  <label>
                    Quantity <span className="planning-required">*</span>
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
                  <label>Working Hours / Day</label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={req.workingHoursPerDay ?? 8}
                    onChange={(e) =>
                      handleUpdateRequirement(
                        req.id,
                        "workingHoursPerDay",
                        Math.min(24, Math.max(1, parseInt(e.target.value, 10) || 8))
                      )
                    }
                    className="planning-input"
                  />
                </div>

                <div className="planning-form-full planning-field-group">
                  <label>Notes</label>
                  <input
                    type="text"
                    value={req.note || ""}
                    onChange={(e) =>
                      handleUpdateRequirement(req.id, "note", e.target.value)
                    }
                    placeholder="e.g. Requires certification in soil core sampling..."
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
