import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronRight, AlertTriangle, RefreshCw } from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import { useNotification } from "../../context/NotificationContext";
import type {
  ExperimentResponse,
  ExperimentStatus,
} from "../../types/experiment";
import type { ExperimentPhase } from "../../types/experimentPhase";
import type { ExperimentEquipmentRequirement } from "../../types/experimentEquipmentRequirement";
import type { ExperimentHumanRequirement } from "../../types/experimentHumanRequirement";
import type { ExperimentLandRequirement } from "../../types/experimentLandRequirement";

import {
  getExperimentById,
  getExperiments,
} from "../../services/experimentService";
import {
  getExperimentPhases,
} from "../../services/experimentPhaseService";
import {
  getExperimentEquipmentRequirements,
} from "../../services/experimentEquipmentRequirementService";
import {
  getExperimentHumanRequirements,
} from "../../services/experimentHumanRequirementService";
import {
  getExperimentLandRequirements,
} from "../../services/experimentLandRequirementService";
import {
  createAllocationPlan,
  getAllocationPlans,
  submitAllocationPlan,
  updateAllocationPlan,
} from "../../services/allocationPlanService";
import {
  createAllocationEquipmentDetail,
  createAllocationHumanDetail,
  createAllocationLandDetail,
  deleteAllocationEquipmentDetail,
  deleteAllocationHumanDetail,
  deleteAllocationLandDetail,
  getAllocationEquipmentDetails,
  getAllocationHumanDetails,
  getAllocationLandDetails,
} from "../../services/allocationDetailService";
import {
  createSchedule,
  deleteSchedule,
  getSchedules,
} from "../../services/scheduleService";
import {
  generateAISuggestions,
  DEFAULT_OPTIMIZATION_SETTINGS,
  type OptimizationSettings,
} from "../../services/aiSuggestionService";
import type {
  AISuggestionInput,
  AISuggestionPlan,
} from "../../types/aiSuggestion";
import { getCurrentUserTokenInfo } from "../../utils/storage";

import "./AISuggestionPage.css";

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

function normalizeDatePart(dateStr?: string | null): string {
  if (!dateStr) return new Date().toISOString().slice(0, 10);

  if (dateStr.includes("T")) {
    return dateStr.slice(0, 10);
  }

  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }

  return dateStr.slice(0, 10);
}

function toAllocationDateTime(
  dateStr?: string | null,
  endOfDay = false
): string {
  if (!dateStr) {
    const today = new Date().toISOString().slice(0, 10);
    return `${today}T${endOfDay ? "23:59:59" : "00:00:00"}`;
  }

  if (dateStr.includes("T")) {
    return dateStr;
  }

  const datePart = normalizeDatePart(dateStr);
  return `${datePart}T${endOfDay ? "23:59:59" : "00:00:00"}`;
}

function normalizeEfficiency(value?: number | null): number {
  const numeric = Number(value ?? 1);
  if (!Number.isFinite(numeric) || numeric <= 0) return 1;
  return numeric > 1 ? numeric / 100 : numeric;
}

function dateKeysBetween(start?: string | null, end?: string | null): string[] {
  const startKey = normalizeDatePart(start);
  const endKey = normalizeDatePart(end || start);
  const startDate = new Date(`${startKey}T00:00:00`);
  const endDate = new Date(`${endKey}T00:00:00`);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate < startDate
  ) {
    return [startKey];
  }

  const result: string[] = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate && result.length < 366) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    const day = String(cursor.getDate()).padStart(2, "0");
    result.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

