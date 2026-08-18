import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import { createExperiment, getExperiments } from "../../services/experimentService";
import { createExperimentPhase } from "../../services/experimentPhaseService";
import { createExperimentEquipmentRequirement } from "../../services/experimentEquipmentRequirementService";
import { createExperimentHumanRequirement } from "../../services/experimentHumanRequirementService";
import { createExperimentLandRequirement } from "../../services/experimentLandRequirementService";
import { useNotification } from "../../context/NotificationContext";

import { PlanningStepper } from "./components/PlanningStepper";
import { ExperimentStep, type ExperimentStepData } from "./components/ExperimentStep";
import { PhasesStep, type PhaseFormItem } from "./components/PhasesStep";
import { EquipmentReqStep, type EquipmentReqFormItem } from "./components/EquipmentReqStep";
import { HumanReqStep, type HumanReqFormItem, isAllowedRole } from "./components/HumanReqStep";
import { LandReqStep, type LandReqFormItem } from "./components/LandReqStep";
import { getHumanResourceProfiles } from "../../services/humanResourceProfileService";
import type { ExperimentResponse } from "../../types/experiment";
import "./PlanningWizard.css";

function convertDateToIso(dateStr?: string | null): string {
  if (!dateStr) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}T00:00:00`;
  }
  const clean = dateStr.slice(0, 10);
  return `${clean}T00:00:00`;
}

function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return "Create experiment failed.";
  }

  const responseData = error.response?.data;

  if (typeof responseData === "string" && responseData.trim()) {
    return responseData;
  }

  if (responseData?.errors) {
    const messages = Object.entries(responseData.errors)
      .flatMap(([field, value]) => {
        const fieldErrors = Array.isArray(value) ? value : [String(value)];
        return fieldErrors.map((message) => `${field}: ${String(message)}`);
      })
      .join(" ");

    if (messages) return messages;
  }

  return (
    responseData?.message ||
    responseData?.error ||
    responseData?.title ||
    responseData?.detail ||
    `Create experiment failed${
      error.response?.status ? ` (${error.response.status})` : ""
    }.`
  );
}

export default function CreateExperiment() {
  const navigate = useNavigate();
  const { sendLocalNotification, fetchUnreadCount } = useNotification();

  // Wizard Step state (1 to 5)
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 State
  const [expData, setExpData] = useState<ExperimentStepData>({
    experimentName: "",
    description: "",
    expectStartDate: "",
    expectEndDate: "",
    deadline: "",
    priority: "1",
  });

  // Step 2 State
  const [phases, setPhases] = useState<PhaseFormItem[]>([]);

  // Step 3 State
  const [equipmentReqs, setEquipmentReqs] = useState<EquipmentReqFormItem[]>([]);

  // Step 4 State
  const [humanReqs, setHumanReqs] = useState<HumanReqFormItem[]>([]);

  // Step 5 State
  const [landReqs, setLandReqs] = useState<LandReqFormItem[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleNextStep = () => {
    setError("");

    if (currentStep === 1) {
      if (!expData.experimentName.trim()) {
        setError("Experiment name is required.");
        return;
      }
      if (expData.expectStartDate && expData.expectEndDate && expData.expectStartDate > expData.expectEndDate) {
        setError("Expected end date must be after expected start date.");
        return;
      }
      if (expData.deadline && expData.expectStartDate && expData.deadline < expData.expectStartDate) {
        setError("Deadline cannot be earlier than start date.");
        return;
      }
    }

    if (currentStep === 4) {
      // Validate all human requirements are ONLY Seasonal or Technician
      for (const hr of humanReqs) {
        if (hr.roleName && !isAllowedRole(hr.roleName)) {
          setError(`Invalid role "${hr.roleName}". Only Seasonal and Technician roles are allowed.`);
          return;
        }
      }
    }

    if (currentStep === 5) {
      if (landReqs.length > 1) {
        setError("An experiment can have at most one Land Resource requirement.");
        return;
      }
    }

    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setError("");
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  /**
   * Helper to find a valid Researcher ID from localStorage or profiles
   */
  const resolveResearcherId = (): number => {
    const rawUserId =
      localStorage.getItem("userId") ||
      localStorage.getItem("researcherId") ||
      localStorage.getItem("id");

    const parsed = Number(rawUserId);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  };

  /**
   * Create Plan = Create Persistent Draft
   */
  const handleCreatePlan = async () => {
    setError("");

    const trimmedName = expData.experimentName.trim();
    if (!trimmedName) {
      setError("Experiment name is required.");
      setCurrentStep(1);
      return;
    }

    // Validate Land: max 1
    if (landReqs.length > 1) {
      setError("An experiment can have at most one Land Resource requirement.");
      return;
    }

    // Validate Human: only Seasonal & Technician
    for (const hr of humanReqs) {
      if (hr.roleName && !isAllowedRole(hr.roleName)) {
        setError(`Invalid role "${hr.roleName}". Only Seasonal and Technician roles are allowed.`);
        return;
      }
    }

    setSaving(true);

    try {
      // Duplicate Name Check Upfront
      try {
        const existingList = await getExperiments({ keyword: trimmedName, size: 20 });
        const isDuplicate = (existingList || []).some(
          (e) => e.experimentName.trim().toLowerCase() === trimmedName.toLowerCase()
        );
        if (isDuplicate) {
          setError(`An experiment plan named "${trimmedName}" already exists in the system. Please choose a different name.`);
          setCurrentStep(1);
          setSaving(false);
          return;
        }
      } catch (checkErr) {
        console.warn("Could not check duplicate experiment name:", checkErr);
      }

      const storedUserId =
        Number(localStorage.getItem("userId")) ||
        Number(localStorage.getItem("researcherId")) ||
        1;

      // 1. Create main Experiment with status = Draft
      const createdExp = await createExperiment({
        experimentName: trimmedName,
        description: expData.description.trim() || undefined,
        researcherId: storedUserId,
        expectStartDate: convertDateToIso(expData.expectStartDate),
        expectEndDate: convertDateToIso(expData.expectEndDate),
        deadline: convertDateToIso(expData.deadline),
        priority: Number(expData.priority) || 1,
        status: "Draft",
      });

      if (!createdExp || !createdExp.experimentId) {
        throw new Error("Experiment creation returned an empty response.");
      }

      const expId = createdExp.experimentId;

      // 2. Create attached Phases
      const orderedPhases = phases.map((p, idx) => ({
        ...p,
        phaseOrder: idx + 1,
      }));

      for (const p of orderedPhases) {
        if (p.phaseName.trim()) {
          try {
            await createExperimentPhase({
              experimentId: expId,
              phaseName: p.phaseName.trim(),
              phaseDescription: p.phaseDescription.trim() || null,
              phaseOrder: p.phaseOrder,
              expectedStartDate: convertDateToIso(p.expectedStartDate),
              expectedEndDate: convertDateToIso(p.expectedEndDate),
              status: "Planned",
            });
          } catch (phaseErr) {
            console.warn("Attached phase creation notice:", phaseErr);
          }
        }
      }

      // 3. Create attached Equipment Requirements (associated per Phase)
      for (const e of equipmentReqs) {
        try {
          const matchedPhase = phases.find((p) => String(p.id) === String(e.phaseId)) || (phases.length === 1 ? phases[0] : null);
          const pName = matchedPhase?.phaseName || e.phaseName || "";
          const phasePrefix = pName ? `[${pName}] ` : "";
          const cleanNote = (e.note || "").replace(/^\[.*?\]\s*/, "");
          const finalNote = cleanNote
            ? `${phasePrefix}${cleanNote}`.trim()
            : phasePrefix
            ? phasePrefix.trim()
            : undefined;

          await createExperimentEquipmentRequirement({
            experimentId: expId,
            equipmentTypeId: e.equipmentTypeId,
            quantity: e.quantity,
            allowSubstitute: e.allowSubstitute,
            minAcceptableEfficiency: e.minAcceptableEfficiency,
            note: finalNote,
          });
        } catch (equipErr) {
          console.warn("Attached equipment requirement creation notice:", equipErr);
        }
      }

      // 4. Create attached Human Requirements (strictly Seasonal/Technician, associated per Phase)
      for (const h of humanReqs) {
        try {
          const matchedPhase = phases.find((p) => String(p.id) === String(h.phaseId)) || (phases.length === 1 ? phases[0] : null);
          const pName = matchedPhase?.phaseName || h.phaseName || "";
          const phasePrefix = pName ? `[${pName}] ` : "";
          const cleanNote = (h.note || "").replace(/^\[.*?\]\s*/, "");
          const finalNote = cleanNote
            ? `${phasePrefix}${cleanNote}`.trim()
            : phasePrefix
            ? phasePrefix.trim()
            : null;

          await createExperimentHumanRequirement({
            experimentId: expId,
            roleId: h.roleId,
            quantity: h.quantity,
            requiredSkillId: h.requiredSkillId ?? null,
            workingHoursPerDay: h.workingHoursPerDay ?? null,
            note: finalNote,
          });
        } catch (humanErr) {
          console.warn("Attached human requirement creation notice:", humanErr);
        }
      }

      // 5. Create attached Land Requirement (Max 1 at experiment level)
      if (landReqs.length > 0) {
        const l = landReqs[0];
        try {
          await createExperimentLandRequirement({
            experimentId: expId,
            requiredArea: l.requiredArea,
            requiredSoilType: l.requiredSoilType || "",
            note: l.note || null,
          });
        } catch (landErr) {
          console.warn("Attached land requirement creation notice:", landErr);
        }
      }

      // Trigger Topbar Bell Notification and Toast
      sendLocalNotification({
        title: "Experiment Plan Created Successfully",
        message: `Experiment plan "${createdExp.experimentName}" has been created successfully as Draft.`,
        notificationType: "Success",
        referenceType: "Experiment",
        referenceId: expId,
      });
      void fetchUnreadCount();

      // Redirect to My Experiments list
      navigate("/experiments", {
        state: {
          message: `Experiment "${createdExp.experimentName}" created successfully as Draft!`,
        },
      });
    } catch (createErr: any) {
      console.error("Create Plan (Draft) failed:", createErr);
      if (createErr?.response?.data) {
        console.error("Backend Error Detail:", createErr.response.data);
      }
      const apiMsg = getApiErrorMessage(createErr);
      if (apiMsg.includes("500") || apiMsg.toLowerCase().includes("internal server error")) {
        setError(`Failed to create experiment plan. The name "${trimmedName}" might be duplicated or the data is invalid. Please check the name.`);
      } else {
        setError(apiMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="planning-wizard-page">
        {/* Header */}
        <div className="planning-wizard-header">
          <div>
            <p className="breadcrumb">Dashboard / Experiments / Create Plan</p>
            <h1>New Experiment Plan</h1>
            <p>Unified step-by-step experiment planning wizard</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span className="planning-draft-badge">Target Status: Draft</span>
            <button
              type="button"
              onClick={() => navigate("/experiments")}
              className="planning-back-btn"
            >
              <ArrowLeft size={16} /> Back to Experiments
            </button>
          </div>
        </div>

        {/* Stepper Header */}
        <PlanningStepper
          currentStep={currentStep}
          onStepClick={(step) => setCurrentStep(step)}
        />

        {/* Error Alert */}
        {error && <div className="planning-alert-error">{error}</div>}

        {/* Wizard Steps */}
        {currentStep === 1 && (
          <ExperimentStep
            data={expData}
            onChange={(updated) =>
              setExpData((prev) => ({ ...prev, ...updated }))
            }
          />
        )}

        {currentStep === 2 && (
          <PhasesStep
            phases={phases}
            onChange={setPhases}
            baseStartDate={expData.expectStartDate}
            baseEndDate={expData.expectEndDate}
          />
        )}

        {currentStep === 3 && (
          <EquipmentReqStep
            phases={phases}
            requirements={equipmentReqs}
            onChange={setEquipmentReqs}
          />
        )}

        {currentStep === 4 && (
          <HumanReqStep
            phases={phases}
            requirements={humanReqs}
            onChange={setHumanReqs}
          />
        )}

        {currentStep === 5 && (
          <LandReqStep
            requirements={landReqs}
            onChange={setLandReqs}
          />
        )}

        {/* Wizard Navigation Actions */}
        <div className="planning-actions-bar">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStep === 1 || saving}
            className="btn-secondary-white"
          >
            <ArrowLeft size={16} /> Back
          </button>

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="btn-primary-green"
            >
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleCreatePlan()}
              disabled={saving}
              className="btn-primary-green"
              style={{ padding: "12px 28px", fontSize: "15px" }}
            >
              {saving ? (
                <>Saving Draft...</>
              ) : (
                <>
                  <Save size={18} /> Create Plan (Save Draft)
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}