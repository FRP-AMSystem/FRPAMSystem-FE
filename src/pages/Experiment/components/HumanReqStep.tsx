import React, { useEffect, useState } from "react";
import { Plus, Trash2, Users, Layers } from "lucide-react";
import { getRoles, type RoleItem } from "../../../services/roleService";
import { getSkills } from "../../../services/skillService";
import type { Skill } from "../../../types/skill";
import type { PhaseFormItem } from "./PhasesStep";
import "../PlanningWizard.css";

export interface HumanReqFormItem {
  id: string;
  phaseId?: string | number | null;
  phaseName?: string;
  roleId: number;
  roleName?: string;
  quantity: number;
  requiredSkillId: number | null;
  requiredSkillName?: string;
  workingHoursPerDay: number | null;
  note: string | null;
}

interface HumanReqStepProps {
  phases?: PhaseFormItem[];
  requirements: HumanReqFormItem[];
  onChange: (requirements: HumanReqFormItem[]) => void;
}

// Only Seasonal and Technician roles are permitted
export function isAllowedRole(roleName?: string): boolean {
  if (!roleName) return false;
  const normalized = roleName.trim().toLowerCase();
  if (
    normalized.includes("admin") ||
    normalized.includes("manager") ||
    normalized.includes("researcher")
  ) {
    return false;
  }
  return (
    normalized === "seasonal" ||
    normalized.includes("seasonal") ||
    normalized === "student" ||
    normalized.includes("student") ||
    normalized === "technician" ||
    normalized.includes("technician")
  );
}

function formatPhaseLabel(phase?: PhaseFormItem, fallbackIndex: number = 1): string {
  if (!phase) return `Phase ${fallbackIndex}`;
  const name = (phase.phaseName || "").trim();
  if (!name) return `Phase ${phase.phaseOrder || fallbackIndex}`;
  if (/^phase\s*\d+/i.test(name)) return name;
  return `Phase ${phase.phaseOrder || fallbackIndex}: ${name}`;
}

export const HumanReqStep: React.FC<HumanReqStepProps> = ({
  phases = [],
  requirements,
  onChange,
}) => {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [activePhaseId, setActivePhaseId] = useState<string>(() =>
    phases[0] ? String(phases[0].id) : ""
  );

  useEffect(() => {
    async function loadOptions() {
      try {
        const [rolesData, skillsData] = await Promise.all([
          getRoles({ size: 100 }),
          getSkills({ size: 100 }),
        ]);

        const allowedRoles = (rolesData || []).filter((r) =>
          isAllowedRole(r.roleName)
        );

        if (allowedRoles.length === 0) {
          const tech = (rolesData || []).find((r) =>
            r.roleName.toLowerCase().includes("tech")
          );
          const fallbackList: RoleItem[] = [];
          if (tech) {
            fallbackList.push(tech);
          } else {
            fallbackList.push({
              roleId: 4,
              roleName: "Technician",
              id: "4",
              name: "Technician",
            });
          }
          fallbackList.push({
            roleId: 5,
            roleName: "Seasonal",
            id: "5",
            name: "Seasonal",
          });
          setRoles(fallbackList);
        } else {
          setRoles(allowedRoles);
        }

        setSkills(skillsData);
      } catch (err) {
        console.error("Failed to load roles or skills", err);
        setRoles([
          {
            roleId: 4,
            roleName: "Technician",
            id: "4",
            name: "Technician",
          },
          {
            roleId: 5,
            roleName: "Seasonal",
            id: "5",
            name: "Seasonal",
          },
        ]);
      }
    }
    void loadOptions();
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
    const defaultRole = roles[0] || { roleId: 4, roleName: "Technician" };
    const targetPhase = currentPhase || phases[0];

    const newReq: HumanReqFormItem = {
      id: `human-temp-${Date.now()}-${Math.random()}`,
      phaseId: targetPhase ? targetPhase.id : null,
      phaseName: targetPhase ? targetPhase.phaseName : "",
      roleId: defaultRole.roleId,
      roleName: defaultRole.roleName,
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
            <Users size={20} color="#16a34a" />
            Step 4: Human Resource Requirements (By Phase)
          </h2>
          <p>
            Specify required personnel roles (Seasonal & Technician only), labor quantities, and skills for each phase.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddRequirement}
          className="btn-primary-green"
        >
          <Plus size={16} /> Add Personnel Need
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
          <Users size={40} />
          <p>
            No personnel requirements added for {formatPhaseLabel(currentPhase)} yet.
          </p>
          <button
            type="button"
            onClick={handleAddRequirement}
            className="btn-primary-green"
          >
            + Add Personnel to {formatPhaseLabel(currentPhase)}
          </button>
        </div>
      ) : (
        <div>
          {filteredRequirements.map((req, index) => (
            <div key={req.id} className="planning-item-row">
              <div className="planning-item-top">
                <span className="planning-item-badge">
                  [{formatPhaseLabel(currentPhase)}] Personnel Req #{index + 1}
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
                    Role <span className="planning-required">* (Seasonal / Technician)</span>
                  </label>
                  <select
                    value={req.roleId}
                    onChange={(e) =>
                      handleUpdateRequirement(req.id, "roleId", e.target.value)
                    }
                    className="planning-select"
                  >
                    {roles.map((r) => (
                      <option key={r.roleId} value={r.roleId}>
                        {r.roleName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="planning-field-group">
                  <label>
                    Number of People <span className="planning-required">*</span>
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
                  <label>Required Skill (Optional)</label>
                  <select
                    value={req.requiredSkillId ?? ""}
                    onChange={(e) =>
                      handleUpdateRequirement(
                        req.id,
                        "requiredSkillId",
                        e.target.value
                      )
                    }
                    className="planning-select"
                  >
                    <option value="">-- Any / No specific skill --</option>
                    {skills.map((s) => (
                      <option key={s.skillId} value={s.skillId}>
                        {s.skillName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="planning-field-group">
                  <label>Working Hours/Day</label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={req.workingHoursPerDay || 8}
                    onChange={(e) =>
                      handleUpdateRequirement(
                        req.id,
                        "workingHoursPerDay",
                        Math.min(24, Math.max(1, parseFloat(e.target.value) || 8))
                      )
                    }
                    className="planning-input"
                  />
                </div>

                <div className="planning-form-full planning-field-group">
                  <label>Role Notes & Instructions</label>
                  <input
                    type="text"
                    value={req.note || ""}
                    onChange={(e) =>
                      handleUpdateRequirement(req.id, "note", e.target.value)
                    }
                    placeholder="e.g. Field sampling experience needed for soil testing..."
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
