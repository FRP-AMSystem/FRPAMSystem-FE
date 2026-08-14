import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import { createExperiment } from "../../services/experimentService";
import { createExperimentPhase } from "../../services/experimentPhaseService";
import { createExperimentEquipmentRequirement } from "../../services/experimentEquipmentRequirementService";
import { createExperimentHumanRequirement } from "../../services/experimentHumanRequirementService";
import { createExperimentLandRequirement } from "../../services/experimentLandRequirementService";

import { PlanningStepper } from "./components/PlanningStepper";
import { ExperimentStep, type ExperimentStepData } from "./components/ExperimentStep";
import { PhasesStep, type PhaseFormItem } from "./components/PhasesStep";
import { EquipmentReqStep, type EquipmentReqFormItem } from "./components/EquipmentReqStep";
import { HumanReqStep, type HumanReqFormItem } from "./components/HumanReqStep";
import { LandReqStep, type LandReqFormItem } from "./components/LandReqStep";
import { getHumanResourceProfiles } from "../../services/humanResourceProfileService";
import "./PlanningWizard.css";

function formatToUtcIso(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  if (dateStr.includes("T")) return dateStr;
  return `${dateStr}T00:00:00.000Z`;
}

function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return "Create experiment failed.";
  }

  const responseData = error.response?.data;

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
    responseData?.title ||
    `Create experiment failed${
      error.response?.status ? ` (${error.response.status})` : ""
    }.`
  );
}

export default function CreateExperiment() {
  const navigate = useNavigate();

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
      if (!expData.expectStartDate) {
        setError("Expected start date is required.");
        return;
      }
      if (!expData.expectEndDate) {
        setError("Expected end date is required.");
        return;
      }
      if (!expData.deadline) {
        setError("Deadline is required.");
        return;
      }
      if (expData.expectStartDate > expData.expectEndDate) {
        setError("Expected end date must be after expected start date.");
        return;
      }
      if (expData.deadline < expData.expectEndDate) {
        setError("Deadline must be on or after expected end date.");
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
   * Helper to find a valid Researcher ID from Backend profiles or localStorage
   */
  const resolveResearcherId = async (): Promise<number> => {
    const localUserId = Number(
      localStorage.getItem("userId") ||
        localStorage.getItem("researcherId") ||
        localStorage.getItem("id")
    );

    try {
      const profiles = await getHumanResourceProfiles({ size: 100 });
      if (profiles && profiles.length > 0) {
        // Try to match logged-in user profile
        const matched = profiles.find(
          (p) => p.userId === localUserId || p.humanResourceProfileId === localUserId
        );
        if (matched) {
          return matched.humanResourceProfileId || matched.userId || localUserId || 1;
        }
        // Fallback to first available researcher profile
        return profiles[0].humanResourceProfileId || profiles[0].userId || 1;
      }
    } catch (e) {
      console.warn("Could not fetch human resource profiles, using local userId:", e);
    }

    return localUserId && localUserId > 0 ? localUserId : 1;
  };

  /**
   * Create Plan = Create Persistent Draft
   */
  const handleCreatePlan = async () => {
    setError("");
    setSaving(true);

    try {
      const researcherId = await resolveResearcherId();

      // 1. Create main Experiment with status = Draft
      const createdExp = await createExperiment({
        experimentName: expData.experimentName.trim(),
        description: expData.description.trim() || undefined,
        researcherId,
        expectStartDate: formatToUtcIso(expData.expectStartDate),
        expectEndDate: formatToUtcIso(expData.expectEndDate),
        deadline: formatToUtcIso(expData.deadline),
        priority: Number(expData.priority) || 1,
        status: "Draft",
      });

      const expId = createdExp.experimentId;

      // 2. Create attached Phases
      for (const p of phases) {
        if (p.phaseName.trim()) {
          try {
            await createExperimentPhase({
              experimentId: expId,
              phaseName: p.phaseName.trim(),
              phaseDescription: p.phaseDescription.trim() || null,
              phaseOrder: p.phaseOrder,
              expectedStartDate: formatToUtcIso(p.expectedStartDate),
              expectedEndDate: formatToUtcIso(p.expectedEndDate),
              status: "Planned",
            });
          } catch (phaseErr) {
            console.warn("Attached phase creation notice:", phaseErr);
          }
        }
      }

      // 3. Create attached Equipment Requirements
      for (const e of equipmentReqs) {
        try {
          await createExperimentEquipmentRequirement({
            experimentId: expId,
            equipmentTypeId: e.equipmentTypeId,
            quantity: e.quantity,
            allowSubstitute: e.allowSubstitute,
            minAcceptableEfficiency: e.minAcceptableEfficiency,
            note: e.note || undefined,
          });
        } catch (equipErr) {
          console.warn("Attached equipment requirement creation notice:", equipErr);
        }
      }

      // 4. Create attached Human Requirements
      for (const h of humanReqs) {
        try {
          await createExperimentHumanRequirement({
            experimentId: expId,
            roleId: h.roleId,
            quantity: h.quantity,
            requiredSkillId: h.requiredSkillId,
            workingHoursPerDay: h.workingHoursPerDay,
            note: h.note || null,
          });
        } catch (humanErr) {
          console.warn("Attached human requirement creation notice:", humanErr);
        }
      }

      // 5. Create attached Land Requirements
      for (const l of landReqs) {
        try {
          await createExperimentLandRequirement({
            experimentId: expId,
            requiredArea: l.requiredArea,
            requiredSoilType: l.requiredSoilType || null,
            note: l.note || null,
          });
        } catch (landErr) {
          console.warn("Attached land requirement creation notice:", landErr);
        }
      }

      // Redirect to My Experiments list
      navigate("/experiments", {
        state: {
          message: `Experiment "${createdExp.experimentName}" created successfully as Draft!`,
        },
      });
    } catch (createErr) {
      console.error("Create Plan (Draft) failed:", createErr);
      setError(getApiErrorMessage(createErr));
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
            requirements={equipmentReqs}
            onChange={setEquipmentReqs}
          />
        )}

        {currentStep === 4 && (
          <HumanReqStep
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