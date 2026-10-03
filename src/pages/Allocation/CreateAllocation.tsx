import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import { useNotification } from "../../context/NotificationContext";
import api from "../../services/api";

import { getExperimentById, getExperiments } from "../../services/experimentService";
import { getEquipmentInstances } from "../../services/equipmentInstanceService";
import { getEquipmentTypes, type EquipmentType } from "../../services/equipmentService";
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
  getAllocationPlans,
  simulateAllocationPlanFitness,
  submitAllocationPlan,
} from "../../services/allocationPlanService";

import {
  createAllocationEquipmentDetail,
  createAllocationHumanDetail,
  createAllocationLandDetail,
  deleteAllocationEquipmentDetail,
  deleteMyAllocationEquipmentDetail,
  deleteAllocationHumanDetail,
  getAllAllocationEquipmentDetails,
  getAllAllocationLandDetails,
  getAllocationEquipmentDetails,
  getAllocationHumanDetails,
  getAllocationLandDetails,
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
import type {
  AllocationEquipmentDetail,
  AllocationEquipmentDetailRequest,
} from "../../types/allocationDetail";
import type { AllocationLandDetail } from "../../types/allocationLand";

import type {
  AllocationHumanDetailRequest,
} from "../../types/allocationHumanDetail";

import type {
  AllocationLandDetailRequest,
} from "../../types/allocationLand";

import "./CreateAllocation.css";

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "-";

  const d = new Date(dateStr);

  if (Number.isNaN(d.getTime())) {
    return dateStr;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function convertDateToIso(
  d?: string | null,
  endOfDay = false
): string {
  if (!d) {
    return new Date().toISOString();
  }

  if (d.includes("T")) {
    return d;
  }

  const clean = d.slice(0, 10);

  return endOfDay
    ? `${clean}T23:59:59`
    : `${clean}T00:00:00`;
}

type EvaluationWeightPlan = {
  equipmentWeight: number;
  humanWeight: number;
  landWeight: number;
  scheduleWeight: number;
};

type PhaseEquipmentRequirementRuntime = {
  phaseEquipmentReqId: number;
  phaseId: number;
  experimentId?: number | null;
  equipmentTypeId: number;
  quantity?: number;
  note?: string | null;
};

type PhaseHumanRequirementRuntime = {
  phaseHumanReqId: number;
  phaseId: number;
  experimentId?: number | null;
  roleId: number;
  quantity?: number;
  requiredSkillId?: number | null;
  note?: string | null;
};

type FitnessComponentKey =
  | "equipment"
  | "human"
  | "land"
  | "schedule"
  | "maintenance";

type FitnessComponentResult = {
  score: number | null;
  weight: number;
  contribution: number | null;
};

type FitnessBreakdown = Record<
  FitnessComponentKey,
  FitnessComponentResult
> & {
  penaltyScore: number | null;
  bonusScore: number | null;
};

function readNumber(
  source: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = source[key];

    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (
      typeof value === "string" &&
      value.trim() !== ""
    ) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

const validateEquipmentInstanceAvailability = async (
  equipmentInstanceId: number,
  startDate: string,
  endDate: string,
  assetCode?: string
) => {
  let existingDetails;

  try {
    existingDetails = await getAllocationEquipmentDetails({
      equipmentInstanceId,
      size: 300,
    });
  } catch (availabilityError) {
    console.warn(
      "Unable to pre-check equipment allocation conflicts; the API will validate availability:",
      availabilityError
    );
    return;
  }

  const requestedStart = new Date(startDate).getTime();
  const requestedEnd = new Date(endDate).getTime();
  if (!Number.isFinite(requestedStart) || !Number.isFinite(requestedEnd)) {
    return;
  }

  const overlappingDetails = existingDetails.filter((detail) => {
    const status = String(detail.status || "").toLowerCase();
    const detailStart = new Date(detail.startDate).getTime();
    const detailEnd = new Date(detail.endDate).getTime();

    return (
      Number(detail.equipmentInstanceId) === equipmentInstanceId &&
      status !== "cancelled" &&
      status !== "completed" &&
      Number.isFinite(detailStart) &&
      Number.isFinite(detailEnd) &&
      detailStart < requestedEnd &&
      requestedStart < detailEnd
    );
  });

  if (overlappingDetails.length === 0) return;

  const planStatuses = await Promise.all(
    [...new Set(overlappingDetails.map((detail) => detail.allocationPlanId))].map(
      async (conflictPlanId) => {
        try {
          const response = await api.get(
            `/AllocationPlans/${conflictPlanId}`
          );
          const conflictPlan =
            response.data?.data ||
            response.data?.result ||
            response.data;

          return [
            conflictPlanId,
            String(conflictPlan?.approveStatus || "").toLowerCase(),
          ] as const;
        } catch {
          return [conflictPlanId, "unknown"] as const;
        }
      }
    )
  );
  const rejectedPlanIds = new Set(
    planStatuses
      .filter(([, status]) => status === "rejected")
      .map(([conflictPlanId]) => conflictPlanId)
  );
  const hasConflict = overlappingDetails.some(
    (detail) => !rejectedPlanIds.has(detail.allocationPlanId)
  );

  if (hasConflict) {
    throw new Error(
      `${assetCode || `Equipment #${equipmentInstanceId}`} is already allocated in the selected date range. Choose another item or adjust the phase dates.`
    );
  }
};

const validateLandAvailability = async (
  landId: number,
  startDate: string,
  endDate: string,
  landCode?: string
) => {
  let existingDetails: AllocationLandDetail[];

  try {
    existingDetails = await getAllocationLandDetails({
      landId,
      size: 300,
    });
  } catch (availabilityError) {
    console.warn(
      "Unable to pre-check land allocation conflicts; the API will validate availability:",
      availabilityError
    );
    return;
  }

  const requestedStart = new Date(startDate).getTime();
  const requestedEnd = new Date(endDate).getTime();
  if (!Number.isFinite(requestedStart) || !Number.isFinite(requestedEnd)) {
    return;
  }

  const overlappingDetails = existingDetails.filter((detail) => {
    const status = String(detail.status || "").toLowerCase();
    const detailStart = new Date(detail.startDate).getTime();
    const detailEnd = new Date(detail.endDate).getTime();

    return (
      Number(detail.landId) === landId &&
      status !== "cancelled" &&
      status !== "completed" &&
      Number.isFinite(detailStart) &&
      Number.isFinite(detailEnd) &&
      detailStart < requestedEnd &&
      requestedStart < detailEnd
    );
  });

  if (overlappingDetails.length === 0) return;

  const planStatuses = await Promise.all(
    [...new Set(overlappingDetails.map((detail) => detail.allocationPlanId))].map(
      async (conflictPlanId) => {
        try {
          const response = await api.get(`/AllocationPlans/${conflictPlanId}`);
          const conflictPlan =
            response.data?.data || response.data?.result || response.data;
          return [
            conflictPlanId,
            String(conflictPlan?.approveStatus || "").toLowerCase(),
          ] as const;
        } catch {
          return [conflictPlanId, "unknown"] as const;
        }
      }
    )
  );
  const rejectedPlanIds = new Set(
    planStatuses
      .filter(([, status]) => status === "rejected")
      .map(([conflictPlanId]) => conflictPlanId)
  );
  const hasConflict = overlappingDetails.some(
    (detail) => !rejectedPlanIds.has(detail.allocationPlanId)
  );

  if (hasConflict) {
    throw new Error(
      `${landCode || `Land #${landId}`} is already allocated in the selected date range. Choose another plot or adjust the experiment dates.`
    );
  }
};

function normalizeEvaluationScore(
  value: number | null
): number | null {
  if (value === null) {
    return null;
  }

  if (value >= 0 && value <= 1) {
    return value * 100;
  }

  return Math.max(
    0,
    Math.min(100, value)
  );
}

function createFitnessComponent(
  score: number | null,
  weight: number
): FitnessComponentResult {
  const normalizedScore =
    normalizeEvaluationScore(score);

  return {
    score: normalizedScore,
    weight,
    contribution:
      normalizedScore === null
        ? null
        : (normalizedScore * weight) / 100,
  };
}

function parseFitnessBreakdown(
  evaluation: unknown,
  weights: EvaluationWeightPlan
): FitnessBreakdown {
  const responseRoot =
    evaluation &&
      typeof evaluation === "object"
      ? (evaluation as Record<string, unknown>)
      : {};
  const payload = responseRoot.data ?? responseRoot.result;
  const root =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : responseRoot;

  const nestedCandidate =
    root.fitnessBreakdown ??
    root.FitnessBreakdown ??
    root.breakdown ??
    root.details ??
    root.componentScores ??
    root.scores;

  const nested =
    nestedCandidate &&
      typeof nestedCandidate === "object"
      ? (nestedCandidate as Record<string, unknown>)
      : {};

  const source = {
    ...root,
    ...nested,
  };

  const equipmentScore = readNumber(
    source,
    [
      "equipmentScore",
      "equipmentFitnessScore",
      "equipmentMatchScore",
      "equipment",
    ]
  );

  const humanScore = readNumber(
    source,
    [
      "humanScore",
      "personnelScore",
      "humanFitnessScore",
      "personnelFitnessScore",
      "human",
      "personnel",
    ]
  );

  const landScore = readNumber(
    source,
    [
      "landScore",
      "landFitnessScore",
      "landMatchScore",
      "land",
    ]
  );

  const scheduleScore = readNumber(
    source,
    [
      "scheduleScore",
      "scheduleFitnessScore",
      "scheduleMatchScore",
      "schedule",
    ]
  );

  const maintenanceScore = readNumber(source, [
    "maintenanceScore",
    "maintenanceFitnessScore",
    "maintenance",
  ]);

  return {
    equipment: createFitnessComponent(
      equipmentScore,
      weights.equipmentWeight
    ),

    human: createFitnessComponent(
      humanScore,
      weights.humanWeight
    ),

    land: createFitnessComponent(
      landScore,
      weights.landWeight
    ),

    schedule: createFitnessComponent(
      scheduleScore,
      weights.scheduleWeight
    ),
    maintenance: createFitnessComponent(
      maintenanceScore,
      0
    ),
    penaltyScore: readNumber(source, ["penaltyScore"]),
    bonusScore: readNumber(source, ["bonusScore"]),
  };
}

export default function CreateAllocation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    sendLocalNotification,
    fetchUnreadCount,
  } = useNotification();

  const initialExpId =
    Number(
      searchParams.get("experimentId")
    ) || 0;

  /*
   * FLOW MỚI:
   *
   * Manager đi vào màn hình này sau khi đã Approve
   * Allocation Plan.
   *
   * URL:
   *
   * /allocation/create
   *   ?experimentId=123
   *   &allocationPlanId=456
   */
  const initialPlanId =
    Number(
      searchParams.get(
        "allocationPlanId"
      )
    ) || 0;

  const currentUserInfo =
    getCurrentUserTokenInfo();

  const isManagerRole =
    currentUserInfo.role === "Manager";

  // Every Manager session is a resource-allocation session. The manager
  // can start from an approved Experiment, either by passing experimentId
  // from Experiment Detail or by choosing an approved Experiment here.
  const isManagerAllocation = isManagerRole;

  // If an approved allocationPlanId is supplied for backward compatibility,
  // its experiment remains the source of truth. Otherwise experimentId (or
  // the manager's selection from the approved list) determines the target.
  useEffect(() => {
    if (!isManagerAllocation || initialPlanId <= 0) {
      return;
    }

    let cancelled = false;

    const syncExperimentFromApprovedPlan = async () => {
      try {
        const approvedPlan =
          await getAllocationPlanById(initialPlanId);

        if (cancelled) return;

        if (approvedPlan.approveStatus !== "Approved") {
          setError(
            `Allocation Plan #${initialPlanId} is not Approved.`
          );
          return;
        }

        const planExperimentId =
          Number(approvedPlan.experimentId);

        if (
          !planExperimentId ||
          Number.isNaN(planExperimentId)
        ) {
          setError(
            `Allocation Plan #${initialPlanId} has no valid Experiment.`
          );
          return;
        }

        // Force the screen to the Experiment that actually owns this plan.
        setSelectedExpId(planExperimentId);
        setDraftPlanId(initialPlanId);

        // Manager's normal Experiment list may not contain this Experiment
        // (for example because of status/list filtering). Fetch the exact
        // Experiment so the UI can show its real name instead of "#ID".
        try {
          const planExperiment =
            await getExperimentById(planExperimentId);

          if (cancelled) return;

          setAllExperiments((current) => {
            const withoutSameExperiment =
              current.filter(
                (item) =>
                  item.experimentId !==
                  planExperimentId
              );

            return [
              ...withoutSameExperiment,
              planExperiment,
            ];
          });
        } catch (experimentError) {
          console.error(
            `Failed to load Experiment #${planExperimentId}:`,
            experimentError
          );
        }
      } catch (err: any) {
        if (cancelled) return;

        console.error(
          "Failed to resolve Experiment from Allocation Plan:",
          err
        );

        setError(
          err?.response?.data?.message ||
          `Unable to load Allocation Plan #${initialPlanId}.`
        );
      }
    };

    void syncExperimentFromApprovedPlan();

    return () => {
      cancelled = true;
    };
  }, [isManagerAllocation, initialPlanId]);

  // Master Data State
  const [
    allExperiments,
    setAllExperiments,
  ] = useState<
    ExperimentResponse[]
  >([]);

  const [
    selectedExpId,
    setSelectedExpId,
  ] = useState<number>(
    initialExpId
  );

  const [
    availableEquipment,
    setAvailableEquipment,
  ] = useState<
    EquipmentInstance[]
  >([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);

  const [existingEquipmentAllocations, setExistingEquipmentAllocations] =
    useState<AllocationEquipmentDetail[]>([]);
  const [blockedEquipmentInstanceIds, setBlockedEquipmentInstanceIds] =
    useState<Set<number>>(() => new Set());
  const [checkingEquipmentAvailability, setCheckingEquipmentAvailability] =
    useState(false);

  const [
    equipmentSubstitutions,
    setEquipmentSubstitutions,
  ] = useState<
    EquipmentSubstitution[]
  >([]);

  const [
    humanProfiles,
    setHumanProfiles,
  ] = useState<
    HumanResourceProfile[]
  >([]);

  const [
    humanResourceSkills,
    setHumanResourceSkills,
  ] = useState<
    HumanResourceSkill[]
  >([]);

  const [
    landResources,
    setLandResources,
  ] = useState<
    LandResource[]
  >([]);
  const [existingLandAllocations, setExistingLandAllocations] =
    useState<AllocationLandDetail[]>([]);
  const [blockedLandIds, setBlockedLandIds] =
    useState<Set<number>>(() => new Set());
  const [checkingLandAvailability, setCheckingLandAvailability] =
    useState(false);

  // Experiment Specific Context
  const [
    phases,
    setPhases,
  ] = useState<
    ExperimentPhase[]
  >([]);

  const [
    activePhaseId,
    setActivePhaseId,
  ] = useState<
    number | null
  >(null);

  const [
    equipmentReqs,
    setEquipmentReqs,
  ] = useState<
    ExperimentEquipmentRequirement[]
  >([]);

  const [
    humanReqs,
    setHumanReqs,
  ] = useState<
    ExperimentHumanRequirement[]
  >([]);

  const [
    landReqs,
    setLandReqs,
  ] = useState<
    ExperimentLandRequirement[]
  >([]);

  const [
    phaseEquipmentReqs,
    setPhaseEquipmentReqs,
  ] =
    useState<
      PhaseEquipmentRequirementRuntime[]
    >([]);

  const [
    phaseHumanReqs,
    setPhaseHumanReqs,
  ] =
    useState<
      PhaseHumanRequirementRuntime[]
    >([]);

  const [
    selectedEquipByPhase,
    setSelectedEquipByPhase,
  ] = useState<
    Record<number, number[]>
  >({});
  const [selectedQuantityEquipmentByPhase, setSelectedQuantityEquipmentByPhase] =
    useState<Record<number, Record<number, number>>>({});

  const [
    selectedHumansByPhase,
    setSelectedHumansByPhase,
  ] = useState<
    Record<number, number[]>
  >({});

  const [equipmentFilterTab, setEquipmentFilterTab] = useState<
    "all" | "available" | "unavailable"
  >("all");

  const [humanFilterTab, setHumanFilterTab] = useState<
    "all" | "available" | "unavailable"
  >("all");

  const [landFilterTab, setLandFilterTab] = useState<
    "all" | "available" | "unavailable"
  >("all");

  const [
    draftPlanId,
    setDraftPlanId,
  ] = useState<
    number | null
  >(null);

  // API source of truth for the current Create Allocation session.
  // React state can lag behind an async request and cause a stale plan id
  // to be used in a subsequent POST.
  const draftPlanIdRef = useRef<number | null>(null);
  const draftCreationPromiseRef =
    useRef<Promise<number> | null>(null);

  const [
    initializingDraftPlan,
    setInitializingDraftPlan,
  ] = useState(false);

  const [
    selectedLandId,
    setSelectedLandId,
  ] = useState<
    number | null
  >(null);

  // UI State
  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    evaluatingFitness,
    setEvaluatingFitness,
  ] = useState(false);

  const [
    fitnessScore,
    setFitnessScore,
  ] = useState<
    number | null
  >(null);

  const [
    fitnessEvaluationMessage,
    setFitnessEvaluationMessage,
  ] = useState("");

  const [
    fitnessBreakdown,
    setFitnessBreakdown,
  ] =
    useState<
      FitnessBreakdown | null
    >(null);

  const [
    evaluationWeights,
    setEvaluationWeights,
  ] =
    useState<EvaluationWeightPlan>({
      equipmentWeight: 34,
      humanWeight: 33,
      landWeight: 33,
      scheduleWeight: 0,
    });

  const [
    weightInputs,
    setWeightInputs,
  ] = useState<
    Record<
      keyof EvaluationWeightPlan,
      string
    >
  >({
    equipmentWeight: "34",
    humanWeight: "33",
    landWeight: "33",
    scheduleWeight: "0",
  });

  const [
    allocationDetailsSaved,
    setAllocationDetailsSaved,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);

      try {
        const currentUser =
          getCurrentUserTokenInfo();

        const {
          userId,
          fullName,
          role,
        } = currentUser;

        const isPrivileged =
          role === "Admin" ||
          role === "Manager";

        const [
          expRes,
          approvedPlansRes,
          equipRes,
          equipmentTypesRes,
          equipmentAllocationsRes,
          substitutionRes,
          humanRes,
          humanSkillRes,
          landRes,
          landAllocationsRes,
        ] =
          await Promise.all([
            getExperiments({
              researcherId:
                !isPrivileged &&
                  userId > 0
                  ? userId
                  : undefined,

              size: 100,
            }).catch(() => []),

            getAllocationPlans({
              approveStatus: "Approved",
              size: 500,
            }).catch(() => []),

            getEquipmentInstances({
              size: 500,
            }).catch(() => []),

            getEquipmentTypes({
              page: 1,
              size: 500,
            }).catch(() => []),

            getAllAllocationEquipmentDetails().catch(() => []),

            getEquipmentSubstitutions({
              size: 500,
            }).catch(() => []),

            getHumanResourceProfiles({
              size: 300,
            }).catch(() => []),

            getHumanResourceSkills({
              page: 1,
              size: 500,
            }).catch(() => []),

            getLandResources({
              size: 100,
            }).catch(() => []),

            getAllAllocationLandDetails().catch(() => []),
          ]);

        const rawExps =
          Array.isArray(expRes)
            ? expRes
            : (expRes as any)
              ?.items || [];

        const approvedExperimentIds = new Set(
          (Array.isArray(approvedPlansRes)
            ? approvedPlansRes
            : []
          )
            .map((plan) => Number(plan.experimentId))
            .filter(
              (experimentId) =>
                Number.isFinite(experimentId) &&
                experimentId > 0
            )
        );

        /*
         * Resource Allocation Request chỉ được tạo sau khi Experiment
         * đã được Manager approve.
         *
         * API có thể trả trạng thái sau approve là Planning hoặc Ready
         * tùy workflow hiện tại của backend. Không lấy Draft/Submitted
         * để tránh Researcher tạo Allocation trước khi Manager duyệt.
         */
        const approvedExperimentStatuses = new Set([
          "planning",
          "ready",
        ]);

        const approvedExperiments =
          rawExps.filter(
            (item: ExperimentResponse) =>
              approvedExperimentStatuses.has(
                String(item.status || "")
                  .trim()
                  .toLowerCase()
              )
          );

        const exps =
          (isPrivileged
            ? approvedExperiments
            : approvedExperiments.filter(
              (
                item: ExperimentResponse
              ) =>
                (
                  userId > 0 &&
                  Number(item.researcherId) ===
                  Number(userId)
                ) ||
                (
                  fullName &&
                  (
                    item.researcherName
                      ?.toLowerCase()
                      .includes(
                        fullName.toLowerCase()
                      ) ||
                    item.createdByName
                      ?.toLowerCase()
                      .includes(
                        fullName.toLowerCase()
                      )
                  )
                )
            )
          ).filter(
            (item: ExperimentResponse) =>
              !approvedExperimentIds.has(
                Number(item.experimentId)
              )
          );

        setAllExperiments(exps);

        const equips =
          Array.isArray(equipRes)
            ? equipRes
            : (equipRes as any)
              ?.items || [];

        const availEquips =
          equips.filter(
            (
              e: EquipmentInstance
            ) =>
              e.status ===
              "Available" ||
              !e.status
          );

        setAvailableEquipment(
          availEquips
        );

        setEquipmentTypes(
          Array.isArray(equipmentTypesRes)
            ? equipmentTypesRes
            : []
        );

        setExistingEquipmentAllocations(
          Array.isArray(equipmentAllocationsRes)
            ? equipmentAllocationsRes
            : []
        );

        const substitutions =
          Array.isArray(
            substitutionRes
          )
            ? substitutionRes
            : (
              substitutionRes as any
            )?.items || [];

        setEquipmentSubstitutions(
          substitutions
        );

        const humans =
          Array.isArray(humanRes)
            ? humanRes
            : (humanRes as any)
              ?.items || [];

        const fieldStaff =
          humans.filter(
            (
              hp: HumanResourceProfile
            ) => {
              const r =
                (
                  hp.roleName ||
                  (hp as any)
                    ?.role ||
                  ""
                ).toLowerCase();

              return (
                r.includes(
                  "seasonal"
                ) ||
                r.includes(
                  "technician"
                )
              );
            }
          );

        setHumanProfiles(
          fieldStaff
        );

        const skills =
          Array.isArray(
            humanSkillRes
          )
            ? humanSkillRes
            : (
              humanSkillRes as any
            )?.items || [];

        setHumanResourceSkills(
          skills
        );

        const lands =
          Array.isArray(landRes)
            ? landRes
            : (landRes as any)
              ?.items || [];

        setLandResources(lands);

        setExistingLandAllocations(
          Array.isArray(landAllocationsRes)
            ? landAllocationsRes
            : []
        );

        // For a manager, initialize from the requested Experiment when it is
        // present in the approved list; otherwise let the first approved
        // Experiment become the default selection.
        if (
          initialExpId &&
          exps.some(
            (e: ExperimentResponse) =>
              e.experimentId === initialExpId
          )
        ) {
          setSelectedExpId(initialExpId);
        } else if (exps.length > 0 && !initialPlanId) {
          setSelectedExpId(exps[0].experimentId);
        }
      } catch (err: any) {
        console.error(
          "Load initial allocation inventory data failed:",
          err
        );

        setError(
          "Failed to load live resource inventory."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadInitialData();
  }, [initialExpId, isManagerAllocation]);
  // 2. When selectedExpId changes, load specific experiment requirements & phases
  useEffect(() => {
    if (!selectedExpId) {
      setPhases([]);
      setActivePhaseId(null);
      setEquipmentReqs([]);
      setHumanReqs([]);
      setLandReqs([]);
      setPhaseEquipmentReqs([]);
      setPhaseHumanReqs([]);
      return;
    }

    async function loadExperimentDetails(id: number) {
      try {
        const [
          phasesRes,
          eReqRes,
          hReqRes,
          lReqRes,
          phaseEquipmentReqRes,
          phaseHumanReqRes,
        ] = await Promise.all([
          getExperimentPhases({
            experimentId: id,
            size: 100,
          }).catch(() => []),

          getExperimentEquipmentRequirements({
            experimentId: id,
            size: 100,
          }).catch(() => []),

          getExperimentHumanRequirements({
            experimentId: id,
            size: 100,
          }).catch(() => []),

          getExperimentLandRequirements({
            experimentId: id,
            size: 100,
          }).catch(() => []),

          api
            .get("/PhaseEquipmentRequirements", {
              params: {
                ExperimentId: id,
                Page: 1,
                Size: 500,
              },
            })
            .then((response) => response.data)
            .catch(() => []),

          api
            .get("/PhaseHumanRequirements", {
              params: {
                ExperimentId: id,
                Page: 1,
                Size: 500,
              },
            })
            .then((response) => response.data)
            .catch(() => []),
        ]);

        // Filter strictly to this experiment
        const allP = Array.isArray(phasesRes)
          ? phasesRes
          : [];

        const matchedPhases = allP.filter(
          (p) => p.experimentId === id
        );

        setPhases(matchedPhases);

        // Set default active phase
        if (matchedPhases.length > 0) {
          setActivePhaseId(
            matchedPhases[0].experimentPhaseId
          );
        } else {
          setActivePhaseId(null);
        }

        const allE = Array.isArray(eReqRes)
          ? eReqRes
          : [];

        setEquipmentReqs(
          allE.filter(
            (e) => e.experimentId === id
          )
        );

        const allH = Array.isArray(hReqRes)
          ? hReqRes
          : [];

        setHumanReqs(
          allH.filter(
            (h) => h.experimentId === id
          )
        );

        const allL = Array.isArray(lReqRes)
          ? lReqRes
          : [];

        setLandReqs(
          allL.filter(
            (l) => l.experimentId === id
          )
        );

        const normalizeApiArray = <T,>(
          payload: unknown
        ): T[] => {
          if (Array.isArray(payload)) {
            return payload as T[];
          }

          if (
            payload &&
            typeof payload === "object"
          ) {
            const record =
              payload as Record<
                string,
                unknown
              >;

            if (
              Array.isArray(record.items)
            ) {
              return record.items as T[];
            }

            if (
              Array.isArray(record.data)
            ) {
              return record.data as T[];
            }

            if (
              Array.isArray(record.result)
            ) {
              return record.result as T[];
            }

            if (
              record.data &&
              typeof record.data ===
              "object"
            ) {
              const nested =
                record.data as Record<
                  string,
                  unknown
                >;

              if (
                Array.isArray(
                  nested.items
                )
              ) {
                return nested.items as T[];
              }
            }
          }

          return [];
        };

        setPhaseEquipmentReqs(
          normalizeApiArray<PhaseEquipmentRequirementRuntime>(
            phaseEquipmentReqRes
          ).filter((requirement) =>
            matchedPhases.some(
              (phase) =>
                Number(
                  phase.experimentPhaseId
                ) ===
                Number(
                  requirement.phaseId
                )
            )
          )
        );

        setPhaseHumanReqs(
          normalizeApiArray<PhaseHumanRequirementRuntime>(
            phaseHumanReqRes
          ).filter((requirement) =>
            matchedPhases.some(
              (phase) =>
                Number(
                  phase.experimentPhaseId
                ) ===
                Number(
                  requirement.phaseId
                )
            )
          )
        );

        // Reset phase selections
        const initialSelectedEquipByPhase: Record<number, number[]> = {};
        const initialSelectedQuantityEquipmentByPhase: Record<number, Record<number, number>> = {};
        const initialSelectedHumansByPhase: Record<number, number[]> = {};
        let initialSelectedLandId: number | null = null;

        if (isManagerAllocation && initialPlanId > 0) {
          const [managerEquipmentDetails, managerHumanDetails, managerLandDetails] = await Promise.all([
            getAllocationEquipmentDetails({
              allocationPlanId: initialPlanId,
              size: 500,
            }).catch(() => []),
            getAllocationHumanDetails({
              allocationPlanId: initialPlanId,
              size: 500,
            }).catch(() => []),
            getAllocationLandDetails({
              allocationPlanId: initialPlanId,
              size: 500,
            }).catch(() => []),
          ]);

          for (const detail of managerEquipmentDetails) {
            const detailInstanceId = Number(detail.equipmentInstanceId ?? 0);

            let phaseId = Number(detail.phaseId ?? 0);
            if (!phaseId && detail.phaseEquipmentReqId) {
              const phaseRequirement = phaseEquipmentReqs.find(
                (requirement) =>
                  Number(requirement.phaseEquipmentReqId) === Number(detail.phaseEquipmentReqId)
              );
              phaseId = Number(phaseRequirement?.phaseId ?? 0);
            }
            if (!phaseId && matchedPhases.length === 1) {
              phaseId = matchedPhases[0].experimentPhaseId;
            }
            if (!phaseId) {
              continue;
            }

            if (detailInstanceId > 0) {
              initialSelectedEquipByPhase[phaseId] = [
                ...(initialSelectedEquipByPhase[phaseId] || []),
                detailInstanceId,
              ];
              continue;
            }

            const equipmentTypeId = Number(detail.allocatedEquipmentTypeId ?? 0);
            const quantity = Math.max(0, Number(detail.quantity ?? 0));
            if (equipmentTypeId > 0 && quantity > 0) {
              initialSelectedQuantityEquipmentByPhase[phaseId] = {
                ...(initialSelectedQuantityEquipmentByPhase[phaseId] || {}),
                [equipmentTypeId]:
                  (initialSelectedQuantityEquipmentByPhase[phaseId]?.[equipmentTypeId] || 0) +
                  quantity,
              };
            }
          }

          for (const detail of managerHumanDetails) {
            const humanId = Number(detail.humanResourceId ?? 0);
            if (!humanId) {
              continue;
            }

            let phaseId = Number(detail.phaseId ?? 0);
            if (!phaseId && detail.phaseHumanReqId) {
              const phaseRequirement = phaseHumanReqs.find(
                (requirement) =>
                  Number(requirement.phaseHumanReqId) === Number(detail.phaseHumanReqId)
              );
              phaseId = Number(phaseRequirement?.phaseId ?? 0);
            }
            if (!phaseId && matchedPhases.length === 1) {
              phaseId = matchedPhases[0].experimentPhaseId;
            }
            if (!phaseId) {
              continue;
            }

            initialSelectedHumansByPhase[phaseId] = [
              ...(initialSelectedHumansByPhase[phaseId] || []),
              humanId,
            ];
          }

          initialSelectedLandId = managerLandDetails.find((detail) => detail.landId)?.landId ?? null;
        }

        setSelectedEquipByPhase(initialSelectedEquipByPhase);
        setSelectedQuantityEquipmentByPhase(initialSelectedQuantityEquipmentByPhase);
        setSelectedHumansByPhase(initialSelectedHumansByPhase);
        setSelectedLandId(initialSelectedLandId);

        /*
         * FLOW MỚI:
         *
         * Manager vào màn hình này bằng allocationPlanId
         * sau khi plan đã được Approved.
         *
         * Vì vậy KHÔNG reset planId về null trong
         * Manager Allocation Mode.
         */
        if (
          isManagerAllocation &&
          initialPlanId > 0
        ) {
          draftPlanIdRef.current = initialPlanId;
          setDraftPlanId(initialPlanId);
        } else {
          // Researcher starts a new Create Allocation session.
          draftPlanIdRef.current = null;
          draftCreationPromiseRef.current = null;
          setDraftPlanId(null);
        }

        setFitnessScore(null);
        setFitnessEvaluationMessage("");
        setFitnessBreakdown(null);

        setEvaluationWeights({
          equipmentWeight: 34,
          humanWeight: 33,
          landWeight: 33,
          scheduleWeight: 0,
        });

        setWeightInputs({
          equipmentWeight: "34",
          humanWeight: "33",
          landWeight: "33",
          scheduleWeight: "0",
        });

        setAllocationDetailsSaved(false);
      } catch (detailErr) {
        console.warn(
          "Could not load experiment requirements for allocation hub:",
          detailErr
        );
      }
    }

    void loadExperimentDetails(
      selectedExpId
    );
  }, [
    selectedExpId,
    initialPlanId,
    isManagerAllocation,
  ]);

  const selectedExp =
    allExperiments.find(
      (e) =>
        e.experimentId ===
        selectedExpId
    );

  const activePhase =
    phases.find(
      (p) =>
        p.experimentPhaseId ===
        activePhaseId
    );

  // Normalize efficiency so both 80 and 0.8 are treated as 80%.
  const normalizeEfficiency = (
    value?: number | null
  ): number => {
    if (
      value === null ||
      value === undefined ||
      Number.isNaN(value)
    ) {
      return 0;
    }

    return value > 1
      ? value / 100
      : value;
  };

  // Get equipment requirements that belong to a specific phase.
  // Current create-experiment flow stores the phase label in note, e.g. [Phase 1:].
  // If an experiment has only one phase, all equipment requirements belong to that phase.
  const getEquipmentRequirementsForPhase = (
    phaseId: number
  ): ExperimentEquipmentRequirement[] => {
    const phase = phases.find(
      (item) =>
        item.experimentPhaseId ===
        phaseId
    );

    if (!phase) {
      return [];
    }

    if (phases.length === 1) {
      return equipmentReqs;
    }

    const phaseName =
      (
        phase.phaseName || ""
      )
        .trim()
        .toLowerCase();

    if (!phaseName) {
      return [];
    }

    const phaseNameWithoutColon =
      phaseName.replace(
        /:$/,
        ""
      );

    return equipmentReqs.filter(
      (req) => {
        const note =
          (
            req.note || ""
          )
            .trim()
            .toLowerCase();

        return (
          note.includes(
            `[${phaseName}`
          ) ||
          note.includes(
            `[${phaseNameWithoutColon}`
          )
        );
      }
    );
  };

  const activePhaseEquipmentRequirements =
    useMemo(() => {
      if (!activePhaseId) {
        return [];
      }

      return getEquipmentRequirementsForPhase(
        activePhaseId
      );
    }, [
      activePhaseId,
      phases,
      equipmentReqs,
    ]);

  type EquipmentRequirementMatch = {
    requirement:
    ExperimentEquipmentRequirement;

    substitution?:
    EquipmentSubstitution;

    isSubstitute: boolean;

    effectiveEfficiency:
    number;
  };

  // Find which requirement an equipment instance satisfies.
  // Primary equipment must match equipmentTypeId directly.
  // Substitute equipment is allowed only when:
  // - Researcher enabled allowSubstitute
  // - EquipmentSubstitutions links primary -> substitute type
  // - Effective efficiency meets minAcceptableEfficiency
  const findEquipmentMatch = (
    phaseId: number,
    equipment:
      EquipmentInstance
  ): EquipmentRequirementMatch | null => {
    const requirements =
      getEquipmentRequirementsForPhase(
        phaseId
      );

    const equipmentTypeId =
      equipment.equipmentTypeId;

    const instanceEfficiency =
      normalizeEfficiency(
        equipment.efficiencyRate ??
        1
      );

    // Prefer the requested equipment type itself.
    for (
      const requirement of
      requirements
    ) {
      if (
        requirement.equipmentTypeId !==
        equipmentTypeId
      ) {
        continue;
      }

      const minimumEfficiency =
        normalizeEfficiency(
          requirement.minAcceptableEfficiency
        );

      if (
        instanceEfficiency >=
        minimumEfficiency
      ) {
        return {
          requirement,
          isSubstitute: false,
          effectiveEfficiency:
            instanceEfficiency,
        };
      }
    }

    // Then try valid substitute types.
    let bestMatch:
      EquipmentRequirementMatch | null =
      null;

    for (
      const requirement of
      requirements
    ) {
      if (
        !requirement.allowSubstitute
      ) {
        continue;
      }

      const minimumEfficiency =
        normalizeEfficiency(
          requirement.minAcceptableEfficiency
        );

      const validRelations =
        equipmentSubstitutions.filter(
          (substitution) =>
            substitution.primaryEquipmentTypeId ===
            requirement.equipmentTypeId &&
            substitution.subEquipmentTypeId ===
            equipmentTypeId
        );

      for (
        const substitution of
        validRelations
      ) {
        const substitutionEfficiency =
          normalizeEfficiency(
            substitution.efficiencyRate
          );

        // Effective efficiency combines the actual instance condition/efficiency
        // with the substitution conversion efficiency.
        const effectiveEfficiency =
          instanceEfficiency *
          substitutionEfficiency;

        if (
          effectiveEfficiency <
          minimumEfficiency
        ) {
          continue;
        }

        if (
          !bestMatch ||
          effectiveEfficiency >
          bestMatch.effectiveEfficiency
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

  const findQuantityEquipmentMatch = (
    phaseId: number,
    equipmentType: EquipmentType
  ): EquipmentRequirementMatch | null => {
    const requirements = getEquipmentRequirementsForPhase(phaseId);

    for (const requirement of requirements) {
      if (requirement.equipmentTypeId !== equipmentType.equipmentTypeId) {
        continue;
      }

      const effectiveEfficiency = 1;
      const minimumEfficiency = normalizeEfficiency(
        requirement.minAcceptableEfficiency
      );
      if (effectiveEfficiency >= minimumEfficiency) {
        return {
          requirement,
          isSubstitute: false,
          effectiveEfficiency,
        };
      }
    }

    let bestMatch: EquipmentRequirementMatch | null = null;
    for (const requirement of requirements) {
      if (!requirement.allowSubstitute) {
        continue;
      }

      for (const substitution of equipmentSubstitutions.filter(
        (item) =>
          item.primaryEquipmentTypeId === requirement.equipmentTypeId &&
          item.subEquipmentTypeId === equipmentType.equipmentTypeId
      )) {
        const effectiveEfficiency = normalizeEfficiency(
          substitution.efficiencyRate
        );
        const minimumEfficiency = normalizeEfficiency(
          requirement.minAcceptableEfficiency
        );

        if (effectiveEfficiency < minimumEfficiency) {
          continue;
        }

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

  useEffect(() => {
    let cancelled = false;

    const phase = phases.find(
      (item) => item.experimentPhaseId === activePhaseId
    );
    const startDate = phase?.expectedStartDate || selectedExp?.expectStartDate;
    const endDate = phase?.expectedEndDate || selectedExp?.expectEndDate;

    if (!activePhaseId || !startDate || !endDate) {
      setBlockedEquipmentInstanceIds(new Set());
      setCheckingEquipmentAvailability(false);
      return () => {
        cancelled = true;
      };
    }

    const requestedStart = new Date(convertDateToIso(startDate)).getTime();
    const requestedEnd = new Date(convertDateToIso(endDate, true)).getTime();
    const overlappingDetails = existingEquipmentAllocations.filter((detail) => {
      const status = String(detail.status || "").toLowerCase();
      const detailStart = new Date(detail.startDate).getTime();
      const detailEnd = new Date(detail.endDate).getTime();

      return (
        detail.equipmentInstanceId != null &&
        status !== "cancelled" &&
        status !== "completed" &&
        Number.isFinite(detailStart) &&
        Number.isFinite(detailEnd) &&
        detailStart < requestedEnd &&
        requestedStart < detailEnd
      );
    });

    if (overlappingDetails.length === 0) {
      setBlockedEquipmentInstanceIds(new Set());
      setCheckingEquipmentAvailability(false);
      return () => {
        cancelled = true;
      };
    }

    setCheckingEquipmentAvailability(true);
    const planIds = [...new Set(
      overlappingDetails.map((detail) => detail.allocationPlanId)
    )];

    void Promise.all(
      planIds.map(async (planId) => {
        try {
          const response = await api.get(`/AllocationPlans/${planId}`);
          const plan = response.data?.data || response.data?.result || response.data;
          return [planId, String(plan?.approveStatus || "").toLowerCase()] as const;
        } catch {
          return [planId, "unknown"] as const;
        }
      })
    ).then((planStatuses) => {
      if (cancelled) return;

      const rejectedPlanIds = new Set(
        planStatuses
          .filter(([, status]) => status === "rejected")
          .map(([planId]) => planId)
      );

      setBlockedEquipmentInstanceIds(
        new Set(
          overlappingDetails
            .filter((detail) => !rejectedPlanIds.has(detail.allocationPlanId))
            .map((detail) => Number(detail.equipmentInstanceId))
        )
      );
      setCheckingEquipmentAvailability(false);
    });

    return () => {
      cancelled = true;
    };
  }, [
    activePhaseId,
    existingEquipmentAllocations,
    phases,
    selectedExp?.expectEndDate,
    selectedExp?.expectStartDate,
  ]);

  useEffect(() => {
    let cancelled = false;
    const startDate = selectedExp?.expectStartDate;
    const endDate = selectedExp?.expectEndDate;

    if (!startDate || !endDate) {
      setBlockedLandIds(new Set());
      setCheckingLandAvailability(false);
      return () => {
        cancelled = true;
      };
    }

    const requestedStart = new Date(convertDateToIso(startDate)).getTime();
    const requestedEnd = new Date(convertDateToIso(endDate, true)).getTime();
    const overlappingDetails = existingLandAllocations.filter((detail) => {
      const status = String(detail.status || "").toLowerCase();
      const detailStart = new Date(detail.startDate).getTime();
      const detailEnd = new Date(detail.endDate).getTime();

      return (
        status !== "cancelled" &&
        status !== "completed" &&
        Number.isFinite(detailStart) &&
        Number.isFinite(detailEnd) &&
        detailStart < requestedEnd &&
        requestedStart < detailEnd
      );
    });

    if (overlappingDetails.length === 0) {
      setBlockedLandIds(new Set());
      setCheckingLandAvailability(false);
      return () => {
        cancelled = true;
      };
    }

    setCheckingLandAvailability(true);
    const planIds = [...new Set(
      overlappingDetails.map((detail) => detail.allocationPlanId)
    )];

    void Promise.all(
      planIds.map(async (planId) => {
        try {
          const response = await api.get(`/AllocationPlans/${planId}`);
          const plan = response.data?.data || response.data?.result || response.data;
          return [planId, String(plan?.approveStatus || "").toLowerCase()] as const;
        } catch {
          return [planId, "unknown"] as const;
        }
      })
    ).then((planStatuses) => {
      if (cancelled) return;

      const ignoredPlanIds = new Set(
        planStatuses
          .filter(([, status]) => status === "rejected")
          .map(([planId]) => planId)
      );

      setBlockedLandIds(
        new Set(
          overlappingDetails
            .filter((detail) => !ignoredPlanIds.has(detail.allocationPlanId))
            .map((detail) => detail.landId)
        )
      );
      setCheckingLandAvailability(false);
    });

    return () => {
      cancelled = true;
    };
  }, [
    existingLandAllocations,
    selectedExp?.expectEndDate,
    selectedExp?.expectStartDate,
  ]);

  const primaryEquipmentForActivePhase =
    useMemo(() => {
      if (!activePhaseId || checkingEquipmentAvailability) {
        return [];
      }

      return availableEquipment.filter(
        (equipment) => {
          if (
            equipment.status !==
            "Available" ||
            blockedEquipmentInstanceIds.has(
              equipment.equipmentInstanceId
            )
          ) {
            return false;
          }

          const match =
            findEquipmentMatch(
              activePhaseId,
              equipment
            );

          return Boolean(
            match &&
            !match.isSubstitute
          );
        }
      );
    }, [
      activePhaseId,
      activePhaseEquipmentRequirements,
      availableEquipment,
      blockedEquipmentInstanceIds,
      checkingEquipmentAvailability,
      equipmentSubstitutions,
    ]);

  const substituteEquipmentForActivePhase =
    useMemo(() => {
      if (!activePhaseId || checkingEquipmentAvailability) {
        return [];
      }

      return availableEquipment
        .map((equipment) => {
          if (
            equipment.status !==
            "Available" ||
            blockedEquipmentInstanceIds.has(
              equipment.equipmentInstanceId
            )
          ) {
            return null;
          }

          const match =
            findEquipmentMatch(
              activePhaseId,
              equipment
            );

          if (
            !match ||
            !match.isSubstitute
          ) {
            return null;
          }

          return {
            equipment,
            match,
          };
        })
        .filter(
          (
            item
          ): item is {
            equipment:
            EquipmentInstance;
            match:
            EquipmentRequirementMatch;
          } =>
            item !== null
        );
    }, [
      activePhaseId,
      activePhaseEquipmentRequirements,
      availableEquipment,
      blockedEquipmentInstanceIds,
      checkingEquipmentAvailability,
      equipmentSubstitutions,
    ]);

  type EquipmentEligibilityItem = {
    equipment: EquipmentInstance;
    isEligible: boolean;
    isPrimary: boolean;
    isSubstitute: boolean;
    effectiveEfficiency: number;
    match?: EquipmentRequirementMatch;
    unavailabilityReason?: string;
  };

  const allEquipmentForActivePhase = useMemo<EquipmentEligibilityItem[]>(() => {
    if (!activePhaseId) {
      return [];
    }

    const requirements = getEquipmentRequirementsForPhase(activePhaseId);
    if (requirements.length === 0) {
      return [];
    }

    // Collect all allowed equipment type IDs for this phase (primary + allowed substitutes)
    const allowedTypeIds = new Set<number>();
    requirements.forEach((req) => {
      if (req.equipmentTypeId != null) {
        allowedTypeIds.add(req.equipmentTypeId);
        if (req.allowSubstitute) {
          equipmentSubstitutions
            .filter((s) => s.primaryEquipmentTypeId === req.equipmentTypeId)
            .forEach((s) => allowedTypeIds.add(s.subEquipmentTypeId));
        }
      }
    });

    const relevantEquipment = availableEquipment.filter(
      (equipment) =>
        equipment.equipmentTypeId != null &&
        allowedTypeIds.has(equipment.equipmentTypeId) &&
        equipmentTypes.find(
          (type) => type.equipmentTypeId === equipment.equipmentTypeId
        )?.trackingType !== "QuantityBased"
    );

    return relevantEquipment.map((equipment) => {
      const isBlocked = blockedEquipmentInstanceIds.has(equipment.equipmentInstanceId);
      const isAvailableStatus = equipment.status === "Available";
      const instanceEfficiency = normalizeEfficiency(equipment.efficiencyRate ?? 1);

      // 1. Check Primary Match
      for (const requirement of requirements) {
        if (requirement.equipmentTypeId === equipment.equipmentTypeId) {
          const minEff = normalizeEfficiency(requirement.minAcceptableEfficiency);
          if (!isAvailableStatus) {
            return {
              equipment,
              isEligible: false,
              isPrimary: true,
              isSubstitute: false,
              effectiveEfficiency: instanceEfficiency,
              match: { requirement, isSubstitute: false, effectiveEfficiency: instanceEfficiency },
              unavailabilityReason: `Status: "${equipment.status}" (Equipment is not available)`,
            };
          }
          if (isBlocked) {
            return {
              equipment,
              isEligible: false,
              isPrimary: true,
              isSubstitute: false,
              effectiveEfficiency: instanceEfficiency,
              match: { requirement, isSubstitute: false, effectiveEfficiency: instanceEfficiency },
              unavailabilityReason: "Schedule conflict: Allocated to another plan during these phase dates",
            };
          }
          if (instanceEfficiency < minEff) {
            return {
              equipment,
              isEligible: false,
              isPrimary: true,
              isSubstitute: false,
              effectiveEfficiency: instanceEfficiency,
              match: { requirement, isSubstitute: false, effectiveEfficiency: instanceEfficiency },
              unavailabilityReason: `Efficiency (${Math.round(instanceEfficiency * 100)}%) is below required minimum (${Math.round(minEff * 100)}%)`,
            };
          }
          return {
            equipment,
            isEligible: true,
            isPrimary: true,
            isSubstitute: false,
            effectiveEfficiency: instanceEfficiency,
            match: { requirement, isSubstitute: false, effectiveEfficiency: instanceEfficiency },
          };
        }
      }

      // 2. Check Substitute Match
      for (const requirement of requirements) {
        const validRelations = equipmentSubstitutions.filter(
          (s) =>
            s.primaryEquipmentTypeId === requirement.equipmentTypeId &&
            s.subEquipmentTypeId === equipment.equipmentTypeId
        );

        if (validRelations.length > 0) {
          if (!requirement.allowSubstitute) {
            return {
              equipment,
              isEligible: false,
              isPrimary: false,
              isSubstitute: true,
              effectiveEfficiency: 0,
              unavailabilityReason: `Substitute mapped, but requirement "${requirement.equipmentTypeName}" does not allow substitutes`,
            };
          }

          for (const substitution of validRelations) {
            const subEff = normalizeEfficiency(substitution.efficiencyRate);
            const effectiveEff = instanceEfficiency * subEff;
            const minEff = normalizeEfficiency(requirement.minAcceptableEfficiency);

            if (!isAvailableStatus) {
              return {
                equipment,
                isEligible: false,
                isPrimary: false,
                isSubstitute: true,
                effectiveEfficiency: effectiveEff,
                match: { requirement, substitution, isSubstitute: true, effectiveEfficiency: effectiveEff },
                unavailabilityReason: `Valid substitute, but status is "${equipment.status}" (not Available)`,
              };
            }
            if (isBlocked) {
              return {
                equipment,
                isEligible: false,
                isPrimary: false,
                isSubstitute: true,
                effectiveEfficiency: effectiveEff,
                match: { requirement, substitution, isSubstitute: true, effectiveEfficiency: effectiveEff },
                unavailabilityReason: "Valid substitute, but allocated to another plan in overlapping dates",
              };
            }
            if (effectiveEff < minEff) {
              return {
                equipment,
                isEligible: false,
                isPrimary: false,
                isSubstitute: true,
                effectiveEfficiency: effectiveEff,
                match: { requirement, substitution, isSubstitute: true, effectiveEfficiency: effectiveEff },
                unavailabilityReason: `Substitute effective efficiency (${Math.round(effectiveEff * 100)}%) < required minimum (${Math.round(minEff * 100)}%)`,
              };
            }
            return {
              equipment,
              isEligible: true,
              isPrimary: false,
              isSubstitute: true,
              effectiveEfficiency: effectiveEff,
              match: { requirement, substitution, isSubstitute: true, effectiveEfficiency: effectiveEff },
            };
          }
        }
      }

      // 3. Type Mismatch fallback
      return {
        equipment,
        isEligible: false,
        isPrimary: false,
        isSubstitute: false,
        effectiveEfficiency: 0,
        unavailabilityReason: `Type "${equipment.equipmentTypeName || `Type #${equipment.equipmentTypeId}`}" does not match phase equipment requirements`,
      };
    });
  }, [
    activePhaseId,
    activePhaseEquipmentRequirements,
    availableEquipment,
    equipmentTypes,
    blockedEquipmentInstanceIds,
    equipmentSubstitutions,
  ]);

  type QuantityEquipmentEligibilityItem = {
    equipmentType: EquipmentType;
    isEligible: boolean;
    isPrimary: boolean;
    isSubstitute: boolean;
    effectiveEfficiency: number;
    selectedQuantity: number;
    maxSelectableQuantity: number;
    match: EquipmentRequirementMatch | null;
    unavailabilityReason?: string;
  };

  const quantityEquipmentForActivePhase = useMemo<
    QuantityEquipmentEligibilityItem[]
  >(() => {
    if (!activePhaseId) {
      return [];
    }

    const requirements = getEquipmentRequirementsForPhase(activePhaseId);
    const allowedTypeIds = new Set<number>();
    requirements.forEach((requirement) => {
      allowedTypeIds.add(requirement.equipmentTypeId);
      if (requirement.allowSubstitute) {
        equipmentSubstitutions
          .filter(
            (item) => item.primaryEquipmentTypeId === requirement.equipmentTypeId
          )
          .forEach((item) => allowedTypeIds.add(item.subEquipmentTypeId));
      }
    });

    const selectedForPhase =
      selectedQuantityEquipmentByPhase[activePhaseId] || {};
    const selectedInstances = selectedEquipByPhase[activePhaseId] || [];

    return equipmentTypes
      .filter(
        (item) =>
          item.trackingType === "QuantityBased" &&
          allowedTypeIds.has(item.equipmentTypeId)
      )
      .map((equipmentType) => {
        const match = findQuantityEquipmentMatch(activePhaseId, equipmentType);
        const selectedQuantity = selectedForPhase[equipmentType.equipmentTypeId] || 0;

        if (!match) {
          return {
            equipmentType,
            isEligible: false,
            isPrimary: false,
            isSubstitute: false,
            effectiveEfficiency: 0,
            selectedQuantity,
            maxSelectableQuantity: 0,
            match,
            unavailabilityReason: "Equipment type does not meet the requirement or minimum efficiency",
          };
        }

        const selectedInstanceQuantity = selectedInstances.reduce(
          (count, instanceId) => {
            const instance = availableEquipment.find(
              (item) => item.equipmentInstanceId === instanceId
            );
            const instanceMatch = instance
              ? findEquipmentMatch(activePhaseId, instance)
              : null;
            return instanceMatch?.requirement.expEquipmentReqId ===
              match.requirement.expEquipmentReqId
              ? count + 1
              : count;
          },
          0
        );

        const selectedOtherQuantity = Object.entries(selectedForPhase).reduce(
          (count, [typeIdText, quantity]) => {
            const typeId = Number(typeIdText);
            if (typeId === equipmentType.equipmentTypeId) {
              return count;
            }
            const otherType = equipmentTypes.find(
              (item) => item.equipmentTypeId === typeId
            );
            const otherMatch = otherType
              ? findQuantityEquipmentMatch(activePhaseId, otherType)
              : null;
            return otherMatch?.requirement.expEquipmentReqId ===
              match.requirement.expEquipmentReqId
              ? count + quantity
              : count;
          },
          0
        );

        const requirementRemaining = Math.max(
          0,
          match.requirement.quantity -
            selectedInstanceQuantity -
            selectedOtherQuantity
        );
        const maxSelectableQuantity = Math.min(
          equipmentType.availableQuantity + selectedQuantity,
          requirementRemaining + selectedQuantity
        );
        const isEligible =
          equipmentType.availableQuantity > 0 &&
          maxSelectableQuantity > 0;

        return {
          equipmentType,
          isEligible,
          isPrimary: !match.isSubstitute,
          isSubstitute: match.isSubstitute,
          effectiveEfficiency: match.effectiveEfficiency,
          selectedQuantity,
          maxSelectableQuantity,
          match,
          unavailabilityReason:
            equipmentType.availableQuantity <= 0
              ? "No quantity-based stock is available"
              : !isEligible
                ? "The requirement quantity is already selected"
                : undefined,
        };
      });
  }, [
    activePhaseId,
    activePhaseEquipmentRequirements,
    equipmentTypes,
    equipmentSubstitutions,
    selectedQuantityEquipmentByPhase,
    selectedEquipByPhase,
    availableEquipment,
  ]);

  // Toggle Equipment for current active phase.
  // Quantity is enforced per requirement, so a substitute counts toward
  // the quantity of its primary requirement.
  const handleToggleEquipment = (
    eqId: number
  ) => {
    /*
     * Resource allocation chỉ được thực hiện
     * bởi Manager sau khi plan đã Approved.
     */

    if (
      allocationDetailsSaved
    ) {
      setError(
        "Fitness evaluation has already been prepared. Save this allocation before changing resources."
      );

      return;
    }

    if (!activePhaseId) {
      return;
    }

    const equipment =
      availableEquipment.find(
        (item) =>
          item.equipmentInstanceId ===
          eqId
      );

    if (!equipment) {
      return;
    }

    const targetMatch =
      findEquipmentMatch(
        activePhaseId,
        equipment
      );

    if (!targetMatch) {
      setError(
        "This equipment does not satisfy the selected phase requirement."
      );

      return;
    }

    setFitnessScore(null);
    setFitnessEvaluationMessage("");
    setFitnessBreakdown(null);

    setSelectedEquipByPhase(
      (prev) => {
        const currentList =
          prev[activePhaseId] ||
          [];

        if (
          currentList.includes(
            eqId
          )
        ) {
          setError("");

          return {
            ...prev,

            [activePhaseId]:
              currentList.filter(
                (id) =>
                  id !== eqId
              ),
          };
        }

        const selectedForSameRequirement =
          currentList.filter(
            (selectedId) => {
              const selectedEquipment =
                availableEquipment.find(
                  (item) =>
                    item.equipmentInstanceId ===
                    selectedId
                );

              if (
                !selectedEquipment
              ) {
                return false;
              }

              const selectedMatch =
                findEquipmentMatch(
                  activePhaseId,
                  selectedEquipment
                );

              return (
                selectedMatch
                  ?.requirement
                  .expEquipmentReqId ===
                targetMatch
                  .requirement
                  .expEquipmentReqId
              );
            }
          ).length;

        const selectedQuantityForSameRequirement = Object.entries(
          selectedQuantityEquipmentByPhase[activePhaseId] || {}
        ).reduce((count, [typeIdText, quantity]) => {
          const type = equipmentTypes.find(
            (item) => item.equipmentTypeId === Number(typeIdText)
          );
          const quantityMatch = type
            ? findQuantityEquipmentMatch(activePhaseId, type)
            : null;
          return quantityMatch?.requirement.expEquipmentReqId ===
            targetMatch.requirement.expEquipmentReqId
            ? count + quantity
            : count;
        }, 0);

        const selectedRequirementQuantity =
          selectedForSameRequirement + selectedQuantityForSameRequirement;

        const requiredQuantity =
          Math.max(
            0,
            targetMatch
              .requirement
              .quantity ||
            0
          );

        if (
          requiredQuantity > 0 &&
          selectedRequirementQuantity >=
          requiredQuantity
        ) {
          setError(
            `Requirement "${targetMatch
              .requirement
              .equipmentTypeName ||
            `Equipment Type #${targetMatch
              .requirement
              .equipmentTypeId
            }`
            }" requires only ${requiredQuantity} unit(s).`
          );

          return prev;
        }

        setError("");

        return {
          ...prev,

          [activePhaseId]: [
            ...currentList,
            eqId,
          ],
        };
      }
    );
  };

  const handleQuantityEquipmentChange = (
    equipmentTypeId: number,
    rawQuantity: string
  ) => {
    if (!activePhaseId || allocationDetailsSaved) {
      return;
    }

    const item = quantityEquipmentForActivePhase.find(
      (equipment) => equipment.equipmentType.equipmentTypeId === equipmentTypeId
    );
    if (!item || !item.isEligible) {
      return;
    }

    const parsedQuantity = Math.floor(Number(rawQuantity));
    const quantity = Number.isFinite(parsedQuantity)
      ? Math.min(item.maxSelectableQuantity, Math.max(0, parsedQuantity))
      : 0;

    setSelectedQuantityEquipmentByPhase((current) => {
      const phaseSelection = { ...(current[activePhaseId] || {}) };
      if (quantity === 0) {
        delete phaseSelection[equipmentTypeId];
      } else {
        phaseSelection[equipmentTypeId] = quantity;
      }
      return {
        ...current,
        [activePhaseId]: phaseSelection,
      };
    });

    setFitnessScore(null);
    setFitnessBreakdown(null);
    setFitnessEvaluationMessage("");
    setAllocationDetailsSaved(false);
    setError("");
  };

  // Get human requirements that belong to a specific phase.
  // Current create-experiment flow stores the phase label in note, e.g. [Phase 1:].
  // If an experiment has only one phase, all human requirements belong to that phase.
  const getHumanRequirementsForPhase = (
    phaseId: number
  ): ExperimentHumanRequirement[] => {
    const phase =
      phases.find(
        (item) =>
          item.experimentPhaseId ===
          phaseId
      );

    if (!phase) {
      return [];
    }

    if (
      phases.length === 1
    ) {
      return humanReqs;
    }

    const phaseName =
      (
        phase.phaseName || ""
      )
        .trim()
        .toLowerCase();

    if (!phaseName) {
      return [];
    }

    const phaseNameWithoutColon =
      phaseName.replace(
        /:$/,
        ""
      );

    return humanReqs.filter(
      (req) => {
        const note =
          (
            req.note || ""
          )
            .trim()
            .toLowerCase();

        return (
          note.includes(
            `[${phaseName}`
          ) ||
          note.includes(
            `[${phaseNameWithoutColon}`
          )
        );
      }
    );
  };

  const activePhaseHumanRequirements =
    useMemo(() => {
      if (!activePhaseId) {
        return [];
      }

      return getHumanRequirementsForPhase(
        activePhaseId
      );
    }, [
      activePhaseId,
      phases,
      humanReqs,
    ]);

  type HumanRequirementMatch = {
    requirement:
    ExperimentHumanRequirement;

    matchedSkill?:
    HumanResourceSkill;
  };

  // Find which human requirement a profile satisfies.
  // A person must match role, available working hours, and required skill (when specified).
  const findHumanMatch = (
    phaseId: number,
    human:
      HumanResourceProfile
  ): HumanRequirementMatch | null => {
    const requirements =
      getHumanRequirementsForPhase(
        phaseId
      );

    for (
      const requirement of
      requirements
    ) {
      if (
        human.roleId == null ||
        human.roleId !==
        requirement.roleId
      ) {
        continue;
      }

      const requiredHours =
        requirement.workingHoursPerDay ??
        0;

      const availableHours =
        human.maxWorkingHoursPerDay ??
        0;

      if (
        requiredHours > 0 &&
        availableHours <
        requiredHours
      ) {
        continue;
      }

      if (
        requirement.requiredSkillId ==
        null
      ) {
        return {
          requirement,
        };
      }

      const matchedSkill =
        humanResourceSkills.find(
          (skill) =>
            skill.humanResourceId ===
            human.humanResourceId &&
            skill.skillId ===
            requirement.requiredSkillId
        );

      if (matchedSkill) {
        return {
          requirement,
          matchedSkill,
        };
      }
    }

    return null;
  };

  const filteredHumansForActivePhase =
    useMemo(() => {
      if (!activePhaseId) {
        return [];
      }

      return humanProfiles.filter(
        (human) => {
          if (
            human.status !==
            "Available"
          ) {
            return false;
          }

          return Boolean(
            findHumanMatch(
              activePhaseId,
              human
            )
          );
        }
      );
    }, [
      activePhaseId,
      activePhaseHumanRequirements,
      humanProfiles,
      humanResourceSkills,
    ]);

  type HumanEligibilityItem = {
    human: HumanResourceProfile;
    isEligible: boolean;
    matchedRequirement?: ExperimentHumanRequirement;
    matchedSkill?: HumanResourceSkill;
    unavailabilityReason?: string;
  };

  const allHumansForActivePhase = useMemo<HumanEligibilityItem[]>(() => {
    if (!activePhaseId) {
      return [];
    }

    const requirements = getHumanRequirementsForPhase(activePhaseId);
    if (requirements.length === 0) {
      return [];
    }

    const allowedRoleIds = new Set<number>();
    requirements.forEach((req) => {
      if (req.roleId != null) {
        allowedRoleIds.add(req.roleId);
      }
    });

    const relevantHumans = humanProfiles.filter(
      (human) => human.roleId != null && allowedRoleIds.has(human.roleId)
    );

    return relevantHumans.map((human) => {
      const isAvailableStatus =
        human.status === "Available" || !human.status;

      if (!isAvailableStatus) {
        return {
          human,
          isEligible: false,
          unavailabilityReason: `Staff status is "${human.status}" (Currently unavailable / On Leave)`,
        };
      }

      for (const requirement of requirements) {
        if (human.roleId == null || human.roleId !== requirement.roleId) {
          continue;
        }

        const requiredHours = requirement.workingHoursPerDay ?? 0;
        const availableHours = human.maxWorkingHoursPerDay ?? 0;
        if (requiredHours > 0 && availableHours < requiredHours) {
          return {
            human,
            isEligible: false,
            matchedRequirement: requirement,
            unavailabilityReason: `Working capacity (${availableHours}h/day) < Required (${requiredHours}h/day)`,
          };
        }

        if (requirement.requiredSkillId == null) {
          return {
            human,
            isEligible: true,
            matchedRequirement: requirement,
          };
        }

        const matchedSkill = humanResourceSkills.find(
          (skill) =>
            skill.humanResourceId === human.humanResourceId &&
            skill.skillId === requirement.requiredSkillId
        );

        if (matchedSkill) {
          return {
            human,
            isEligible: true,
            matchedRequirement: requirement,
            matchedSkill,
          };
        }

        return {
          human,
          isEligible: false,
          matchedRequirement: requirement,
          unavailabilityReason: `Missing required skill: "${requirement.requiredSkillName || `Skill #${requirement.requiredSkillId}`}"`,
        };
      }

      const requiredRoleNames = requirements
        .map((r) => r.roleName || `Role #${r.roleId}`)
        .join(", ");
      return {
        human,
        isEligible: false,
        unavailabilityReason: `Role is "${human.roleName || `Role #${human.roleId}`}" (Phase requires: ${requiredRoleNames})`,
      };
    });
  }, [
    activePhaseId,
    activePhaseHumanRequirements,
    humanProfiles,
    humanResourceSkills,
  ]);

  /*
   * ==========================================================
   * ALLOCATION PLAN INITIALIZATION
   * ==========================================================
   *
   * Researcher:
   *   tạo Draft Plan MỚI cho mỗi lần bắt đầu Create Allocation.
   *   KHÔNG reuse Draft cũ của cùng Experiment.
   *
  * Manager:
  *   selects an Experiment that has already been approved by the Manager,
  *   then creates a Draft assignment plan and submits it as Pending after
  *   resources are saved. An approved source allocationPlanId remains
  *   supported for backward compatibility.
   */
  const ensureDraftAllocationPlan =
    async (): Promise<number> => {
      /*
       * MANAGER RESOURCE ALLOCATION MODE
       *
       * Manager creates the Allocation Plan from an Experiment that has
       * already been approved. An optional allocationPlanId is still
       * supported for backward compatibility with an existing approved
       * source plan.
       */
      if (isManagerAllocation) {
        if (initialPlanId > 0) {
          const existingPlan =
            await getAllocationPlanById(initialPlanId);

          if (
            String(existingPlan.approveStatus || "")
              .trim()
              .toLowerCase() !== "approved"
          ) {
            throw new Error(
              "Manager can allocate resources only after the source Allocation Plan has been approved."
            );
          }

          if (
            Number(existingPlan.experimentId) !==
            Number(selectedExpId)
          ) {
            throw new Error(
              "This Allocation Plan does not belong to the selected experiment."
            );
          }
        } else {
          const approvedExperiment =
            await getExperimentById(Number(selectedExpId));
          const approvedStatus = String(approvedExperiment.status || "")
            .trim()
            .toLowerCase();

          if (approvedStatus !== "planning" && approvedStatus !== "ready") {
            throw new Error(
              "Manager can create an Allocation Plan only from an Experiment that has been approved."
            );
          }
        }
      }

      /*
       * RESEARCHER DRAFT MODE
       *
       * Never use a stale React state value as the API source of truth.
       * A Draft is reused only inside this mounted Create Allocation session.
       * We never search the backend for an old Draft.
       */
      if (draftPlanIdRef.current) {
        const currentPlan =
          await getAllocationPlanById(
            draftPlanIdRef.current
          );

        const currentPlanExperimentId =
          Number(currentPlan?.experimentId || 0);
        const currentPlanStatus =
          String(currentPlan?.approveStatus || "")
            .trim()
            .toLowerCase();

        if (
          currentPlanExperimentId === Number(selectedExpId) &&
          currentPlanStatus === "draft"
        ) {
          return draftPlanIdRef.current;
        }

        // Stale plan / wrong experiment: never POST details to it.
        draftPlanIdRef.current = null;
        setDraftPlanId(null);
      }

      if (!selectedExpId) {
        throw new Error(
          "Please select an experiment first."
        );
      }

      // Prevent concurrent Evaluate/Submit clicks from creating multiple
      // Drafts before React has had a chance to update state.
      if (draftCreationPromiseRef.current) {
        return draftCreationPromiseRef.current;
      }

      const createNewDraft = (async () => {
        setInitializingDraftPlan(true);

        try {
          const experimentIdForDraft =
            Number(selectedExpId);

          const createdPlan =
            await createAllocationPlan({
              experimentId: experimentIdForDraft,
              fitnessScore: null,
              approveStatus: "Draft",
            });

          const newPlanId =
            Number(
              createdPlan?.allocationPlanId ||
              (
                createdPlan as unknown as {
                  id?: number;
                }
              )?.id ||
              0
            );

          if (newPlanId <= 0) {
            throw new Error(
              "Failed to initialize a new Allocation Draft."
            );
          }

          // Verify the server-created Draft before any detail POST.
          const verifiedPlan =
            await getAllocationPlanById(newPlanId);

          if (
            Number(verifiedPlan?.experimentId || 0) !==
            experimentIdForDraft
          ) {
            throw new Error(
              `New Allocation Draft #${newPlanId} does not belong to Experiment #${experimentIdForDraft}.`
            );
          }

          if (
            String(verifiedPlan?.approveStatus || "")
              .trim()
              .toLowerCase() !== "draft"
          ) {
            throw new Error(
              `New Allocation Draft #${newPlanId} is not in Draft status.`
            );
          }

          draftPlanIdRef.current = newPlanId;
          setDraftPlanId(newPlanId);

          console.info(
            `Created new Allocation Draft #${newPlanId} for experiment #${experimentIdForDraft}.`
          );

          return newPlanId;
        } finally {
          setInitializingDraftPlan(false);
          draftCreationPromiseRef.current = null;
        }
      })();

      draftCreationPromiseRef.current = createNewDraft;

      return createNewDraft;
    };

  /*
   * ==========================================================
   * LAND
   * ==========================================================
   */

  const activeLandRequirement =
    useMemo(() => {
      if (
        landReqs.length === 0
      ) {
        return null;
      }

      /*
       * Current backend requirement is experiment-level.
       * Therefore the same requirement applies to phases.
       */
      return landReqs[0];
    }, [landReqs]);

  type LandEligibilityItem = {
    land: LandResource;
    isEligible: boolean;
    unavailabilityReason?: string;
  };

  const allLandForExperiment = useMemo<LandEligibilityItem[]>(() => {
    if (!activeLandRequirement) {
      return [];
    }

    const requiredArea =
      Number(activeLandRequirement.requiredArea) || 0;

    const requiredSoilType = (
      activeLandRequirement.requiredSoilType || ""
    )
      .trim()
      .toLowerCase();

    // 1. Filter land resources by required soil type
    const matchingLand = landResources.filter((land) => {
      if (!requiredSoilType || requiredSoilType === "any") {
        return true;
      }
      const actualSoilType = (land.soilType || "").trim().toLowerCase();
      return actualSoilType === requiredSoilType;
    });

    // 2. Map eligibility
    return matchingLand.map((land) => {
      const status = (land.status || "").trim().toLowerCase();
      const isAvailableStatus = !status || status === "available";
      const isBlocked = blockedLandIds.has(land.landId);
      const landArea = Number(land.areaSize) || 0;
      const isAreaEnough = requiredArea <= 0 || landArea >= requiredArea;

      if (!isAvailableStatus) {
        return {
          land,
          isEligible: false,
          unavailabilityReason: `Status: "${land.status}" (Plot is not available)`,
        };
      }

      if (isBlocked) {
        return {
          land,
          isEligible: false,
          unavailabilityReason: "Schedule conflict: Allocated to another plan during experiment dates",
        };
      }

      if (!isAreaEnough) {
        return {
          land,
          isEligible: false,
          unavailabilityReason: `Area (${landArea.toLocaleString()} m²) is smaller than required (${requiredArea.toLocaleString()} m²)`,
        };
      }

      return {
        land,
        isEligible: true,
      };
    });
  }, [
    landResources,
    activeLandRequirement,
    blockedLandIds,
  ]);

  const handleSelectLand = (
    landId: number
  ) => {
    if (
      allocationDetailsSaved
    ) {
      setError(
        "Fitness evaluation has already been prepared. Save this allocation before changing land."
      );

      return;
    }

    const landItem = allLandForExperiment.find((item) => item.land.landId === landId);
    if (landItem && !landItem.isEligible) {
      setError(landItem.unavailabilityReason || "This land plot is not available for allocation.");
      return;
    }

    setError("");
    setSelectedLandId(
      (current) =>
        current === landId
          ? null
          : landId
    );

    setFitnessScore(null);
    setFitnessEvaluationMessage("");
    setFitnessBreakdown(null);
  };

  /*
   * ==========================================================
   * COUNTERS
   * ==========================================================
   */

  const totalEquipmentCount =
    useMemo(
      () => {
        const individualCount = Object.values(selectedEquipByPhase).reduce(
          (sum, list) => sum + list.length,
          0
        );
        const quantityCount = Object.values(selectedQuantityEquipmentByPhase).reduce(
          (sum, quantities) =>
            sum +
            Object.values(quantities).reduce(
              (quantitySum, quantity) => quantitySum + Math.max(0, Number(quantity) || 0),
              0
            ),
          0
        );

        return individualCount + quantityCount;
      },
      [
        selectedEquipByPhase,
        selectedQuantityEquipmentByPhase,
      ]
    );

  const totalHumanCount =
    useMemo(
      () =>
        Object.values(
          selectedHumansByPhase
        ).reduce(
          (
            sum,
            list
          ) =>
            sum +
            list.length,
          0
        ),
      [
        selectedHumansByPhase,
      ]
    );

  const filteredIndividualEquipmentForActivePhase = useMemo(
    () =>
      allEquipmentForActivePhase.filter((item) => {
        if (equipmentFilterTab === "available") return item.isEligible;
        if (equipmentFilterTab === "unavailable") return !item.isEligible;
        return true;
      }),
    [allEquipmentForActivePhase, equipmentFilterTab]
  );

  const filteredQuantityEquipmentForActivePhase = useMemo(
    () =>
      quantityEquipmentForActivePhase.filter((item) => {
        if (equipmentFilterTab === "available") return item.isEligible;
        if (equipmentFilterTab === "unavailable") return !item.isEligible;
        return true;
      }),
    [quantityEquipmentForActivePhase, equipmentFilterTab]
  );

  const equipmentFilterCounts = useMemo(
    () => ({
      all:
        allEquipmentForActivePhase.length +
        quantityEquipmentForActivePhase.length,
      available:
        allEquipmentForActivePhase.filter((item) => item.isEligible).length +
        quantityEquipmentForActivePhase.filter((item) => item.isEligible).length,
      unavailable:
        allEquipmentForActivePhase.filter((item) => !item.isEligible).length +
        quantityEquipmentForActivePhase.filter((item) => !item.isEligible).length,
    }),
    [allEquipmentForActivePhase, quantityEquipmentForActivePhase]
  );

  const evaluationWeightTotal =
    useMemo(
      () =>
        evaluationWeights
          .equipmentWeight +
        evaluationWeights
          .humanWeight +
        evaluationWeights
          .landWeight,
      [evaluationWeights]
    );

  /*
   * ==========================================================
   * PHASE REQUIREMENT HELPERS
   * ==========================================================
   */

  const ensurePhaseHumanRequirement =
    async (
      phaseId: number,
      requirement:
        ExperimentHumanRequirement
    ): Promise<
      number | null
    > => {
      const existing =
        phaseHumanReqs.find(
          (item) =>
            Number(
              item.phaseId
            ) ===
            Number(
              phaseId
            ) &&
            Number(
              item.roleId
            ) ===
            Number(
              requirement.roleId
            ) &&
            Number(
              item.requiredSkillId ||
              0
            ) ===
            Number(
              requirement
                .requiredSkillId ||
              0
            )
        );

      if (existing) {
        return Number(
          existing.phaseHumanReqId
        );
      }

      try {
        const response =
          await api.post(
            "/PhaseHumanRequirements",
            {
              phaseId,

              roleId:
                requirement.roleId,

              quantity:
                requirement.quantity ||
                1,

              requiredSkillId:
                requirement
                  .requiredSkillId ||
                null,

              note:
                requirement.note ||
                null,
            }
          );

        const created =
          response.data?.data ??
          response.data?.result ??
          response.data;

        const createdId =
          Number(
            created
              ?.phaseHumanReqId ||
            created?.id ||
            0
          );

        if (
          createdId > 0
        ) {
          setPhaseHumanReqs(
            (current) => [
              ...current,
              {
                phaseHumanReqId:
                  createdId,

                phaseId,

                experimentId:
                  selectedExpId,

                roleId:
                  requirement.roleId,

                quantity:
                  requirement.quantity,

                requiredSkillId:
                  requirement
                    .requiredSkillId,

                note:
                  requirement.note,
              },
            ]
          );

          return createdId;
        }
      } catch (err) {
        console.warn(
          "Unable to create PhaseHumanRequirement:",
          err
        );
      }

      return null;
    };

  /*
   * ==========================================================
   * ALLOCATION DETAIL PERSISTENCE
   * ==========================================================
   *
   * Hàm này chỉ được gọi trong Manager Allocation Mode.
   *
   * Nó persist:
   *
   * - AllocationEquipmentDetails
   * - AllocationHumanDetails
   * - AllocationLandDetails
   *
   * KHÔNG persist Schedule.
   */

  const persistAllocationDetails =
    async (
      planId: number,
      createdEquipmentDetailIds: number[]
    ) => {
      const plan =
        await getAllocationPlanById(
          planId
        );

      const normalizedPlanStatus = String(
        plan.approveStatus || ""
      )
        .trim()
        .toLowerCase();

      const canPersistResourceDetails =
        isManagerAllocation
          ? normalizedPlanStatus === "draft" &&
          String(
            (await getAllocationPlanById(initialPlanId))
              .approveStatus || ""
          ).trim().toLowerCase() === "approved"
          : currentUserInfo.role === "Researcher" &&
          normalizedPlanStatus === "draft";

      if (!canPersistResourceDetails) {
        throw new Error(
          isManagerAllocation
            ? "Manager allocation requires an Approved source request and a Draft assignment plan."
            : "Researcher can prepare resources only while the Allocation Plan is Draft."
        );
      }

      // Hard guard: never create an Equipment Detail against a plan belonging
      // to another experiment/session.
      if (
        Number(plan.experimentId || 0) !==
        Number(selectedExpId)
      ) {
        throw new Error(
          `Allocation Plan #${planId} belongs to Experiment #${plan.experimentId}, not Experiment #${selectedExpId}.`
        );
      }

      /*
       * --------------------------------------------------------
       * EQUIPMENT
       * --------------------------------------------------------
       */

      const existingEquipmentDetails =
        await getAllocationEquipmentDetails(
          {
            allocationPlanId:
              planId,

            size: 500,
          }
        ).catch(() => []);

      const equipmentDetails =
        Array.isArray(
          existingEquipmentDetails
        )
          ? existingEquipmentDetails
          : (
            existingEquipmentDetails as any
          )?.items || [];

      const existingEquipmentKeys =
        new Set(
          equipmentDetails.map(
            (detail: any) =>
              [
                Number(
                  detail
                    .allocationPlanId
                ),

                Number(
                  detail
                    .equipmentInstanceId
                ),

                Number(
                  detail
                    .expEquipmentReqId ||
                  0
                ),

                Number(
                  detail
                    .phaseEquipmentReqId ||
                  0
                ),
              ].join(":")
          )
        );

      for (
        const [
          phaseIdText,
          equipmentIds,
        ] of Object.entries(
          selectedEquipByPhase
        )
      ) {
        const phaseId =
          Number(
            phaseIdText
          );

        const phase =
          phases.find(
            (item) =>
              item.experimentPhaseId ===
              phaseId
          );

        if (!phase) {
          continue;
        }

        for (
          const equipmentId of
          equipmentIds
        ) {
          const equipment =
            availableEquipment.find(
              (item) =>
                item.equipmentInstanceId ===
                equipmentId
            );

          if (!equipment) {
            continue;
          }

          const match =
            findEquipmentMatch(
              phaseId,
              equipment
            );

          if (!match) {
            throw new Error(
              `${equipment.assetCode ||
              equipment.equipmentTypeName ||
              `Equipment #${equipmentId}`
              } does not satisfy the requirement for ${phase.phaseName}.`
            );
          }

          const requirement =
            match.requirement;

          const startDate =
            convertDateToIso(
              phase.expectedStartDate ||
              selectedExp
                ?.expectStartDate
            );

          const endDate =
            convertDateToIso(
              phase.expectedEndDate ||
              selectedExp
                ?.expectEndDate,
              true
            );

          const key = [
            planId,
            equipmentId,
            requirement
              .expEquipmentReqId,
            0,
          ].join(":");

          if (
            existingEquipmentKeys.has(
              key
            )
          ) {
            continue;
          }

          await validateEquipmentInstanceAvailability(
            equipmentId,
            startDate,
            endDate,
            equipment.assetCode
          );

          const equipmentAllocationPayload: AllocationEquipmentDetailRequest = {
            allocationPlanId:
              Number(planId),

            expEquipmentReqId:
              Number(
                requirement
                  .expEquipmentReqId
              ),

            phaseEquipmentReqId: null,

            // AllocationEquipmentDetailRequest requires the actual
            // equipment type being allocated, even for a substitute.
            allocatedEquipmentTypeId:
              Number(
                equipment.equipmentTypeId
              ),

            equipmentInstanceId:
              Number(
                equipmentId
              ),

            // One selected EquipmentInstance represents one allocated unit.
            quantity: 1,

            // The allocation API stores efficiency as a 0..1 ratio.
            efficiencyRate:
              Number(
                match.effectiveEfficiency.toFixed(4)
              ),

            isSubstitute:
              Boolean(
                match.isSubstitute
              ),

            startDate,
            endDate,

            status:
              "Allocated",
          };

          console.debug(
            "Creating AllocationEquipmentDetail with verified payload:",
            equipmentAllocationPayload
          );

          const createdEquipmentDetail =
            await createAllocationEquipmentDetail(
            equipmentAllocationPayload
          );

          createdEquipmentDetailIds.push(
            createdEquipmentDetail.allocationEquipmentDetailId
          );

          existingEquipmentKeys.add(
            key
          );
        }
      }

      /*
       * --------------------------------------------------------
       * QUANTITY-BASED EQUIPMENT
       * --------------------------------------------------------
       *
       * QuantityBased equipment has no EquipmentInstanceId.
       * The allocation detail stores the selected stock quantity
       * against the allocated equipment type.
       */
      for (const [phaseIdText, quantities] of Object.entries(
        selectedQuantityEquipmentByPhase
      )) {
        const phaseId = Number(phaseIdText);
        const phase = phases.find(
          (item) => item.experimentPhaseId === phaseId
        );
        if (!phase) continue;

        const startDate = convertDateToIso(
          phase.expectedStartDate || selectedExp?.expectStartDate
        );
        const endDate = convertDateToIso(
          phase.expectedEndDate || selectedExp?.expectEndDate,
          true
        );

        for (const [equipmentTypeIdText, rawQuantity] of Object.entries(quantities)) {
          const equipmentTypeId = Number(equipmentTypeIdText);
          const quantity = Math.max(0, Math.floor(Number(rawQuantity) || 0));
          if (equipmentTypeId <= 0 || quantity <= 0) continue;

          const equipmentType = equipmentTypes.find(
            (item) => item.equipmentTypeId === equipmentTypeId
          );
          if (!equipmentType || equipmentType.trackingType !== "QuantityBased") {
            throw new Error(
              `Equipment type #${equipmentTypeId} is not configured as Quantity Based.`
            );
          }

          const match = findQuantityEquipmentMatch(phaseId, equipmentType);
          if (!match) {
            throw new Error(
              `${equipmentType.name || equipmentType.equipmentTypeName || `Equipment Type #${equipmentTypeId}`} does not satisfy the requirement for ${phase.phaseName}.`
            );
          }

          const key = [
            planId,
            0,
            match.requirement.expEquipmentReqId,
            0,
          ].join(":");

          if (existingEquipmentKeys.has(key)) {
            continue;
          }

          const maxAvailable = Number(equipmentType.availableQuantity ?? 0);
          if (quantity > maxAvailable) {
            throw new Error(
              `${equipmentType.name || equipmentType.equipmentTypeName || `Equipment Type #${equipmentTypeId}`} has only ${maxAvailable} unit(s) available.`
            );
          }

          const equipmentAllocationPayload: AllocationEquipmentDetailRequest = {
            allocationPlanId: Number(planId),
            expEquipmentReqId: Number(match.requirement.expEquipmentReqId),
            phaseEquipmentReqId: null,
            allocatedEquipmentTypeId: equipmentTypeId,
            equipmentInstanceId: null,
            quantity,
            efficiencyRate: Number(match.effectiveEfficiency.toFixed(4)),
            isSubstitute: Boolean(match.isSubstitute),
            startDate,
            endDate,
            status: "Allocated",
          };

          console.debug(
            "Creating QuantityBased AllocationEquipmentDetail:",
            equipmentAllocationPayload
          );

          const createdEquipmentDetail =
            await createAllocationEquipmentDetail(
              equipmentAllocationPayload
            );

          createdEquipmentDetailIds.push(
            createdEquipmentDetail.allocationEquipmentDetailId
          );

          existingEquipmentKeys.add(key);
        }
      }

      /*
       * --------------------------------------------------------
       * HUMAN RESOURCE
       * --------------------------------------------------------
       *
       * FLOW MỚI:
       *
       * Manager allocate personnel vào phase.
       *
       * Không tạo Schedule tại đây.
       *
       * startDate/endDate chỉ biểu diễn khoảng thời gian
       * resource được dành cho phase.
       */

      const existingHumanDetailsResponse =
        await getAllocationHumanDetails(
          {
            allocationPlanId:
              planId,

            size: 500,
          }
        ).catch(() => []);

      const existingHumanDetails =
        Array.isArray(
          existingHumanDetailsResponse
        )
          ? existingHumanDetailsResponse
          : (
            existingHumanDetailsResponse as any
          )?.items || [];

      const existingHumanKeys =
        new Set(
          existingHumanDetails.map(
            (detail: any) =>
              [
                Number(
                  detail
                    .allocationPlanId
                ),

                Number(
                  detail
                    .humanResourceId
                ),

                Number(
                  detail
                    .expHumanReqId ||
                  0
                ),

                Number(
                  detail
                    .phaseHumanReqId ||
                  0
                ),
              ].join(":")
          )
        );

      for (
        const [
          phaseIdText,
          humanIds,
        ] of Object.entries(
          selectedHumansByPhase
        )
      ) {
        const phaseIdNum =
          Number(
            phaseIdText
          );

        const phase =
          phases.find(
            (item) =>
              item.experimentPhaseId ===
              phaseIdNum
          );

        if (!phase) {
          continue;
        }

        for (
          const humanId of
          humanIds
        ) {
          const human =
            humanProfiles.find(
              (item) =>
                item.humanResourceId ===
                humanId
            );

          if (!human) {
            continue;
          }

          const humanMatch =
            findHumanMatch(
              phaseIdNum,
              human
            );

          if (!humanMatch) {
            throw new Error(
              `${human.fullName ||
              `Human resource #${humanId}`
              } does not satisfy the personnel requirement for ${phase.phaseName}.`
            );
          }

          const requirement =
            humanMatch.requirement;

          const phaseHumanReqId =
            await ensurePhaseHumanRequirement(
              phaseIdNum,
              requirement
            );

          const requiredWorkingHours =
            Number(
              requirement
                .workingHoursPerDay ||
              human
                .maxWorkingHoursPerDay ||
              8
            );

          /*
           * Đây KHÔNG phải Work Schedule.
           *
           * Manager chỉ reserve Human Resource cho
           * khoảng thời gian của Experiment Phase.
           */
          const humanStartDate =
            convertDateToIso(
              phase.expectedStartDate ||
              selectedExp
                ?.expectStartDate
            );

          const humanEndDate =
            convertDateToIso(
              phase.expectedEndDate ||
              selectedExp
                ?.expectEndDate,
              true
            );

          const key = [
            planId,
            humanId,
            requirement
              .expHumanReqId,
            phaseHumanReqId ||
            0,
          ].join(":");

          if (
            existingHumanKeys.has(
              key
            )
          ) {
            continue;
          }

          const humanAllocationPayload: AllocationHumanDetailRequest = {
            allocationPlanId:
              Number(planId),

            expHumanReqId:
              phaseHumanReqId
                ? null
                : Number(
                  requirement.expHumanReqId
                ),

            phaseHumanReqId:
              phaseHumanReqId
                ? Number(
                  phaseHumanReqId
                )
                : null,

            humanResourceId:
              Number(
                humanId
              ),

            workingHours:
              requiredWorkingHours,

            startDate:
              humanStartDate,

            endDate:
              humanEndDate,

            // Allocation detail API stores efficiency as percentage (100 = 100%).
            // The matching logic above is normalized to 0..1, so convert it back here.
            status:
              "Allocated",
          };

          if (import.meta.env.DEV) {
            console.debug(
              "AllocationHumanDetail POST payload:",
              humanAllocationPayload
            );
          }

          await createAllocationHumanDetail(
            humanAllocationPayload
          );

          existingHumanKeys.add(
            key
          );
        }
      }

      /*
       * --------------------------------------------------------
       * LAND
       * --------------------------------------------------------
       */

      if (
        activeLandRequirement &&
        selectedLandId
      ) {
        const selectedLand =
          landResources.find(
            (item) =>
              item.landId ===
              selectedLandId
          );

        if (
          !selectedLand
        ) {
          throw new Error(
            "Selected land resource could not be found."
          );
        }

        const requiredArea =
          Number(
            activeLandRequirement
              .requiredArea
          ) || 0;

        const actualArea =
          Number(
            selectedLand.areaSize
          ) || 0;

        if (
          requiredArea > 0 &&
          actualArea <
          requiredArea
        ) {
          throw new Error(
            `Selected land provides ${actualArea} ha but ${requiredArea} ha is required.`
          );
        }

        const existingLandDetailsResponse =
          await getAllocationLandDetails(
            {
              allocationPlanId:
                planId,

              size: 100,
            }
          ).catch(() => []);

        const existingLandDetails =
          Array.isArray(
            existingLandDetailsResponse
          )
            ? existingLandDetailsResponse
            : (
              existingLandDetailsResponse as any
            )?.items || [];

        const landAlreadyAllocated =
          existingLandDetails.some(
            (detail: any) =>
              Number(
                detail
                  .allocationPlanId
              ) ===
              Number(
                planId
              ) &&
              Number(
                detail.landId
              ) ===
              Number(
                selectedLandId
              ) &&
              Number(
                detail
                  .expLandReqId ||
                0
              ) ===
              Number(
                activeLandRequirement
                  .expLandReqId
              )
          );

        if (
          !landAlreadyAllocated
        ) {
          const landStartDate = convertDateToIso(
            selectedExp?.expectStartDate
          );
          const landEndDate = convertDateToIso(
            selectedExp?.expectEndDate,
            true
          );

          await validateLandAvailability(
            selectedLandId,
            landStartDate,
            landEndDate,
            selectedLand.landCode
          );

          const landAllocationPayload: AllocationLandDetailRequest = {
            allocationPlanId:
              Number(planId),

            expLandReqId:
              Number(
                activeLandRequirement
                  .expLandReqId
              ),

            landId:
              Number(
                selectedLandId
              ),

            startDate: landStartDate,

            endDate: landEndDate,

            // Allocation detail API stores efficiency as percentage (100 = 100%).
            // The matching logic above is normalized to 0..1, so convert it back here.
            status:
              "Allocated",
          };

          await createAllocationLandDetail(
            landAllocationPayload
          );
        }
      }

      setAllocationDetailsSaved(
        true
      );
    };

  const handleWeightInputChange = (
    key: keyof EvaluationWeightPlan,
    value: string
  ) => {
    const parsedValue = value === "" ? null : Number(value);
    const numericOtherWeights = (
      Object.entries(weightInputs) as [keyof EvaluationWeightPlan, string][]
    )
      .filter(([entryKey]) => entryKey !== key)
      .reduce((total, [entryKey, entryValue]) => {
        const numericEntry =
          entryValue === "" ? 0 : Number(entryValue);

        if (!Number.isFinite(numericEntry)) {
          return total + (evaluationWeights[entryKey] ?? 0);
        }

        return total + numericEntry;
      }, 0);

    const maxAllowed = Math.max(0, 100 - numericOtherWeights);
    const fittedPercentage =
      parsedValue === null
        ? 0
        : Number.isFinite(parsedValue)
          ? Math.max(0, Math.min(maxAllowed, parsedValue))
          : 0;

    setEvaluationWeights((current) => ({
      ...current,
      [key]: fittedPercentage,
    }));
    setWeightInputs((currentInputs) => ({
      ...currentInputs,
      [key]: value === "" ? "" : String(fittedPercentage),
    }));

    setFitnessScore(null);
    setFitnessBreakdown(null);
    setFitnessEvaluationMessage("");
    setAllocationDetailsSaved(false);
  };

  const handleWeightBlur = (
    key: keyof EvaluationWeightPlan
  ) => {
    // Keep the visible input synchronized with the already-fitted value.
    setWeightInputs((current) => ({
      ...current,
      [key]: String(evaluationWeights[key] ?? 0),
    }));
  };

  /*
   * ==========================================================
   * FITNESS EVALUATION
   * ==========================================================
   *
   * Chỉ Manager được Evaluate sau khi Plan đã Approved
   * và resource đã được chọn.
   */

  const handleEvaluateFitnessScore =
    async () => {
      if (
        !selectedExpId ||
        !selectedExp
      ) {
        setError(
          "Please select an experiment first."
        );

        return;
      }

      if (
        (equipmentReqs.length > 0 || phaseEquipmentReqs.length > 0) &&
        totalEquipmentCount === 0
      ) {
        setError(
          "Please select the required equipment before evaluating Fitness Score."
        );

        return;
      }

      if (
        (humanReqs.length > 0 || phaseHumanReqs.length > 0) &&
        totalHumanCount === 0
      ) {
        setError(
          "Please select the required personnel before evaluating Fitness Score."
        );

        return;
      }

      if (
        activeLandRequirement &&
        !selectedLandId
      ) {
        setError(
          "Please select a land plot before evaluating Fitness Score."
        );

        return;
      }

      if (Math.abs(evaluationWeightTotal - 100) > 0.001) {
        setError(
          `The three weights must total exactly 100%. Current total: ${evaluationWeightTotal.toFixed(1)}%.`
        );
        return;
      }

      try {
        setEvaluatingFitness(
          true
        );

        setError("");

        setFitnessEvaluationMessage(
          ""
        );

        const equipmentDetails = Object.entries(
          selectedEquipByPhase
        ).flatMap(([phaseIdText, equipmentIds]) => {
          const phaseId = Number(phaseIdText);
          const phase = phases.find(
            (item) => item.experimentPhaseId === phaseId
          );

          if (!phase) return [];

          return equipmentIds.flatMap((equipmentId) => {
            const equipment = availableEquipment.find(
              (item) => item.equipmentInstanceId === equipmentId
            );
            if (!equipment) return [];

            const match = findEquipmentMatch(phaseId, equipment);
            if (!match) return [];

            const phaseRequirement = phaseEquipmentReqs.find(
              (item) =>
                item.phaseId === phaseId &&
                item.equipmentTypeId === match.requirement.equipmentTypeId
            );
            const startDate =
              phase.expectedStartDate || selectedExp.expectStartDate;
            const endDate =
              phase.expectedEndDate || selectedExp.expectEndDate;

            return [{
              equipmentTypeId: equipment.equipmentTypeId ?? null,
              equipmentInstanceId: equipment.equipmentInstanceId ?? null,
              quantity: 1,
              expEquipmentReqId: match.requirement.expEquipmentReqId,
              phaseEquipmentReqId: null,
              isSubstitute: match.isSubstitute,
              efficiencyRate: Number(match.effectiveEfficiency.toFixed(4)),
              startDate: startDate ? convertDateToIso(startDate) : null,
              endDate: endDate ? convertDateToIso(endDate, true) : null,
            }];
          });
        });

        const quantityEquipmentDetails = Object.entries(
          selectedQuantityEquipmentByPhase
        ).flatMap(([phaseIdText, quantities]) => {
          const phaseId = Number(phaseIdText);
          const phase = phases.find(
            (item) => item.experimentPhaseId === phaseId
          );
          if (!phase) return [];

          return Object.entries(quantities).flatMap(([equipmentTypeIdText, quantity]) => {
            const equipmentTypeId = Number(equipmentTypeIdText);
            const selectedQuantity = Math.max(0, Math.floor(Number(quantity) || 0));
            if (equipmentTypeId <= 0 || selectedQuantity <= 0) return [];

            const equipmentType = equipmentTypes.find(
              (item) => item.equipmentTypeId === equipmentTypeId
            );
            if (!equipmentType) return [];

            const match = findQuantityEquipmentMatch(phaseId, equipmentType);
            if (!match) return [];

            const startDate =
              phase.expectedStartDate || selectedExp.expectStartDate;
            const endDate =
              phase.expectedEndDate || selectedExp.expectEndDate;

            return [{
              equipmentTypeId,
              equipmentInstanceId: null,
              quantity: selectedQuantity,
              expEquipmentReqId: match.requirement.expEquipmentReqId,
              phaseEquipmentReqId: null,
              isSubstitute: match.isSubstitute,
              efficiencyRate: Number(match.effectiveEfficiency.toFixed(4)),
              startDate: startDate ? convertDateToIso(startDate) : null,
              endDate: endDate ? convertDateToIso(endDate, true) : null,
            }];
          });
        });

        const allEquipmentDetails = [
          ...equipmentDetails,
          ...quantityEquipmentDetails,
        ];

        const humanDetails = Object.entries(
          selectedHumansByPhase
        ).flatMap(([phaseIdText, humanIds]) => {
          const phaseId = Number(phaseIdText);
          const phase = phases.find(
            (item) => item.experimentPhaseId === phaseId
          );

          if (!phase) return [];

          return humanIds.flatMap((humanId) => {
            const human = humanProfiles.find(
              (item) => item.humanResourceId === humanId
            );
            if (!human) return [];

            const match = findHumanMatch(phaseId, human);
            if (!match) return [];

            const phaseRequirement = phaseHumanReqs.find(
              (item) =>
                item.phaseId === phaseId &&
                item.roleId === match.requirement.roleId
            );
            const startDate =
              phase.expectedStartDate || selectedExp.expectStartDate;
            const endDate =
              phase.expectedEndDate || selectedExp.expectEndDate;

            return [{
              humanResourceId: human.humanResourceId,
              assignedRole: match.requirement.roleName ?? null,
              expHumanReqId: phaseRequirement
                ? null
                : match.requirement.expHumanReqId,
              phaseHumanReqId: phaseRequirement?.phaseHumanReqId ?? null,
              workingHours: Number(
                match.requirement.workingHoursPerDay ||
                human.maxWorkingHoursPerDay ||
                8
              ),
              startDate: startDate ? convertDateToIso(startDate) : null,
              endDate: endDate ? convertDateToIso(endDate, true) : null,
            }];
          });
        });

        const selectedLand = landResources.find(
          (land) => land.landId === selectedLandId
        );
        const landDetails =
          activeLandRequirement && selectedLand
            ? [{
              landId: selectedLand.landId,
              allocatedArea: Number(
                activeLandRequirement.requiredArea || selectedLand.areaSize || 0
              ),
              expLandReqId: activeLandRequirement.expLandReqId,
              startDate: selectedExp.expectStartDate
                ? convertDateToIso(selectedExp.expectStartDate)
                : null,
              endDate: selectedExp.expectEndDate
                ? convertDateToIso(selectedExp.expectEndDate, true)
                : null,
            }]
            : [];

        const evaluation = await simulateAllocationPlanFitness({
          experimentId: selectedExpId,
          currentPlanId: draftPlanId ?? (initialPlanId > 0 ? initialPlanId : null),
          equipmentDetails: allEquipmentDetails,
          humanDetails,
          landDetails,
        });

        const breakdown = parseFitnessBreakdown(
          evaluation.raw,
          evaluationWeights
        );
        const hasAllComponentScores = [
          breakdown.equipment.score,
          breakdown.human.score,
          breakdown.land.score,
        ].every((score) => score !== null);
        if (!hasAllComponentScores) {
          throw new Error(
            "The simulation did not return all component scores needed to apply the selected weights."
          );
        }

        const weightedScore = [
          breakdown.equipment.contribution,
          breakdown.human.contribution,
          breakdown.land.contribution,
        ].reduce<number>(
          (total, contribution) => total + (contribution ?? 0),
          0
        ) + (breakdown.penaltyScore ?? 0) + (breakdown.bonusScore ?? 0);

        setFitnessScore(Number(weightedScore));
        setFitnessBreakdown(breakdown);

        setFitnessEvaluationMessage(
          "Simulated for the currently selected resources. This does not save or submit the allocation."
        );
      } catch (
      evaluationError: any
      ) {
        console.error(
          "Evaluate allocation fitness failed:",
          evaluationError
        );

        const responseData =
          evaluationError
            ?.response?.data;

        const backendMessage =
          responseData?.message ||
          responseData?.error ||
          responseData?.title ||
          (
            typeof responseData ===
              "string"
              ? responseData
              : null
          );

        setError(
          backendMessage ||
          evaluationError
            ?.message ||
          "Failed to evaluate Fitness Score."
        );
      } finally {
        setEvaluatingFitness(
          false
        );
      }
    };

  /*
   * ==========================================================
   * SAVE / SUBMIT
   * ==========================================================
   *
   * RESEARCHER
   *   Draft Plan
   *      -> Submit
   *      -> Pending
   *
   * MANAGER
   *   Approved Plan
   *      -> persist resources
   *
   * Schedule KHÔNG được tạo ở cả hai nhánh.
   */

  const handleSaveAndSubmitPlan =
    async () => {
      if (
        !selectedExpId ||
        !selectedExp
      ) {
        setError(
          "Please select an experiment first."
        );

        return;
      }

      setSubmitting(true);
      setError("");
      const createdEquipmentDetailIds: number[] = [];

      try {
        const planId =
          await ensureDraftAllocationPlan();

        /*
         * ======================================================
         * MANAGER RESOURCE ALLOCATION
         * ======================================================
         */

        if (isManagerAllocation) {
          const assignmentPlan = await getAllocationPlanById(planId);
          const experimentForAllocation = await getExperimentById(
            Number(selectedExpId)
          );
          const experimentStatus = String(
            experimentForAllocation.status || ""
          )
            .trim()
            .toLowerCase();

          if (experimentStatus !== "planning" && experimentStatus !== "ready") {
            throw new Error(
              "Manager can create an Allocation Plan only from an Experiment that has already been approved."
            );
          }

          if (
            Number(assignmentPlan.experimentId) !== Number(selectedExpId) ||
            String(assignmentPlan.approveStatus || "").trim().toLowerCase() !== "draft"
          ) {
            throw new Error(
              "The Allocation Plan Draft is invalid for the selected approved Experiment."
            );
          }

          if (
            totalEquipmentCount ===
            0
          ) {
            throw new Error(
              "Please select the required equipment."
            );
          }

          if (
            totalHumanCount ===
            0
          ) {
            throw new Error(
              "Please select the required personnel."
            );
          }

          if (
            activeLandRequirement &&
            !selectedLandId
          ) {
            throw new Error(
              "Please select the required land plot."
            );
          }

          /*
           * Đây là nơi duy nhất trong màn hình này
           * resource allocation được persist.
           *
           * KHÔNG persist Schedule.
           */
          await persistAllocationDetails(
            planId,
            createdEquipmentDetailIds
          );

          /*
           * Fitness Score không bắt buộc để lưu resource.
           *
           * Nếu Manager đã Evaluate thì score đã được backend
           * cập nhật. Nếu chưa Evaluate thì vẫn cho phép lưu.
           */
          // A Manager-created plan follows the existing Allocation workflow:
          // save the resources to Draft, then submit it as Pending.
          await submitAllocationPlan(planId);

          sendLocalNotification({
            title: "Allocation Plan Created",
            message:
              `Allocation Plan #${planId} was created from approved Experiment #${selectedExpId} and submitted for approval.`,
            notificationType: "Success",
            referenceType: "AllocationPlan",
            referenceId: planId,
          });

          void fetchUnreadCount();

          navigate("/allocation", {
            state: {
              message:
                `Allocation Plan #${planId} was created from approved Experiment "${selectedExp.experimentName}" and submitted successfully.`,
            },
          });

          return;
        }

        /*
         * ======================================================
         * RESEARCHER SUBMIT PLAN
         * ======================================================
         *
         * Researcher KHÔNG persist resource.
         * Researcher KHÔNG persist Schedule.
         */

        if (
          currentUserInfo.role !==
          "Researcher"
        ) {
          throw new Error(
            "Only Researcher can submit a new Allocation Plan."
          );
        }

        if (
          totalEquipmentCount === 0 &&
          (equipmentReqs.length > 0 || phaseEquipmentReqs.length > 0)
        ) {
          throw new Error("Please select the required equipment before submitting the plan.");
        }

        if (
          totalHumanCount === 0 &&
          (humanReqs.length > 0 || phaseHumanReqs.length > 0)
        ) {
          throw new Error("Please select the required personnel before submitting the plan.");
        }

        if (activeLandRequirement && !selectedLandId) {
          throw new Error("Please select the required land plot before submitting the plan.");
        }

        if (Math.abs(evaluationWeightTotal - 100) > 0.001) {
          throw new Error(
            `The three weights must total exactly 100%. Current total: ${evaluationWeightTotal.toFixed(1)}%.`
          );
        }

        /*
         * Fitness Score is no longer part of the Researcher submit flow.
         * Therefore resource details must be persisted HERE before the
         * Allocation Plan is submitted. Previously this happened only from
         * the Evaluate Fitness Score handler, so removing that UI also
         * removed the only call that created Equipment/Human/Land details.
         */
        await persistAllocationDetails(
          planId,
          createdEquipmentDetailIds
        );

        const savedEvaluation = await evaluateAllocationPlan(
          planId,
          {
            equipmentWeight: evaluationWeights.equipmentWeight / 100,
            humanWeight: evaluationWeights.humanWeight / 100,
            landWeight: evaluationWeights.landWeight / 100,
            maintenanceWeight: 0,
          }
        );

        if (savedEvaluation.fitnessScore === null) {
          throw new Error(
            "The backend did not return the Fitness Score for the saved allocation."
          );
        }

        setFitnessScore(savedEvaluation.fitnessScore);
        setFitnessBreakdown(
          parseFitnessBreakdown(savedEvaluation.raw, evaluationWeights)
        );

        // Submit only changes the Allocation Plan workflow: Draft -> Pending.
        await submitAllocationPlan(planId);

        sendLocalNotification({
          title:
            "Allocation Plan Submitted",

          message:
            `Allocation plan for Experiment #${selectedExpId} has been submitted for Manager approval.`,

          notificationType:
            "Success",

          referenceType:
            "AllocationPlan",

          referenceId:
            planId,
        });

        void fetchUnreadCount();

        navigate(
          "/allocation",
          {
            state: {
              message:
                `Allocation plan for Experiment "${selectedExp.experimentName}" submitted successfully for Manager approval.`,
            },
          }
        );
      } catch (err: any) {
        if (createdEquipmentDetailIds.length > 0) {
          const rollbackResults = await Promise.allSettled(
            createdEquipmentDetailIds.map((detailId) =>
              currentUserInfo.role === "Researcher"
                ? deleteMyAllocationEquipmentDetail(detailId)
                : deleteAllocationEquipmentDetail(detailId)
            )
          );
          const rollbackFailures = rollbackResults
            .map((result, index) => ({ result, detailId: createdEquipmentDetailIds[index] }))
            .filter(({ result }) => result.status === "rejected");

          if (rollbackFailures.length > 0) {
            console.error(
              "Failed to roll back allocation equipment details:",
              rollbackFailures
            );
          }
        }

        console.error(
          "Allocation flow failed:",
          err
        );

        const responseData =
          err?.response?.data;

        const responseErrors =
          responseData?.errors &&
            typeof responseData.errors === "object"
            ? Object.entries(responseData.errors)
              .map(([field, messages]) =>
                `${field}: ${Array.isArray(messages) ? messages.join(", ") : String(messages)}`
              )
              .join("; ")
            : null;

        const backendMessage =
          responseData?.message ||
          responseData?.error ||
          responseData?.title ||
          responseData?.detail ||
          responseErrors ||
          (
            typeof responseData ===
              "string"
              ? responseData
              : responseData && Object.keys(responseData).length > 0
                ? JSON.stringify(responseData)
                : null
          );

        console.error("Allocation API failure details:", {
          status: err?.response?.status,
          url: err?.config?.url,
          response: responseData,
        });

        setError(
          backendMessage ||
          err?.message ||
          "Failed to process Allocation Plan. Please check inputs."
        );
      } finally {
        setSubmitting(
          false
        );
      }
    };

  return (
    <DashboardLayout>
      <div className="create-allocation-page">
        {error && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="allocation-error-title"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              background:
                "rgba(15, 23, 42, 0.48)",
              backdropFilter:
                "blur(2px)",
            }}
            onMouseDown={(
              event
            ) => {
              if (
                event.currentTarget ===
                event.target
              ) {
                setError("");
              }
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "520px",
                borderRadius: "14px",
                border:
                  "1px solid #fecaca",
                background:
                  "#ffffff",
                boxShadow:
                  "0 20px 50px rgba(15, 23, 42, 0.22)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding:
                    "18px 20px 14px",
                  borderBottom:
                    "1px solid #fee2e2",
                  background:
                    "#fff7f7",
                }}
              >
                <div
                  id="allocation-error-title"
                  style={{
                    fontSize:
                      "16px",
                    fontWeight:
                      700,
                    color:
                      "#b91c1c",
                  }}
                >
                  Allocation Error
                </div>

                <div
                  style={{
                    marginTop:
                      "7px",
                    color:
                      "#7f1d1d",
                    fontSize:
                      "13px",
                    lineHeight:
                      1.55,
                  }}
                >
                  {error}
                </div>
              </div>

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "flex-end",
                  padding:
                    "12px 20px",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setError("")
                  }
                  className="alloc-btn-manual"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="alloc-page-header">
          <div>
            <button
              type="button"
              className="alloc-back-btn"
              onClick={() =>
                navigate(
                  "/allocation"
                )
              }
            >
              <ArrowLeft
                size={16}
              />

              Back to Allocation Plans
            </button>

            <h1>
              {isManagerAllocation
                ? "Create Allocation Plan"
                : "Request Allocation Resources"}
            </h1>

            <p>
              {isManagerAllocation
                ? "Choose an Experiment already approved by the Manager, then assign its land, equipment and personnel resources."
                : "Select an experiment, then prepare its proposed resource allocation."}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="alloc-loading">
            Loading resource inventory...
          </div>
        ) : (
          <>
            <div className="alloc-section">
              <div className="alloc-section-header">
                <div>
                  <h2>
                    Experiment
                  </h2>

                  <p>
                    {isManagerAllocation
                      ? "Select an approved Experiment. A new Draft Allocation Plan will be created for it."
                      : "Select an experiment, then prepare its proposed resource allocation."}
                  </p>
                </div>
              </div>

              {isManagerAllocation ? (
                <div className="alloc-form-group">
                  <label htmlFor="manager-approved-experiment">
                    Approved Experiment
                  </label>

                  <select
                    id="manager-approved-experiment"
                    value={selectedExpId || ""}
                    onChange={(event) =>
                      setSelectedExpId(Number(event.target.value) || 0)
                    }
                    disabled={!!initialPlanId}
                  >
                    <option value="">
                      -- Select approved Experiment --
                    </option>

                    {allExperiments.map((experiment) => (
                      <option
                        key={experiment.experimentId}
                        value={experiment.experimentId}
                      >
                        {experiment.experimentName}
                      </option>
                    ))}
                  </select>

                  {initialPlanId > 0 && (
                    <div
                      style={{
                        marginTop: "6px",
                        fontSize: "12px",
                        color: "#64748b",
                      }}
                    >
                      Source Allocation Plan #{initialPlanId} · Approved
                    </div>
                  )}
                </div>
              ) : (
                <div className="alloc-form-group">
                  <label
                    htmlFor="allocation-experiment"
                  >
                    Experiment
                  </label>

                  <select
                    id="allocation-experiment"
                    value={
                      selectedExpId ||
                      ""
                    }
                    onChange={(
                      event
                    ) => {
                      const id =
                        Number(
                          event
                            .target
                            .value
                        );

                      setSelectedExpId(
                        id
                      );
                    }}
                  >
                    <option value="">
                      -- Select Experiment --
                    </option>

                    {allExperiments.map(
                      (
                        experiment
                      ) => (
                        <option
                          key={
                            experiment
                              .experimentId
                          }
                          value={
                            experiment
                              .experimentId
                          }
                        >
                          {
                            experiment
                              .experimentName
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}

              {selectedExp && (
                <div className="alloc-experiment-summary">
                  <div>
                    <span>
                      Experiment
                    </span>

                    <strong>
                      {
                        selectedExp
                          .experimentName
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Researcher
                    </span>

                    <strong>
                      {selectedExp
                        .researcherName ||
                        selectedExp
                          .createdByName ||
                        "-"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Expected
                      Start
                    </span>

                    <strong>
                      {formatDate(
                        selectedExp
                          .expectStartDate
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Expected
                      End
                    </span>

                    <strong>
                      {formatDate(
                        selectedExp
                          .expectEndDate
                      )}
                    </strong>
                  </div>
                </div>
              )}
            </div>
            {selectedExp && (
              <>
                {/* =========================================================
                    1. EXPERIMENT PHASES
                ========================================================= */}
                <div className="alloc-phase-nav-card">
                  <div className="alloc-phase-nav-header">
                    <div>
                      <h3>
                        1. Select Experiment Phase ({phases.length} Phases)
                      </h3>

                      <p
                        style={{
                          margin: "3px 0 0",
                          fontSize: "12.5px",
                          color: "#64748b",
                          fontWeight: 400,
                        }}
                      >
                        Select a phase to allocate equipment and personnel
                        for that execution window.
                      </p>
                    </div>
                  </div>

                  {phases.length === 0 ? (
                    <p
                      style={{
                        color: "#64748b",
                        margin: "10px 0 0",
                        fontSize: "13px",
                        fontWeight: 400,
                      }}
                    >
                      No phases are defined for this experiment.
                    </p>
                  ) : (
                    <div className="alloc-phase-tabs">
                      {phases.map((phase) => {
                        const isSelected =
                          phase.experimentPhaseId === activePhaseId;

                        const equipmentCount =
                          (selectedEquipByPhase[
                            phase.experimentPhaseId
                          ]?.length || 0) +
                          Object.values(
                            selectedQuantityEquipmentByPhase[
                              phase.experimentPhaseId
                            ] || {}
                          ).reduce(
                            (sum, quantity) =>
                              sum + Math.max(0, Number(quantity) || 0),
                            0
                          );

                        const humanCount =
                          selectedHumansByPhase[
                            phase.experimentPhaseId
                          ]?.length || 0;

                        return (
                          <button
                            key={phase.experimentPhaseId}
                            type="button"
                            onClick={() =>
                              setActivePhaseId(
                                phase.experimentPhaseId
                              )
                            }
                            className={`alloc-phase-tab ${isSelected ? "active" : ""
                              }`}
                          >
                            <span className="alloc-phase-tab-badge">
                              Phase #{phase.phaseOrder ?? 1}
                            </span>

                            <div className="alloc-phase-tab-title">
                              {phase.phaseName}
                            </div>

                            <div className="alloc-phase-tab-dates">
                              {formatDate(phase.expectedStartDate)}
                              {" → "}
                              {formatDate(phase.expectedEndDate)}
                            </div>

                            {(equipmentCount > 0 ||
                              humanCount > 0) && (
                                <div
                                  style={{
                                    marginTop: "3px",
                                    fontSize: "11px",
                                    fontWeight: 500,
                                    color: "#16a34a",
                                  }}
                                >
                                  {equipmentCount} machines •{" "}
                                  {humanCount} staff
                                </div>
                              )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* =========================================================
                    2. PHASE RESOURCE WORKSPACE
                ========================================================= */}

                {activePhase ? (
                  <div className="alloc-workspace-grid">
                    {/* =====================================================
                        EQUIPMENT
                    ===================================================== */}
                    <div className="alloc-section-card">
                      <div className="alloc-section-header">
                        <div>
                          <h4>
                            Equipment for "{activePhase.phaseName}"
                          </h4>

                          <span
                            style={{
                              fontSize: "12px",
                              color: "#64748b",
                              fontWeight: 400,
                            }}
                          >
                            Select equipment matching this phase&apos;s
                            requirements.
                          </span>
                        </div>

                        <span className="alloc-selection-count">
                          {selectedEquipByPhase[
                            activePhase.experimentPhaseId
                          ]?.length || 0}{" "}
                          Selected
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

                          {activePhaseEquipmentRequirements.map(
                            (requirement) => (
                              <div
                                key={
                                  requirement.expEquipmentReqId
                                }
                                style={{
                                  fontSize: "12px",
                                  color: "#334155",
                                  marginTop: "3px",
                                }}
                              >
                                <strong>
                                  {requirement.equipmentTypeName ||
                                    `Equipment Type #${requirement.equipmentTypeId}`}
                                </strong>

                                {" • "}
                                Required: {requirement.quantity}

                                {" • "}
                                Min Eff:{" "}
                                {Math.round(
                                  normalizeEfficiency(
                                    requirement.minAcceptableEfficiency
                                  ) * 100
                                )}
                                %

                                {" • "}
                                Substitute:{" "}
                                {requirement.allowSubstitute
                                  ? "Allowed"
                                  : "No"}
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {/* Filter Tabs for Equipment */}
                      <div className="alloc-view-filter-tabs">
                        <button
                          type="button"
                          className={`alloc-view-filter-btn ${equipmentFilterTab === "all" ? "active" : ""}`}
                          onClick={() => setEquipmentFilterTab("all")}
                        >
                          All ({equipmentFilterCounts.all})
                        </button>
                        <button
                          type="button"
                          className={`alloc-view-filter-btn ${equipmentFilterTab === "available" ? "active" : ""}`}
                          onClick={() => setEquipmentFilterTab("available")}
                        >
                          Available ({equipmentFilterCounts.available})
                        </button>
                        <button
                          type="button"
                          className={`alloc-view-filter-btn ${equipmentFilterTab === "unavailable" ? "active warning" : ""}`}
                          onClick={() => setEquipmentFilterTab("unavailable")}
                        >
                          Unavailable ({equipmentFilterCounts.unavailable})
                        </button>
                      </div>

                      {activePhaseEquipmentRequirements.length === 0 ? (
                        <p
                          style={{
                            color: "#b45309",
                            fontSize: "12.5px",
                            margin: "12px 0",
                            fontWeight: 500,
                          }}
                        >
                          No equipment requirement is configured for this
                          phase.
                        </p>
                      ) : checkingEquipmentAvailability ? (
                        <p
                          style={{
                            color: "#64748b",
                            fontSize: "12.5px",
                            margin: "12px 0",
                          }}
                        >
                          Checking equipment availability for this phase&apos;s dates...
                        </p>
                      ) : (
                        <div className="alloc-items-list">
                          {/* QuantityBased stock */}
                          {filteredQuantityEquipmentForActivePhase.length > 0 && (
                            <>
                              <div
                                style={{
                                  padding: "8px 2px 4px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color: "#475569",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.03em",
                                }}
                              >
                                Quantity-based stock
                              </div>

                              {filteredQuantityEquipmentForActivePhase.map(
                                ({
                                  equipmentType,
                                  isEligible,
                                  isPrimary,
                                  isSubstitute,
                                  effectiveEfficiency,
                                  selectedQuantity,
                                  maxSelectableQuantity,
                                  unavailabilityReason,
                                  match,
                                }) => (
                                  <div
                                    key={`quantity-${equipmentType.equipmentTypeId}`}
                                    className={`alloc-item-row ${selectedQuantity > 0 ? "selected" : ""} ${!isEligible ? "disabled" : ""}`}
                                    style={{
                                      cursor: isEligible ? "default" : "not-allowed",
                                      alignItems: "center",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: "10px",
                                        flex: 1,
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: "28px",
                                          minWidth: "28px",
                                          height: "28px",
                                          borderRadius: "7px",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          background: isEligible ? "#f0fdf4" : "#f8fafc",
                                          border: `1px solid ${isEligible ? "#bbf7d0" : "#e2e8f0"}`,
                                          fontSize: "11px",
                                          fontWeight: 700,
                                          color: isEligible ? "#15803d" : "#94a3b8",
                                        }}
                                      >
                                        QTY
                                      </div>

                                      <div>
                                        <div
                                          style={{
                                            fontSize: "13px",
                                            color: isEligible
                                              ? isSubstitute
                                                ? "#7c3aed"
                                                : "#0284c7"
                                              : "#64748b",
                                            fontWeight: 600,
                                          }}
                                        >
                                          {equipmentType.name ||
                                            equipmentType.equipmentTypeName ||
                                            `Equipment Type #${equipmentType.equipmentTypeId}`}
                                        </div>

                                        <div
                                          style={{
                                            fontSize: "11.5px",
                                            color: "#64748b",
                                            marginTop: "2px",
                                          }}
                                        >
                                          Quantity Based
                                          {" • "}
                                          Stock: {equipmentType.availableQuantity}
                                          {" • "}
                                          Required: {match?.requirement.quantity ?? "-"}
                                          {" • "}
                                          {Math.round((effectiveEfficiency || 0) * 100)}% Eff.
                                        </div>

                                        {!isEligible && unavailabilityReason && (
                                          <div className="alloc-reason-badge">
                                            ⚠️ {unavailabilityReason}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                      }}
                                    >
                                      <div style={{ textAlign: "right" }}>
                                        {isPrimary && (
                                          <div
                                            style={{
                                              fontSize: "10.5px",
                                              fontWeight: 700,
                                              color: isEligible ? "#15803d" : "#94a3b8",
                                            }}
                                          >
                                            PRIMARY
                                          </div>
                                        )}
                                        {isSubstitute && (
                                          <div
                                            style={{
                                              fontSize: "10.5px",
                                              fontWeight: 700,
                                              color: isEligible ? "#7c3aed" : "#94a3b8",
                                            }}
                                          >
                                            SUBSTITUTE
                                          </div>
                                        )}
                                      </div>

                                      <input
                                        type="number"
                                        min={0}
                                        max={maxSelectableQuantity}
                                        value={selectedQuantity}
                                        disabled={
                                          !isEligible ||
                                          allocationDetailsSaved
                                        }
                                        onClick={(event) => event.stopPropagation()}
                                        onChange={(event) =>
                                          handleQuantityEquipmentChange(
                                            equipmentType.equipmentTypeId,
                                            event.target.value
                                          )
                                        }
                                        style={{
                                          width: "74px",
                                          padding: "7px 8px",
                                          border: "1px solid #cbd5e1",
                                          borderRadius: "6px",
                                          fontSize: "14px",
                                          fontWeight: 700,
                                          textAlign: "center",
                                          background: !isEligible ? "#f8fafc" : "#fff",
                                          color: "#111827",
                                          WebkitTextFillColor: "#111827",
                                          colorScheme: "light",
                                          opacity: 1,
                                        }}
                                        aria-label={`Quantity for ${equipmentType.name || equipmentType.equipmentTypeName || `equipment type ${equipmentType.equipmentTypeId}`}`}
                                      />
                                    </div>
                                  </div>
                                )
                              )}
                            </>
                          )}

                          {/* Individual assets */}
                          {filteredIndividualEquipmentForActivePhase.length > 0 && (
                            <>
                              <div
                                style={{
                                  padding: "12px 2px 4px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color: "#475569",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.03em",
                                }}
                              >
                                Individual equipment
                              </div>

                              {filteredIndividualEquipmentForActivePhase.map(
                                ({
                                  equipment,
                                  isEligible,
                                  isPrimary,
                                  isSubstitute,
                                  effectiveEfficiency,
                                  unavailabilityReason,
                                }) => {
                                  const isChecked = (
                                    selectedEquipByPhase[
                                      activePhase.experimentPhaseId
                                    ] || []
                                  ).includes(
                                    equipment.equipmentInstanceId
                                  );

                                  return (
                                    <div
                                      key={`individual-${equipment.equipmentInstanceId}`}
                                      onClick={() => {
                                        if (
                                          isEligible &&
                                          !allocationDetailsSaved
                                        ) {
                                          handleToggleEquipment(
                                            equipment.equipmentInstanceId
                                          );
                                        }
                                      }}
                                      className={`alloc-item-row ${isChecked ? "selected" : ""
                                        } ${!isEligible ? "disabled" : ""}`}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "flex-start",
                                          gap: "10px",
                                          flex: 1,
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          disabled={
                                            !isEligible ||
                                            allocationDetailsSaved
                                          }
                                          readOnly
                                          className="alloc-item-checkbox"
                                          style={{ marginTop: "3px" }}
                                        />

                                        <div>
                                          <div
                                            style={{
                                              fontSize: "13px",
                                              color: isEligible
                                                ? isSubstitute
                                                  ? "#7c3aed"
                                                  : "#0284c7"
                                                : "#64748b",
                                              fontWeight: 550,
                                            }}
                                          >
                                            {equipment.assetCode ||
                                              `EQ-${equipment.equipmentInstanceId}`}
                                          </div>

                                          <div
                                            style={{
                                              fontSize: "11.5px",
                                              color: "#64748b",
                                            }}
                                          >
                                            {equipment.equipmentTypeName ||
                                              `Type #${equipment.equipmentTypeId}`}
                                            {" • "}
                                            {equipment.conditionLevel || "Good"}
                                            {equipment.status !== "Available" &&
                                              ` • Status: ${equipment.status}`}
                                            {" • Individual"}
                                          </div>

                                          {!isEligible && unavailabilityReason && (
                                            <div className="alloc-reason-badge">
                                              ⚠️ {unavailabilityReason}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div
                                        style={{
                                          textAlign: "right",
                                        }}
                                      >
                                        {isPrimary && (
                                          <div
                                            style={{
                                              fontSize: "10.5px",
                                              fontWeight: 700,
                                              color: isEligible
                                                ? "#15803d"
                                                : "#94a3b8",
                                            }}
                                          >
                                            PRIMARY
                                          </div>
                                        )}
                                        {isSubstitute && (
                                          <div
                                            style={{
                                              fontSize: "10.5px",
                                              fontWeight: 700,
                                              color: isEligible
                                                ? "#7c3aed"
                                                : "#94a3b8",
                                            }}
                                          >
                                            SUBSTITUTE
                                          </div>
                                        )}
                                        <span
                                          style={{
                                            fontSize: "11.5px",
                                            color: isEligible
                                              ? "#16a34a"
                                              : "#94a3b8",
                                          }}
                                        >
                                          {Math.round(
                                            (effectiveEfficiency ||
                                              normalizeEfficiency(
                                                equipment.efficiencyRate ?? 1
                                              )) * 100
                                          )}
                                          % Eff.
                                        </span>
                                      </div>
                                    </div>
                                  );
                                }
                              )}
                            </>
                          )}

                          {filteredQuantityEquipmentForActivePhase.length === 0 &&
                            filteredIndividualEquipmentForActivePhase.length === 0 && (
                              <p
                                style={{
                                  color: "#64748b",
                                  fontSize: "12.5px",
                                  margin: "12px 0",
                                }}
                              >
                                No equipment found in inventory matching this
                                phase&apos;s requirements.
                              </p>
                            )}
                        </div>
                      )}
                    </div>

                    {/* =====================================================
                        PERSONNEL
                    ===================================================== */}
                    <div className="alloc-section-card">
                      <div className="alloc-section-header">
                        <div>
                          <h4>
                            Personnel for "{activePhase.phaseName}"
                          </h4>

                          <span
                            style={{
                              fontSize: "12px",
                              color: "#64748b",
                              fontWeight: 400,
                            }}
                          >
                            Select personnel matching this phase&apos;s requirements.
                            Work schedules will be assigned after the Allocation Plan is approved.
                          </span>
                        </div>

                        <span className="alloc-selection-count">
                          {selectedHumansByPhase[
                            activePhase.experimentPhaseId
                          ]?.length || 0}{" "}
                          Selected
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
                            }}
                          >
                            Personnel Requirement
                          </div>

                          {activePhaseHumanRequirements.map(
                            (requirement) => (
                              <div
                                key={
                                  requirement.expHumanReqId
                                }
                                style={{
                                  fontSize: "12px",
                                  color: "#334155",
                                  marginTop: "4px",
                                }}
                              >
                                <strong>
                                  {requirement.roleName ||
                                    `Role #${requirement.roleId}`}
                                </strong>

                                {" • "}
                                Required: {requirement.quantity}

                                {" • "}
                                Skill:{" "}
                                {requirement.requiredSkillName ||
                                  (requirement.requiredSkillId
                                    ? `Skill #${requirement.requiredSkillId}`
                                    : "Any")}

                                {" • "}
                                Working:{" "}
                                {requirement.workingHoursPerDay ?? "-"}{" "}
                                hrs/day
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {/* Filter Tabs for Personnel */}
                      <div className="alloc-view-filter-tabs">
                        <button
                          type="button"
                          className={`alloc-view-filter-btn ${humanFilterTab === "all" ? "active" : ""}`}
                          onClick={() => setHumanFilterTab("all")}
                        >
                          All ({allHumansForActivePhase.length})
                        </button>
                        <button
                          type="button"
                          className={`alloc-view-filter-btn ${humanFilterTab === "available" ? "active" : ""}`}
                          onClick={() => setHumanFilterTab("available")}
                        >
                          Available ({allHumansForActivePhase.filter((h) => h.isEligible).length})
                        </button>
                        <button
                          type="button"
                          className={`alloc-view-filter-btn ${humanFilterTab === "unavailable" ? "active warning" : ""}`}
                          onClick={() => setHumanFilterTab("unavailable")}
                        >
                          Unavailable ({allHumansForActivePhase.filter((h) => !h.isEligible).length})
                        </button>
                      </div>

                      {activePhaseHumanRequirements.length === 0 ? (
                        <p
                          style={{
                            color: "#b45309",
                            fontSize: "12.5px",
                            margin: "12px 0",
                          }}
                        >
                          No personnel requirement is configured for this
                          phase.
                        </p>
                      ) : allHumansForActivePhase.length === 0 ? (
                        <p
                          style={{
                            color: "#64748b",
                            fontSize: "12.5px",
                            margin: "12px 0",
                          }}
                        >
                          No personnel found matching this phase&apos;s role requirements.
                        </p>
                      ) : (
                        <div className="alloc-items-list">
                          {allHumansForActivePhase
                            .filter((item) => {
                              if (humanFilterTab === "available") return item.isEligible;
                              if (humanFilterTab === "unavailable") return !item.isEligible;
                              return true;
                            })
                            .map(
                              ({
                                human,
                                isEligible,
                                matchedSkill,
                                unavailabilityReason,
                              }) => {
                                const phaseId =
                                  activePhase.experimentPhaseId;

                                const isChecked = (
                                  selectedHumansByPhase[
                                  phaseId
                                  ] || []
                                ).includes(
                                  human.humanResourceId
                                );

                                const match =
                                  findHumanMatch(
                                    phaseId,
                                    human
                                  );

                                return (
                                  <div
                                    key={human.humanResourceId}
                                    onClick={() => {
                                      if (!isEligible) return;

                                      const current =
                                        selectedHumansByPhase[
                                        phaseId
                                        ] || [];

                                      /*
                                       * Unselect personnel.
                                       */
                                      if (
                                        current.includes(
                                          human.humanResourceId
                                        )
                                      ) {
                                        setSelectedHumansByPhase(
                                          (previous) => ({
                                            ...previous,
                                            [phaseId]: (
                                              previous[
                                              phaseId
                                              ] || []
                                            ).filter(
                                              (id) =>
                                                id !==
                                                human.humanResourceId
                                            ),
                                          })
                                        );

                                        setFitnessScore(null);
                                        setFitnessBreakdown(null);
                                        setFitnessEvaluationMessage("");
                                        setAllocationDetailsSaved(false);
                                        return;
                                      }

                                      if (!match) {
                                        setError(
                                          "This person does not satisfy the selected phase personnel requirement."
                                        );
                                        return;
                                      }

                                      /*
                                       * Enforce quantity of the matched
                                       * personnel requirement.
                                       */
                                      const selectedForRequirement =
                                        current.filter(
                                          (selectedHumanId) => {
                                            const selectedHuman =
                                              humanProfiles.find(
                                                (item) =>
                                                  item.humanResourceId ===
                                                  selectedHumanId
                                              );
                                            if (!selectedHuman) return false;
                                            const selectedMatch =
                                              findHumanMatch(
                                                phaseId,
                                                selectedHuman
                                              );
                                            return (
                                              selectedMatch?.requirement
                                                .expHumanReqId ===
                                              match.requirement
                                                .expHumanReqId
                                            );
                                          }
                                        ).length;

                                      const requiredQuantity =
                                        Math.max(
                                          0,
                                          Number(
                                            match.requirement.quantity || 0
                                          )
                                        );

                                      if (
                                        requiredQuantity > 0 &&
                                        selectedForRequirement >=
                                        requiredQuantity
                                      ) {
                                        setError(
                                          `Requirement "${match.requirement.roleName ||
                                          `Role #${match.requirement.roleId}`
                                          }" requires only ${requiredQuantity} person(s).`
                                        );
                                        return;
                                      }

                                      setSelectedHumansByPhase(
                                        (previous) => ({
                                          ...previous,
                                          [phaseId]: [
                                            ...(previous[phaseId] || []),
                                            human.humanResourceId,
                                          ],
                                        })
                                      );

                                      setFitnessScore(null);
                                      setFitnessBreakdown(null);
                                      setFitnessEvaluationMessage("");
                                      setAllocationDetailsSaved(false);
                                      setError("");
                                    }}
                                    className={`alloc-item-row ${isChecked ? "selected" : ""
                                      } ${!isEligible ? "disabled" : ""}`}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: "10px",
                                        flex: 1,
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        disabled={!isEligible}
                                        readOnly
                                        className="alloc-item-checkbox"
                                        style={{ marginTop: "3px" }}
                                      />

                                      <div>
                                        <div
                                          style={{
                                            fontSize: "13px",
                                            color: isEligible
                                              ? "#1e293b"
                                              : "#64748b",
                                            fontWeight: 550,
                                          }}
                                        >
                                          {human.fullName ||
                                            `Staff #${human.userId ||
                                            human.humanResourceId
                                            }`}
                                        </div>

                                        <div
                                          style={{
                                            fontSize: "11.5px",
                                            color: "#64748b",
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontWeight: 500,
                                              color: isEligible
                                                ? "#7e22ce"
                                                : "#64748b",
                                              marginRight: "6px",
                                            }}
                                          >
                                            {human.roleName ||
                                              `Role #${human.roleId ?? "-"
                                              }`}
                                          </span>
                                          •{" "}
                                          {human.maxWorkingHoursPerDay ?? 0}{" "}
                                          hrs/day
                                        </div>

                                        {!isEligible && unavailabilityReason && (
                                          <div className="alloc-reason-badge">
                                            ⚠️ {unavailabilityReason}
                                          </div>
                                        )}

                                        {isChecked && (
                                          <div
                                            style={{
                                              marginTop: "3px",
                                              fontSize: "10.5px",
                                              color: "#15803d",
                                              fontWeight: 600,
                                            }}
                                          >
                                            Allocated to this phase.
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div
                                      style={{
                                        textAlign: "right",
                                      }}
                                    >
                                      {matchedSkill ? (
                                        <>
                                          <div
                                            style={{
                                              fontSize: "11.5px",
                                              color: "#0369a1",
                                              fontWeight: 600,
                                            }}
                                          >
                                            {matchedSkill.skillName ||
                                              `Skill #${matchedSkill.skillId}`}
                                          </div>

                                          <div
                                            style={{
                                              fontSize: "10.5px",
                                              color: "#64748b",
                                              marginTop: "2px",
                                            }}
                                          >
                                            {matchedSkill.skillLevel}
                                          </div>
                                        </>
                                      ) : (
                                        <span
                                          style={{
                                            fontSize: "11px",
                                            color: isEligible
                                              ? "#16a34a"
                                              : "#94a3b8",
                                            fontWeight: 600,
                                          }}
                                        >
                                          {isEligible
                                            ? "ROLE MATCHED"
                                            : "UNAVAILABLE"}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* =========================================================
                    3. LAND
                ========================================================= */}

                <div
                  className="alloc-section-card full-width"
                  style={{
                    marginBottom: "20px",
                  }}
                >
                  <div className="alloc-section-header">
                    <div>
                      <h4>
                        3. Experiment Land Plot
                      </h4>

                      <span
                        style={{
                          fontSize: "12px",
                          color: "#64748b",
                          fontWeight: 400,
                        }}
                      >
                        Select one available land plot matching the
                        experiment&apos;s land requirement.
                      </span>
                    </div>

                    {selectedLandId && (
                      <span className="alloc-selection-count">
                        1 Selected
                      </span>
                    )}
                  </div>

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
                          Soil Type:{" "}
                          {activeLandRequirement.requiredSoilType ||
                            "Any"}
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

                  {/* Filter Tabs for Land */}
                  {activeLandRequirement && (
                    <div className="alloc-view-filter-tabs">
                      <button
                        type="button"
                        className={`alloc-view-filter-btn ${landFilterTab === "all" ? "active" : ""}`}
                        onClick={() => setLandFilterTab("all")}
                      >
                        All ({allLandForExperiment.length})
                      </button>
                      <button
                        type="button"
                        className={`alloc-view-filter-btn ${landFilterTab === "available" ? "active" : ""}`}
                        onClick={() => setLandFilterTab("available")}
                      >
                        Available ({allLandForExperiment.filter((l) => l.isEligible).length})
                      </button>
                      <button
                        type="button"
                        className={`alloc-view-filter-btn ${landFilterTab === "unavailable" ? "active warning" : ""}`}
                        onClick={() => setLandFilterTab("unavailable")}
                      >
                        Unavailable ({allLandForExperiment.filter((l) => !l.isEligible).length})
                      </button>
                    </div>
                  )}

                  {!activeLandRequirement ? (
                    <p
                      style={{
                        color: "#b45309",
                        fontSize: "12.5px",
                      }}
                    >
                      No land requirement is configured for this
                      experiment.
                    </p>
                  ) : checkingLandAvailability ? (
                    <p
                      style={{
                        color: "#64748b",
                        fontSize: "12.5px",
                      }}
                    >
                      Checking land availability for the experiment dates...
                    </p>
                  ) : allLandForExperiment.length === 0 ? (
                    <p
                      style={{
                        color: "#64748b",
                        fontSize: "12.5px",
                      }}
                    >
                      No land plot found in inventory matching required soil type:{" "}
                      <strong>{activeLandRequirement.requiredSoilType || "Any"}</strong>.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(320px, 1fr))",
                        gap: "16px",
                        marginTop: "12px",
                      }}
                    >
                      {allLandForExperiment
                        .filter((item) => {
                          if (landFilterTab === "available") return item.isEligible;
                          if (landFilterTab === "unavailable") return !item.isEligible;
                          return true;
                        })
                        .map(({ land, isEligible, unavailabilityReason }) => {
                          const isSelected =
                            selectedLandId === land.landId;

                          const requiredArea =
                            Number(
                              activeLandRequirement.requiredArea
                            ) || 0;

                          const landArea =
                            Number(land.areaSize) || 0;

                          const extraArea =
                            Math.max(
                              0,
                              landArea - requiredArea
                            );

                          return (
                            <div
                              key={land.landId}
                              onClick={() => {
                                if (isEligible) {
                                  handleSelectLand(
                                    land.landId
                                  );
                                }
                              }}
                              className={`alloc-land-row ${
                                isSelected ? "selected" : ""
                              } ${!isEligible ? "disabled" : ""}`}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                padding: "16px 18px",
                                borderRadius: "12px",
                                border: isSelected
                                  ? "1.5px solid #16a34a"
                                  : isEligible
                                  ? "1.5px solid #e2e8f0"
                                  : "1.5px solid #f1f5f9",
                                background: isSelected
                                  ? "#f0fdf4"
                                  : isEligible
                                  ? "#ffffff"
                                  : "#fafafa",
                                cursor: isEligible ? "pointer" : "not-allowed",
                                opacity: isEligible ? 1 : 0.88,
                                transition: "all 0.18s ease",
                                boxShadow: isSelected
                                  ? "0 4px 14px rgba(22, 163, 74, 0.12)"
                                  : "0 1px 3px rgba(15, 23, 42, 0.04)",
                                minHeight: "115px",
                                boxSizing: "border-box",
                              }}
                            >
                              {/* Top Row: Title + Radio (left) and Status Badge (right) */}
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: "12px",
                                  marginBottom: "8px",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    minWidth: 0,
                                    flex: 1,
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name="land-radio-selection"
                                    checked={isSelected}
                                    disabled={!isEligible}
                                    readOnly
                                    className="alloc-land-radio"
                                    style={{
                                      width: "16px",
                                      height: "16px",
                                      accentColor: "#16a34a",
                                      margin: 0,
                                      flexShrink: 0,
                                    }}
                                  />
                                  <span
                                    style={{
                                      fontSize: "14px",
                                      fontWeight: 700,
                                      color: isSelected
                                        ? "#15803d"
                                        : isEligible
                                        ? "#0f172a"
                                        : "#475569",
                                      letterSpacing: "-0.01em",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {land.landCode ||
                                      `Plot #${land.landId}`}
                                  </span>
                                </div>

                                <div style={{ flexShrink: 0 }}>
                                  {isEligible ? (
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        padding: "3px 9px",
                                        borderRadius: "6px",
                                        background: "#f0fdf4",
                                        color: "#15803d",
                                        fontSize: "11.5px",
                                        fontWeight: 650,
                                        border: "1px solid #bbf7d0",
                                      }}
                                    >
                                      Available
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        padding: "3px 9px",
                                        borderRadius: "6px",
                                        background: "#fef2f2",
                                        color: "#dc2626",
                                        fontSize: "11.5px",
                                        fontWeight: 650,
                                        border: "1px solid #fecaca",
                                      }}
                                    >
                                      Unavailable
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Middle: Details */}
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "3px",
                                  paddingLeft: "26px",
                                  flex: 1,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "12.5px",
                                    color: "#475569",
                                    fontWeight: 500,
                                  }}
                                >
                                  {land.soilType ||
                                    "Unknown Soil"}{" "}
                                  •{" "}
                                  {land.areaSize?.toLocaleString() ||
                                    "-"}{" "}
                                  m²
                                </div>

                                {isEligible && extraArea > 0 && (
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      color: "#16a34a",
                                      fontWeight: 600,
                                    }}
                                  >
                                    +
                                    {extraArea.toLocaleString()}{" "}
                                    m² above requirement
                                  </div>
                                )}
                              </div>

                              {/* Bottom: Warning Box (if ineligible) */}
                              {!isEligible && unavailabilityReason && (
                                <div
                                  style={{
                                    marginTop: "10px",
                                    paddingLeft: "26px",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "flex-start",
                                      gap: "6px",
                                      padding: "6px 10px",
                                      borderRadius: "6px",
                                      background: "#fef2f2",
                                      color: "#b91c1c",
                                      border: "1px solid #fecaca",
                                      fontSize: "11.5px",
                                      fontWeight: 550,
                                      lineHeight: 1.4,
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    <span style={{ flexShrink: 0 }}>
                                      ⚠️
                                    </span>
                                    <span>
                                      {unavailabilityReason}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* =========================================================
                4. BOTTOM ACTION
            ========================================================= */}

            <div className="alloc-summary-card">
              {selectedExp && (
                <div className="alloc-summary-stats">
                  <div className="alloc-stat-pill">
                    Equipment Units:{" "}
                    <strong>
                      {totalEquipmentCount}
                    </strong>
                  </div>

                  <div className="alloc-stat-pill">
                    Field Workforce:{" "}
                    <strong>
                      {totalHumanCount}
                    </strong>
                  </div>

                  <div className="alloc-stat-pill">
                    Land Plot:{" "}
                    <strong>
                      {selectedLandId
                        ? landResources.find(
                          (land) =>
                            land.landId ===
                            selectedLandId
                        )?.landCode ||
                        "Selected (1)"
                        : "None (0/1)"}
                    </strong>
                  </div>
                </div>
              )}

              <div className="alloc-action-buttons">
                <button
                  type="button"
                  onClick={() => void handleSaveAndSubmitPlan()}
                  disabled={
                    submitting ||
                    evaluatingFitness ||
                    initializingDraftPlan ||
                    !selectedExpId ||
                    (isManagerRole && !isManagerAllocation)
                  }
                  className="alloc-btn-ai"
                >
                  {submitting
                    ? isManagerAllocation
                      ? "Saving Resources..."
                      : "Submitting Request..."
                    : isManagerAllocation
                      ? "Save Resource Allocation"
                      : "Submit Resource Request for Approval"}
                </button>
              </div>
            </div>

          </>
        )}
      </div>
    </DashboardLayout>
  );
}