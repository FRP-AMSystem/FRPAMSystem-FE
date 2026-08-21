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
import {
  createAllocationPlan,
  evaluateAllocationPlan,
  getAllocationPlanById,
  updateAllocationPlan,
  submitAllocationPlan,
} from "../../services/allocationPlanService";
import {
  createAllocationEquipmentDetail,
  createAllocationHumanDetail,
  createAllocationLandDetail,
  getAllocationEquipmentDetails,
  getAllocationHumanDetails,
  getAllocationLandDetails,
} from "../../services/allocationDetailService";
import {
  createSchedule,
  deleteSchedule,
  getSchedules,
} from "../../services/scheduleService";
import { getCurrentUserTokenInfo } from "../../utils/storage";
import HumanScheduleCalendar from "./components/HumanScheduleCalendar";

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
import type { Schedule } from "../../types/schedule";

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


const WORK_START_HOUR = 8;
const WORK_END_HOUR = 17;

type WorkTimeRange = {
  start: number;
  end: number;
};

function clampHour(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toHourValue(date: Date): number {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

function mergeWorkRanges(ranges: WorkTimeRange[]): WorkTimeRange[] {
  if (ranges.length === 0) return [];

  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: WorkTimeRange[] = [{ ...sorted[0] }];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    const previous = merged[merged.length - 1];

    if (current.start <= previous.end) {
      previous.end = Math.max(previous.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function getBusyRangesForDate(
  schedules: Schedule[],
  dateKey: string,
  ignoredPlanId?: number,
  ignoredPhaseId?: number,
  ignoredHumanId?: number
): WorkTimeRange[] {
  const dayStart = new Date(`${dateKey}T00:00:00`);
  const dayEnd = new Date(`${dateKey}T23:59:59`);
  const ranges: WorkTimeRange[] = [];

  for (const schedule of schedules) {
    if (schedule.status === "Cancelled") continue;

    // When retrying Submit, schedules created by this same draft/phase/person
    // are replaced below and must not make the person look busy to themselves.
    if (
      ignoredPlanId &&
      ignoredPhaseId &&
      ignoredHumanId &&
      schedule.allocationPlanId === ignoredPlanId &&
      schedule.phaseId === ignoredPhaseId &&
      schedule.assignedHumanResourceId === ignoredHumanId
    ) {
      continue;
    }

    const start = new Date(schedule.startDate);
    const end = new Date(schedule.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    if (end <= dayStart || start >= dayEnd) continue;

    const clippedStart = start < dayStart ? dayStart : start;
    const clippedEnd = end > dayEnd ? dayEnd : end;

    const startHour = clampHour(
      toHourValue(clippedStart),
      WORK_START_HOUR,
      WORK_END_HOUR
    );
    const endHour = clampHour(
      toHourValue(clippedEnd),
      WORK_START_HOUR,
      WORK_END_HOUR
    );

    if (endHour > startHour) {
      ranges.push({ start: startHour, end: endHour });
    }
  }

  return mergeWorkRanges(ranges);
}

function getFreeWorkRanges(busyRanges: WorkTimeRange[]): WorkTimeRange[] {
  const free: WorkTimeRange[] = [];
  let cursor = WORK_START_HOUR;

  for (const range of busyRanges) {
    if (range.start > cursor) {
      free.push({ start: cursor, end: range.start });
    }
    cursor = Math.max(cursor, range.end);
  }

  if (cursor < WORK_END_HOUR) {
    free.push({ start: cursor, end: WORK_END_HOUR });
  }

  return free.filter((range) => range.end > range.start);
}

function buildWorkSegments(
  freeRanges: WorkTimeRange[],
  requiredHours: number
): WorkTimeRange[] {
  const result: WorkTimeRange[] = [];
  let remaining = requiredHours;

  for (const range of freeRanges) {
    if (remaining <= 0.0001) break;

    const available = range.end - range.start;
    const used = Math.min(available, remaining);

    if (used > 0) {
      result.push({ start: range.start, end: range.start + used });
      remaining -= used;
    }
  }

  return remaining <= 0.0001 ? result : [];
}

function hourToDateTime(dateKey: string, hourValue: number): string {
  let hour = Math.floor(hourValue);
  let minute = Math.round((hourValue - hour) * 60);

  if (minute === 60) {
    hour += 1;
    minute = 0;
  }

  return `${dateKey}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
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

  const [draftPlanId, setDraftPlanId] = useState<number | null>(null);
  const [initializingDraftPlan, setInitializingDraftPlan] = useState(false);
  const [scheduleHumanId, setScheduleHumanId] = useState<number | null>(null);
  const [scheduledHumanDates, setScheduledHumanDates] = useState<
    Record<number, Record<number, string[]>>
  >({});

  // Land Plot selection: Strictly 1 land plot for the experiment!
  const [selectedLandId, setSelectedLandId] = useState<number | null>(null);

  // UI State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [evaluatingFitness, setEvaluatingFitness] = useState(false);
  const [fitnessScore, setFitnessScore] = useState<number | null>(null);
  const [fitnessEvaluationMessage, setFitnessEvaluationMessage] = useState("");
  const [allocationDetailsSaved, setAllocationDetailsSaved] = useState(false);
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

        // Resource Allocation Hub only shows experiments that have already
        // been submitted by the Researcher and are ready for allocation.
        // Draft / Planning / Ready / Running / Completed / Cancelled experiments
        // must not appear in the Target Experiment selector.
        const rawExps = Array.isArray(expRes) ? expRes : (expRes as any)?.items || [];

        const submittedExperiments = rawExps.filter(
          (item: ExperimentResponse) =>
            String(item.status || "")
              .trim()
              .toLowerCase() === "submitted"
        );

        const exps = isPrivileged
          ? submittedExperiments
          : submittedExperiments.filter(
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
        setScheduledHumanDates({});
        setScheduleHumanId(null);
        setDraftPlanId(null);
        setSelectedLandId(null);
        setFitnessScore(null);
        setFitnessEvaluationMessage("");
        setAllocationDetailsSaved(false);
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
    if (allocationDetailsSaved) {
      setError("Fitness evaluation has already been prepared. Submit this plan before changing resources.");
      return;
    }

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

    setFitnessScore(null);
    setFitnessEvaluationMessage("");

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

  // ScheduleRequest needs an allocationPlanId, therefore a Draft plan is
  // initialized the first time the Researcher opens a personnel calendar.
  const ensureDraftAllocationPlan = async (): Promise<number> => {
    if (draftPlanId) return draftPlanId;

    if (!selectedExpId) {
      throw new Error("Please select an experiment first.");
    }

    try {
      setInitializingDraftPlan(true);

      const createdPlan = await createAllocationPlan({
        experimentId: selectedExpId,
        fitnessScore: null,
        approveStatus: "Draft",
      });

      const newPlanId =
        createdPlan?.allocationPlanId ||
        Number((createdPlan as unknown as { id?: number })?.id || 0);

      if (!newPlanId) {
        throw new Error("Failed to initialize Allocation Draft.");
      }

      setDraftPlanId(newPlanId);
      return newPlanId;
    } finally {
      setInitializingDraftPlan(false);
    }
  };

  // Clicking a matching worker opens the schedule calendar. The worker is
  // counted as selected only after a valid working date is persisted.
  const handleOpenHumanSchedule = async (humanId: number) => {
    if (allocationDetailsSaved) {
      setError("Fitness evaluation has already been prepared. Submit this plan before changing personnel schedules.");
      return;
    }

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

    const currentList = selectedHumansByPhase[activePhaseId] || [];
    const alreadySelected = currentList.includes(humanId);

    if (!alreadySelected) {
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

      const requiredQuantity = Math.max(0, targetMatch.requirement.quantity || 0);
      if (requiredQuantity > 0 && selectedForSameRequirement >= requiredQuantity) {
        setError(
          `Requirement "${
            targetMatch.requirement.roleName ||
            `Role #${targetMatch.requirement.roleId}`
          }" requires only ${requiredQuantity} person(s).`
        );
        return;
      }
    }

    setError("");
    setScheduleHumanId(humanId);
  };

  const handleHumanScheduled = (payload: {
    humanResourceId: number;
    phaseId: number;
    dates: string[];
  }) => {
    const normalizedDates = Array.from(new Set(payload.dates)).sort();

    setScheduledHumanDates((prev) => ({
      ...prev,
      [payload.phaseId]: {
        ...(prev[payload.phaseId] || {}),
        [payload.humanResourceId]: normalizedDates,
      },
    }));

    setSelectedHumansByPhase((prev) => {
      const current = prev[payload.phaseId] || [];
      const alreadySelected = current.includes(payload.humanResourceId);

      if (normalizedDates.length > 0 && !alreadySelected) {
        return {
          ...prev,
          [payload.phaseId]: [...current, payload.humanResourceId],
        };
      }

      if (normalizedDates.length === 0 && alreadySelected) {
        return {
          ...prev,
          [payload.phaseId]: current.filter(
            (id) => id !== payload.humanResourceId
          ),
        };
      }

      return prev;
    });

    setFitnessScore(null);
    setFitnessEvaluationMessage("");
    setError("");
    setScheduleHumanId(null);
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
    if (allocationDetailsSaved) {
      setError("Fitness evaluation has already been prepared. Submit this plan before changing the land plot.");
      return;
    }

    setFitnessScore(null);
    setFitnessEvaluationMessage("");
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

  /*
   * ============================================================
   * BACKEND FITNESS EVALUATION
   * ============================================================
   *
   * The backend owns the Fitness Score calculation through:
   * POST /api/AllocationPlans/{id}/evaluate
   *
   * To evaluate a manual plan, the current Equipment/Human/Land selections
   * must first be persisted into the Draft Allocation Plan. After evaluation
   * succeeds, resource editing is locked for this draft so the score shown to
   * the Researcher always matches the details stored on the backend.
   */

  const persistAllocationDetails = async (planId: number) => {
    if (allocationDetailsSaved) return;

    /*
     * Fitness evaluation can be retried after a partial failure. For example,
     * Equipment may have been saved successfully while Human failed. If we
     * blindly POST everything again on the next Evaluate click, the backend can
     * reject duplicate allocation details with HTTP 500.
     *
     * Always reload the current Draft details first and only create records that
     * do not already exist for this Allocation Plan.
     */
    const [existingEquipmentDetails, existingHumanDetails, existingLandDetails] =
      await Promise.all([
        getAllocationEquipmentDetails({
          allocationPlanId: planId,
          page: 1,
          size: 500,
        }),
        getAllocationHumanDetails({
          allocationPlanId: planId,
          page: 1,
          size: 500,
        }),
        getAllocationLandDetails({
          allocationPlanId: planId,
          page: 1,
          size: 500,
        }),
      ]);

    // Equipment details per phase
    for (const [pIdStr, eqIds] of Object.entries(selectedEquipByPhase)) {
      const phaseIdNum = Number(pIdStr);
      const pObj = phases.find((p) => p.experimentPhaseId === phaseIdNum);
      const sDate = convertDateToIso(
        pObj?.expectedStartDate || selectedExp?.expectStartDate
      );
      const eDate = convertDateToIso(
        pObj?.expectedEndDate || selectedExp?.expectEndDate,
        true
      );

      for (const eqId of eqIds) {
        const eqObj = availableEquipment.find(
          (e) => e.equipmentInstanceId === eqId
        );

        if (!eqObj) {
          console.warn(`Skipping equipment ${eqId}: equipment instance not found.`);
          continue;
        }

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

        const equipmentAlreadyExists = existingEquipmentDetails.some(
          (detail) =>
            detail.allocationPlanId === planId &&
            detail.expEquipmentReqId === expEqReqId &&
            detail.equipmentInstanceId === eqId
        );

        if (equipmentAlreadyExists) {
          console.info(
            `Skipping duplicate equipment allocation detail: plan=${planId}, requirement=${expEqReqId}, equipment=${eqId}.`
          );
          continue;
        }

        const createdEquipmentDetail = await createAllocationEquipmentDetail({
          allocationPlanId: planId,
          expEquipmentReqId: expEqReqId,
          phaseEquipmentReqId: null,
          allocatedEquipmentTypeId: eqObj.equipmentTypeId,
          equipmentInstanceId: eqId,
          quantity: 1,
          efficiencyRate: match.effectiveEfficiency,
          isSubstitute: match.isSubstitute,
          startDate: sDate,
          endDate: eDate,
          status: "Allocated",
        });

        // Keep the local snapshot in sync so another selected entry in this same
        // persist pass cannot create the exact same detail again.
        existingEquipmentDetails.push(createdEquipmentDetail);
      }
    }

    // Human details per phase / selected working dates
    for (const [pIdStr, hIds] of Object.entries(selectedHumansByPhase)) {
      const phaseIdNum = Number(pIdStr);

      for (const hId of hIds) {
        const hObj = humanProfiles.find((h) => h.humanResourceId === hId);
        if (!hObj) continue;

        const humanMatch = findHumanMatch(phaseIdNum, hObj);
        const requirement = humanMatch?.requirement;

        let expHReqId = requirement?.expHumanReqId;
        const requiredWorkingHours =
          requirement?.workingHoursPerDay ??
          hObj.maxWorkingHoursPerDay ??
          8;

        if (!expHReqId) {
          const createdHReq = await createExperimentHumanRequirement({
            experimentId: selectedExpId,
            roleId: requirement?.roleId ?? hObj.roleId ?? 1,
            quantity: requirement?.quantity ?? 1,
            requiredSkillId: requirement?.requiredSkillId ?? null,
            workingHoursPerDay: requiredWorkingHours,
            note: requirement?.note ?? null,
          });

          expHReqId =
            (createdHReq as { expHumanReqId?: number; id?: number })
              ?.expHumanReqId ??
            (createdHReq as { expHumanReqId?: number; id?: number })?.id;
        }

        if (!expHReqId) {
          throw new Error(
            `Human requirement ID is missing for resource #${hId}.`
          );
        }

        const selectedDates = scheduledHumanDates[phaseIdNum]?.[hId] || [];
        if (selectedDates.length === 0) {
          throw new Error(
            `${hObj.fullName || `Human resource #${hId}`} has no scheduled working date.`
          );
        }

        const sortedDates = [...selectedDates].sort();
        const firstWorkingDate = sortedDates[0];
        const lastWorkingDate = sortedDates[sortedDates.length - 1];

        if (!firstWorkingDate || !lastWorkingDate) {
          throw new Error(
            `${hObj.fullName || `Human resource #${hId}`} has no valid scheduled working date.`
          );
        }

        const humanAlreadyExists = existingHumanDetails.some(
          (detail) =>
            detail.allocationPlanId === planId &&
            detail.expHumanReqId === expHReqId &&
            detail.humanResourceId === hId
        );

        if (humanAlreadyExists) {
          console.info(
            `Skipping duplicate human allocation detail: plan=${planId}, requirement=${expHReqId}, human=${hId}.`
          );
          continue;
        }

        // AllocationHumanDetail represents one assignment of this person. The
        // exact selected work-day/time segments remain FE-only until Submit.
        const createdHumanDetail = await createAllocationHumanDetail({
          allocationPlanId: planId,
          expHumanReqId: expHReqId,
          phaseHumanReqId: null,
          humanResourceId: hId,
          workingHours: requiredWorkingHours,
          startDate: `${firstWorkingDate}T08:00:00`,
          endDate: `${lastWorkingDate}T17:00:00`,
          status: "Allocated",
        });

        existingHumanDetails.push(createdHumanDetail);
      }
    }

    // One land plot for the experiment
    if (selectedLandId) {
      const sDate = convertDateToIso(selectedExp?.expectStartDate);
      const eDate = convertDateToIso(selectedExp?.expectEndDate, true);
      const selLandObj = landResources.find(
        (l) => l.landId === selectedLandId
      );

      let expLandReqId: number | undefined = landReqs[0]?.expLandReqId;

      if (expLandReqId == null) {
        const createdReq = await createExperimentLandRequirement({
          experimentId: selectedExpId,
          requiredArea: selLandObj?.areaSize || 1000,
          requiredSoilType: selLandObj?.soilType || "Standard Soil",
          note: "Allocated Land Plot",
        });

        const createdLandReqId =
          (createdReq as { expLandReqId?: number; id?: number })
            ?.expLandReqId ??
          (createdReq as { expLandReqId?: number; id?: number })?.id;

        if (createdLandReqId == null) {
          throw new Error("Failed to create land requirement ID.");
        }

        expLandReqId = createdLandReqId;
      }

      const resolvedExpLandReqId = expLandReqId;

      if (resolvedExpLandReqId == null) {
        throw new Error("Land requirement ID is missing.");
      }

      const landAlreadyExists = existingLandDetails.some(
        (detail) =>
          detail.allocationPlanId === planId &&
          detail.landId === selectedLandId &&
          detail.expLandReqId === resolvedExpLandReqId
      );

      if (landAlreadyExists) {
        console.info(
          `Skipping duplicate land allocation detail: plan=${planId}, requirement=${resolvedExpLandReqId}, land=${selectedLandId}.`
        );
      } else {
        const createdLandDetail = await createAllocationLandDetail({
          allocationPlanId: planId,
          landId: selectedLandId,
          expLandReqId: resolvedExpLandReqId,
          startDate: sDate,
          endDate: eDate,
          status: "Allocated",
        });

        existingLandDetails.push(createdLandDetail);
      }
    }

    setAllocationDetailsSaved(true);
  };

  const persistHumanSchedules = async (planId: number) => {
    const currentUser = getCurrentUserTokenInfo();

    for (const [phaseIdText, humans] of Object.entries(scheduledHumanDates)) {
      const phaseId = Number(phaseIdText);
      const phase = phases.find((item) => item.experimentPhaseId === phaseId);
      if (!phase) continue;

      for (const [humanIdText, selectedDatesRaw] of Object.entries(humans)) {
        const humanId = Number(humanIdText);
        const human = humanProfiles.find(
          (item) => item.humanResourceId === humanId
        );
        if (!human) continue;

        const selectedDates = Array.from(new Set(selectedDatesRaw)).sort();
        if (selectedDates.length === 0) continue;

        const humanMatch = findHumanMatch(phaseId, human);
        const requiredHours =
          humanMatch?.requirement.workingHoursPerDay ??
          human.maxWorkingHoursPerDay ??
          8;

        if (requiredHours <= 0 || requiredHours > WORK_END_HOUR - WORK_START_HOUR) {
          throw new Error(
            `Invalid working hours for ${human.fullName || `Human #${humanId}`}.`
          );
        }

        const firstDate = selectedDates[0];
        const lastDate = selectedDates[selectedDates.length - 1];

        const schedules = await getSchedules({
          assignedHumanResourceId: humanId,
          dateFrom: `${firstDate}T00:00:00`,
          dateTo: `${lastDate}T23:59:59`,
          page: 1,
          size: 500,
        });

        // Validate every selected day again at Submit time. Another plan may
        // have occupied the person after the Researcher opened the calendar.
        const preparedDays = selectedDates.map((dateKey) => {
          const busyRanges = getBusyRangesForDate(
            schedules,
            dateKey,
            planId,
            phaseId,
            humanId
          );
          const freeRanges = getFreeWorkRanges(busyRanges);
          const segments = buildWorkSegments(freeRanges, requiredHours);

          return { dateKey, segments };
        });

        const invalidDay = preparedDays.find((item) => item.segments.length === 0);
        if (invalidDay) {
          throw new Error(
            `${human.fullName || `Human #${humanId}`} no longer has ${requiredHours} free hour(s) on ${formatDate(invalidDay.dateKey)}.`
          );
        }

        // A retry of Submit should update this draft's schedules rather than
        // create duplicate rows.
        const oldDraftSchedules = schedules.filter(
          (schedule) =>
            schedule.status !== "Cancelled" &&
            schedule.allocationPlanId === planId &&
            schedule.phaseId === phaseId &&
            schedule.assignedHumanResourceId === humanId
        );

        for (const schedule of oldDraftSchedules) {
          if (schedule.scheduleId > 0) {
            await deleteSchedule(schedule.scheduleId);
          }
        }

        const titleBase = selectedExp?.experimentName?.trim() || "Experiment";
        const phaseLabel = phase.phaseName?.trim() || `Phase #${phaseId}`;

        for (const preparedDay of preparedDays) {
          for (let index = 0; index < preparedDay.segments.length; index += 1) {
            const segment = preparedDay.segments[index];

            await createSchedule({
              allocationPlanId: planId,
              phaseId,
              title:
                preparedDay.segments.length > 1
                  ? `${titleBase} - ${phaseLabel} (${index + 1}/${preparedDay.segments.length})`
                  : `${titleBase} - ${phaseLabel}`,
              description: `Scheduled from Resource Allocation Hub for ${
                human.fullName || `Human Resource #${humanId}`
              }.`,
              startDate: hourToDateTime(preparedDay.dateKey, segment.start),
              endDate: hourToDateTime(preparedDay.dateKey, segment.end),
              status: "Planned",
              createdBy: currentUser.userId > 0 ? currentUser.userId : null,
              assignedHumanResourceId: humanId,
              notes: `Required ${requiredHours} working hour(s) within office hours 08:00-17:00.`,
              priority: 1,
            });
          }
        }
      }
    }
  };

  const handleEvaluateFitnessScore = async () => {
    if (!selectedExpId || !selectedExp) {
      setError("Please select an experiment first.");
      return;
    }

    if (totalEquipmentCount === 0) {
      setError("Please select the required equipment before evaluating Fitness Score.");
      return;
    }

    if (totalHumanCount === 0) {
      setError("Please select and schedule the required personnel before evaluating Fitness Score.");
      return;
    }

    if (activeLandRequirement && !selectedLandId) {
      setError("Please select a land plot before evaluating Fitness Score.");
      return;
    }

    try {
      setEvaluatingFitness(true);
      setError("");
      setFitnessEvaluationMessage("");

      const planId = await ensureDraftAllocationPlan();
      await persistAllocationDetails(planId);

      const evaluation = await evaluateAllocationPlan(planId);

      let evaluatedScore = evaluation.fitnessScore;

      // Some backend versions update the AllocationPlan but return only a
      // generic success response. Reload the plan to obtain the persisted score.
      if (evaluatedScore === null || evaluatedScore === undefined) {
        const refreshedPlan = await getAllocationPlanById(planId);
        evaluatedScore = refreshedPlan.fitnessScore;
      }

      if (evaluatedScore === null || evaluatedScore === undefined) {
        throw new Error(
          "The backend evaluation completed but did not return a Fitness Score."
        );
      }

      setFitnessScore(Number(evaluatedScore));
      setFitnessEvaluationMessage(
        "Fitness Score was calculated by the backend allocation evaluation engine."
      );
    } catch (evaluationError: any) {
      console.error("Evaluate allocation fitness failed:", evaluationError);
      setError(
        evaluationError?.response?.data?.message ||
          evaluationError?.message ||
          "Failed to evaluate Fitness Score."
      );
    } finally {
      setEvaluatingFitness(false);
    }
  };

  // Save & Submit Allocation Plan (Manual)
  const handleSaveAndSubmitPlan = async () => {
    if (!selectedExpId || !selectedExp) {
      setError("Please select an experiment first.");
      return;
    }

    if (fitnessScore === null) {
      setError("Please evaluate the Fitness Score before submitting the Allocation Plan.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const planId = await ensureDraftAllocationPlan();

      // Allocation details are normally persisted during Fitness evaluation.
      await persistAllocationDetails(planId);

      // IMPORTANT: personnel calendar selections have only lived in FE state
      // until this exact point. Create/update the real backend schedules only
      // when Researcher confirms Save & Submit Allocation Plan.
      await persistHumanSchedules(planId);

      // Persist the exact Fitness Score that the Researcher reviewed before
      // moving the Allocation Plan from Draft -> Pending. This guarantees the
      // Manager sees the same score on the submitted plan.
      await updateAllocationPlan(planId, {
        experimentId: selectedExpId,
        fitnessScore,
        approveStatus: "Draft",
      });

      // Backend submit endpoint transitions the plan to Pending so it becomes
      // actionable for Manager approval/rejection.
      await submitAllocationPlan(planId);

      sendLocalNotification({
        title: "Allocation Plan Submitted",
        message: `Allocation plan for Experiment #${selectedExpId} with ${totalEquipmentCount} equipment and ${totalHumanCount} personnel (Fitness Score: ${fitnessScore}) has been submitted for Manager approval!`,
        notificationType: "Success",
        referenceType: "AllocationPlan",
        referenceId: planId,
      });
      void fetchUnreadCount();

      navigate("/allocation", {
        state: {
          message: `Allocation plan for Experiment "${selectedExp.experimentName}" submitted successfully for Manager approval! Fitness Score: ${fitnessScore}.`,
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
                    Select personnel matching this phase&apos;s role, skill, and working-hour requirements. Click a person to choose a working date (08:00-17:00).
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
                        onClick={() => void handleOpenHumanSchedule(hp.humanResourceId)}
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

                            {(scheduledHumanDates[activePhase.experimentPhaseId]?.[
                              hp.humanResourceId
                            ]?.length || 0) > 0 && (
                              <div
                                style={{
                                  marginTop: "3px",
                                  fontSize: "10.5px",
                                  color: "#15803d",
                                  fontWeight: 600,
                                }}
                              >
                                Selected {
                                  scheduledHumanDates[activePhase.experimentPhaseId][
                                    hp.humanResourceId
                                  ].length
                                } day(s): {
                                  scheduledHumanDates[activePhase.experimentPhaseId][
                                    hp.humanResourceId
                                  ]
                                    .slice(0, 3)
                                    .map((date) => formatDate(date))
                                    .join(", ")
                                }
                                {scheduledHumanDates[activePhase.experimentPhaseId][
                                  hp.humanResourceId
                                ].length > 3
                                  ? " ..."
                                  : ""}
                              </div>
                            )}
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

        {/* 4. Backend Fitness Evaluation */}
        <div
          className="alloc-section-card full-width"
          style={{ marginBottom: "20px" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "18px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: "280px" }}>
              <h4 style={{ margin: 0, color: "#0f172a" }}>
                4. Allocation Fitness Evaluation
              </h4>
              <p
                style={{
                  margin: "5px 0 0",
                  fontSize: "12.5px",
                  color: "#64748b",
                  lineHeight: 1.6,
                }}
              >
                After selecting Equipment, Personnel schedules, and Land, use the
                backend evaluation engine to calculate the official Fitness Score
                before submitting this Allocation Plan.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleEvaluateFitnessScore()}
              disabled={
                evaluatingFitness ||
                submitting ||
                initializingDraftPlan ||
                fitnessScore !== null
              }
              className="alloc-btn-manual"
              style={{ whiteSpace: "nowrap" }}
            >
              {evaluatingFitness
                ? "Evaluating..."
                : fitnessScore !== null
                  ? "Evaluation Complete"
                  : "Evaluate Fitness Score"}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "10px",
              marginTop: "16px",
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                background: "#f8fafc",
              }}
            >
              <div style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 700 }}>
                EQUIPMENT
              </div>
              <strong style={{ display: "block", marginTop: "5px", fontSize: "18px" }}>
                {totalEquipmentCount}
              </strong>
              <span style={{ fontSize: "11px", color: "#64748b" }}>unit(s) selected</span>
            </div>

            <div
              style={{
                padding: "12px 14px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                background: "#f8fafc",
              }}
            >
              <div style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 700 }}>
                PERSONNEL
              </div>
              <strong style={{ display: "block", marginTop: "5px", fontSize: "18px" }}>
                {totalHumanCount}
              </strong>
              <span style={{ fontSize: "11px", color: "#64748b" }}>person(s) scheduled</span>
            </div>

            <div
              style={{
                padding: "12px 14px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                background: "#f8fafc",
              }}
            >
              <div style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 700 }}>
                LAND
              </div>
              <strong style={{ display: "block", marginTop: "5px", fontSize: "18px" }}>
                {selectedLandId ? 1 : 0}
              </strong>
              <span style={{ fontSize: "11px", color: "#64748b" }}>plot selected</span>
            </div>

            <div
              style={{
                padding: "12px 14px",
                border: fitnessScore !== null ? "1px solid #86efac" : "1px solid #cbd5e1",
                borderRadius: "8px",
                background: fitnessScore !== null ? "#f0fdf4" : "#ffffff",
              }}
            >
              <div
                style={{
                  fontSize: "10.5px",
                  color: fitnessScore !== null ? "#15803d" : "#64748b",
                  fontWeight: 700,
                }}
              >
                FITNESS SCORE
              </div>
              <strong
                style={{
                  display: "block",
                  marginTop: "4px",
                  fontSize: "24px",
                  color: fitnessScore !== null ? "#15803d" : "#94a3b8",
                }}
              >
                {fitnessScore !== null ? fitnessScore.toFixed(2) : "--"}
              </strong>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                calculated by backend
              </span>
            </div>
          </div>

          {fitnessEvaluationMessage && (
            <div
              style={{
                marginTop: "12px",
                padding: "10px 12px",
                border: "1px solid #bbf7d0",
                background: "#f0fdf4",
                color: "#166534",
                borderRadius: "7px",
                fontSize: "12px",
                fontWeight: 500,
              }}
            >
              {fitnessEvaluationMessage}
            </div>
          )}

          {allocationDetailsSaved && fitnessScore !== null && (
            <div
              style={{
                marginTop: "10px",
                fontSize: "11.5px",
                color: "#64748b",
              }}
            >
              The evaluated Draft is locked to keep the displayed Fitness Score
              consistent with the resources stored on the backend.
            </div>
          )}
        </div>

        {/* 5. Bottom Summary Bar & Submit Action */}
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
              disabled={
                submitting ||
                evaluatingFitness ||
                initializingDraftPlan ||
                !selectedExpId ||
                fitnessScore === null
              }
              className="alloc-btn-ai"
            >
              {submitting
                ? "Submitting Plan..."
                : fitnessScore === null
                  ? "Evaluate Before Submit"
                  : "Save & Submit Allocation Plan"}
            </button>
          </div>
        </div>
      </div>
      <HumanScheduleCalendar
        open={scheduleHumanId !== null}
        human={
          scheduleHumanId !== null
            ? humanProfiles.find(
                (item) => item.humanResourceId === scheduleHumanId
              ) || null
            : null
        }
        phaseId={activePhaseId}
        phaseName={activePhase?.phaseName}
        phaseStartDate={activePhase?.expectedStartDate}
        phaseEndDate={activePhase?.expectedEndDate}
        experimentName={selectedExp?.experimentName}
        selectedWorkingDates={
          activePhaseId && scheduleHumanId !== null
            ? scheduledHumanDates[activePhaseId]?.[scheduleHumanId] || []
            : []
        }
        requiredWorkingHours={(() => {
          if (!activePhaseId || scheduleHumanId === null) return 0;

          const human = humanProfiles.find(
            (item) => item.humanResourceId === scheduleHumanId
          );
          if (!human) return 0;

          return (
            findHumanMatch(activePhaseId, human)?.requirement.workingHoursPerDay ??
            0
          );
        })()}
        onClose={() => setScheduleHumanId(null)}
        onScheduled={handleHumanScheduled}
      />

    </DashboardLayout>
  );
}