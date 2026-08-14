import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import {
  getExperimentById,
  updateExperiment,
} from "../../services/experimentService";

import {
  createExperimentPhase,
  deleteExperimentPhase,
  getExperimentPhases,
  updateExperimentPhase,
} from "../../services/experimentPhaseService";

import {
  createExperimentEquipmentRequirement,
  deleteExperimentEquipmentRequirement,
  getExperimentEquipmentRequirements,
  updateExperimentEquipmentRequirement,
} from "../../services/experimentEquipmentRequirementService";

import {
  createExperimentHumanRequirement,
  deleteExperimentHumanRequirement,
  getExperimentHumanRequirements,
  updateExperimentHumanRequirement,
} from "../../services/experimentHumanRequirementService";

import {
  createExperimentLandRequirement,
  deleteExperimentLandRequirement,
  getExperimentLandRequirements,
  updateExperimentLandRequirement,
} from "../../services/experimentLandRequirementService";

import { PlanningStepper } from "./components/PlanningStepper";
import { ExperimentStep, type ExperimentStepData } from "./components/ExperimentStep";
import { PhasesStep, type PhaseFormItem } from "./components/PhasesStep";
import { EquipmentReqStep, type EquipmentReqFormItem } from "./components/EquipmentReqStep";
import { HumanReqStep, type HumanReqFormItem } from "./components/HumanReqStep";
import { LandReqStep, type LandReqFormItem } from "./components/LandReqStep";

import "./PlanningWizard.css";

function formatToUtcIso(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  if (dateStr.includes("T")) return dateStr;
  return `${dateStr}T00:00:00.000Z`;
}

function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function getApiErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
            error?: string;
            title?: string;
            errors?: Record<string, string[]>;
          };
        };
      }
    ).response;

    if (response?.data?.message) {
      return response.data.message;
    }
    if (response?.data?.error) {
      return response.data.error;
    }
    if (response?.data?.errors) {
      return Object.values(response.data.errors).flat().join(" ");
    }
    if (response?.data?.title) {
      return response.data.title;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Update experiment failed. Please try again.";
}

