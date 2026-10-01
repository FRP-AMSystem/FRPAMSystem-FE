import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import { useNotification } from "../../context/NotificationContext";
import api from "../../services/api";

import { getExperimentById, getExperiments } from "../../services/experimentService";
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
  simulateAllocationPlanFitness,
  submitAllocationPlan,
} from "../../services/allocationPlanService";

import {
  createAllocationEquipmentDetail,
  createAllocationHumanDetail,
  createAllocationLandDetail,
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

  const isManagerAllocation =
    currentUserInfo.role === "Manager" &&
    initialPlanId > 0;

  // In Manager allocation mode, allocationPlanId is the source of truth.
  // The experimentId in the URL may be stale/wrong, so never trust it to
  // decide which Experiment receives resources.
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

  const [
    selectedHumansByPhase,
    setSelectedHumansByPhase,
  ] = useState<
    Record<number, number[]>
  >({});

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
          equipRes,
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

            getEquipmentInstances({
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
          isPrivileged
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

        // Researcher create-plan mode may initialize from the URL/default list.
        // Manager allocation mode is different: allocationPlanId is the source
        // of truth, so this loader must never overwrite selectedExpId.
        if (!isManagerAllocation) {
          if (
            initialExpId &&
            exps.some(
              (
                e: ExperimentResponse
              ) =>
                e.experimentId ===
                initialExpId
            )
          ) {
            setSelectedExpId(
              initialExpId
            );
          } else if (
            exps.length > 0
          ) {
            setSelectedExpId(
              exps[0]
                .experimentId
            );
          }
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
        setSelectedEquipByPhase({});
        setSelectedHumansByPhase({});

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

        setSelectedLandId(null);
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
          selectedForSameRequirement >=
            requiredQuantity
        ) {
          setError(
            `Requirement "${
              targetMatch
                .requirement
                .equipmentTypeName ||
              `Equipment Type #${
                targetMatch
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
  *   validates the approved request in initialPlanId, then creates one
  *   Draft assignment plan because Backend does not allow details on Approved plans.
   */
  const ensureDraftAllocationPlan =
    async (): Promise<number> => {
      /*
       * MANAGER RESOURCE ALLOCATION MODE
       */
      if (
        isManagerAllocation &&
        initialPlanId > 0
      ) {
        const existingPlan =
          await getAllocationPlanById(
            initialPlanId
          );

        if (
          String(
            existingPlan.approveStatus ||
              ""
          )
            .trim()
            .toLowerCase() !==
          "approved"
        ) {
          throw new Error(
            "Manager can allocate resources only after the Allocation Plan has been approved."
          );
        }

        if (
          Number(
            existingPlan.experimentId
          ) !==
          Number(selectedExpId)
        ) {
          throw new Error(
            "This Allocation Plan does not belong to the selected experiment."
          );
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

  const filteredLandResources =
    useMemo(() => {
      if (!activeLandRequirement || checkingLandAvailability) {
        return [];
      }

      const requiredArea =
        Number(
          activeLandRequirement
            .requiredArea
        ) || 0;

      const requiredSoilType =
        (
          activeLandRequirement
            .requiredSoilType || ""
        )
          .trim()
          .toLowerCase();

      return landResources.filter(
        (land) => {
          const status =
            (
              land.status || ""
            )
              .trim()
              .toLowerCase();

          if (
            status &&
            status !==
              "available"
          ) {
            return false;
          }

          if (blockedLandIds.has(land.landId)) {
            return false;
          }

          const landArea =
            Number(
              land.areaSize
            ) || 0;

          if (
            requiredArea > 0 &&
            landArea <
              requiredArea
          ) {
            return false;
          }

          if (
            requiredSoilType
          ) {
            const actualSoilType =
              (
                land.soilType ||
                ""
              )
                .trim()
                .toLowerCase();

            if (
              actualSoilType !==
              requiredSoilType
            ) {
              return false;
            }
          }

          return true;
        }
      );
    }, [
      landResources,
      activeLandRequirement,
      blockedLandIds,
      checkingLandAvailability,
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
      () =>
        Object.values(
          selectedEquipByPhase
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
        selectedEquipByPhase,
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
      planId: number
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
              `${
                equipment.assetCode ||
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

          await createAllocationEquipmentDetail(
            equipmentAllocationPayload
          );

          existingEquipmentKeys.add(
            key
          );
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
              `${
                human.fullName ||
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
          equipmentDetails,
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

      try {
        const planId =
          await ensureDraftAllocationPlan();

        /*
         * ======================================================
         * MANAGER RESOURCE ALLOCATION
         * ======================================================
         */

        if (
          isManagerAllocation
        ) {
          const approvedSourcePlan =
            await getAllocationPlanById(
              initialPlanId
            );
          const assignmentPlan = await getAllocationPlanById(planId);

          if (
            String(
              approvedSourcePlan
                .approveStatus ||
                ""
            )
              .trim()
              .toLowerCase() !==
            "approved"
          ) {
            throw new Error(
              "Manager can allocate resources only after the source plan has been approved."
            );
          }

          if (
            Number(approvedSourcePlan.experimentId) !== Number(assignmentPlan.experimentId) ||
            String(assignmentPlan.approveStatus || "").trim().toLowerCase() !== "draft"
          ) {
            throw new Error(
              "The assignment Draft is invalid for the approved source plan."
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
            planId
          );

          /*
           * Fitness Score không bắt buộc để lưu resource.
           *
           * Nếu Manager đã Evaluate thì score đã được backend
           * cập nhật. Nếu chưa Evaluate thì vẫn cho phép lưu.
           */
          sendLocalNotification({
            title:
              "Resources Allocated",

            message:
              `Personnel, equipment and land resources were allocated to Experiment #${selectedExpId}.`,

            notificationType:
              "Success",

            referenceType:
              "AllocationPlan",

            referenceId:
              planId,
          });

          void fetchUnreadCount();

          navigate(
            `/allocation/${planId}`,
            {
              state: {
                  message:
                    `Resources were saved to assignment Draft #${planId}, created from Approved plan #${initialPlanId}.`,
              },
            }
          );

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
        await persistAllocationDetails(planId);

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

  // AI Allocation Handler
  const handleStartAIAllocation =
    () => {
      if (
        !selectedExpId
      ) {
        setError(
          "Please select an experiment first."
        );

        return;
      }

      /*
       * AI resource optimizer thuộc bước Manager allocation.
       */
      if (
        !isManagerAllocation
      ) {
        setError(
          "AI Resource Optimizer is available after Manager approves the Allocation Plan."
        );

        return;
      }

      navigate(
        `/experiments/${selectedExpId}/ai-suggestions?allocationPlanId=${initialPlanId}`
      );
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
                ? "Allocate Resources"
                : "Request Allocation Resources"}
            </h1>

            <p>
              {isManagerAllocation
                ? "Allocate personnel, equipment and land to the approved Allocation Plan."
                : "Select proposed resources and submit the resource allocation request for Manager approval."}
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
                      ? "Resource allocation will be saved to the approved plan."
                      : "Select an experiment, then prepare its proposed resource allocation."}
                  </p>
                </div>
              </div>

              {isManagerAllocation ? (
                <div className="alloc-form-group">
                  <label>Experiment</label>

                  <div
                    style={{
                      minHeight: "42px",
                      display: "flex",
                      alignItems: "center",
                      padding: "0 14px",
                      border: "1px solid #dbe3ec",
                      borderRadius: "8px",
                      background: "#f8fafc",
                      color: "#0f172a",
                      fontWeight: 600,
                    }}
                  >
                    {selectedExp?.experimentName ||
                      "Loading approved plan experiment..."}
                  </div>

                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "12px",
                      color: "#64748b",
                    }}
                  >
                    Allocation Plan #{initialPlanId} · Approved
                  </div>
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
                          selectedEquipByPhase[
                            phase.experimentPhaseId
                          ]?.length || 0;

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
                            className={`alloc-phase-tab ${
                              isSelected ? "active" : ""
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
                      ) : primaryEquipmentForActivePhase.length === 0 &&
                        substituteEquipmentForActivePhase.length === 0 ? (
                        <p
                          style={{
                            color: "#64748b",
                            fontSize: "12.5px",
                            margin: "12px 0",
                          }}
                        >
                          No available equipment matches this phase&apos;s
                          requirements.
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
                              {primaryEquipmentForActivePhase.map(
                                (equipment) => {
                                  const match =
                                    findEquipmentMatch(
                                      activePhase.experimentPhaseId,
                                      equipment
                                    );

                                  const isChecked = (
                                    selectedEquipByPhase[
                                      activePhase.experimentPhaseId
                                    ] || []
                                  ).includes(
                                    equipment.equipmentInstanceId
                                  );

                                  return (
                                    <div
                                      key={
                                        equipment.equipmentInstanceId
                                      }
                                      onClick={() =>
                                        handleToggleEquipment(
                                          equipment.equipmentInstanceId
                                        )
                                      }
                                      className={`alloc-item-row ${
                                        isChecked ? "selected" : ""
                                      }`}
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
                                          readOnly
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

                                            {equipment.conditionLevel ||
                                              "Good"}
                                          </div>
                                        </div>
                                      </div>

                                      <div
                                        style={{
                                          textAlign: "right",
                                        }}
                                      >
                                        <div
                                          style={{
                                            fontSize: "10.5px",
                                            fontWeight: 700,
                                            color: "#15803d",
                                          }}
                                        >
                                          PRIMARY
                                        </div>

                                        <span
                                          style={{
                                            fontSize: "11.5px",
                                            color: "#16a34a",
                                          }}
                                        >
                                          {Math.round(
                                            (match?.effectiveEfficiency ??
                                              normalizeEfficiency(
                                                equipment.efficiencyRate ??
                                                  1
                                              )) * 100
                                          )}
                                          % Eff.
                                        </span>
                                      </div>
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          )}

                          {activePhaseEquipmentRequirements.some(
                            (requirement) =>
                              requirement.allowSubstitute
                          ) && (
                            <>
                              <div
                                style={{
                                  margin: "16px 0 7px",
                                  paddingTop: "12px",
                                  borderTop:
                                    "1px dashed #cbd5e1",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color: "#7c3aed",
                                  textTransform: "uppercase",
                                }}
                              >
                                Valid Equipment Substitutions
                              </div>

                              {substituteEquipmentForActivePhase.length ===
                              0 ? (
                                <p
                                  style={{
                                    color: "#64748b",
                                    fontSize: "12px",
                                  }}
                                >
                                  No available substitute equipment meets
                                  the minimum efficiency requirement.
                                </p>
                              ) : (
                                <div className="alloc-items-list">
                                  {substituteEquipmentForActivePhase.map(
                                    ({ equipment, match }) => {
                                      const isChecked = (
                                        selectedEquipByPhase[
                                          activePhase.experimentPhaseId
                                        ] || []
                                      ).includes(
                                        equipment.equipmentInstanceId
                                      );

                                      return (
                                        <div
                                          key={`sub-${equipment.equipmentInstanceId}-${match.requirement.expEquipmentReqId}`}
                                          onClick={() =>
                                            handleToggleEquipment(
                                              equipment.equipmentInstanceId
                                            )
                                          }
                                          className={`alloc-item-row ${
                                            isChecked
                                              ? "selected"
                                              : ""
                                          }`}
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
                                              readOnly
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

                                                {" • substitutes for "}

                                                <strong>
                                                  {match.requirement
                                                    .equipmentTypeName ||
                                                    `Type #${match.requirement.equipmentTypeId}`}
                                                </strong>
                                              </div>
                                            </div>
                                          </div>

                                          <div
                                            style={{
                                              textAlign: "right",
                                            }}
                                          >
                                            <div
                                              style={{
                                                fontSize: "10.5px",
                                                fontWeight: 700,
                                                color: "#7c3aed",
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
                                              {Math.round(
                                                match.effectiveEfficiency *
                                                  100
                                              )}
                                              % Effective
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
                      ) : filteredHumansForActivePhase.length === 0 ? (
                        <p
                          style={{
                            color: "#64748b",
                            fontSize: "12.5px",
                            margin: "12px 0",
                          }}
                        >
                          No available personnel matches this phase&apos;s
                          role, skill and working-hour requirements.
                        </p>
                      ) : (
                        <div className="alloc-items-list">
                          {filteredHumansForActivePhase.map(
                            (human) => {
                              const isChecked = (
                                selectedHumansByPhase[
                                  activePhase.experimentPhaseId
                                ] || []
                              ).includes(
                                human.humanResourceId
                              );

                              const match =
                                findHumanMatch(
                                  activePhase.experimentPhaseId,
                                  human
                                );

                              return (
                                <div
                                  key={
                                    human.humanResourceId
                                  }
                                  onClick={() => {
                                    const phaseId =
                                      activePhase.experimentPhaseId;

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

                                          [phaseId]:
                                            (
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

                                          if (!selectedHuman) {
                                            return false;
                                          }

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
                                          match.requirement.quantity ||
                                            0
                                        )
                                      );

                                    if (
                                      requiredQuantity > 0 &&
                                      selectedForRequirement >=
                                        requiredQuantity
                                    ) {
                                      setError(
                                        `Requirement "${
                                          match.requirement.roleName ||
                                          `Role #${match.requirement.roleId}`
                                        }" requires only ${requiredQuantity} person(s).`
                                      );

                                      return;
                                    }

                                    setSelectedHumansByPhase(
                                      (previous) => ({
                                        ...previous,

                                        [phaseId]: [
                                          ...(
                                            previous[
                                              phaseId
                                            ] || []
                                          ),
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
                                  className={`alloc-item-row ${
                                    isChecked ? "selected" : ""
                                  }`}
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
                                      readOnly
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
                                        {human.fullName ||
                                          `Staff #${
                                            human.userId ||
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
                                            color: "#7e22ce",
                                            marginRight: "6px",
                                          }}
                                        >
                                          {human.roleName ||
                                            `Role #${
                                              human.roleId ?? "-"
                                            }`}
                                        </span>

                                        •{" "}
                                        {human.maxWorkingHoursPerDay ??
                                          0}{" "}
                                        hrs/day
                                      </div>

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
                                          Schedule will be assigned by
                                          Researcher later.
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div
                                    style={{
                                      textAlign: "right",
                                    }}
                                  >
                                    {match?.matchedSkill ? (
                                      <>
                                        <div
                                          style={{
                                            fontSize: "11.5px",
                                            color: "#0369a1",
                                            fontWeight: 600,
                                          }}
                                        >
                                          {match.matchedSkill
                                            .skillName ||
                                            `Skill #${match.matchedSkill.skillId}`}
                                        </div>

                                        <div
                                          style={{
                                            fontSize: "10.5px",
                                            color: "#64748b",
                                            marginTop: "2px",
                                          }}
                                        >
                                          {
                                            match.matchedSkill
                                              .skillLevel
                                          }
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
                  ) : filteredLandResources.length === 0 ? (
                    <p
                      style={{
                        color: "#64748b",
                        fontSize: "12.5px",
                      }}
                    >
                      No available land plot matches the required soil
                      type and area.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(280px, 1fr))",
                        gap: "10px",
                      }}
                    >
                      {filteredLandResources.map((land) => {
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
                            onClick={() =>
                              handleSelectLand(
                                land.landId
                              )
                            }
                            className={`alloc-land-row ${
                              isSelected ? "selected" : ""
                            }`}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              <input
                                type="radio"
                                name="land-radio-selection"
                                checked={isSelected}
                                readOnly
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
                                  {land.landCode ||
                                    `Plot #${land.landId}`}
                                </div>

                                <div
                                  style={{
                                    fontSize: "11.5px",
                                    color: "#64748b",
                                    marginTop: "2px",
                                  }}
                                >
                                  {land.soilType ||
                                    "Unknown Soil"}

                                  {" • "}

                                  {land.areaSize?.toLocaleString() ||
                                    "-"}{" "}
                                  m²
                                </div>

                                {extraArea > 0 && (
                                  <div
                                    style={{
                                      marginTop: "3px",
                                      fontSize: "10.5px",
                                      color: "#64748b",
                                    }}
                                  >
                                    +
                                    {extraArea.toLocaleString()}{" "}
                                    m² above requirement
                                  </div>
                                )}
                              </div>
                            </div>

                            <span className="badge-available">
                              Available
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            <div
              className="alloc-section-card full-width"
              style={{
                marginBottom: "20px",
                padding: "16px 18px",
              }}
            >
              <div className="alloc-section-header">
                <div>
                  <h4>4. Fitness Score</h4>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      fontWeight: 400,
                    }}
                  >
                    Simulate the current resource selection before submitting.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => void handleEvaluateFitnessScore()}
                  disabled={
                    evaluatingFitness ||
                    submitting ||
                    !selectedExpId ||
                    Math.abs(evaluationWeightTotal - 100) > 0.001
                  }
                  className="alloc-btn-ai"
                >
                  <Sparkles size={15} />
                  {evaluatingFitness
                    ? "Simulating..."
                    : "Simulate Fitness Score"}
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "12px",
                  marginTop: "14px",
                }}
              >
                {[
                  { key: "equipmentWeight", label: "Equipment Weight" },
                  { key: "humanWeight", label: "Personnel Weight" },
                  { key: "landWeight", label: "Land Weight" },
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    style={{
                      display: "grid",
                      gap: "5px",
                      color: "#475569",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {label} (%)
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      inputMode="numeric"
                      value={weightInputs[key as keyof EvaluationWeightPlan]}
                      onChange={(event) =>
                        handleWeightInputChange(
                          key as keyof EvaluationWeightPlan,
                          event.target.value
                        )
                      }
                      onBlur={() =>
                        handleWeightBlur(key as keyof EvaluationWeightPlan)
                      }
                      aria-label={`${label} percentage`}
                      style={{
                        width: "100%",
                        minHeight: "38px",
                        boxSizing: "border-box",
                        padding: "8px 10px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        backgroundColor: "#ffffff",
                        color: "#0f172a",
                        colorScheme: "light",
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                    />
                  </label>
                ))}
              </div>

              <div
                role="status"
                aria-live="polite"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginTop: "10px",
                  color:
                    Math.abs(evaluationWeightTotal - 100) <= 0.001
                      ? "#15803d"
                      : "#b45309",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                <span>Weight total</span>
                <span>
                  {evaluationWeightTotal}% / 100%
                  {Math.abs(evaluationWeightTotal - 100) <= 0.001
                    ? " · Ready"
                    : " · Adjust weights to exactly 100%"}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  marginTop: "12px",
                  padding: "12px 14px",
                  border: "1px solid #dbeafe",
                  borderRadius: "7px",
                  background: "#f8fbff",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    Fitness Score
                  </div>
                  <strong
                    style={{
                      display: "block",
                      marginTop: "3px",
                      color: fitnessScore === null ? "#64748b" : "#15803d",
                      fontSize: "24px",
                    }}
                  >
                    {fitnessScore === null
                      ? "Not calculated"
                      : Number(fitnessScore).toFixed(2)}
                  </strong>
                </div>
              </div>

              {fitnessBreakdown && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "10px",
                    marginTop: "10px",
                  }}
                >
                  {[
                    { label: "Equipment", result: fitnessBreakdown.equipment },
                    { label: "Personnel", result: fitnessBreakdown.human },
                    { label: "Land", result: fitnessBreakdown.land },
                  ].map(({ label, result }) => (
                    <div
                      key={label}
                      style={{
                        padding: "10px 12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "7px",
                        background: "#fff",
                      }}
                    >
                      <span style={{ color: "#64748b", fontSize: "11px" }}>
                        {label}
                      </span>
                      {result.score !== null && (
                        <strong
                          style={{
                            display: "block",
                            marginTop: "4px",
                            color: "#0f172a",
                            fontSize: "14px",
                          }}
                        >
                          {`${result.score.toFixed(2)}%`}
                        </strong>
                      )}
                      <span style={{ color: "#64748b", fontSize: "11px" }}>
                        Weight {result.weight}%
                        {result.contribution === null
                          ? ""
                          : ` · Contribution ${result.contribution.toFixed(2)}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* =========================================================
                5. BOTTOM ACTION
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
                {isManagerAllocation && (
                  <button
                    type="button"
                    onClick={
                      handleStartAIAllocation
                    }
                    disabled={
                      !selectedExpId ||
                      submitting
                    }
                    className="alloc-btn-manual"
                  >
                    Use AI Suggestion Optimizer
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    void handleSaveAndSubmitPlan()
                  }
                  disabled={
                    submitting ||
                    evaluatingFitness ||
                    initializingDraftPlan ||
                    !selectedExpId
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