export default function AISuggestionPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { sendLocalNotification, fetchUnreadCount } = useNotification();

  // Selected experiment ID
  const [selectedExpId, setSelectedExpId] = useState<number | null>(
    id ? Number(id) : null
  );

  // Experiment & Requirements State
  const [experiment, setExperiment] = useState<ExperimentResponse | null>(null);
  const [allExperiments, setAllExperiments] = useState<ExperimentResponse[]>([]);
  const [phases, setPhases] = useState<ExperimentPhase[]>([]);
  const [equipReqs, setEquipReqs] = useState<ExperimentEquipmentRequirement[]>([]);
  const [humanReqs, setHumanReqs] = useState<ExperimentHumanRequirement[]>([]);
  const [landReqs, setLandReqs] = useState<ExperimentLandRequirement[]>([]);

  // AI Suggestions State
  const [suggestions, setSuggestions] = useState<AISuggestionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<
    "overview" | "equipment" | "humans" | "lands" | "conflicts"
  >("overview");

  // Loading & Error States
  const [loadingExp, setLoadingExp] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Settings Drawer
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<OptimizationSettings>(
    DEFAULT_OPTIMIZATION_SETTINGS
  );

  // Load experiment list for picker
  useEffect(() => {
    async function loadList() {
      try {
        const currentUser = getCurrentUserTokenInfo();
        const { userId, fullName, role } = currentUser;
        const isPrivileged = role === "Admin" || role === "Manager";

        const res = await getExperiments({
          researcherId: !isPrivileged && userId > 0 ? userId : undefined,
          size: 100,
        });
        const rawItems = Array.isArray(res) ? res : (res as any)?.items || [];
        const items = isPrivileged
          ? rawItems
          : rawItems.filter(
              (item: ExperimentResponse) =>
                (userId > 0 && item.researcherId === userId) ||
                (fullName &&
                  (item.researcherName?.toLowerCase().includes(fullName.toLowerCase()) ||
                    item.createdByName?.toLowerCase().includes(fullName.toLowerCase())))
            );

        setAllExperiments(items);
        if (!selectedExpId && items.length > 0) {
          setSelectedExpId(items[0].experimentId);
        }
      } catch (err) {
        console.error("Failed to load experiment list", err);
      }
    }
    loadList();
  }, [selectedExpId]);

  // Load experiment details and trigger AI suggestion
  const loadDataAndRunAI = useCallback(
    async (expId: number, currentSettings: OptimizationSettings) => {
      try {
        setLoadingExp(true);
        setError(null);

        const [exp, pList, eList, hList, lList] = await Promise.all([
          getExperimentById(expId),
          getExperimentPhases({ experimentId: expId, size: 100 }),
          getExperimentEquipmentRequirements({ experimentId: expId, size: 100 }),
          getExperimentHumanRequirements({ experimentId: expId, size: 100 }),
          getExperimentLandRequirements({ experimentId: expId, size: 100 }),
        ]);

        setExperiment(exp);
        setPhases(pList);
        setEquipReqs(eList);
        setHumanReqs(hList);
        setLandReqs(lList);

        setLoadingExp(false);
        setLoadingAI(true);

        const payload: AISuggestionInput = {
          experiment: {
            experimentId: exp.experimentId,
            experimentName: exp.experimentName,
            description: exp.description || "",
            researcherId: exp.researcherId || 1,
            expectStartDate: exp.expectStartDate || new Date().toISOString(),
            expectEndDate: exp.expectEndDate || new Date().toISOString(),
            deadline: exp.deadline || new Date().toISOString(),
            priority: exp.priority ?? 1,
            status: "Draft",
          },
          experimentPhases: pList.map((p) => ({
            phaseName: p.phaseName,
            phaseDescription: p.phaseDescription,
            phaseOrder: p.phaseOrder,
            expectedStartDate: p.expectedStartDate,
            expectedEndDate: p.expectedEndDate,
            status: "Planned",
          })),
          equipmentRequirements: eList.map((e) => ({
            equipmentTypeId: e.equipmentTypeId,
            equipmentTypeName: e.equipmentTypeName,
            quantity: e.quantity,
            allowSubstitute: e.allowSubstitute,
            minAcceptableEfficiency: e.minAcceptableEfficiency,
            note: e.note,
          })),
          humanRequirements: hList.map((h) => ({
            roleId: h.roleId,
            roleName: h.roleName || undefined,
            quantity: h.quantity,
            requiredSkillId: h.requiredSkillId || null,
            requiredSkillName: h.requiredSkillName || undefined,
            workingHoursPerDay: h.workingHoursPerDay || null,
            note: h.note || null,
          })),
          landRequirements: lList.map((l) => ({
            requiredArea: l.requiredArea,
            requiredSoilType: l.requiredSoilType,
            note: l.note,
          })),
        };

        const res = await generateAISuggestions(payload, currentSettings);
        setSuggestions(res.suggestions || []);
        if (res.suggestions && res.suggestions.length > 0) {
          setSelectedPlanId(res.suggestions[0].id);
        }
      } catch (err: unknown) {
        console.error("Failed to load and optimize AI plan:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to generate AI allocation suggestions for this experiment."
        );
      } finally {
        setLoadingExp(false);
        setLoadingAI(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedExpId) {
      loadDataAndRunAI(selectedExpId, settings);
    }
  }, [selectedExpId, loadDataAndRunAI, settings]);

  const selectedPlan = suggestions.find((s) => s.id === selectedPlanId);

  // Resolve or create the single Draft Allocation Plan used by the selected AI option.
  const ensureDraftAllocationPlan = async (): Promise<number> => {
    if (!experiment) {
      throw new Error("Experiment is not loaded.");
    }

    const plans = await getAllocationPlans({
      experimentId: experiment.experimentId,
      page: 1,
      size: 100,
    });

    const existingDraft = [...plans]
      .filter(
        (plan) =>
          Number(plan.experimentId) === Number(experiment.experimentId) &&
          String(plan.approveStatus || "").toLowerCase() === "draft"
      )
      .sort(
        (first, second) =>
          new Date(second.updatedAt || second.createdAt || 0).getTime() -
          new Date(first.updatedAt || first.createdAt || 0).getTime()
      )[0];

    if (existingDraft?.allocationPlanId) {
      return existingDraft.allocationPlanId;
    }

    const created = await createAllocationPlan({
      experimentId: experiment.experimentId,
      fitnessScore: null,
      approveStatus: "Draft",
    });

    const planId = Number(created?.allocationPlanId || 0);

    if (!Number.isInteger(planId) || planId <= 0) {
      throw new Error("Unable to create Draft Allocation Plan for the AI suggestion.");
    }

    return planId;
  };

  const resolvePhase = (phaseId?: number, phaseName?: string) => {
    if (phaseId) {
      const byId = phases.find(
        (phase) => Number(phase.experimentPhaseId) === Number(phaseId)
      );
      if (byId) return byId;
    }

    if (phaseName) {
      const normalizedName = phaseName.trim().toLowerCase();
      const byName = phases.find(
        (phase) =>
          String(phase.phaseName || "").trim().toLowerCase() === normalizedName
      );
      if (byName) return byName;
    }

    return phases[0];
  };

  const findEquipmentRequirement = (
    requiredTypeId?: number,
    allocatedTypeId?: number
  ): ExperimentEquipmentRequirement | undefined => {
    if (requiredTypeId) {
      const requested = equipReqs.find(
        (requirement) =>
          Number(requirement.equipmentTypeId) === Number(requiredTypeId)
      );
      if (requested) return requested;
    }

    if (allocatedTypeId) {
      return equipReqs.find(
        (requirement) =>
          Number(requirement.equipmentTypeId) === Number(allocatedTypeId)
      );
    }

    return undefined;
  };

  const findHumanRequirement = (
    roleId?: number
  ): ExperimentHumanRequirement | undefined => {
    if (!roleId) return humanReqs[0];

    return (
      humanReqs.find(
        (requirement) => Number(requirement.roleId) === Number(roleId)
      ) || humanReqs[0]
    );
  };

  const findLandRequirement = (
    soilType?: string,
    areaSize?: number
  ): ExperimentLandRequirement | undefined => {
    const normalizedSoil = String(soilType || "").trim().toLowerCase();

    if (normalizedSoil) {
      const soilMatch = landReqs.find(
        (requirement) =>
          String(requirement.requiredSoilType || "").trim().toLowerCase() ===
            normalizedSoil &&
          Number(areaSize || 0) >= Number(requirement.requiredArea || 0)
      );

      if (soilMatch) return soilMatch;
    }

    return landReqs[0];
  };

  // When a Researcher chooses an AI candidate, replace only the Allocation
  // resources belonging to the Draft. Experiment phases and requirements are
  // source requirements and must never be deleted/recreated by the AI flow.
  const clearDraftAllocationResources = async (planId: number) => {
    const [equipmentDetails, humanDetails, landDetails, schedules] =
      await Promise.all([
        getAllocationEquipmentDetails({ allocationPlanId: planId, page: 1, size: 500 }),
        getAllocationHumanDetails({ allocationPlanId: planId, page: 1, size: 500 }),
        getAllocationLandDetails({ allocationPlanId: planId, page: 1, size: 500 }),
        getSchedules({ allocationPlanId: planId, page: 1, size: 500 }),
      ]);

    for (const schedule of schedules) {
      if (schedule.scheduleId > 0) {
        await deleteSchedule(schedule.scheduleId);
      }
    }

    for (const detail of equipmentDetails) {
      if (detail.allocationEquipmentDetailId > 0) {
        await deleteAllocationEquipmentDetail(detail.allocationEquipmentDetailId);
      }
    }

    for (const detail of humanDetails) {
      if (detail.allocationHumanDetailId > 0) {
        await deleteAllocationHumanDetail(detail.allocationHumanDetailId);
      }
    }

    for (const detail of landDetails) {
      if (detail.allocationLandDetailId > 0) {
        await deleteAllocationLandDetail(detail.allocationLandDetailId);
      }
    }
  };

  const persistSelectedAIResources = async (planId: number) => {
    if (!experiment || !selectedPlan) {
      throw new Error("No AI allocation option is selected.");
    }

    if (!Array.isArray(selectedPlan.allocatedEquipment)) {
      throw new Error("The selected AI option does not contain equipment allocation data.");
    }

    if (!Array.isArray(selectedPlan.allocatedHumans)) {
      throw new Error("The selected AI option does not contain personnel allocation data.");
    }

    if (!Array.isArray(selectedPlan.allocatedLands)) {
      throw new Error("The selected AI option does not contain land allocation data.");
    }

    // Equipment selected by the AI solver.
    for (const item of selectedPlan.allocatedEquipment) {
      const equipmentInstanceId = Number(item.equipmentInstanceId || 0);
      const allocatedEquipmentTypeId = Number(
        item.allocatedEquipmentTypeId || item.requiredEquipmentTypeId || 0
      );

      if (!Number.isInteger(equipmentInstanceId) || equipmentInstanceId <= 0) {
        throw new Error(
          `AI candidate contains an invalid equipment instance (${item.assetCode || "unknown"}).`
        );
      }

      if (
        !Number.isInteger(allocatedEquipmentTypeId) ||
        allocatedEquipmentTypeId <= 0
      ) {
        throw new Error(
          `AI candidate contains an invalid equipment type for ${item.assetCode || `equipment #${equipmentInstanceId}`}.`
        );
      }

      const requirement = findEquipmentRequirement(
        item.requiredEquipmentTypeId,
        item.allocatedEquipmentTypeId
      );

      if (!requirement?.expEquipmentReqId) {
        throw new Error(
          `Unable to match ${item.assetCode || `equipment #${equipmentInstanceId}`} to an Experiment Equipment Requirement.`
        );
      }

      const phase = resolvePhase(item.phaseId, item.phaseName);
      const startDate = toAllocationDateTime(
        item.startDate || phase?.expectedStartDate || experiment.expectStartDate
      );
      const endDate = toAllocationDateTime(
        item.endDate || phase?.expectedEndDate || experiment.expectEndDate,
        true
      );

      await createAllocationEquipmentDetail({
        allocationPlanId: planId,
        expEquipmentReqId: requirement.expEquipmentReqId,
        phaseEquipmentReqId: null,
        allocatedEquipmentTypeId,
        equipmentInstanceId,
        quantity: 1,
        efficiencyRate: normalizeEfficiency(item.efficiencyRate),
        isSubstitute: Boolean(item.isSubstitute),
        startDate,
        endDate,
        status: "Allocated",
      });
    }

    // Personnel selected by the AI solver.
    //
    // IMPORTANT:
    // The same human can legitimately appear more than once in the AI result
    // (for example, the same Technician is reused in multiple phases).
    // AllocationHumanDetail represents the PERSON/REQUIREMENT assignment,
    // while Schedule represents the concrete phase/day working windows.
    //
    // Therefore we must create only ONE AllocationHumanDetail for each
    // (Experiment Human Requirement + Human Resource) pair and then create
    // the schedules for every AI assignment. Without this grouping, the
    // backend can reject the second duplicate AllocationHumanDetail with 500.
    type PreparedHumanAssignment = {
      item: AISuggestionPlan["allocatedHumans"][number];
      humanResourceId: number;
      requirement: ExperimentHumanRequirement;
      requiredHours: number;
      phase: ExperimentPhase | undefined;
      startSource: string;
      endSource: string;
      firstDate: string;
      lastDate: string;
    };

    const preparedHumanAssignments: PreparedHumanAssignment[] = [];

    for (const item of selectedPlan.allocatedHumans) {
      const humanResourceId = Number(item.humanResourceId || 0);

      if (!Number.isInteger(humanResourceId) || humanResourceId <= 0) {
        throw new Error(
          `AI candidate contains an invalid human resource (${item.fullName || "unknown"}).`
        );
      }

      const requirement = findHumanRequirement(item.roleId);

      if (!requirement?.expHumanReqId) {
        throw new Error(
          `Unable to match ${item.fullName || `human resource #${humanResourceId}`} to an Experiment Human Requirement.`
        );
      }

      const requiredHours = Math.min(
        9,
        Math.max(1, Number(requirement.workingHoursPerDay || 8))
      );

      const phase = resolvePhase(item.phaseId, item.phaseName);

      const startSource =
        item.startDate ||
        phase?.expectedStartDate ||
        experiment.expectStartDate ||
        new Date().toISOString();

      const endSource =
        item.endDate ||
        phase?.expectedEndDate ||
        experiment.expectEndDate ||
        startSource;

      const firstDate = normalizeDatePart(startSource);
      const lastDate = normalizeDatePart(endSource);

      if (!firstDate || !lastDate) {
        throw new Error(
          `AI candidate contains an invalid schedule range for ${
            item.fullName || `Human Resource #${humanResourceId}`
          }.`
        );
      }

      preparedHumanAssignments.push({
        item,
        humanResourceId,
        requirement,
        requiredHours,
        phase,
        startSource,
        endSource,
        firstDate,
        lastDate,
      });
    }

    // Group duplicate AI assignments that point to the same Human Detail row.
    const groupedHumanAssignments = new Map<
      string,
      PreparedHumanAssignment[]
    >();

    for (const assignment of preparedHumanAssignments) {
      const key = `${assignment.requirement.expHumanReqId}:${assignment.humanResourceId}`;
      const group = groupedHumanAssignments.get(key) || [];
      group.push(assignment);
      groupedHumanAssignments.set(key, group);
    }

    // Create exactly one AllocationHumanDetail per requirement/person pair.
    for (const assignments of groupedHumanAssignments.values()) {
      const firstAssignment = assignments[0];

      const allDateKeys = assignments
        .flatMap((assignment) =>
          dateKeysBetween(
            assignment.startSource,
            assignment.endSource
          )
        )
        .filter(Boolean)
        .sort();

      const firstWorkingDate = allDateKeys[0];
      const lastWorkingDate = allDateKeys[allDateKeys.length - 1];

      if (!firstWorkingDate || !lastWorkingDate) {
        throw new Error(
          `${
            firstAssignment.item.fullName ||
            `Human Resource #${firstAssignment.humanResourceId}`
          } does not have a valid AI working date.`
        );
      }

      const humanPayload = {
        allocationPlanId: planId,
        expHumanReqId:
          firstAssignment.requirement.expHumanReqId,
        phaseHumanReqId: null,
        humanResourceId:
          firstAssignment.humanResourceId,
        workingHours:
          firstAssignment.requiredHours,
        startDate:
          `${firstWorkingDate}T08:00:00`,
        endDate:
          `${lastWorkingDate}T17:00:00`,
        status: "Allocated" as const,
      };

      console.log(
        "AI AllocationHumanDetail payload:",
        humanPayload
      );

      try {
        await createAllocationHumanDetail(
          humanPayload
        );
      } catch (humanDetailError: any) {
        console.error(
          "Create AI AllocationHumanDetail failed:",
          {
            payload: humanPayload,
            status:
              humanDetailError?.response?.status,
            response:
              humanDetailError?.response?.data,
            message:
              humanDetailError?.message,
          }
        );

        throw new Error(
          humanDetailError?.response?.data?.message ||
          humanDetailError?.response?.data?.title ||
          humanDetailError?.response?.data?.error ||
          `Unable to allocate ${
            firstAssignment.item.fullName ||
            `Human Resource #${firstAssignment.humanResourceId}`
          }. The person may already be allocated during this period.`
        );
      }
    }

    // Create concrete schedules separately for each AI phase assignment.
    // The Human Detail above is intentionally NOT recreated here.
    const createdScheduleKeys = new Set<string>();

    for (const assignment of preparedHumanAssignments) {
      for (const dateKey of dateKeysBetween(
        assignment.startSource,
        assignment.endSource
      )) {
        const scheduleKey =
          `${assignment.humanResourceId}:${assignment.phase?.experimentPhaseId || 0}:${dateKey}`;

        if (createdScheduleKeys.has(scheduleKey)) {
          continue;
        }

        createdScheduleKeys.add(scheduleKey);

        const endHour = Math.min(
          17,
          8 + assignment.requiredHours
        );

        const endHourText = String(
          Math.floor(endHour)
        ).padStart(2, "0");

        const endMinuteText =
          endHour % 1 === 0 ? "00" : "30";

        await createSchedule({
          allocationPlanId: planId,
          phaseId:
            assignment.phase?.experimentPhaseId ||
            null,

          title:
            `${experiment.experimentName} - ${
              assignment.phase?.phaseName ||
              assignment.item.phaseName ||
              "AI Allocation"
            }`,

          description:
            `AI-selected schedule for ${
              assignment.item.fullName ||
              `Human Resource #${assignment.humanResourceId}`
            }.`,

          startDate:
            `${dateKey}T08:00:00`,

          endDate:
            `${dateKey}T${endHourText}:${endMinuteText}:00`,

          status: "Planned",

          createdBy:
            getCurrentUserTokenInfo().userId ||
            null,

          assignedHumanResourceId:
            assignment.humanResourceId,

          notes:
            `AI allocation candidate #${selectedPlan.rank}; required ${assignment.requiredHours} hour(s) within office hours 08:00-17:00.`,

          priority: 1,
        });
      }
    }

    // Project rule: one experiment uses at most one land plot. Keep the first
    // valid AI-selected plot and persist it against the existing land requirement.
    const selectedLand = selectedPlan.allocatedLands.find(
      (item) => Number(item.landId || 0) > 0
    );

    if (selectedLand) {
      const landId = Number(selectedLand.landId);
      const requirement = findLandRequirement(
        selectedLand.soilType,
        selectedLand.areaSize
      );

      if (!requirement?.expLandReqId) {
        throw new Error(
          `Unable to match ${selectedLand.landCode || `land #${landId}`} to an Experiment Land Requirement.`
        );
      }

      await createAllocationLandDetail({
        allocationPlanId: planId,
        landId,
        expLandReqId: requirement.expLandReqId,
        startDate: toAllocationDateTime(
          selectedLand.startDate || experiment.expectStartDate
        ),
        endDate: toAllocationDateTime(
          selectedLand.endDate || experiment.expectEndDate,
          true
        ),
        status: "Allocated",
      });
    } else if (landReqs.length > 0) {
      throw new Error("The selected AI option does not contain a valid land plot.");
    }
  };

  // Apply the Researcher's chosen AI candidate to a Draft Allocation Plan,
  // persist its exact Fitness Score, then submit Draft -> Pending for Manager.
  const handleApplySelectedPlan = async () => {
    if (!experiment || !selectedPlan) return;

    const fitnessScore = Number(selectedPlan.fitnessScore);

    if (!Number.isFinite(fitnessScore)) {
      sendLocalNotification({
        title: "Invalid AI Fitness Score",
        message: "The selected AI candidate does not contain a valid Fitness Score.",
        notificationType: "Error",
      });
      return;
    }

    const confirmed = window.confirm(
      `Submit AI Candidate #${selectedPlan.rank} with Fitness Score ${fitnessScore.toFixed(2)} for Manager review?`
    );

    if (!confirmed) return;

    try {
      setApplying(true);
      setError(null);

      const planId = await ensureDraftAllocationPlan();

      // If this experiment already had a Manual/AI Draft, replace only the
      // Draft's allocation resources. Never modify the Experiment requirements.
      await clearDraftAllocationResources(planId);
      await persistSelectedAIResources(planId);

      // Persist the exact score the Researcher reviewed. No hard-coded fallback.
      await updateAllocationPlan(planId, {
        experimentId: experiment.experimentId,
        fitnessScore,
        approveStatus: "Draft",
      });

      // Use the exact same state transition as Manual Allocation.
      await submitAllocationPlan(planId);

      sendLocalNotification({
        title: "AI Allocation Plan Submitted",
        message: `Candidate #${selectedPlan.rank} for "${experiment.experimentName}" was submitted with Fitness Score ${fitnessScore.toFixed(2)} for Manager review.`,
        notificationType: "Success",
        referenceType: "AllocationPlan",
        referenceId: planId,
      });
      void fetchUnreadCount();

      navigate(`/allocation/${planId}`, {
        state: {
          message: `AI Candidate #${selectedPlan.rank} submitted successfully. Fitness Score: ${fitnessScore.toFixed(2)}.`,
          planningMethod: "AI",
        },
      });
    } catch (err: any) {
      console.error("Failed to apply AI Plan:", err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to apply AI suggestion.";

      setError(message);
      sendLocalNotification({
        title: "Error Applying AI Plan",
        message,
        notificationType: "Error",
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="ai-page-container">
        {/* Breadcrumb Navigation */}
        <div className="ai-page-breadcrumb">
          <Link to="/dashboard">Dashboard</Link>
          <ChevronRight size={14} />
          <Link to="/experiments">Experiments</Link>
          <ChevronRight size={14} />
          {experiment ? (
            <Link to={`/experiments/${experiment.experimentId}`}>
              {experiment.experimentName}
            </Link>
          ) : (
            <span>Experiment Planning</span>
          )}
          <ChevronRight size={14} />
          <span style={{ color: "#0f172a", fontWeight: 700 }}>
            AI Allocation Suggestions
          </span>
        </div>

        {/* Page Header */}
        <div className="ai-page-header">
          <div className="ai-page-title-area">
            <div>
              <h1>AI Allocation Suggestions</h1>
              <p>
                Genetic algorithm evaluated allocation candidates for equipment, land plots, personnel, and schedule timelines.
              </p>
            </div>
          </div>

          <div className="ai-page-header-actions">
            <button
              type="button"
              onClick={() => {
                if (experiment) {
                  navigate(`/experiments/${experiment.experimentId}`);
                } else {
                  navigate("/experiments");
                }
              }}
              className="btn-secondary-white"
              style={{ fontSize: "13px" }}
            >
              Back to Experiment
            </button>

            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="btn-secondary-white"
              style={{ fontSize: "13px" }}
            >
              Algorithm Settings
            </button>

            <button
              type="button"
              onClick={() => {
                if (selectedExpId) {
                  loadDataAndRunAI(selectedExpId, settings);
                }
              }}
              disabled={loadingAI || loadingExp}
              className="btn-primary-green"
              style={{ fontSize: "13px" }}
            >
              {loadingAI ? "Optimizing..." : "Re-run Optimization"}
            </button>
          </div>
        </div>

        {/* Experiment Context Selector Card */}
        <div className="ai-exp-summary-card">
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div>
              <label
                htmlFor="experiment-picker-select"
                style={{
                  fontSize: "11px",
                  fontWeight: 750,
                  color: "#64748b",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Target Experiment
              </label>
              <select
                id="experiment-picker-select"
                value={selectedExpId || ""}
                onChange={(e) => {
                  const newId = Number(e.target.value);
                  setSelectedExpId(newId);
                  navigate(`/experiments/${newId}/ai-suggestions`);
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: "7px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#0f172a",
                  background: "#ffffff",
                  minWidth: "260px",
                  outline: "none",
                }}
              >
                {allExperiments.length === 0 ? (
                  <option value="">No Draft Experiments Available</option>
                ) : (
                  allExperiments.map((exp) => (
                    <option key={exp.experimentId} value={exp.experimentId}>
                      #{exp.experimentId} - {exp.experimentName} (Draft)
                    </option>
                  ))
                )}
              </select>
            </div>

            {experiment && (
              <div className="ai-exp-meta-items" style={{ paddingLeft: "16px", borderLeft: "1px solid #e2e8f0" }}>
                <div className="ai-exp-meta-item">
                  <span>
                    Schedule: <strong>{formatDate(experiment.expectStartDate)}</strong> →{" "}
                    <strong>{formatDate(experiment.expectEndDate)}</strong>
                  </span>
                </div>
                <div className="ai-exp-meta-item">
                  <span>
                    Deadline: <strong>{formatDate(experiment.deadline)}</strong>
                  </span>
                </div>
                <div className="ai-exp-meta-item">
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: "#e0f2fe",
                      color: "#0369a1",
                    }}
                  >
                    Priority: {experiment.priority ?? 1}
                  </span>
                </div>
              </div>
            )}
          </div>

          {experiment && (
            <div style={{ display: "flex", gap: "8px" }}>
              <span className="planning-draft-badge" style={{ fontSize: "11.5px", padding: "4px 10px" }}>
                Status: {experiment.status}
              </span>
            </div>
          )}
        </div>

        {/* Algorithm Settings Panel - Clean & Modern Redesign */}
        {showSettings && (
          <div className="ai-settings-card">
            {/* Settings Header */}
            <div className="ai-settings-header">
              <div>
                <h3 className="ai-settings-title">
                  Genetic Algorithm Parameters & Constraint Weights
                </h3>
                <p className="ai-settings-subtitle">
                  Configure solver population, generation iterations, and multi-objective optimization weights.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSettings(DEFAULT_OPTIMIZATION_SETTINGS)}
                className="ai-settings-reset-btn"
              >
                Reset to Default
              </button>
            </div>

            {/* Content 2-Column Split */}
            <div className="ai-settings-grid">
              {/* Group 1: GA Core Parameters */}
              <div className="ai-settings-group">
                <div className="ai-settings-group-header">
                  <span>GA Solver Parameters</span>
                </div>
                <div className="ai-settings-fields-grid">
                  <div className="ai-input-wrapper">
                    <label>Population Size</label>
                    <div className="ai-input-box">
                      <input
                        type="number"
                        min="10"
                        max="500"
                        value={settings.populationSize ?? 100}
                        onChange={(e) =>
                          setSettings({ ...settings, populationSize: Number(e.target.value) })
                        }
                      />
                      <span className="ai-input-unit">candidates</span>
                    </div>
                  </div>

                  <div className="ai-input-wrapper">
                    <label>Generation Count</label>
                    <div className="ai-input-box">
                      <input
                        type="number"
                        min="10"
                        max="300"
                        value={settings.generationCount ?? 80}
                        onChange={(e) =>
                          setSettings({ ...settings, generationCount: Number(e.target.value) })
                        }
                      />
                      <span className="ai-input-unit">rounds</span>
                    </div>
                  </div>

                  <div className="ai-input-wrapper">
                    <label>Crossover Rate</label>
                    <div className="ai-input-box">
                      <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        max="1.0"
                        value={settings.crossoverRate ?? 0.8}
                        onChange={(e) =>
                          setSettings({ ...settings, crossoverRate: Number(e.target.value) })
                        }
                      />
                      <span className="ai-input-unit">rate</span>
                    </div>
                  </div>

                  <div className="ai-input-wrapper">
                    <label>Schedule Shift Max</label>
                    <div className="ai-input-box">
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={settings.maxScheduleShiftDays ?? 7}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            maxScheduleShiftDays: Number(e.target.value),
                          })
                        }
                      />
                      <span className="ai-input-unit">days</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 2: Constraint & Objective Weights */}
              <div className="ai-settings-group">
                <div className="ai-settings-group-header">
                  <span>
                    Objective Weights (
                    {(settings.landWeight ?? 25) +
                      (settings.humanWeight ?? 25) +
                      (settings.equipmentWeight ?? 25) +
                      (settings.scheduleWeight ?? 25)}
                    )
                  </span>
                </div>
                <div className="ai-settings-fields-grid">
                  <div className="ai-input-wrapper">
                    <label>Land Weight</label>
                    <div className="ai-input-box">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={settings.landWeight ?? 25}
                        onChange={(e) =>
                          setSettings({ ...settings, landWeight: Number(e.target.value) })
                        }
                      />
                      <span className="ai-input-unit">pts</span>
                    </div>
                  </div>

                  <div className="ai-input-wrapper">
                    <label>Human Weight</label>
                    <div className="ai-input-box">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={settings.humanWeight ?? 25}
                        onChange={(e) =>
                          setSettings({ ...settings, humanWeight: Number(e.target.value) })
                        }
                      />
                      <span className="ai-input-unit">pts</span>
                    </div>
                  </div>

                  <div className="ai-input-wrapper">
                    <label>Equipment Weight</label>
                    <div className="ai-input-box">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={settings.equipmentWeight ?? 25}
                        onChange={(e) =>
                          setSettings({ ...settings, equipmentWeight: Number(e.target.value) })
                        }
                      />
                      <span className="ai-input-unit">pts</span>
                    </div>
                  </div>

                  <div className="ai-input-wrapper">
                    <label>Schedule Weight</label>
                    <div className="ai-input-box">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={settings.scheduleWeight ?? 25}
                        onChange={(e) =>
                          setSettings({ ...settings, scheduleWeight: Number(e.target.value) })
                        }
                      />
                      <span className="ai-input-unit">pts</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer action */}
            <div className="ai-settings-footer">
              <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                Higher weight prioritizes satisfying constraints for that specific resource category.
              </span>
              <button
                type="button"
                onClick={() => {
                  if (selectedExpId) {
                    loadDataAndRunAI(selectedExpId, settings);
                  }
                }}
                className="btn-primary-green"
                style={{ padding: "9px 22px", fontSize: "13.5px" }}
              >
                Apply Parameters & Run Solver
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {(loadingExp || loadingAI) && (
          <div style={{ textAlign: "center", padding: "80px 20px", background: "#ffffff", borderRadius: "20px", border: "1px solid #e2e8f0" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                border: "4px solid #bbf7d0",
                borderTopColor: "#16a34a",
                borderRadius: "50%",
                margin: "0 auto 20px",
                animation: "spin 1s linear infinite",
              }}
            />
            <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>
              Running Genetic Algorithm Optimization...
            </h3>
            <p style={{ fontSize: "14px", color: "#64748b", maxWidth: "560px", margin: "0 auto" }}>
              Evaluating population size {settings.populationSize || 100} across {settings.generationCount || 80} generations.
              Resolving resource contentions, equipment availability, staff workload, and land plot parameters.
            </p>
          </div>
        )}

        {/* Error State */}
        {!loadingExp && !loadingAI && error && (
          <div className="planning-alert-error" style={{ textAlign: "center", padding: "40px", background: "#ffffff", borderRadius: "20px" }}>
            <AlertTriangle size={42} color="#b91c1c" style={{ margin: "0 auto 14px" }} />
            <h3 style={{ fontSize: "19px", fontWeight: 800, color: "#991b1b", marginBottom: "8px" }}>
              AI Optimization Issue
            </h3>
            <p style={{ fontSize: "14.5px", color: "#b91c1c", maxWidth: "550px", margin: "0 auto 24px" }}>
              {error}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
              <button
                type="button"
                onClick={() => {
                  if (selectedExpId) loadDataAndRunAI(selectedExpId, settings);
                }}
                className="btn-primary-green"
              >
                <RefreshCw size={16} /> Retry Optimization
              </button>
              <button
                type="button"
                onClick={() => {
                  if (experiment) navigate(`/experiments/${experiment.experimentId}/edit`);
                }}
                className="btn-secondary-white"
              >
                Edit Experiment Manually
              </button>
            </div>
          </div>
        )}

        {/* Content View: Candidate Plans Ready */}
        {!loadingExp && !loadingAI && !error && suggestions.length > 0 && (
          <div>
            {/* Top 5 Candidates Grid */}
            <div className="ai-candidates-grid">
              {suggestions.map((plan) => {
                const isSelected = plan.id === selectedPlanId;
                const isTop = plan.rank === 1;
                const hasConflicts = plan.conflictCount > 0;

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`ai-candidate-card ${isSelected ? "active" : ""}`}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span className={`ai-candidate-rank-badge ${isTop ? "recommended" : "standard"}`}>
                          {isTop ? "Rank #1 (Best Fit)" : `Rank #${plan.rank}`}
                        </span>
                        {isSelected && (
                          <span style={{ fontSize: "11.5px", fontWeight: 750, color: "#16a34a" }}>
                            Selected
                          </span>
                        )}
                      </div>

                      <div className="ai-candidate-score">
                        {plan.fitnessScore.toFixed(1)}
                        <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 600, marginLeft: "4px" }}>
                          Fitness
                        </span>
                      </div>

                      <div>
                        {hasConflicts ? (
                          <span className="ai-candidate-conflict-pill has-conflicts">
                            {plan.conflictCount} Conflicts
                          </span>
                        ) : (
                          <span className="ai-candidate-conflict-pill clean">
                            0 Conflicts
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="ai-candidate-footer">
                      <span>{plan.estimatedDurationDays} Days</span>
                      <span>End: {formatDate(plan.estimatedCompletionTime)}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Plan Detailed Workspace Card */}
            {selectedPlan && (
              <div className="ai-workspace-card">
                {/* Workspace Banner */}
                <div className="ai-workspace-banner">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 650,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: selectedPlan.rank === 1 ? "#dcfce7" : "#f1f5f9",
                          color: selectedPlan.rank === 1 ? "#15803d" : "#475569",
                          border: selectedPlan.rank === 1 ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                        }}
                      >
                        Option #{selectedPlan.rank} • {selectedPlan.strategyBadge}
                      </span>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        Est. Completion: <strong>{formatDate(selectedPlan.estimatedCompletionTime)}</strong>
                      </span>
                    </div>
                    <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                      {selectedPlan.title}
                    </h2>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="ai-metrics-row">
                    <div className="ai-metric-pill">
                      <div className="label">FITNESS SCORE</div>
                      <div className="val">{selectedPlan.fitnessScore.toFixed(1)}</div>
                    </div>

                    <div
                      className="ai-metric-pill"
                      style={{
                        background: selectedPlan.penaltyScore < 0 ? "#fef2f2" : "#f8fafc",
                        borderColor: selectedPlan.penaltyScore < 0 ? "#fecaca" : "#e2e8f0",
                      }}
                    >
                      <div className="label">PENALTY POINTS</div>
                      <div
                        className="val"
                        style={{ color: selectedPlan.penaltyScore < 0 ? "#dc2626" : "#0f172a" }}
                      >
                        {selectedPlan.penaltyScore}
                      </div>
                    </div>

                    <div
                      className="ai-metric-pill"
                      style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}
                    >
                      <div className="label">BONUS POINTS</div>
                      <div className="val" style={{ color: "#16a34a" }}>
                        +{selectedPlan.bonusScore}
                      </div>
                    </div>

                    <div
                      className="ai-metric-pill"
                      style={{
                        background: selectedPlan.conflictCount > 0 ? "#fffbeb" : "#f0fdf4",
                        borderColor: selectedPlan.conflictCount > 0 ? "#fde68a" : "#bbf7d0",
                      }}
                    >
                      <div className="label">CONFLICT COUNT</div>
                      <div
                        className="val"
                        style={{ color: selectedPlan.conflictCount > 0 ? "#d97706" : "#16a34a" }}
                      >
                        {selectedPlan.conflictCount}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="ai-workspace-tabs">
                  <button
                    type="button"
                    onClick={() => setActiveTab("overview")}
                    className={`ai-tab-btn ${activeTab === "overview" ? "active" : ""}`}
                  >
                    Overview & Scores
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("equipment")}
                    className={`ai-tab-btn ${activeTab === "equipment" ? "active" : ""}`}
                  >
                    Allocated Equipment ({selectedPlan.allocatedEquipment?.length || 0})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("humans")}
                    className={`ai-tab-btn ${activeTab === "humans" ? "active" : ""}`}
                  >
                    Personnel Assigned ({selectedPlan.allocatedHumans?.length || 0})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("lands")}
                    className={`ai-tab-btn ${activeTab === "lands" ? "active" : ""}`}
                  >
                    Plots & Land ({selectedPlan.allocatedLands?.length || 0})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("conflicts")}
                    className={`ai-tab-btn conflict-tab ${activeTab === "conflicts" ? "active" : ""}`}
                  >
                    Warnings & Conflicts ({selectedPlan.conflictCount})
                  </button>
                </div>

                {/* Tab Workspace Body */}
                <div className="ai-workspace-body">
                  {/* TAB 1: OVERVIEW */}
                  {activeTab === "overview" && (
                    <div>
                      {/* 4-Pillar Score Meters */}
                      <div className="ai-scores-grid">
                        <div className="ai-score-card">
                          <div className="ai-score-header">
                            <span>Land Compatibility</span>
                            <span style={{ color: "#16a34a", fontWeight: 650 }}>
                              {selectedPlan.fitnessBreakdown?.landScore ?? 0}/100
                            </span>
                          </div>
                          <div className="ai-progress-bar-bg">
                            <div
                              className="ai-progress-bar-fill"
                              style={{
                                width: `${Math.min(100, selectedPlan.fitnessBreakdown?.landScore ?? 0)}%`,
                                background: "#16a34a",
                              }}
                            />
                          </div>
                        </div>

                        <div className="ai-score-card">
                          <div className="ai-score-header">
                            <span>Human Workload</span>
                            <span style={{ color: "#7c3aed", fontWeight: 650 }}>
                              {selectedPlan.fitnessBreakdown?.humanScore ?? 0}/100
                            </span>
                          </div>
                          <div className="ai-progress-bar-bg">
                            <div
                              className="ai-progress-bar-fill"
                              style={{
                                width: `${Math.min(100, selectedPlan.fitnessBreakdown?.humanScore ?? 0)}%`,
                                background: "#7c3aed",
                              }}
                            />
                          </div>
                        </div>

                        <div className="ai-score-card">
                          <div className="ai-score-header">
                            <span>Equipment Utilization</span>
                            <span style={{ color: "#0284c7", fontWeight: 650 }}>
                              {selectedPlan.fitnessBreakdown?.equipmentScore?.toFixed(1) ?? 0}/100
                            </span>
                          </div>
                          <div className="ai-progress-bar-bg">
                            <div
                              className="ai-progress-bar-fill"
                              style={{
                                width: `${Math.min(100, selectedPlan.fitnessBreakdown?.equipmentScore ?? 0)}%`,
                                background: "#0284c7",
                              }}
                            />
                          </div>
                        </div>

                        <div className="ai-score-card">
                          <div className="ai-score-header">
                            <span>Schedule Efficiency</span>
                            <span style={{ color: "#d97706", fontWeight: 650 }}>
                              {selectedPlan.fitnessBreakdown?.scheduleScore?.toFixed(1) ?? 0}/100
                            </span>
                          </div>
                          <div className="ai-progress-bar-bg">
                            <div
                              className="ai-progress-bar-fill"
                              style={{
                                width: `${Math.min(100, selectedPlan.fitnessBreakdown?.scheduleScore ?? 0)}%`,
                                background: "#d97706",
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Advantages vs Potential Bottlenecks */}
                      <div className="ai-insights-grid">
                        <div className="ai-insight-box advantages">
                          <h3>Advantages & Strengths</h3>
                          {selectedPlan.advantages && selectedPlan.advantages.length > 0 ? (
                            <ul>
                              {selectedPlan.advantages.map((adv, idx) => (
                                <li key={idx}>{adv}</li>
                              ))}
                            </ul>
                          ) : (
                            <p style={{ margin: 0, fontSize: "13px", color: "#166534" }}>
                              Candidate generated from available resources and requirements.
                            </p>
                          )}
                        </div>

                        <div className="ai-insight-box warnings">
                          <h3>Potential Bottlenecks ({selectedPlan.conflictCount})</h3>
                          {selectedPlan.disadvantages && selectedPlan.disadvantages.length > 0 ? (
                            <ul>
                              {selectedPlan.disadvantages.slice(0, 5).map((dis, idx) => (
                                <li key={idx}>{dis}</li>
                              ))}
                              {selectedPlan.disadvantages.length > 5 && (
                                <li style={{ fontWeight: 700, color: "#b45309" }}>
                                  +{selectedPlan.disadvantages.length - 5} more warnings in Warnings Tab
                                </li>
                              )}
                            </ul>
                          ) : (
                            <p style={{ margin: 0, fontSize: "13px", color: "#15803d", fontWeight: 700 }}>
                              No hard constraint conflicts detected.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Timeline Execution List */}
                      <div>
                        <h3 style={{ fontSize: "15px", fontWeight: 750, color: "#0f172a", margin: "0 0 14px" }}>
                          Phase Execution Timeline
                        </h3>
                        <div className="ai-timeline-list">
                          {(selectedPlan.timeline && selectedPlan.timeline.length > 0
                            ? selectedPlan.timeline
                            : selectedPlan.experimentPhases
                          ).map((phase, pIdx) => {
                            const pName = "phaseName" in phase ? phase.phaseName : `Phase ${pIdx + 1}`;
                            const pStart = "startDate" in phase && phase.startDate ? formatDate(phase.startDate) : "expectedStartDate" in phase && phase.expectedStartDate ? formatDate(phase.expectedStartDate) : "-";
                            const pEnd = "endDate" in phase && phase.endDate ? formatDate(phase.endDate) : "expectedEndDate" in phase && phase.expectedEndDate ? formatDate(phase.expectedEndDate) : "-";
                            const pDuration = "durationDays" in phase ? phase.durationDays : undefined;

                            return (
                              <div key={pIdx} className="ai-timeline-item">
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                  <span
                                    style={{
                                      width: "28px",
                                      height: "28px",
                                      borderRadius: "50%",
                                      background: "#16a34a",
                                      color: "#ffffff",
                                      fontSize: "12px",
                                      fontWeight: 800,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    {pIdx + 1}
                                  </span>
                                  <div>
                                    <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                                      {pName}
                                    </strong>
                                  </div>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "#475569" }}>
                                  <span style={{ fontSize: "13px", fontWeight: 600 }}>
                                    {pStart} → {pEnd}
                                  </span>
                                  {pDuration !== undefined && (
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        fontWeight: 800,
                                        background: "#f1f5f9",
                                        padding: "3px 10px",
                                        borderRadius: "6px",
                                        color: "#1e293b",
                                      }}
                                    >
                                      {pDuration} Days
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: ALLOCATED EQUIPMENT */}
                  {activeTab === "equipment" && (
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: 750, color: "#0f172a", margin: "0 0 14px" }}>
                        Allocated Equipment Instances ({selectedPlan.allocatedEquipment?.length || 0})
                      </h3>
                      {selectedPlan.allocatedEquipment && selectedPlan.allocatedEquipment.length > 0 ? (
                        <div className="ai-table-container">
                          <table className="ai-table">
                            <thead>
                              <tr>
                                <th>Asset Code</th>
                                <th>Equipment Type</th>
                                <th>Phase</th>
                                <th>Substitution Status</th>
                                <th>Efficiency</th>
                                <th>Time Multiplier</th>
                                <th>Usage Period</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedPlan.allocatedEquipment.map((eq, eIdx) => (
                                <tr key={eIdx}>
                                  <td>
                                    <strong style={{ color: "#0284c7" }}>
                                      {eq.assetCode || `Unit #${eq.equipmentInstanceId}`}
                                    </strong>
                                  </td>
                                  <td>{eq.equipmentTypeName || `Type #${eq.allocatedEquipmentTypeId}`}</td>
                                  <td>{eq.phaseName || `Phase #${eq.phaseId}`}</td>
                                  <td>
                                    {eq.isSubstitute ? (
                                      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800">
                                        Substitute Unit
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                                        Exact Match
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    <strong>{Math.round((eq.efficiencyRate ?? 1) * 100)}</strong>
                                  </td>
                                  <td>{eq.timeMultiplier ? `${eq.timeMultiplier}x` : "1.0x"}</td>
                                  <td>
                                    {formatDate(eq.startDate)} → {formatDate(eq.endDate)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p style={{ color: "#64748b", margin: 0 }}>No equipment instances allocated for this plan.</p>
                      )}
                    </div>
                  )}

                  {/* TAB 3: ALLOCATED PERSONNEL */}
                  {activeTab === "humans" && (
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: 750, color: "#0f172a", margin: "0 0 14px" }}>
                        Assigned Personnel ({selectedPlan.allocatedHumans?.length || 0})
                      </h3>
                      {selectedPlan.allocatedHumans && selectedPlan.allocatedHumans.length > 0 ? (
                        <div className="ai-table-container">
                          <table className="ai-table">
                            <thead>
                              <tr>
                                <th>Personnel Full Name</th>
                                <th>Phase</th>
                                <th>Current Active Workload</th>
                                <th>Assignment Period</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedPlan.allocatedHumans.map((h, hIdx) => (
                                <tr key={hIdx}>
                                  <td>
                                    <strong style={{ color: "#7c3aed" }}>
                                      {h.fullName || `Staff #${h.humanResourceId}`}
                                    </strong>
                                  </td>
                                  <td>{h.phaseName || `Phase #${h.phaseId}`}</td>
                                  <td>
                                    <span style={{ fontWeight: 700, color: "#334155" }}>
                                      {h.currentWorkload ?? 0} active assignments
                                    </span>
                                  </td>
                                  <td>
                                    {formatDate(h.startDate)} → {formatDate(h.endDate)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p style={{ color: "#64748b", margin: 0 }}>No personnel assigned for this plan.</p>
                      )}
                    </div>
                  )}

                  {/* TAB 4: ALLOCATED LAND PLOTS */}
                  {activeTab === "lands" && (
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: 750, color: "#0f172a", margin: "0 0 14px" }}>
                        Allocated Land Plots ({selectedPlan.allocatedLands?.length || 0})
                      </h3>
                      {selectedPlan.allocatedLands && selectedPlan.allocatedLands.length > 0 ? (
                        <div className="ai-table-container">
                          <table className="ai-table">
                            <thead>
                              <tr>
                                <th>Plot Code</th>
                                <th>Soil Type</th>
                                <th>Area Size (m²)</th>
                                <th>Phase</th>
                                <th>Usage Period</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedPlan.allocatedLands.map((l, lIdx) => (
                                <tr key={lIdx}>
                                  <td>
                                    <strong style={{ color: "#15803d" }}>
                                      {l.landCode || `Plot #${l.landId}`}
                                    </strong>
                                  </td>
                                  <td>
                                    <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                      {l.soilType || "Standard Soil"}
                                    </span>
                                  </td>
                                  <td>
                                    <strong style={{ color: "#0f172a" }}>
                                      {l.areaSize?.toLocaleString()} m²
                                    </strong>
                                  </td>
                                  <td>{l.phaseName || `Phase #${l.phaseId}`}</td>
                                  <td>
                                    {formatDate(l.startDate)} → {formatDate(l.endDate)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p style={{ color: "#64748b", margin: 0 }}>No land plots allocated for this plan.</p>
                      )}
                    </div>
                  )}

                  {/* TAB 5: WARNINGS & CONFLICT DIAGNOSTICS */}
                  {activeTab === "conflicts" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                      <div
                        style={{
                          background: selectedPlan.conflictCount > 0 ? "#fffbeb" : "#f0fdf4",
                          border: `1px solid ${selectedPlan.conflictCount > 0 ? "#fde68a" : "#dcfce7"}`,
                          borderRadius: "12px",
                          padding: "18px",
                        }}
                      >
                        <h4
                          style={{
                            fontSize: "15px",
                            fontWeight: 750,
                            color: selectedPlan.conflictCount > 0 ? "#b45309" : "#15803d",
                            margin: "0 0 6px",
                          }}
                        >
                          Total Detected Bottlenecks: {selectedPlan.conflictCount}
                        </h4>
                        <p style={{ fontSize: "13.5px", color: "#64748b", margin: 0 }}>
                          The genetic algorithm applied soft and hard constraint penalties to calculate the final fitness score.
                        </p>
                      </div>

                      {selectedPlan.constraintReport ? (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                          {selectedPlan.constraintReport.landConflicts && selectedPlan.constraintReport.landConflicts.length > 0 && (
                            <div style={{ background: "#ffffff", border: "1px solid #fee2e2", borderRadius: "10px", padding: "14px" }}>
                              <strong style={{ fontSize: "13px", color: "#991b1b", display: "block", marginBottom: "8px" }}>
                                Land Conflicts ({selectedPlan.constraintReport.landConflicts.length})
                              </strong>
                              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "#7f1d1d", lineHeight: "1.6" }}>
                                {selectedPlan.constraintReport.landConflicts.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {selectedPlan.constraintReport.humanConflicts && selectedPlan.constraintReport.humanConflicts.length > 0 && (
                            <div style={{ background: "#ffffff", border: "1px solid #fee2e2", borderRadius: "10px", padding: "14px" }}>
                              <strong style={{ fontSize: "13px", color: "#991b1b", display: "block", marginBottom: "8px" }}>
                                Human Workload Conflicts ({selectedPlan.constraintReport.humanConflicts.length})
                              </strong>
                              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "#7f1d1d", lineHeight: "1.6" }}>
                                {selectedPlan.constraintReport.humanConflicts.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {selectedPlan.constraintReport.equipmentConflicts && selectedPlan.constraintReport.equipmentConflicts.length > 0 && (
                            <div style={{ background: "#ffffff", border: "1px solid #fee2e2", borderRadius: "10px", padding: "14px" }}>
                              <strong style={{ fontSize: "13px", color: "#991b1b", display: "block", marginBottom: "8px" }}>
                                Equipment Conflicts ({selectedPlan.constraintReport.equipmentConflicts.length})
                              </strong>
                              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "#7f1d1d", lineHeight: "1.6" }}>
                                {selectedPlan.constraintReport.equipmentConflicts.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {selectedPlan.constraintReport.scheduleConflicts && selectedPlan.constraintReport.scheduleConflicts.length > 0 && (
                            <div style={{ background: "#ffffff", border: "1px solid #fee2e2", borderRadius: "10px", padding: "14px" }}>
                              <strong style={{ fontSize: "13px", color: "#991b1b", display: "block", marginBottom: "8px" }}>
                                Schedule Overlap Conflicts ({selectedPlan.constraintReport.scheduleConflicts.length})
                              </strong>
                              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "#7f1d1d", lineHeight: "1.6" }}>
                                {selectedPlan.constraintReport.scheduleConflicts.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {selectedPlan.constraintReport.skillConflicts && selectedPlan.constraintReport.skillConflicts.length > 0 && (
                            <div style={{ background: "#ffffff", border: "1px solid #fee2e2", borderRadius: "10px", padding: "14px" }}>
                              <strong style={{ fontSize: "13px", color: "#991b1b", display: "block", marginBottom: "8px" }}>
                                Skill Mismatch Conflicts ({selectedPlan.constraintReport.skillConflicts.length})
                              </strong>
                              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "#7f1d1d", lineHeight: "1.6" }}>
                                {selectedPlan.constraintReport.skillConflicts.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {selectedPlan.constraintReport.roleConflicts && selectedPlan.constraintReport.roleConflicts.length > 0 && (
                            <div style={{ background: "#ffffff", border: "1px solid #fee2e2", borderRadius: "10px", padding: "14px" }}>
                              <strong style={{ fontSize: "13px", color: "#991b1b", display: "block", marginBottom: "8px" }}>
                                Role Missing Conflicts ({selectedPlan.constraintReport.roleConflicts.length})
                              </strong>
                              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "#7f1d1d", lineHeight: "1.6" }}>
                                {selectedPlan.constraintReport.roleConflicts.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {selectedPlan.constraintReport.deadlineConflicts && selectedPlan.constraintReport.deadlineConflicts.length > 0 && (
                            <div style={{ background: "#ffffff", border: "1px solid #fee2e2", borderRadius: "10px", padding: "14px" }}>
                              <strong style={{ fontSize: "13px", color: "#991b1b", display: "block", marginBottom: "8px" }}>
                                Deadline Breach Conflicts ({selectedPlan.constraintReport.deadlineConflicts.length})
                              </strong>
                              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "#7f1d1d", lineHeight: "1.6" }}>
                                {selectedPlan.constraintReport.deadlineConflicts.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                          <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#334155" }}>
                            {selectedPlan.disadvantages?.map((dis, idx) => (
                              <li key={idx}>{dis}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sticky Bottom Action Bar */}
            {selectedPlan && (
              <div className="ai-sticky-action-bar">
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (experiment) navigate(`/experiments/${experiment.experimentId}`);
                    }}
                    className="btn-secondary-white"
                  >
                    Back to Experiment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (experiment) navigate(`/experiments/${experiment.experimentId}/edit`);
                    }}
                    className="btn-secondary-white"
                  >
                    Switch to Manual Planning
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>
                    Applying plan will submit experiment for Manager review.
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleApplySelectedPlan()}
                    disabled={applying}
                    className="btn-primary-green"
                    style={{ padding: "12px 28px", fontSize: "14.5px" }}
                  >
                    {applying
                      ? "Applying & Submitting Plan..."
                      : `Apply & Submit Candidate #${selectedPlan.rank}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