export default function EditExperiment() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const experimentId = Number(id);

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
    status: "Draft",
  });

  // Step 2 State
  const [phases, setPhases] = useState<PhaseFormItem[]>([]);
  const [initialPhaseIds, setInitialPhaseIds] = useState<number[]>([]);

  // Step 3 State
  const [equipmentReqs, setEquipmentReqs] = useState<EquipmentReqFormItem[]>([]);
  const [initialEquipmentReqIds, setInitialEquipmentReqIds] = useState<number[]>([]);

  // Step 4 State
  const [humanReqs, setHumanReqs] = useState<HumanReqFormItem[]>([]);
  const [initialHumanReqIds, setInitialHumanReqIds] = useState<number[]>([]);

  // Step 5 State
  const [landReqs, setLandReqs] = useState<LandReqFormItem[]>([]);
  const [initialLandReqIds, setInitialLandReqIds] = useState<number[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load existing experiment details and all sub-resources
  useEffect(() => {
    let active = true;

    async function loadData() {
      if (!id || !Number.isInteger(experimentId) || experimentId <= 0) {
        if (active) {
          setError("Invalid experiment ID.");
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [exp, phasesData, equipData, humanData, landData] = await Promise.all([
          getExperimentById(experimentId),
          getExperimentPhases({ experimentId, size: 100 }).catch(() => []),
          getExperimentEquipmentRequirements({ experimentId, size: 100 }).catch(() => []),
          getExperimentHumanRequirements({ experimentId, size: 100 }).catch(() => []),
          getExperimentLandRequirements({ experimentId, size: 100 }).catch(() => []),
        ]);

        if (!active) return;

        // Step 1
        setExpData({
          experimentName: exp.experimentName || "",
          description: exp.description || "",
          expectStartDate: toDateInputValue(exp.expectStartDate),
          expectEndDate: toDateInputValue(exp.expectEndDate),
          deadline: toDateInputValue(exp.deadline),
          priority: String(exp.priority ?? 1),
          status: exp.status || "Draft",
        });

        // Step 2: Phases
        const loadedPhases: PhaseFormItem[] = phasesData.map((p) => ({
          id: String(p.experimentPhaseId),
          phaseName: p.phaseName || "",
          phaseDescription: p.phaseDescription || "",
          phaseOrder: p.phaseOrder || 1,
          expectedStartDate: toDateInputValue(p.expectedStartDate),
          expectedEndDate: toDateInputValue(p.expectedEndDate),
          status: "Planned",
        }));
        setPhases(loadedPhases);
        setInitialPhaseIds(phasesData.map((p) => p.experimentPhaseId));

        // Step 3: Equipment Reqs
        const loadedEquip: EquipmentReqFormItem[] = equipData.map((e) => ({
          id: String(e.expEquipmentReqId),
          equipmentTypeId: e.equipmentTypeId,
          equipmentTypeName: e.equipmentTypeName,
          quantity: e.quantity,
          allowSubstitute: e.allowSubstitute,
          minAcceptableEfficiency: e.minAcceptableEfficiency,
          note: e.note || "",
        }));
        setEquipmentReqs(loadedEquip);
        setInitialEquipmentReqIds(equipData.map((e) => e.expEquipmentReqId));

        // Step 4: Human Reqs
        const loadedHuman: HumanReqFormItem[] = humanData.map((h) => ({
          id: String(h.expHumanReqId),
          roleId: h.roleId,
          roleName: h.roleName,
          quantity: h.quantity,
          requiredSkillId: h.requiredSkillId,
          requiredSkillName: h.requiredSkillName,
          workingHoursPerDay: h.workingHoursPerDay,
          note: h.note || "",
        }));
        setHumanReqs(loadedHuman);
        setInitialHumanReqIds(humanData.map((h) => h.expHumanReqId));

        // Step 5: Land Reqs
        const loadedLand: LandReqFormItem[] = landData.map((l) => ({
          id: String(l.expLandReqId),
          requiredArea: l.requiredArea,
          requiredSoilType: l.requiredSoilType || "",
          note: l.note || "",
        }));
        setLandReqs(loadedLand);
        setInitialLandReqIds(landData.map((l) => l.expLandReqId));
      } catch (loadErr) {
        console.error("Load experiment data failed:", loadErr);
        if (active) {
          setError(getApiErrorMessage(loadErr));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [id, experimentId]);

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

  const handleSaveChanges = async () => {
    setError("");

    if (!expData.experimentName.trim()) {
      setError("Experiment name is required.");
      setCurrentStep(1);
      return;
    }

    try {
      setSaving(true);

      // 1. Update main Experiment
      await updateExperiment(experimentId, {
        experimentName: expData.experimentName.trim(),
        description: expData.description.trim() || undefined,
        expectStartDate: expData.expectStartDate ? formatToUtcIso(expData.expectStartDate) : undefined,
        expectEndDate: expData.expectEndDate ? formatToUtcIso(expData.expectEndDate) : undefined,
        deadline: expData.deadline ? formatToUtcIso(expData.deadline) : undefined,
        priority: Number(expData.priority) || 1,
        status: expData.status || "Draft",
      });

      // 2. Sync Phases
      const currentPhaseNumIds = phases
        .map((p) => Number(p.id))
        .filter((num) => Number.isInteger(num) && num > 0);

      const phasesToDelete = initialPhaseIds.filter(
        (pid) => !currentPhaseNumIds.includes(pid)
      );

      for (const deleteId of phasesToDelete) {
        try {
          await deleteExperimentPhase(deleteId);
        } catch (phaseDelErr) {
          console.warn("Delete phase notice:", phaseDelErr);
        }
      }

      for (const p of phases) {
        if (!p.phaseName.trim()) continue;
        const numId = Number(p.id);
        const isExisting = Number.isInteger(numId) && numId > 0 && initialPhaseIds.includes(numId);

        const payload = {
          experimentId,
          phaseName: p.phaseName.trim(),
          phaseDescription: p.phaseDescription.trim() || null,
          phaseOrder: p.phaseOrder,
          expectedStartDate: formatToUtcIso(p.expectedStartDate),
          expectedEndDate: formatToUtcIso(p.expectedEndDate),
          status: "Planned" as const,
        };

        if (isExisting) {
          await updateExperimentPhase(numId, payload);
        } else {
          await createExperimentPhase(payload);
        }
      }

      // 3. Sync Equipment Requirements
      const currentEquipNumIds = equipmentReqs
        .map((e) => Number(e.id))
        .filter((num) => Number.isInteger(num) && num > 0);

      const equipToDelete = initialEquipmentReqIds.filter(
        (eid) => !currentEquipNumIds.includes(eid)
      );

      for (const deleteId of equipToDelete) {
        try {
          await deleteExperimentEquipmentRequirement(deleteId);
        } catch (equipDelErr) {
          console.warn("Delete equipment req notice:", equipDelErr);
        }
      }

      for (const e of equipmentReqs) {
        const numId = Number(e.id);
        const isExisting = Number.isInteger(numId) && numId > 0 && initialEquipmentReqIds.includes(numId);

        const payload = {
          experimentId,
          equipmentTypeId: e.equipmentTypeId,
          quantity: e.quantity,
          allowSubstitute: e.allowSubstitute,
          minAcceptableEfficiency: e.minAcceptableEfficiency,
          note: e.note || undefined,
        };

        if (isExisting) {
          await updateExperimentEquipmentRequirement(numId, payload);
        } else {
          await createExperimentEquipmentRequirement(payload);
        }
      }

      // 4. Sync Human Requirements
      const currentHumanNumIds = humanReqs
        .map((h) => Number(h.id))
        .filter((num) => Number.isInteger(num) && num > 0);

      const humanToDelete = initialHumanReqIds.filter(
        (hid) => !currentHumanNumIds.includes(hid)
      );

      for (const deleteId of humanToDelete) {
        try {
          await deleteExperimentHumanRequirement(deleteId);
        } catch (humanDelErr) {
          console.warn("Delete human req notice:", humanDelErr);
        }
      }

      for (const h of humanReqs) {
        const numId = Number(h.id);
        const isExisting = Number.isInteger(numId) && numId > 0 && initialHumanReqIds.includes(numId);

        const payload = {
          experimentId,
          roleId: h.roleId,
          quantity: h.quantity,
          requiredSkillId: h.requiredSkillId,
          workingHoursPerDay: h.workingHoursPerDay,
          note: h.note || null,
        };

        if (isExisting) {
          await updateExperimentHumanRequirement(numId, payload);
        } else {
          await createExperimentHumanRequirement(payload);
        }
      }

      // 5. Sync Land Requirements
      const currentLandNumIds = landReqs
        .map((l) => Number(l.id))
        .filter((num) => Number.isInteger(num) && num > 0);

      const landToDelete = initialLandReqIds.filter(
        (lid) => !currentLandNumIds.includes(lid)
      );

      for (const deleteId of landToDelete) {
        try {
          await deleteExperimentLandRequirement(deleteId);
        } catch (landDelErr) {
          console.warn("Delete land req notice:", landDelErr);
        }
      }

      for (const l of landReqs) {
        const numId = Number(l.id);
        const isExisting = Number.isInteger(numId) && numId > 0 && initialLandReqIds.includes(numId);

        const payload = {
          experimentId,
          requiredArea: l.requiredArea,
          requiredSoilType: l.requiredSoilType || null,
          note: l.note || null,
        };

        if (isExisting) {
          await updateExperimentLandRequirement(numId, payload);
        } else {
          await createExperimentLandRequirement(payload);
        }
      }

      navigate(`/experiments/${experimentId}`, {
        state: { message: "Experiment plan updated successfully!" },
      });
    } catch (submitError) {
      console.error("Update Experiment plan failed:", submitError);
      setError(getApiErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="planning-wizard-page">
          <p>Loading experiment plan details...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="planning-wizard-page">
        {/* Header */}
        <div className="planning-wizard-header">
          <div>
            <p className="breadcrumb">Dashboard / Experiments / Edit</p>
            <h1>Edit Experiment Plan #{experimentId}</h1>
            <p>Update metadata, phases, and resource requirements</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span className="planning-draft-badge">
              Status: {expData.status || "Draft"}
            </span>
            <button
              type="button"
              onClick={() => navigate(`/experiments/${experimentId}`)}
              className="planning-back-btn"
            >
              <ArrowLeft size={16} /> Back to Details
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

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {currentStep < 5 && (
              <button
                type="button"
                onClick={handleNextStep}
                className="btn-secondary-white"
              >
                Next <ArrowRight size={16} />
              </button>
            )}

            <button
              type="button"
              onClick={() => void handleSaveChanges()}
              disabled={saving}
              className="btn-primary-green"
              style={{ padding: "12px 28px", fontSize: "15px" }}
            >
              {saving ? (
                <>Saving Changes...</>
              ) : (
                <>
                  <Save size={18} /> Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}