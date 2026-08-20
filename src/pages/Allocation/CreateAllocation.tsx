import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import { useNotification } from "../../context/NotificationContext";

import { getExperiments } from "../../services/experimentService";
import { getEquipmentInstances } from "../../services/equipmentInstanceService";
import { getEquipmentSubstitutions } from "../../services/equipmentSubstitutionService";
import { getHumanResourceProfiles } from "../../services/humanResourceProfileService";
import { getHumanResourceSkills } from "../../services/humanResourceSkillService";
import { getLandResources } from "../../services/landResourceService";
import { getExperimentPhases } from "../../services/experimentPhaseService";
import {
  createExperimentEquipmentRequirement,
  getExperimentEquipmentRequirements,
} from "../../services/experimentEquipmentRequirementService";
import {
  createExperimentHumanRequirement,
  getExperimentHumanRequirements,
} from "../../services/experimentHumanRequirementService";
import {
  createExperimentLandRequirement,
  getExperimentLandRequirements,
} from "../../services/experimentLandRequirementService";
import { createAllocationPlan } from "../../services/allocationPlanService";
import {
  createAllocationEquipmentDetail,
  createAllocationHumanDetail,
  createAllocationLandDetail,
} from "../../services/allocationDetailService";
import { getCurrentUserTokenInfo } from "../../utils/storage";

import type { ExperimentResponse } from "../../types/experiment";
import type { EquipmentInstance } from "../../types/equipmentInstance";
import type { EquipmentSubstitution } from "../../types/equipmentSubstitution";
import type { HumanResourceProfile } from "../../types/humanResourceProfile";
import type { HumanResourceSkill } from "../../types/humanResourceSkill";
import type { LandResource } from "../../types/landResource";
import type { ExperimentPhase } from "../../types/experimentPhase";
import type { ExperimentEquipmentRequirement } from "../../types/experimentEquipmentRequirement";
import type { ExperimentHumanRequirement } from "../../types/experimentHumanRequirement";
import type { ExperimentLandRequirement } from "../../types/experimentLandRequirement";

import "./CreateAllocation.css";

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function convertDateToIso(d?: string | null, endOfDay = false): string {
  if (!d) return new Date().toISOString();
  if (d.includes("T")) return d;
  const clean = d.slice(0, 10);
  return endOfDay ? `${clean}T23:59:59` : `${clean}T00:00:00`;
}

export default function CreateAllocation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sendLocalNotification, fetchUnreadCount } = useNotification();

  const initialExpId = Number(searchParams.get("experimentId")) || 0;

  // Master Data State
  const [allExperiments, setAllExperiments] = useState<ExperimentResponse[]>([]);
  const [selectedExpId, setSelectedExpId] = useState<number>(initialExpId);

  const [availableEquipment, setAvailableEquipment] = useState<EquipmentInstance[]>([]);
  const [equipmentSubstitutions, setEquipmentSubstitutions] = useState<EquipmentSubstitution[]>([]);
  const [humanProfiles, setHumanProfiles] = useState<HumanResourceProfile[]>([]);
  const [humanResourceSkills, setHumanResourceSkills] = useState<HumanResourceSkill[]>([]);
  const [landResources, setLandResources] = useState<LandResource[]>([]);

  // Experiment Specific Context
  const [phases, setPhases] = useState<ExperimentPhase[]>([]);
  const [activePhaseId, setActivePhaseId] = useState<number | null>(null);
  const [equipmentReqs, setEquipmentReqs] = useState<ExperimentEquipmentRequirement[]>([]);
  const [humanReqs, setHumanReqs] = useState<ExperimentHumanRequirement[]>([]);
  const [landReqs, setLandReqs] = useState<ExperimentLandRequirement[]>([]);

  // Selection state per phase: phaseId -> Array of chosen item IDs
  const [selectedEquipByPhase, setSelectedEquipByPhase] = useState<Record<number, number[]>>({});
  const [selectedHumansByPhase, setSelectedHumansByPhase] = useState<Record<number, number[]>>({});

  // Land Plot selection: Strictly 1 land plot for the experiment!
  const [selectedLandId, setSelectedLandId] = useState<number | null>(null);

  // UI State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 1. Fetch initial experiments and system inventory
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        const currentUser = getCurrentUserTokenInfo();
        const { userId, fullName, role } = currentUser;
        const isPrivileged = role === "Admin" || role === "Manager";

        const [expRes, equipRes, substitutionRes, humanRes, humanSkillRes, landRes] = await Promise.all([
          getExperiments({
            researcherId: !isPrivileged && userId > 0 ? userId : undefined,
            size: 100,
          }).catch(() => []),
          getEquipmentInstances({ size: 500 }).catch(() => []),
          getEquipmentSubstitutions({ size: 500 }).catch(() => []),
          getHumanResourceProfiles({ size: 300 }).catch(() => []),
          getHumanResourceSkills({ page: 1, size: 500 }).catch(() => []),
          getLandResources({ size: 100 }).catch(() => []),
        ]);

        // Show active experiments filtered by token user if Researcher
        const rawExps = Array.isArray(expRes) ? expRes : (expRes as any)?.items || [];
        const exps = isPrivileged
          ? rawExps
          : rawExps.filter(
              (item: ExperimentResponse) =>
                (userId > 0 && item.researcherId === userId) ||
                (fullName &&
                  (item.researcherName?.toLowerCase().includes(fullName.toLowerCase()) ||
                    item.createdByName?.toLowerCase().includes(fullName.toLowerCase())))
            );
        setAllExperiments(exps);

        // Filter equipment with Available status
        const equips = Array.isArray(equipRes) ? equipRes : (equipRes as any)?.items || [];
        const availEquips = equips.filter(
          (e: EquipmentInstance) => e.status === "Available" || !e.status
        );
        setAvailableEquipment(availEquips);

        const substitutions = Array.isArray(substitutionRes)
          ? substitutionRes
          : (substitutionRes as any)?.items || [];
        setEquipmentSubstitutions(substitutions);

        // Strictly filter personnel to only Seasonal and Technician roles
        const humans = Array.isArray(humanRes) ? humanRes : (humanRes as any)?.items || [];
        const fieldStaff = humans.filter((hp: HumanResourceProfile) => {
          const r = (hp.roleName || (hp as any)?.role || "").toLowerCase();
          return r.includes("seasonal") || r.includes("technician");
        });
        setHumanProfiles(fieldStaff);

        const skills = Array.isArray(humanSkillRes)
          ? humanSkillRes
          : (humanSkillRes as any)?.items || [];
        setHumanResourceSkills(skills);

        const lands = Array.isArray(landRes) ? landRes : (landRes as any)?.items || [];
        setLandResources(lands);

        // Determine default selected experiment
        if (initialExpId && exps.some((e: ExperimentResponse) => e.experimentId === initialExpId)) {
          setSelectedExpId(initialExpId);
        } else if (exps.length > 0) {
          setSelectedExpId(exps[0].experimentId);
        }
      } catch (err: any) {
        console.error("Load initial allocation inventory data failed:", err);
        setError("Failed to load live resource inventory.");
      } finally {
        setLoading(false);
      }
    }

    void loadInitialData();
  }, [initialExpId]);

  // 2. When selectedExpId changes, load specific experiment requirements & phases
  useEffect(() => {
    if (!selectedExpId) return;

    async function loadExperimentDetails(id: number) {
      try {
        const [phasesRes, eReqRes, hReqRes, lReqRes] = await Promise.all([
          getExperimentPhases({ experimentId: id, size: 100 }).catch(() => []),
          getExperimentEquipmentRequirements({ experimentId: id, size: 100 }).catch(() => []),
          getExperimentHumanRequirements({ experimentId: id, size: 100 }).catch(() => []),
          getExperimentLandRequirements({ experimentId: id, size: 100 }).catch(() => []),
        ]);

        // Filter strictly to this experiment
        const allP = Array.isArray(phasesRes) ? phasesRes : [];
        const matchedPhases = allP.filter((p) => p.experimentId === id);
        setPhases(matchedPhases);

        // Set default active phase
        if (matchedPhases.length > 0) {
          setActivePhaseId(matchedPhases[0].experimentPhaseId);
        } else {
          setActivePhaseId(null);
        }

        const allE = Array.isArray(eReqRes) ? eReqRes : [];
        setEquipmentReqs(allE.filter((e) => e.experimentId === id));

        const allH = Array.isArray(hReqRes) ? hReqRes : [];
        setHumanReqs(allH.filter((h) => h.experimentId === id));

        const allL = Array.isArray(lReqRes) ? lReqRes : [];
        setLandReqs(allL.filter((l) => l.experimentId === id));

        // Reset phase selections
        setSelectedEquipByPhase({});
        setSelectedHumansByPhase({});
        setSelectedLandId(null);
      } catch (detailErr) {
        console.warn("Could not load experiment requirements for allocation hub:", detailErr);
      }
    }

    void loadExperimentDetails(selectedExpId);
  }, [selectedExpId]);

  const selectedExp = allExperiments.find((e) => e.experimentId === selectedExpId);
  const activePhase = phases.find((p) => p.experimentPhaseId === activePhaseId);

  // Normalize efficiency so both 80 and 0.8 are treated as 80%.
  const normalizeEfficiency = (value?: number | null): number => {
    if (value === null || value === undefined || Number.isNaN(value)) return 0;
    return value > 1 ? value / 100 : value;
  };

  // Get equipment requirements that belong to a specific phase.
  // Current create-experiment flow stores the phase label in note, e.g. [Phase 1:].
  // If an experiment has only one phase, all equipment requirements belong to that phase.
  const getEquipmentRequirementsForPhase = (
    phaseId: number
  ): ExperimentEquipmentRequirement[] => {
    const phase = phases.find((item) => item.experimentPhaseId === phaseId);
    if (!phase) return [];

    if (phases.length === 1) {
      return equipmentReqs;
    }

    const phaseName = (phase.phaseName || "").trim().toLowerCase();
    if (!phaseName) return [];

    const phaseNameWithoutColon = phaseName.replace(/:$/, "");

    return equipmentReqs.filter((req) => {
      const note = (req.note || "").trim().toLowerCase();
      return (
        note.includes(`[${phaseName}`) ||
        note.includes(`[${phaseNameWithoutColon}`)
      );
    });
  };

  const activePhaseEquipmentRequirements = useMemo(() => {
    if (!activePhaseId) return [];
    return getEquipmentRequirementsForPhase(activePhaseId);
  }, [activePhaseId, phases, equipmentReqs]);

  type EquipmentRequirementMatch = {
    requirement: ExperimentEquipmentRequirement;
    substitution?: EquipmentSubstitution;
    isSubstitute: boolean;
    effectiveEfficiency: number;
  };

  // Find which requirement an equipment instance satisfies.
  // Primary equipment must match equipmentTypeId directly.
  // Substitute equipment is allowed only when:
  // - Researcher enabled allowSubstitute
  // - EquipmentSubstitutions links primary -> substitute type
  // - Effective efficiency meets minAcceptableEfficiency
  const findEquipmentMatch = (
    phaseId: number,
    equipment: EquipmentInstance
  ): EquipmentRequirementMatch | null => {
    const requirements = getEquipmentRequirementsForPhase(phaseId);
    const equipmentTypeId = equipment.equipmentTypeId;
    const instanceEfficiency = normalizeEfficiency(equipment.efficiencyRate ?? 1);

    // Prefer the requested equipment type itself.
    for (const requirement of requirements) {
      if (requirement.equipmentTypeId !== equipmentTypeId) continue;

      const minimumEfficiency = normalizeEfficiency(
        requirement.minAcceptableEfficiency
      );

      if (instanceEfficiency >= minimumEfficiency) {
        return {
          requirement,
          isSubstitute: false,
          effectiveEfficiency: instanceEfficiency,
        };
      }
    }

    // Then try valid substitute types.
    let bestMatch: EquipmentRequirementMatch | null = null;

    for (const requirement of requirements) {
      if (!requirement.allowSubstitute) continue;

      const minimumEfficiency = normalizeEfficiency(
        requirement.minAcceptableEfficiency
      );

      const validRelations = equipmentSubstitutions.filter(
        (substitution) =>
          substitution.primaryEquipmentTypeId === requirement.equipmentTypeId &&
          substitution.subEquipmentTypeId === equipmentTypeId
      );

      for (const substitution of validRelations) {
        const substitutionEfficiency = normalizeEfficiency(
          substitution.efficiencyRate
        );

        // Effective efficiency combines the actual instance condition/efficiency
        // with the substitution conversion efficiency.
        const effectiveEfficiency = instanceEfficiency * substitutionEfficiency;

        if (effectiveEfficiency < minimumEfficiency) continue;

        if (
          !bestMatch ||
          effectiveEfficiency > bestMatch.effectiveEfficiency
        ) {
          bestMatch = {
            requirement,
            substitution,
            isSubstitute: true,
            effectiveEfficiency,
          };
        }
      }
    }

    return bestMatch;
  };

  const primaryEquipmentForActivePhase = useMemo(() => {
    if (!activePhaseId) return [];

    return availableEquipment.filter((equipment) => {
      if (equipment.status !== "Available") return false;
      const match = findEquipmentMatch(activePhaseId, equipment);
      return Boolean(match && !match.isSubstitute);
    });
  }, [
    activePhaseId,
    activePhaseEquipmentRequirements,
    availableEquipment,
    equipmentSubstitutions,
  ]);

  const substituteEquipmentForActivePhase = useMemo(() => {
    if (!activePhaseId) return [];

    return availableEquipment
      .map((equipment) => {
        if (equipment.status !== "Available") return null;
        const match = findEquipmentMatch(activePhaseId, equipment);
        if (!match || !match.isSubstitute) return null;
        return { equipment, match };
      })
      .filter(
        (
          item
        ): item is {
          equipment: EquipmentInstance;
          match: EquipmentRequirementMatch;
        } => item !== null
      );
  }, [
    activePhaseId,
    activePhaseEquipmentRequirements,
    availableEquipment,
    equipmentSubstitutions,
  ]);

  // Toggle Equipment for current active phase.
  // Quantity is enforced per requirement, so a substitute counts toward
  // the quantity of its primary requirement.
  const handleToggleEquipment = (eqId: number) => {
    if (!activePhaseId) return;

    const equipment = availableEquipment.find(
      (item) => item.equipmentInstanceId === eqId
    );

    if (!equipment) return;

    const targetMatch = findEquipmentMatch(activePhaseId, equipment);
    if (!targetMatch) {
      setError("This equipment does not satisfy the selected phase requirement.");
      return;
    }

    setSelectedEquipByPhase((prev) => {
      const currentList = prev[activePhaseId] || [];

      if (currentList.includes(eqId)) {
        setError("");
        return {
          ...prev,
          [activePhaseId]: currentList.filter((id) => id !== eqId),
        };
      }

      const selectedForSameRequirement = currentList.filter((selectedId) => {
        const selectedEquipment = availableEquipment.find(
          (item) => item.equipmentInstanceId === selectedId
        );
        if (!selectedEquipment) return false;

        const selectedMatch = findEquipmentMatch(
          activePhaseId,
          selectedEquipment
        );

        return (
          selectedMatch?.requirement.expEquipmentReqId ===
          targetMatch.requirement.expEquipmentReqId
        );
      }).length;

      const requiredQuantity = Math.max(
        0,
        targetMatch.requirement.quantity || 0
      );

      if (
        requiredQuantity > 0 &&
        selectedForSameRequirement >= requiredQuantity
      ) {
        setError(
          `Requirement "${
            targetMatch.requirement.equipmentTypeName ||
            `Equipment Type #${targetMatch.requirement.equipmentTypeId}`
          }" requires only ${requiredQuantity} unit(s).`
        );
        return prev;
      }

      setError("");
      return {
        ...prev,
        [activePhaseId]: [...currentList, eqId],
      };
    });
  };

  // Get human requirements that belong to a specific phase.
  // Current create-experiment flow stores the phase label in note, e.g. [Phase 1:].
  // If an experiment has only one phase, all human requirements belong to that phase.
  const getHumanRequirementsForPhase = (
    phaseId: number
  ): ExperimentHumanRequirement[] => {
    const phase = phases.find((item) => item.experimentPhaseId === phaseId);
    if (!phase) return [];

    if (phases.length === 1) {
      return humanReqs;
    }

    const phaseName = (phase.phaseName || "").trim().toLowerCase();
    if (!phaseName) return [];

    const phaseNameWithoutColon = phaseName.replace(/:$/, "");

    return humanReqs.filter((req) => {
      const note = (req.note || "").trim().toLowerCase();
      return (
        note.includes(`[${phaseName}`) ||
        note.includes(`[${phaseNameWithoutColon}`)
      );
    });
  };

  const activePhaseHumanRequirements = useMemo(() => {
    if (!activePhaseId) return [];
    return getHumanRequirementsForPhase(activePhaseId);
  }, [activePhaseId, phases, humanReqs]);

  type HumanRequirementMatch = {
    requirement: ExperimentHumanRequirement;
    matchedSkill?: HumanResourceSkill;
  };

  // Find which human requirement a profile satisfies.
  // A person must match role, available working hours, and required skill (when specified).
  const findHumanMatch = (
    phaseId: number,
    human: HumanResourceProfile
  ): HumanRequirementMatch | null => {
    const requirements = getHumanRequirementsForPhase(phaseId);

    for (const requirement of requirements) {
      if (human.roleId == null || human.roleId !== requirement.roleId) {
        continue;
      }

      const requiredHours = requirement.workingHoursPerDay ?? 0;
      const availableHours = human.maxWorkingHoursPerDay ?? 0;

      if (requiredHours > 0 && availableHours < requiredHours) {
        continue;
      }

      if (requirement.requiredSkillId == null) {
        return { requirement };
      }

      const matchedSkill = humanResourceSkills.find(
        (skill) =>
          skill.humanResourceId === human.humanResourceId &&
          skill.skillId === requirement.requiredSkillId
      );

      if (matchedSkill) {
        return { requirement, matchedSkill };
      }
    }

    return null;
  };

  const filteredHumansForActivePhase = useMemo(() => {
    if (!activePhaseId) return [];

    return humanProfiles.filter((human) => {
      if (human.status !== "Available") return false;
      return Boolean(findHumanMatch(activePhaseId, human));
    });
  }, [
    activePhaseId,
    activePhaseHumanRequirements,
    humanProfiles,
    humanResourceSkills,
  ]);

  // Toggle Personnel for current active phase.
  // Quantity is enforced per human requirement.
  const handleToggleHuman = (humanId: number) => {
    if (!activePhaseId) return;

    const human = humanProfiles.find(
      (item) => item.humanResourceId === humanId
    );

    if (!human) return;

    const targetMatch = findHumanMatch(activePhaseId, human);
    if (!targetMatch) {
      setError("This person does not satisfy the selected phase personnel requirement.");
      return;
    }

    setSelectedHumansByPhase((prev) => {
      const currentList = prev[activePhaseId] || [];

      if (currentList.includes(humanId)) {
        setError("");
        return {
          ...prev,
          [activePhaseId]: currentList.filter((id) => id !== humanId),
        };
      }

      const selectedForSameRequirement = currentList.filter((selectedId) => {
        const selectedHuman = humanProfiles.find(
          (item) => item.humanResourceId === selectedId
        );
        if (!selectedHuman) return false;

        const selectedMatch = findHumanMatch(activePhaseId, selectedHuman);

        return (
          selectedMatch?.requirement.expHumanReqId ===
          targetMatch.requirement.expHumanReqId
        );
      }).length;

      const requiredQuantity = Math.max(
        0,
        targetMatch.requirement.quantity || 0
      );

      if (
        requiredQuantity > 0 &&
        selectedForSameRequirement >= requiredQuantity
      ) {
        setError(
          `Requirement "${
            targetMatch.requirement.roleName ||
            `Role #${targetMatch.requirement.roleId}`
          }" requires only ${requiredQuantity} person(s).`
        );
        return prev;
      }

      setError("");
      return {
        ...prev,
        [activePhaseId]: [...currentList, humanId],
      };
    });
  };


  // Land requirement for the selected experiment.
  // Current business rule: each experiment has at most one land requirement.
  const activeLandRequirement = useMemo(() => {
    if (landReqs.length === 0) return null;
    return landReqs[0];
  }, [landReqs]);

  // Filter land plots according to the requirement chosen by the Researcher.
  // A plot is valid when:
  // - status is Available (or backend omitted the status),
  // - soilType matches requiredSoilType,
  // - areaSize is greater than or equal to requiredArea.
  const filteredLandResources = useMemo(() => {
    if (!activeLandRequirement) return [];

    const requiredSoilType = (
      activeLandRequirement.requiredSoilType || ""
    )
      .trim()
      .toLowerCase();

    const requiredArea = Number(activeLandRequirement.requiredArea) || 0;

    return landResources.filter((land) => {
      if (land.status && land.status !== "Available") {
        return false;
      }

      const landSoilType = (land.soilType || "")
        .trim()
        .toLowerCase();

      if (requiredSoilType && landSoilType !== requiredSoilType) {
        return false;
      }

      const landArea = Number(land.areaSize) || 0;

      if (requiredArea > 0 && landArea < requiredArea) {
        return false;
      }

      return true;
    });
  }, [activeLandRequirement, landResources]);

  // Select Land (Strictly 1 Land Plot for the Experiment)
  const handleSelectLand = (landId: number) => {
    setSelectedLandId((prev) => (prev === landId ? null : landId));
  };

  // Calculate totals
  const totalEquipmentCount = Object.values(selectedEquipByPhase).reduce(
    (acc, list) => acc + list.length,
    0
  );
  const totalHumanCount = Object.values(selectedHumansByPhase).reduce(
    (acc, list) => acc + list.length,
    0
  );

  // Save & Submit Allocation Plan (Manual)
  const handleSaveAndSubmitPlan = async () => {
    if (!selectedExpId || !selectedExp) {
      setError("Please select an experiment first.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // 1. Create Allocation Plan with Pending status
      const createdPlan = await createAllocationPlan({
        experimentId: selectedExpId,
        fitnessScore: 85,
        approveStatus: "Pending",
      });

      const planId = (createdPlan as any)?.allocationPlanId || (createdPlan as any)?.id;
      if (!planId) throw new Error("Failed to initialize allocation plan ID.");

      // 2. Create Equipment details per phase
      for (const [pIdStr, eqIds] of Object.entries(selectedEquipByPhase)) {
        const phaseIdNum = Number(pIdStr);
        const pObj = phases.find((p) => p.experimentPhaseId === phaseIdNum);
        const sDate = convertDateToIso(pObj?.expectedStartDate || selectedExp.expectStartDate);
        const eDate = convertDateToIso(pObj?.expectedEndDate || selectedExp.expectEndDate, true);

        for (const eqId of eqIds) {
          const eqObj = availableEquipment.find(
            (e) => e.equipmentInstanceId === eqId
          );

          if (!eqObj) {
            console.warn(`Skipping equipment ${eqId}: equipment instance not found.`);
            continue;
          }

          const equipmentTypeId = eqObj.equipmentTypeId;
          const match = findEquipmentMatch(phaseIdNum, eqObj);

          if (!match) {
            console.warn(
              `Skipping equipment ${eqId}: it no longer matches a requirement for phase ${phaseIdNum}.`
            );
            continue;
          }

          const expEqReqId = match.requirement.expEquipmentReqId;

          if (!expEqReqId) {
            console.warn(
              `Skipping equipment ${eqId}: matching experiment equipment requirement has no ID.`
            );
            continue;
          }

          try {
            await createAllocationEquipmentDetail({
              allocationPlanId: planId,
              expEquipmentReqId: expEqReqId,
              phaseEquipmentReqId: phaseIdNum,
              allocatedEquipmentTypeId: equipmentTypeId,
              equipmentInstanceId: eqId,
              quantity: 1,
              efficiencyRate: match.effectiveEfficiency,
              isSubstitute: match.isSubstitute,
              startDate: sDate,
              endDate: eDate,
              status: "Allocated",
            });
          } catch (eErr) {
            console.error("Create equipment allocation detail notice:", eErr);
          }
        }
      }

      // 3. Create Human details per phase
      for (const [pIdStr, hIds] of Object.entries(selectedHumansByPhase)) {
        const phaseIdNum = Number(pIdStr);
        const pObj = phases.find((p) => p.experimentPhaseId === phaseIdNum);
        const sDate = convertDateToIso(pObj?.expectedStartDate || selectedExp.expectStartDate);
        const eDate = convertDateToIso(pObj?.expectedEndDate || selectedExp.expectEndDate, true);

        for (const hId of hIds) {
          const hObj = humanProfiles.find((h) => h.humanResourceId === hId);
          let expHReqId = humanReqs[0]?.expHumanReqId;
          
          if (!expHReqId) {
            try {
              const createdHReq = await createExperimentHumanRequirement({
                experimentId: selectedExpId,
                roleId: hObj?.roleId || 1,
                quantity: 1,
                requiredSkillId: null,
                workingHoursPerDay: hObj?.maxWorkingHoursPerDay || 8,
                note: null,
              });
              expHReqId = (createdHReq as any)?.expHumanReqId || (createdHReq as any)?.id;
            } catch {
              expHReqId = 1;
            }
          }

          try {
            await createAllocationHumanDetail({
              allocationPlanId: planId,
              expHumanReqId: expHReqId || 1,
              phaseHumanReqId: phaseIdNum,
              humanResourceId: hId,
              workingHours: hObj?.maxWorkingHoursPerDay || 8,
              startDate: sDate,
              endDate: eDate,
              status: "Allocated",
            });
          } catch (hErr) {
            console.error("Create human allocation detail notice:", hErr);
          }
        }
      }

      // 4. Create Land detail (Single Land Plot)
      if (selectedLandId) {
        const sDate = convertDateToIso(selectedExp.expectStartDate);
        const eDate = convertDateToIso(selectedExp.expectEndDate, true);
        const selLandObj = landResources.find((l) => l.landId === selectedLandId);

        let expLandReqId = landReqs[0]?.expLandReqId;
        if (!expLandReqId) {
          try {
            const createdReq = await createExperimentLandRequirement({
              experimentId: selectedExpId,
              requiredArea: selLandObj?.areaSize || 1000,
              requiredSoilType: selLandObj?.soilType || "Standard Soil",
              note: "Allocated Land Plot",
            });
            expLandReqId = (createdReq as any)?.expLandReqId || (createdReq as any)?.id;
          } catch (lrErr) {
            console.warn("Auto create experiment land requirement notice:", lrErr);
          }
        }

        try {
          await createAllocationLandDetail({
            allocationPlanId: planId,
            landId: selectedLandId,
            expLandReqId: expLandReqId || 1,
            startDate: sDate,
            endDate: eDate,
            status: "Allocated",
          });
        } catch (lErr) {
          console.error("Create land allocation detail error:", lErr);
        }
      }

      // 5. Notify and navigate
      sendLocalNotification({
        title: "Allocation Plan Submitted",
        message: `Allocation plan for Experiment #${selectedExpId} with ${totalEquipmentCount} equipment and ${totalHumanCount} personnel has been submitted for Manager approval!`,
        notificationType: "Success",
        referenceType: "AllocationPlan",
        referenceId: planId,
      });
      void fetchUnreadCount();

      navigate("/allocation", {
        state: {
          message: `Allocation plan for Experiment "${selectedExp.experimentName}" submitted successfully for Manager approval!`,
        },
      });
    } catch (err: any) {
      console.error("Save & submit allocation plan failed:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to submit allocation plan. Please check inputs."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // AI Allocation Handler
  const handleStartAIAllocation = () => {
    if (!selectedExpId) {
      setError("Please select an experiment first.");
      return;
    }
    navigate(`/experiments/${selectedExpId}/ai-suggestions`);
  };

  return (
    <DashboardLayout>
      <div className="create-allocation-page">
        {/* Header */}
        <div className="create-header">
          <div>
            <p className="breadcrumb">Dashboard / Allocations / Resource Allocation Hub</p>
            <h1>Resource Allocation Hub</h1>
            <p>
              Select an experiment, configure resources per phase (Equipment, Seasonal/Technician workforce, and Land Plot), and submit for Manager approval.
            </p>
          </div>

          <button type="button" onClick={() => navigate("/allocation")} className="back-btn">
            <ArrowLeft size={16} /> Back to Allocations
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        {/* Experiment Context Selector Card */}
        <div className="alloc-exp-picker-card">
          <div className="alloc-picker-row">
            <div>
              <label
                htmlFor="experiment-alloc-select"
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                Target Experiment
              </label>
              <select
                id="experiment-alloc-select"
                value={selectedExpId || ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setSelectedExpId(id);
                }}
                className="alloc-picker-select"
              >
                {allExperiments.length === 0 ? (
                  <option value="">No Active Experiments Found</option>
                ) : (
                  allExperiments.map((exp) => (
                    <option key={exp.experimentId} value={exp.experimentId}>
                      #{exp.experimentId} - {exp.experimentName} ({exp.status || "Active"})
                    </option>
                  ))
                )}
              </select>
            </div>

            {selectedExp && (
              <div className="alloc-exp-meta-items">
                <div className="alloc-exp-meta-item">
                  Schedule: <span style={{ color: "#1e293b", fontWeight: 500 }}>{formatDate(selectedExp.expectStartDate)}</span> →{" "}
                  <span style={{ color: "#1e293b", fontWeight: 500 }}>{formatDate(selectedExp.expectEndDate)}</span>
                </div>
                <div className="alloc-exp-meta-item">
                  Deadline: <span style={{ color: "#1e293b", fontWeight: 500 }}>{formatDate(selectedExp.deadline)}</span>
                </div>
                <div className="alloc-exp-meta-item">
                  <span
                    style={{
                      fontSize: "11.5px",
                      fontWeight: 500,
                      padding: "2px 8px",
                      borderRadius: "5px",
                      background: "#f0f9ff",
                      color: "#0369a1",
                      border: "1px solid #e0f2fe",
                    }}
                  >
                    Priority {selectedExp.priority ?? 1}
                  </span>
                </div>
                <div className="alloc-exp-meta-item">
                  <span
                    style={{
                      fontSize: "11.5px",
                      fontWeight: 500,
                      padding: "2px 8px",
                      borderRadius: "5px",
                      background: "#f8fafc",
                      color: "#475569",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    Status: {selectedExp.status || "Submitted"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 1. Experiment Phases Stepper - Allows choosing active phase to allocate */}
        <div className="alloc-phase-nav-card">
          <div className="alloc-phase-nav-header">
            <div>
              <h3>1. Select Experiment Phase ({phases.length} Phases)</h3>
              <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#64748b", fontWeight: 400 }}>
                Click on a phase below to configure equipment and workforce assignments specifically for that execution window.
              </p>
            </div>
          </div>

          {phases.length === 0 ? (
            <p style={{ color: "#64748b", margin: "10px 0 0", fontSize: "13px", fontWeight: 400 }}>
              No phases defined for this experiment. You can proceed with AI Optimization to auto-generate phased schedules.
            </p>
          ) : (
            <div className="alloc-phase-tabs">
              {phases.map((p) => {
                const isSelected = p.experimentPhaseId === activePhaseId;
                const equipCount = selectedEquipByPhase[p.experimentPhaseId]?.length || 0;
                const humanCount = selectedHumansByPhase[p.experimentPhaseId]?.length || 0;

                return (
                  <button
                    key={p.experimentPhaseId}
                    type="button"
                    onClick={() => setActivePhaseId(p.experimentPhaseId)}
                    className={`alloc-phase-tab ${isSelected ? "active" : ""}`}
                  >
                    <span className="alloc-phase-tab-badge">Phase #{p.phaseOrder ?? 1}</span>
                    <div className="alloc-phase-tab-title">{p.phaseName}</div>
                    <div className="alloc-phase-tab-dates">
                      {formatDate(p.expectedStartDate)} → {formatDate(p.expectedEndDate)}
                    </div>
                    {(equipCount > 0 || humanCount > 0) && (
                      <div style={{ marginTop: "3px", fontSize: "11px", fontWeight: 500, color: "#16a34a" }}>
                        {equipCount} machines • {humanCount} staff
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Interactive Phase Resource Workspace Grid */}
        {activePhase ? (
          <div className="alloc-workspace-grid">
            {/* Left: Phase Equipment Allocation */}
            <div className="alloc-section-card">
              <div className="alloc-section-header">
                <div>
                  <h4>Equipment for "{activePhase.phaseName}"</h4>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 400 }}>
                    Select equipment that matches this phase's equipment requirements.
                  </span>
                </div>
                <span className="alloc-selection-count">
                  {selectedEquipByPhase[activePhase.experimentPhaseId]?.length || 0} Selected
                </span>
              </div>

              {activePhaseEquipmentRequirements.length > 0 && (
                <div
                  style={{
                    margin: "10px 0 12px",
                    padding: "10px 12px",
                    border: "1px solid #dcfce7",
                    background: "#f0fdf4",
                    borderRadius: "7px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#166534",
                      marginBottom: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                    }}
                  >
                    Equipment Requirement
                  </div>

                  {activePhaseEquipmentRequirements.map((req) => (
                    <div
                      key={req.expEquipmentReqId}
                      style={{
                        fontSize: "12px",
                        color: "#334155",
                        marginTop: "3px",
                      }}
                    >
                      <strong>
                        {req.equipmentTypeName || `Equipment Type #${req.equipmentTypeId}`}
                      </strong>
                      {" • "}
                      Required: {req.quantity}
                      {" • "}
                      Min Eff: {Math.round(
                        normalizeEfficiency(req.minAcceptableEfficiency) * 100
                      )}%
                      {" • "}
                      Substitute: {req.allowSubstitute ? "Allowed" : "No"}
                    </div>
                  ))}
                </div>
              )}

              {loading ? (
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "12.5px",
                    margin: "12px 0",
                    fontWeight: 400,
                  }}
                >
                  Loading available equipment...
                </p>
              ) : activePhaseEquipmentRequirements.length === 0 ? (
                <p
                  style={{
                    color: "#b45309",
                    fontSize: "12.5px",
                    margin: "12px 0",
                    fontWeight: 500,
                  }}
                >
                  No equipment requirement is configured for this phase.
                </p>
              ) : primaryEquipmentForActivePhase.length === 0 &&
                substituteEquipmentForActivePhase.length === 0 ? (
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "12.5px",
                    margin: "12px 0",
                    fontWeight: 400,
                  }}
                >
                  No available equipment or valid substitution matches the requirements for this phase.
                </p>
              ) : (
                <>
                  <div
                    style={{
                      margin: "10px 0 7px",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#0f766e",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Requested Equipment
                  </div>

                  {primaryEquipmentForActivePhase.length === 0 ? (
                    <p
                      style={{
                        color: "#64748b",
                        fontSize: "12px",
                        margin: "8px 0 12px",
                      }}
                    >
                      No primary equipment is currently available.
                    </p>
                  ) : (
                    <div className="alloc-items-list">
                      {primaryEquipmentForActivePhase.map((eq) => {
                        const match = findEquipmentMatch(
                          activePhase.experimentPhaseId,
                          eq
                        );
                        const isChecked = (
                          selectedEquipByPhase[activePhase.experimentPhaseId] || []
                        ).includes(eq.equipmentInstanceId);

                        return (
                          <div
                            key={`primary-${eq.equipmentInstanceId}`}
                            onClick={() =>
                              handleToggleEquipment(eq.equipmentInstanceId)
                            }
                            className={`alloc-item-row ${
                              isChecked ? "selected" : ""
                            }`}
                          >
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="alloc-item-checkbox"
                              />
                              <div>
                                <div
                                  style={{
                                    fontSize: "13px",
                                    color: "#0284c7",
                                    fontWeight: 550,
                                  }}
                                >
                                  {eq.assetCode || `EQ-${eq.equipmentInstanceId}`}
                                </div>
                                <div
                                  style={{
                                    fontSize: "11.5px",
                                    color: "#64748b",
                                    fontWeight: 400,
                                  }}
                                >
                                  {eq.equipmentTypeName ||
                                    `Type #${eq.equipmentTypeId}`} {" • "}
                                  {eq.conditionLevel || "Good"}
                                </div>
                              </div>
                            </div>

                            <div style={{ textAlign: "right" }}>
                              <div
                                style={{
                                  fontSize: "10.5px",
                                  fontWeight: 700,
                                  color: "#15803d",
                                  marginBottom: "2px",
                                }}
                              >
                                PRIMARY
                              </div>
                              <span
                                style={{
                                  fontSize: "11.5px",
                                  fontWeight: 500,
                                  color: "#16a34a",
                                }}
                              >
                                {Math.round(
                                  (match?.effectiveEfficiency ??
                                    normalizeEfficiency(eq.efficiencyRate ?? 1)) *
                                    100
                                )}
                                % Eff.
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {activePhaseEquipmentRequirements.some(
                    (req) => req.allowSubstitute
                  ) && (
                    <>
                      <div
                        style={{
                          margin: "16px 0 7px",
                          paddingTop: "12px",
                          borderTop: "1px dashed #cbd5e1",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#7c3aed",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        Valid Equipment Substitutions
                      </div>

                      {substituteEquipmentForActivePhase.length === 0 ? (
                        <p
                          style={{
                            color: "#64748b",
                            fontSize: "12px",
                            margin: "8px 0",
                          }}
                        >
                          No available substitute equipment meets the minimum efficiency requirement.
                        </p>
                      ) : (
                        <div className="alloc-items-list">
                          {substituteEquipmentForActivePhase.map(
                            ({ equipment: eq, match }) => {
                              const isChecked = (
                                selectedEquipByPhase[
                                  activePhase.experimentPhaseId
                                ] || []
                              ).includes(eq.equipmentInstanceId);

                              const substitutionEfficiency = normalizeEfficiency(
                                match.substitution?.efficiencyRate ?? 0
                              );

                              return (
                                <div
                                  key={`sub-${eq.equipmentInstanceId}-${match.requirement.expEquipmentReqId}`}
                                  onClick={() =>
                                    handleToggleEquipment(eq.equipmentInstanceId)
                                  }
                                  className={`alloc-item-row ${
                                    isChecked ? "selected" : ""
                                  }`}
                                  style={{
                                    borderColor: isChecked ? "#a78bfa" : "#ddd6fe",
                                    background: isChecked ? "#f5f3ff" : "#faf5ff",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {}}
                                      className="alloc-item-checkbox"
                                    />
                                    <div>
                                      <div
                                        style={{
                                          fontSize: "13px",
                                          color: "#7c3aed",
                                          fontWeight: 600,
                                        }}
                                      >
                                        {eq.assetCode ||
                                          `EQ-${eq.equipmentInstanceId}`}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: "11.5px",
                                          color: "#64748b",
                                          fontWeight: 400,
                                        }}
                                      >
                                        {eq.equipmentTypeName ||
                                          match.substitution?.subEquipmentTypeName ||
                                          `Type #${eq.equipmentTypeId}`} {" • "}
                                        substitutes for {" "}
                                        <strong>
                                          {match.requirement.equipmentTypeName ||
                                            match.substitution
                                              ?.primaryEquipmentTypeName ||
                                            `Type #${match.requirement.equipmentTypeId}`}
                                        </strong>
                                      </div>
                                      {match.substitution?.note && (
                                        <div
                                          style={{
                                            fontSize: "10.5px",
                                            color: "#7c3aed",
                                            marginTop: "2px",
                                          }}
                                        >
                                          {match.substitution.note}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div style={{ textAlign: "right" }}>
                                    <div
                                      style={{
                                        fontSize: "10.5px",
                                        fontWeight: 700,
                                        color: "#7c3aed",
                                        marginBottom: "2px",
                                      }}
                                    >
                                      SUBSTITUTE
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "11.5px",
                                        fontWeight: 600,
                                        color: "#7c3aed",
                                      }}
                                    >
                                      {Math.round(match.effectiveEfficiency * 100)}%
                                      Effective
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "10.5px",
                                        color: "#64748b",
                                      }}
                                    >
                                      Rule: {Math.round(substitutionEfficiency * 100)}%
                                      {match.substitution?.timeMultiplier
                                        ? ` • Time ×${match.substitution.timeMultiplier}`
                                        : ""}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Right: Phase Personnel Allocation */}
            <div className="alloc-section-card">
              <div className="alloc-section-header">
                <div>
                  <h4>Personnel for "{activePhase.phaseName}"</h4>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      fontWeight: 400,
                    }}
                  >
                    Select personnel matching this phase&apos;s role, skill, and working-hour requirements.
                  </span>
                </div>

                <span className="alloc-selection-count">
                  {selectedHumansByPhase[activePhase.experimentPhaseId]?.length || 0} Selected
                </span>
              </div>

              {activePhaseHumanRequirements.length > 0 && (
                <div
                  style={{
                    margin: "10px 0 12px",
                    padding: "10px 12px",
                    border: "1px solid #ede9fe",
                    background: "#faf5ff",
                    borderRadius: "7px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#7e22ce",
                      marginBottom: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                    }}
                  >
                    Personnel Requirement
                  </div>

                  {activePhaseHumanRequirements.map((requirement) => (
                    <div
                      key={requirement.expHumanReqId}
                      style={{
                        fontSize: "12px",
                        color: "#334155",
                        marginTop: "4px",
                      }}
                    >
                      <strong>
                        {requirement.roleName || `Role #${requirement.roleId}`}
                      </strong>
                      {" • "}
                      Required: {requirement.quantity}
                      {" • "}
                      Skill: {requirement.requiredSkillName ||
                        (requirement.requiredSkillId
                          ? `Skill #${requirement.requiredSkillId}`
                          : "Any")}
                      {" • "}
                      Working: {requirement.workingHoursPerDay ?? "-"} hrs/day
                    </div>
                  ))}
                </div>
              )}

              {loading ? (
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "12.5px",
                    margin: "12px 0",
                    fontWeight: 400,
                  }}
                >
                  Loading workforce data...
                </p>
              ) : activePhaseHumanRequirements.length === 0 ? (
                <p
                  style={{
                    color: "#b45309",
                    fontSize: "12.5px",
                    margin: "12px 0",
                    fontWeight: 500,
                  }}
                >
                  No personnel requirement is configured for this phase.
                </p>
              ) : filteredHumansForActivePhase.length === 0 ? (
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "12.5px",
                    margin: "12px 0",
                    fontWeight: 400,
                  }}
                >
                  No available personnel matches this phase&apos;s role, skill, and working-hour requirements.
                </p>
              ) : (
                <div className="alloc-items-list">
                  {filteredHumansForActivePhase.map((hp) => {
                    const isChecked = (
                      selectedHumansByPhase[activePhase.experimentPhaseId] || []
                    ).includes(hp.humanResourceId);

                    const match = findHumanMatch(
                      activePhase.experimentPhaseId,
                      hp
                    );

                    return (
                      <div
                        key={hp.humanResourceId}
                        onClick={() => handleToggleHuman(hp.humanResourceId)}
                        className={`alloc-item-row ${isChecked ? "selected" : ""}`}
                      >
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="alloc-item-checkbox"
                          />

                          <div>
                            <div
                              style={{
                                fontSize: "13px",
                                color: "#1e293b",
                                fontWeight: 550,
                              }}
                            >
                              {hp.fullName || `Staff #${hp.userId || hp.humanResourceId}`}
                            </div>

                            <div
                              style={{
                                fontSize: "11.5px",
                                color: "#64748b",
                                fontWeight: 400,
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 500,
                                  color: "#7e22ce",
                                  marginRight: "6px",
                                }}
                              >
                                {hp.roleName || `Role #${hp.roleId ?? "-"}`}
                              </span>
                              • {hp.maxWorkingHoursPerDay ?? 0} hrs/day
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          {match?.matchedSkill ? (
                            <>
                              <div
                                style={{
                                  fontSize: "11.5px",
                                  color: "#0369a1",
                                  fontWeight: 600,
                                }}
                              >
                                {match.matchedSkill.skillName ||
                                  `Skill #${match.matchedSkill.skillId}`}
                              </div>

                              <div
                                style={{
                                  fontSize: "10.5px",
                                  color: "#64748b",
                                  marginTop: "2px",
                                }}
                              >
                                {match.matchedSkill.skillLevel}
                              </div>
                            </>
                          ) : (
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#16a34a",
                                fontWeight: 600,
                              }}
                            >
                              Role Match
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* 3. Experiment Land Plot Selection (Strictly 1 Plot Allowed) */}
        <div
          className="alloc-section-card full-width"
          style={{ marginBottom: "20px" }}
        >
          <div className="alloc-section-header">
            <div>
              <h4>3. Experiment Land Plot (Strictly Max 1 Plot)</h4>
              <span
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  fontWeight: 400,
                }}
              >
                Select one available land plot matching the Researcher&apos;s land requirement.
              </span>
            </div>

            {selectedLandId && (
              <span className="alloc-selection-count">1 Selected</span>
            )}
          </div>

          {/* Land requirement summary */}
          {activeLandRequirement && (
            <div
              style={{
                margin: "10px 0 14px",
                padding: "10px 12px",
                border: "1px solid #fed7aa",
                background: "#fff7ed",
                borderRadius: "7px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#c2410c",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                Land Requirement
              </div>

              <div
                style={{
                  fontSize: "12px",
                  color: "#334155",
                }}
              >
                <strong>
                  Soil Type: {activeLandRequirement.requiredSoilType || "Any"}
                </strong>
                {" • "}
                Required Area:{" "}
                <strong>
                  {activeLandRequirement.requiredArea || 0} m²
                </strong>
                {activeLandRequirement.note && (
                  <>
                    {" • "}
                    Note: {activeLandRequirement.note}
                  </>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <p
              style={{
                color: "#64748b",
                fontSize: "12.5px",
                margin: "12px 0",
                fontWeight: 400,
              }}
            >
              Loading land resources...
            </p>
          ) : !activeLandRequirement ? (
            <p
              style={{
                color: "#b45309",
                fontSize: "12.5px",
                margin: "12px 0",
                fontWeight: 500,
              }}
            >
              No land requirement is configured for this experiment.
            </p>
          ) : filteredLandResources.length === 0 ? (
            <p
              style={{
                color: "#64748b",
                fontSize: "12.5px",
                margin: "12px 0",
                fontWeight: 400,
              }}
            >
              No available land plot matches the required soil type and area.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "10px",
              }}
            >
              {filteredLandResources.map((land) => {
                const isSelected = selectedLandId === land.landId;
                const requiredArea = Number(activeLandRequirement.requiredArea) || 0;
                const landArea = Number(land.areaSize) || 0;
                const extraArea = Math.max(0, landArea - requiredArea);

                return (
                  <div
                    key={land.landId}
                    onClick={() => handleSelectLand(land.landId)}
                    className={`alloc-land-row ${isSelected ? "selected" : ""}`}
                  >
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <input
                        type="radio"
                        name="land-radio-selection"
                        checked={isSelected}
                        onChange={() => {}}
                        className="alloc-land-radio"
                      />

                      <div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#15803d",
                            fontWeight: 600,
                          }}
                        >
                          {land.landCode || `Plot #${land.landId}`}
                        </div>

                        <div
                          style={{
                            fontSize: "11.5px",
                            color: "#64748b",
                            marginTop: "2px",
                          }}
                        >
                          {land.soilType || "Unknown Soil"}
                          {" • "}
                          {land.areaSize?.toLocaleString() || "-"} m²
                        </div>

                        {extraArea > 0 && (
                          <div
                            style={{
                              marginTop: "3px",
                              fontSize: "10.5px",
                              color: "#64748b",
                            }}
                          >
                            +{extraArea.toLocaleString()} m² above requirement
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: "4px",
                      }}
                    >
                      <span className="badge-available">Available</span>
                      <span
                        style={{
                          fontSize: "10.5px",
                          color: "#16a34a",
                          fontWeight: 600,
                        }}
                      >
                        Matches Requirement
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Bottom Summary Bar & Submit Action */}
        <div className="alloc-summary-card">
          <div className="alloc-summary-stats">
            <div className="alloc-stat-pill">
              Equipment Units: <strong>{totalEquipmentCount}</strong>
            </div>
            <div className="alloc-stat-pill">
              Field Workforce: <strong>{totalHumanCount}</strong>
            </div>
            <div className="alloc-stat-pill">
              Land Plot:{" "}
              <strong>
                {selectedLandId
                  ? landResources.find((l) => l.landId === selectedLandId)?.landCode || "Selected (1)"
                  : "None (0/1)"}
              </strong>
            </div>
          </div>

          <div className="alloc-action-buttons">
            <button
              type="button"
              onClick={handleStartAIAllocation}
              disabled={!selectedExpId}
              className="alloc-btn-manual"
            >
              Use AI Suggestion Optimizer
            </button>

            <button
              type="button"
              onClick={() => void handleSaveAndSubmitPlan()}
              disabled={submitting || !selectedExpId}
              className="alloc-btn-ai"
            >
              {submitting ? "Submitting Plan..." : "Save & Submit Allocation Plan"}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}