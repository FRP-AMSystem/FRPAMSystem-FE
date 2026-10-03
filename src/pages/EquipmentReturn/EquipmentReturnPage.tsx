import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  PackageCheck,
  RotateCcw,
  Search,
  Truck,
  XCircle,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import ToastPopup, {
  type ToastType,
} from "../../components/common/ToastPopup";

import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";

import {
  createEquipmentHandover,
  getAllocationEquipmentDetails,
  getEquipmentHandovers,
  getMyAllocationEquipmentDetails,
  handoverEquipmentDetail,
  type EquipmentHandoverRecord,
} from "../../services/allocationDetailService";
import {
  getAllocationPlanById,
  getAllocationPlans,
} from "../../services/allocationPlanService";
import {
  getExperimentById,
  getExperiments,
} from "../../services/experimentService";
import { getExperimentPhases } from "../../services/experimentPhaseService";
import { getExperimentEquipmentRequirements } from "../../services/experimentEquipmentRequirementService";
import { getUsers } from "../../services/userService";

import {
  confirmEquipmentReturn,
  getEquipmentReturns,
  rejectEquipmentReturn,
  submitMyEquipmentReturn,
} from "../../services/equipmentReturnService";

import { getStoredRole } from "../../config/rolePermissions";
import { getCurrentUserTokenInfo } from "../../utils/storage";

import type { AllocationEquipmentDetail } from "../../types/allocationDetail";
import type { EquipmentConditionLevel } from "../../types/equipmentInstance";
import type { EquipmentReturn } from "../../types/equipmentReturn";
import type { ExperimentPhase } from "../../types/experimentPhase";
import type { ExperimentEquipmentRequirement } from "../../types/experimentEquipmentRequirement";

import "./EquipmentReturnPage.css";

/* =========================================================
   TYPES
========================================================= */

type TabFilter =
  | "all"
  | "inuse"
  | "allocated"
  | "completed";

/* =========================================================
   HELPERS
========================================================= */

function formatDate(
  value?: string | null
): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("vi-VN");
}

function normalizeStatus(
  value?: string | null
): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getEquipmentDisplayName(
  item: AllocationEquipmentDetail
): string {
  return (
    item.equipmentInstanceName ||
    item.allocatedEquipmentTypeName ||
    item.requestedEquipmentTypeName ||
    item.assetCode ||
    `Equipment #${item.allocationEquipmentDetailId}`
  );
}

function cleanPhaseName(name?: string | null): string {
  if (!name) return "";
  let cleaned = name.trim();
  if (cleaned.endsWith(":")) {
    cleaned = cleaned.slice(0, -1).trim();
  }
  return cleaned;
}

function resolvePhaseDisplayName(
  item: AllocationEquipmentDetail,
  phases: ExperimentPhase[] = [],
  reqs: ExperimentEquipmentRequirement[] = []
): string {
  // 1. Direct phaseName from detail item
  if (item.phaseName && item.phaseName.trim()) {
    return cleanPhaseName(item.phaseName);
  }

  // 2. Direct phaseId
  if (item.phaseId) {
    const match = phases.find(
      (p) => (p.experimentPhaseId || (p as any).phaseId) === item.phaseId
    );
    if (match && match.phaseName) {
      return cleanPhaseName(match.phaseName);
    }
  }

  // 3. Match from expEquipmentReqId note (contains "[Phase X: ...]")
  if (item.expEquipmentReqId && reqs && reqs.length > 0) {
    const req = reqs.find(
      (r) => (r.expEquipmentReqId || (r as any).id) === item.expEquipmentReqId
    );
    if (req && req.note) {
      const match = req.note.match(/\[(Phase\s*\d+[^\]]*)\]/i);
      if (match && match[1]) {
        return cleanPhaseName(match[1]);
      }
    }
  }

  // 4. Match by date overlap with phases
  if (item.startDate && item.endDate && phases.length > 0) {
    const itemStart = new Date(item.startDate).getTime();
    const itemEnd = new Date(item.endDate).getTime();

    if (!Number.isNaN(itemStart) && !Number.isNaN(itemEnd)) {
      let bestPhase: ExperimentPhase | null = null;
      let maxOverlap = 0;

      for (const phase of phases) {
        if (!phase.expectedStartDate || !phase.expectedEndDate) continue;
        const pStart = new Date(phase.expectedStartDate).getTime();
        const pEnd = new Date(phase.expectedEndDate).getTime();
        if (Number.isNaN(pStart) || Number.isNaN(pEnd)) continue;

        const overlapStart = Math.max(itemStart, pStart);
        const overlapEnd = Math.min(itemEnd, pEnd);
        const overlap = overlapEnd - overlapStart;

        if (overlap > maxOverlap) {
          maxOverlap = overlap;
          bestPhase = phase;
        }
      }

      if (bestPhase && maxOverlap > 0 && bestPhase.phaseName) {
        return cleanPhaseName(bestPhase.phaseName);
      }

      // Boundary match within 1 day
      const matchingPhase = phases.find((p) => {
        if (!p.expectedStartDate || !p.expectedEndDate) return false;
        const pStart = new Date(p.expectedStartDate).getTime();
        const pEnd = new Date(p.expectedEndDate).getTime();
        if (Number.isNaN(pStart) || Number.isNaN(pEnd)) return false;
        return (
          Math.abs(itemStart - pStart) <= 86400000 ||
          Math.abs(itemEnd - pEnd) <= 86400000
        );
      });

      if (matchingPhase && matchingPhase.phaseName) {
        return cleanPhaseName(matchingPhase.phaseName);
      }
    }
  }

  // 5. Single phase fallback
  if (phases.length === 1 && phases[0].phaseName) {
    return cleanPhaseName(phases[0].phaseName);
  }

  if (typeof item.phaseId === "number" && Number.isFinite(item.phaseId)) {
    return `Phase #${item.phaseId}`;
  }

  return "No phase";
}

function getPlanReturnerName(
  item: AllocationEquipmentDetail,
  returnRecord?: EquipmentReturn,
  planResearcherMap: Record<number, string> = {},
  experimentResearcherMap: Record<number, string> = {},
  returnerNamesById: Record<number, string> = {}
): string {
  return (
    (item.allocationPlanId ? planResearcherMap[item.allocationPlanId] : "") ||
    (item.experimentId ? experimentResearcherMap[item.experimentId] : "") ||
    returnRecord?.returnedByUser?.fullName ||
    returnRecord?.returnedByUser?.username ||
    (returnRecord?.returnedBy ? returnerNamesById[returnRecord.returnedBy] : "") ||
    (returnRecord?.returnedBy ? `User #${returnRecord.returnedBy}` : "-")
  );
}

/* =========================================================
   COMPONENT
========================================================= */

export default function EquipmentReturnPage() {
  const role = getStoredRole();

  const isManager =
    role === "Manager" ||
    role === "Admin";

  /* =======================================================
     DATA
  ======================================================= */

  const [items, setItems] = useState<
    AllocationEquipmentDetail[]
  >([]);

  const [
    returnRecords,
    setReturnRecords,
  ] = useState<
    EquipmentReturn[]
  >([]);

  const [returnerNamesById, setReturnerNamesById] = useState<
    Record<number, string>
  >({});

  const [handoverRecords, setHandoverRecords] = useState<
    EquipmentHandoverRecord[]
  >([]);

  const [experimentPhasesMap, setExperimentPhasesMap] = useState<
    Record<number, ExperimentPhase[]>
  >({});

  const [experimentReqsMap, setExperimentReqsMap] = useState<
    Record<number, ExperimentEquipmentRequirement[]>
  >({});

  const [planResearcherMap, setPlanResearcherMap] = useState<
    Record<number, string>
  >({});

  const [experimentResearcherMap, setExperimentResearcherMap] = useState<
    Record<number, string>
  >({});

  const [
    submittedReturnIds,
    setSubmittedReturnIds,
  ] = useState<number[]>([]);

  const [loading, setLoading] =
    useState<boolean>(true);

  const [
    actionLoading,
    setActionLoading,
  ] = useState<boolean>(false);

  /* =======================================================
     SEARCH / FILTER
  ======================================================= */

  const [
    searchTerm,
    setSearchTerm,
  ] = useState<string>("");

  const [
    tabFilter,
    setTabFilter,
  ] =
    useState<TabFilter>("all");

  /* =======================================================
     HANDOVER MODAL
  ======================================================= */

  const [
    handoverModalItem,
    setHandoverModalItem,
  ] =
    useState<AllocationEquipmentDetail | null>(
      null
    );

  /* =======================================================
     RETURN MODAL
  ======================================================= */

  const [
    returnModalItem,
    setReturnModalItem,
  ] =
    useState<AllocationEquipmentDetail | null>(
      null
    );

  const [
    returnCondition,
    setReturnCondition,
  ] =
    useState<EquipmentConditionLevel>(
      "Good"
    );

  const [
    returnNotes,
    setReturnNotes,
  ] = useState<string>("");

  const [
    damageDescription,
    setDamageDescription,
  ] = useState<string>("");

  const [
    rejectReason,
    setRejectReason,
  ] = useState<string>("");

  /* =======================================================
     TOAST
  ======================================================= */

  const [
    toast,
    setToast,
  ] = useState<{
    visible: boolean;
    type: ToastType;
    title?: string;
    message: string;
  }>({
    visible: false,
    type: "error",
    message: "",
  });

  const showToast = (
    message: string,
    type: ToastType = "error",
    title?: string
  ) => {
    setToast({
      visible: true,
      type,
      title:
        title ||
        (type === "success"
          ? "Success"
          : type === "error"
            ? "Processing error"
            : "Notification"),
      message,
    });
  };

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const loadData =
    useCallback(async () => {
      try {
        setLoading(true);

        /* =================================================
           MANAGER / ADMIN
        ================================================= */

        if (isManager) {
          const [
            allocationList,
            returns,
            handovers,
            users,
            plans,
            experiments,
          ] = await Promise.all([
            getAllocationEquipmentDetails({
              size: 400,
            }),

            getEquipmentReturns({
              size: 400,
            }),

            getEquipmentHandovers({
              size: 400,
            }).catch(() => []),

            getUsers(),

            getAllocationPlans({
              size: 400,
            }).catch(() => []),

            getExperiments({
              size: 400,
            }).catch(() => []),
          ]);

          setItems(
            allocationList || []
          );

          setReturnRecords(
            returns || []
          );
          setReturnerNamesById(
            Object.fromEntries(
              users
                .filter((user) => user.userId && user.fullName)
                .map((user) => [user.userId as number, user.fullName])
            )
          );
          setHandoverRecords(handovers || []);

          const pMap: Record<number, string> = {};
          plans.forEach((p) => {
            if (p.allocationPlanId && p.createdByName) {
              pMap[p.allocationPlanId] = p.createdByName;
            }
          });
          setPlanResearcherMap(pMap);

          const eMap: Record<number, string> = {};
          experiments.forEach((e) => {
            if (e.experimentId && (e.researcherName || e.createdByName)) {
              eMap[e.experimentId] = e.researcherName || e.createdByName || "";
            }
          });
          setExperimentResearcherMap(eMap);

          return;
        }

        /* =================================================
           FIELD USER
        ================================================= */

        const currentUser = getCurrentUserTokenInfo();
        const [allocationList, handovers, returns, plans, experiments] = await Promise.all([
          getMyAllocationEquipmentDetails({
            size: 400,
          }),
          getEquipmentHandovers({
            receivedBy: currentUser.userId,
            size: 400,
          }).catch(() => []),
          getEquipmentReturns({
            returnedBy: currentUser.userId,
            size: 400,
          }),
          getAllocationPlans({
            size: 400,
          }).catch(() => []),
          getExperiments({
            size: 400,
          }).catch(() => []),
        ]);

        const safeList =
          allocationList || [];
        const safeReturns = returns || [];

        setItems(safeList);
        setHandoverRecords(handovers || []);
        setReturnRecords(safeReturns);
        setSubmittedReturnIds(
          safeReturns
            .filter((record) => normalizeStatus(record.status) === "pending")
            .map((record) => record.allocationEquipmentDetailId)
        );

        const pMap: Record<number, string> = {};
        plans.forEach((p) => {
          if (p.allocationPlanId && p.createdByName) {
            pMap[p.allocationPlanId] = p.createdByName;
          }
        });
        setPlanResearcherMap(pMap);

        const eMap: Record<number, string> = {};
        experiments.forEach((e) => {
          if (e.experimentId && (e.researcherName || e.createdByName)) {
            eMap[e.experimentId] = e.researcherName || e.createdByName || "";
          }
        });
        setExperimentResearcherMap(eMap);
      } catch (error: any) {
        showToast(
          error?.response?.data
            ?.message ||
          error?.message ||
          "Unable to load the equipment list.",
          "error"
        );
      } finally {
        setLoading(false);
      }
    }, [
      isManager,
    ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const experimentIds = [...new Set(
      items
        .map((item) => Number(item.experimentId))
        .filter((id) => Number.isFinite(id) && id > 0)
    )];

    if (experimentIds.length === 0) {
      setExperimentPhasesMap({});
      setExperimentReqsMap({});
      return;
    }

    let cancelled = false;

    void Promise.all(
      experimentIds.map(async (experimentId) => {
        const [phases, reqs] = await Promise.all([
          getExperimentPhases({
            experimentId,
            size: 200,
          }).catch(() => []),
          getExperimentEquipmentRequirements({
            experimentId,
            size: 200,
          }).catch(() => []),
        ]);

        return {
          experimentId,
          phases,
          reqs,
        };
      })
    ).then((results) => {
      if (cancelled) return;

      const nextPhaseMap: Record<number, ExperimentPhase[]> = {};
      const nextReqMap: Record<number, ExperimentEquipmentRequirement[]> = {};
      results.forEach(({ experimentId, phases, reqs }) => {
        nextPhaseMap[experimentId] = phases;
        nextReqMap[experimentId] = reqs;
      });
      setExperimentPhasesMap(nextPhaseMap);
      setExperimentReqsMap(nextReqMap);
    }).catch(() => {
      if (!cancelled) {
        setExperimentPhasesMap({});
        setExperimentReqsMap({});
      }
    });

    return () => {
      cancelled = true;
    };
  }, [items]);

  useEffect(() => {
    const missingPlanIds = [...new Set(
      items
        .map((item) => Number(item.allocationPlanId))
        .filter((id) => Number.isFinite(id) && id > 0 && !planResearcherMap[id])
    )];

    if (missingPlanIds.length === 0) return;

    let cancelled = false;
    void Promise.all(
      missingPlanIds.map(async (planId) => {
        try {
          const plan = await getAllocationPlanById(planId);
          return { planId, createdByName: plan?.createdByName };
        } catch {
          return null;
        }
      })
    ).then((results) => {
      if (cancelled) return;
      setPlanResearcherMap((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          if (r && r.createdByName) {
            next[r.planId] = r.createdByName;
          }
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [items, planResearcherMap]);

  /* =======================================================
     FIND LATEST RETURN RECORD
  ======================================================= */

  const getReturnForAllocation =
    useCallback(
      (
        allocationEquipmentDetailId:
          number
      ):
        | EquipmentReturn
        | undefined => {
        const records =
          returnRecords.filter(
            (record) =>
              record.allocationEquipmentDetailId ===
              allocationEquipmentDetailId
          );

        if (
          records.length === 0
        ) {
          return undefined;
        }

        return [...records].sort(
          (a, b) => {
            const aDate =
              a.returnDate
                ? new Date(
                  a.returnDate
                ).getTime()
                : 0;

            const bDate =
              b.returnDate
                ? new Date(
                  b.returnDate
                ).getTime()
                : 0;

            if (
              aDate !== bDate
            ) {
              return (
                bDate - aDate
              );
            }

            return (
              b.id -
              a.id
            );
          }
        )[0];
      },
      [returnRecords]
    );

  const getHandoverForAllocation = useCallback(
    (allocationEquipmentDetailId: number) => {
      const records = handoverRecords.filter(
        (record) =>
          record.allocationEquipmentDetailId === allocationEquipmentDetailId
      );

      return [...records].sort(
        (a, b) =>
          new Date(b.handoverDate).getTime() -
          new Date(a.handoverDate).getTime()
      )[0];
    },
    [handoverRecords]
  );

  /* =======================================================
     STATISTICS
  ======================================================= */

  const stats = useMemo(() => {
    const total =
      items.length;

    /* =====================================================
       MANAGER
    ===================================================== */

    if (isManager) {
      const pendingIds =
        new Set(
          returnRecords
            .filter(
              (record) =>
                normalizeStatus(
                  record.status
                ) === "pending"
            )
            .map(
              (record) =>
                record.allocationEquipmentDetailId
            )
        );

      const confirmedIds =
        new Set(
          returnRecords
            .filter(
              (record) =>
                normalizeStatus(
                  record.status
                ) ===
                "confirmed"
            )
            .map(
              (record) =>
                record.allocationEquipmentDetailId
            )
        );

      const allocated =
        items.filter(
          (item) =>
            item.status ===
            "Allocated" ||
            item.status ===
            "Reserved"
        ).length;

      return {
        total,
        inUse:
          pendingIds.size,
        allocated,
        completed:
          confirmedIds.size,
      };
    }

    /* =====================================================
       FIELD USER
    ===================================================== */

    const inUse =
      items.filter(
        (item) =>
          item.status ===
          "InUse" &&
          !submittedReturnIds.includes(
            item.allocationEquipmentDetailId
          )
      ).length;

    const allocated =
      items.filter(
        (item) =>
          item.status ===
          "Allocated" ||
          item.status ===
          "Reserved"
      ).length;

    const completed =
      items.filter(
        (item) =>
          item.status ===
          "Completed"
      ).length;

    return {
      total,
      inUse,
      allocated,
      completed,
    };
  }, [
    items,
    isManager,
    returnRecords,
    submittedReturnIds,
  ]);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredItems =
    useMemo(() => {
      return items.filter(
        (item) => {
          const returnRecord =
            getReturnForAllocation(
              item.allocationEquipmentDetailId
            );

          const returnStatus =
            normalizeStatus(
              returnRecord?.status
            );

          const submittedLocally =
            submittedReturnIds.includes(
              item.allocationEquipmentDetailId
            );

          let matchesTab =
            false;

          /* ===============================================
             ALL
          =============================================== */

          if (
            tabFilter === "all"
          ) {
            matchesTab = true;
          }

          /* ===============================================
             ALLOCATED
          =============================================== */

          if (
            tabFilter ===
            "allocated"
          ) {
            matchesTab =
              item.status ===
              "Allocated" ||
              item.status ===
              "Reserved";
          }

          /* ===============================================
             IN USE / PENDING
          =============================================== */

          if (
            tabFilter ===
            "inuse"
          ) {
            if (isManager) {
              matchesTab =
                returnStatus ===
                "pending";
            } else {
              matchesTab =
                item.status ===
                "InUse" &&
                !submittedLocally;
            }
          }

          /* ===============================================
             COMPLETED
          =============================================== */

          if (
            tabFilter ===
            "completed"
          ) {
            if (isManager) {
              matchesTab =
                returnStatus ===
                "confirmed";
            } else {
              matchesTab =
                item.status ===
                "Completed";
            }
          }

          if (!matchesTab) {
            return false;
          }

          /* ===============================================
             SEARCH
          =============================================== */

          const keyword =
            searchTerm
              .trim()
              .toLowerCase();

          if (!keyword) {
            return true;
          }

          const phases = experimentPhasesMap[item.experimentId ?? 0] || [];
          const reqs = experimentReqsMap[item.experimentId ?? 0] || [];
          const resolvedPhase = resolvePhaseDisplayName(item, phases, reqs);
          const returner = getPlanReturnerName(
            item,
            returnRecord,
            planResearcherMap,
            experimentResearcherMap,
            returnerNamesById
          );

          const searchable =
            [
              item.allocatedEquipmentTypeName,
              item.requestedEquipmentTypeName,
              item.equipmentInstanceName,
              item.assetCode,
              item.serialNumber,
              item.experimentName,
              item.phaseName,
              resolvedPhase,
              returner,
              returnRecord?.returnedByUser?.fullName ?? returnRecord?.returnedByUser?.username,
              returnRecord?.returnedBy
                ? returnerNamesById[returnRecord.returnedBy]
                : undefined,
              returnRecord?.returnedBy,
              returnRecord?.receivedByUser?.fullName ?? returnRecord?.receivedByUser?.username,
              returnRecord?.note,
              returnRecord?.damageDescription,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          return searchable.includes(
            keyword
          );
        }
      ).sort((a, b) => {
        // Sort newest plan first (highest planId)
        const planA = Number(a.allocationPlanId || 0);
        const planB = Number(b.allocationPlanId || 0);
        if (planB !== planA) {
          return planB - planA;
        }

        // Within same plan, sort by start date ascending (chronological phases)
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        if (dateA !== dateB) {
          return dateA - dateB;
        }

        return Number(b.allocationEquipmentDetailId || 0) - Number(a.allocationEquipmentDetailId || 0);
      });
    }, [
      items,
      tabFilter,
      searchTerm,
      isManager,
      submittedReturnIds,
      getReturnForAllocation,
      experimentPhasesMap,
      experimentReqsMap,
      planResearcherMap,
      experimentResearcherMap,
      returnerNamesById,
    ]);

  /* =======================================================
     PAGINATION
  ======================================================= */

  const {
    currentPage,
    pageSize,
    paginatedItems,
    setCurrentPage,
    setPageSize,
  } = usePagination(
    filteredItems,
    10
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    tabFilter,
    setCurrentPage,
  ]);

  /* =======================================================
     HANDOVER MODAL
  ======================================================= */

  const openHandoverModal = (
    item: AllocationEquipmentDetail
  ) => {
    setHandoverModalItem(
      item
    );
  };

  const closeHandoverModal =
    () => {
      if (actionLoading) {
        return;
      }

      setHandoverModalItem(
        null
      );
    };

  /* =======================================================
     CONFIRM HANDOVER
  ======================================================= */

  const handleConfirmHandover =
    async () => {
      if (!handoverModalItem) {
        return;
      }

      try {
        setActionLoading(true);

        await handoverEquipmentDetail(
          handoverModalItem.allocationEquipmentDetailId,
          {
            conditionBefore:
              "Good",
            note: null,
          }
        );

        showToast(
          `Equipment received "${getEquipmentDisplayName(
            handoverModalItem
          )}" and is now in use.`,
          "success",
          "Equipment received successfully"
        );

        /*
         * Do not use closeHandoverModal()
         * because actionLoading is true.
         */
        setHandoverModalItem(
          null
        );

        await loadData();
      } catch (error: any) {
        showToast(
          error?.response?.data
            ?.message ||
          error?.message ||
          "Unable to receive the equipment.",
          "error"
        );
      } finally {
        setActionLoading(false);
      }
    };

  /* =======================================================
     OPEN RETURN MODAL
  ======================================================= */

  const openReturnModal = (
    item: AllocationEquipmentDetail
  ) => {
    const returnRecord =
      getReturnForAllocation(
        item.allocationEquipmentDetailId
      );

    setReturnModalItem(
      item
    );

    const condition =
      returnRecord?.conditionAfter;

    if (
      condition === "Good" ||
      condition === "Fair" ||
      condition === "Poor" ||
      condition === "Critical"
    ) {
      setReturnCondition(
        condition
      );
    } else {
      setReturnCondition(
        "Good"
      );
    }

    setReturnNotes(
      returnRecord?.note ||
      ""
    );

    setDamageDescription(
      returnRecord?.damageDescription ||
      ""
    );

    setRejectReason(
      returnRecord?.note ||
      ""
    );
  };

  const openDamagedReturnModal = (
    item: AllocationEquipmentDetail
  ) => {
    const returnRecord =
      getReturnForAllocation(
        item.allocationEquipmentDetailId
      );

    setReturnModalItem(
      item
    );
    setReturnCondition(
      "Poor"
    );
    setReturnNotes(
      returnRecord?.note ||
      ""
    );
    setDamageDescription(
      returnRecord?.damageDescription ||
      ""
    );
    setRejectReason(
      returnRecord?.note ||
      ""
    );
  };

  /* =======================================================
     CLOSE RETURN MODAL
  ======================================================= */

  const closeReturnModal =
    () => {
      if (actionLoading) {
        return;
      }

      setReturnModalItem(
        null
      );

      setReturnCondition(
        "Good"
      );

      setReturnNotes("");

      setDamageDescription(
        ""
      );

      setRejectReason("");
    };

  /* =======================================================
     CONFIRM / SUBMIT RETURN
  ======================================================= */

  const handleConfirmReturn =
    async () => {
      if (!returnModalItem) {
        return;
      }

      try {
        setActionLoading(true);

        /* =================================================
           MANAGER CONFIRM RETURN
        ================================================= */

        if (isManager) {
          const returnRecord =
            getReturnForAllocation(
              returnModalItem.allocationEquipmentDetailId
            );

          if (
            !returnRecord?.id
          ) {
            throw new Error(
              "Equipment return request not found."
            );
          }

          if (
            normalizeStatus(
              returnRecord.status
            ) !== "pending"
          ) {
            throw new Error(
              "The equipment return request is no longer pending confirmation."
            );
          }

          await confirmEquipmentReturn(
            returnRecord.id
          );

          showToast(
            `Equipment return confirmed for "${getEquipmentDisplayName(
              returnModalItem
            )}".`,
            "success",
            "Equipment return confirmed successfully"
          );
        } else {
          /* =================================================
             FIELD USER SUBMIT RETURN
          ================================================= */

          if (
            returnModalItem.status !==
            "InUse"
          ) {
            throw new Error(
              "Only equipment currently in use can be submitted for return."
            );
          }

          if (
            submittedReturnIds.includes(
              returnModalItem.allocationEquipmentDetailId
            )
          ) {
            throw new Error(
              "You have already submitted a return request for this equipment."
            );
          }

          /*
           * Actual EquipmentConditionLevel:
           *
           * Good
           * Fair
           * Poor
           * Critical
           * Swagger: Good / Fair / Poor / Critical
           */

          const isDamaged =
            returnCondition ===
            "Poor" ||
            returnCondition ===
            "Critical";

          if (
            isDamaged &&
            !damageDescription.trim()
          ) {
            throw new Error(
              "Please describe the equipment damage or issue."
            );
          }

          const createdReturn =
            await submitMyEquipmentReturn(
              returnModalItem.allocationEquipmentDetailId,
              {
                conditionAfter:
                  returnCondition,

                isDamaged,

                damageDescription:
                  isDamaged
                    ? damageDescription.trim()
                    : null,

                note:
                  returnNotes.trim() ||
                  null,
              }
            );

          /*
           * Submit return:
           *
           * InUse
           *   ↓
           * Pending
           *
           * Do NOT move directly to Completed.
           */

          if (createdReturn) {
            setReturnRecords(
              (previous) => [
                createdReturn,

                ...previous.filter(
                  (record) =>
                    record.id !==
                    createdReturn.id
                ),
              ]
            );
          }

          /*
           * Keep Pending in the session.
           */
          setSubmittedReturnIds(
            (previous) => {
              const id =
                returnModalItem.allocationEquipmentDetailId;

              if (
                previous.includes(
                  id
                )
              ) {
                return previous;
              }

              return [
                ...previous,
                id,
              ];
            }
          );

          showToast(
            `Equipment return request submitted for "${getEquipmentDisplayName(
              returnModalItem
            )}". The request is waiting for manager confirmation.`,
            "success",
            "Equipment return request submitted successfully"
          );
        }

        /*
         * RESET THE MODAL DIRECTLY.
         *
         * Do not call closeReturnModal()
         * because actionLoading is true.
         */
        setReturnModalItem(
          null
        );

        setReturnCondition(
          "Good"
        );

        setReturnNotes("");

        setDamageDescription(
          ""
        );

        setRejectReason("");

        await loadData();
      } catch (error: any) {
        showToast(
          error?.response?.data
            ?.message ||
          error?.message ||
          "Unable to process the equipment return.",
          "error"
        );
      } finally {
        setActionLoading(false);
      }
    };

  /* =======================================================
     MANAGER REJECT RETURN
  ======================================================= */

  const handleRejectReturn =
    async () => {
      if (
        !isManager ||
        !returnModalItem
      ) {
        return;
      }

      const returnRecord =
        getReturnForAllocation(
          returnModalItem.allocationEquipmentDetailId
        );

      if (
        !returnRecord?.id
      ) {
        showToast(
          "Equipment return request not found.",
          "error"
        );

        return;
      }

      if (
        normalizeStatus(
          returnRecord.status
        ) !== "pending"
      ) {
        showToast(
          "This request is no longer pending.",
          "error"
        );

        return;
      }

      if (
        !rejectReason.trim()
      ) {
        showToast(
          "Please enter a rejection reason.",
          "error"
        );

        return;
      }

      try {
        setActionLoading(true);

        await rejectEquipmentReturn(
          returnRecord.id,
          {
            reason:
              rejectReason.trim(),
          }
        );

        showToast(
          `Equipment return request rejected for "${getEquipmentDisplayName(
            returnModalItem
          )}".`,
          "success",
          "Request rejected"
        );

        /*
         * Reset the modal directly.
         */
        setReturnModalItem(
          null
        );

        setReturnCondition(
          "Good"
        );

        setReturnNotes("");

        setDamageDescription(
          ""
        );

        setRejectReason("");

        await loadData();
      } catch (error: any) {
        showToast(
          error?.response?.data
            ?.message ||
          error?.message ||
          "Unable to reject the equipment return request.",
          "error"
        );
      } finally {
        setActionLoading(false);
      }
    };

  /* =======================================================
     STATUS BADGE
  ======================================================= */

  const renderStatus = (
    item: AllocationEquipmentDetail
  ) => {
    const returnRecord =
      getReturnForAllocation(
        item.allocationEquipmentDetailId
      );

    const returnStatus =
      normalizeStatus(
        returnRecord?.status
      );
    const handoverRecord = getHandoverForAllocation(
      item.allocationEquipmentDetailId
    );
    const handoverStatus = normalizeStatus(handoverRecord?.status);

    const submittedLocally =
      submittedReturnIds.includes(
        item.allocationEquipmentDetailId
      );

    /*
     * EquipmentReturn status
     * takes priority over the Allocation status.
     */

    if (
      returnStatus ===
      "pending" ||
      submittedLocally
    ) {
      return (
        <span className="eq-status-badge eq-status-pending">
          Pending return confirmation
        </span>
      );
    }

    if (
      returnStatus ===
      "confirmed"
    ) {
      return (
        <span className="eq-status-badge eq-status-completed">
          Return confirmed
        </span>
      );
    }

    if (
      returnStatus ===
      "rejected"
    ) {
      return (
        <span className="eq-status-badge eq-status-rejected">
          Return request rejected
        </span>
      );
    }

    const normalizedStatus = normalizeStatus(item.status);

    if (
      normalizedStatus === "allocated" ||
      normalizedStatus === "reserved"
    ) {
      if (handoverStatus === "pending") {
        return (
          <span className="eq-status-badge eq-status-pending">
            {isManager
              ? "Step 2: Waiting for Researcher to receive"
              : "Step 2: Handed over - waiting for receipt"}
          </span>
        );
      }

      if (handoverStatus === "rejected") {
        return (
          <span className="eq-status-badge eq-status-rejected">
            Waiting for re-handover
          </span>
        );
      }

      return (
        <span className="eq-status-badge eq-status-allocated">
          {isManager ? "Step 1: Waiting for handover" : "Step 1: Waiting for Manager handover"}
        </span>
      );
    }

    switch (normalizedStatus) {
      case "allocated":
      case "reserved":
        return (
          <span className="eq-status-badge eq-status-allocated">
            Pending receipt
          </span>
        );

      case "InUse":
        return (
          <span className="eq-status-badge eq-status-inuse">
            In Use
          </span>
        );

      case "Completed":
        return (
          <span className="eq-status-badge eq-status-completed">
            Returned
          </span>
        );

      case "Cancelled":
        return (
          <span className="eq-status-badge eq-status-rejected">
            Cancelled
          </span>
        );

      default:
        return (
          <span className="eq-status-badge">
            {item.status ||
              "-"}
          </span>
        );
    }
  };

  /* =======================================================
     ACTION CELL
  ======================================================= */

  const handleManagerHandover = async (
    item: AllocationEquipmentDetail
  ) => {
    try {
      setActionLoading(true);

      const currentUser = getCurrentUserTokenInfo();
      const currentUserId = Number(currentUser?.userId || 0);

      if (!currentUserId) {
        showToast(
          "Unable to identify the current user.",
          "error",
          "Equipment Handover"
        );
        return;
      }

      const candidateResearcherIds: number[] = [];

      if (item.experimentId) {
        try {
          const experiment = await getExperimentById(item.experimentId);
          const resolvedResearcherId = Number(experiment?.researcherId || 0);

          if (resolvedResearcherId > 0) {
            candidateResearcherIds.push(resolvedResearcherId);
          }
        } catch (experimentError) {
          console.warn("Unable to resolve experiment researcher for handover:", experimentError);
        }
      }

      if (item.allocationPlanId) {
        try {
          const plan = await getAllocationPlanById(item.allocationPlanId);
          const planCreatedBy = Number(plan?.createdBy || 0);

          if (planCreatedBy > 0) {
            candidateResearcherIds.push(planCreatedBy);
          }
        } catch (planError) {
          console.warn("Unable to resolve allocation plan owner for handover:", planError);
        }
      }

      const researcherUserId =
        candidateResearcherIds.find(
          (id) => id > 0 && id !== currentUserId
        ) ?? currentUserId;

      await createEquipmentHandover({
        allocationEquipmentDetailId: item.allocationEquipmentDetailId,
        equipmentInstanceId: item.equipmentInstanceId ?? null,
        handedOverBy: currentUserId,
        receivedBy: researcherUserId,
        handoverDate: new Date().toISOString(),
        quantity: Number(item.quantity || 1),
        conditionBefore: "Good",
        note: "Manager has handed over the equipment to the Researcher.",
        status: "Pending",
        confirmedAt: null,
      });

      showToast(
        `Handover request created for "${getEquipmentDisplayName(item)}".`,
        "success",
        "Equipment handed over successfully"
      );

      await loadData();
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
        error?.message ||
        "Unable to hand over the equipment.",
        "error",
        "Equipment Handover"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const renderActions = (
    item: AllocationEquipmentDetail
  ) => {
    const returnRecord =
      getReturnForAllocation(
        item.allocationEquipmentDetailId
      );

    const returnStatus =
      normalizeStatus(
        returnRecord?.status
      );

    const handoverRecord =
      getHandoverForAllocation(
        item.allocationEquipmentDetailId
      );

    const handoverStatus =
      normalizeStatus(
        handoverRecord?.status
      );

    const submittedLocally =
      submittedReturnIds.includes(
        item.allocationEquipmentDetailId
      );

    /* =====================================================
       MANAGER
    ===================================================== */

    if (isManager) {
      if (
        returnStatus ===
        "pending"
      ) {
        return (
          <button
            type="button"
            className="eq-action-btn eq-action-return"
            onClick={() =>
              openReturnModal(
                item
              )
            }
          >
            <PackageCheck
              size={15}
            />
            Process Request
          </button>
        );
      }

      if (
        returnStatus ===
        "confirmed"
      ) {
        return (
          <span className="eq-action-done">
            <CheckCircle2
              size={15}
            />
            Accepted
          </span>
        );
      }

      if (
        returnStatus ===
        "rejected"
      ) {
        return (
          <button
            type="button"
            className="eq-action-btn"
            onClick={() =>
              openReturnModal(
                item
              )
            }
          >
            View Details
          </button>
        );
      }

      if (
        (item.status === "Allocated" || item.status === "Reserved") &&
        (!handoverRecord || handoverStatus === "rejected" || handoverStatus === "cancelled")
      ) {
        return (
          <button
            type="button"
            className="eq-action-btn eq-action-handover"
            onClick={() => void handleManagerHandover(item)}
            disabled={actionLoading}
          >
            <Truck size={15} />
            Equipment Handover
          </button>
        );
      }

      if (handoverStatus === "pending") {
        return (
          <span className="eq-action-pending">
            <Truck size={15} />
            Step 2: waiting for Researcher confirmation
          </span>
        );
      }

      return (
        <span className="eq-action-muted">
          -
        </span>
      );
    }

    /* =====================================================
       FIELD USER
    ===================================================== */

    if (
      item.status ===
      "Allocated" ||
      item.status ===
      "Reserved"
    ) {
      if (getHandoverForAllocation(item.allocationEquipmentDetailId)?.status === "Pending") {
        return (
          <button
            type="button"
            className="eq-action-btn eq-action-handover"
            onClick={() =>
              openHandoverModal(
                item
              )
            }
          >
            <Truck size={15} />
            Receive Equipment
          </button>
        );
      }

      return (
        <button
          type="button"
          className="eq-action-btn eq-action-handover"
          onClick={() =>
            openHandoverModal(
              item
            )
          }
        >
          <Truck size={15} />
          Receive Equipment
        </button>
      );
    }

    if (
      item.status ===
      "InUse" &&
      !submittedLocally &&
      returnStatus !==
      "pending"
    ) {
      return (
        <div className="eq-action-stack">
          <button
            type="button"
            className="eq-action-btn eq-action-return"
            onClick={() =>
              openReturnModal(
                item
              )
            }
          >
            <RotateCcw
              size={15}
            />
            Return Equipment
          </button>
        </div>
      );
    }

    if (
      submittedLocally ||
      returnStatus ===
      "pending"
    ) {
      return (
        <span className="eq-action-pending">
          <PackageCheck
            size={15}
          />
          Pending Confirmation
        </span>
      );
    }

    if (
      item.status ===
      "Completed"
    ) {
      return (
        <span className="eq-action-done">
          <CheckCircle2
            size={15}
          />
          Returned
        </span>
      );
    }

    return (
      <span className="eq-action-muted">
        -
      </span>
    );
  };

  /* =======================================================
     CURRENT RETURN RECORD
  ======================================================= */

  const currentReturnRecord =
    returnModalItem
      ? getReturnForAllocation(
        returnModalItem.allocationEquipmentDetailId
      )
      : undefined;

  const currentReturnStatus =
    normalizeStatus(
      currentReturnRecord?.status
    );

  const isDamagedReturnFlow =
    returnCondition === "Poor" ||
    returnCondition === "Critical";

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <DashboardLayout>
      <div className="equipment-return-page">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="eq-return-header">
          <div>
            <p className="eq-return-breadcrumb">
              {isManager
                ? "Operations / Equipment Return Confirmation"
                : "Operations / Equipment Return"}
            </p>

            <h1>
              {isManager
                ? "Equipment Return Confirmation"
                : "Equipment Handover & Return"}
            </h1>

            <p className="eq-return-description">
              {isManager
                ? "Review, inspect, and confirm equipment return requests from users."
                : "Track allocated equipment, receive equipment, and submit return requests after completing work."}
            </p>
          </div>
        </header>

        {/* =================================================
            STATISTICS
        ================================================= */}

        <div className="eq-return-stats-grid">

          <div className="eq-return-stat-card">
            <div className="eq-stat-icon-wrapper eq-stat-icon-all">
              <Cpu size={22} />
            </div>

            <div className="eq-stat-info">
              <span className="eq-stat-label">
                {isManager
                  ? "Total Allocated Equipment"
                  : "Total Assigned Equipment"}
              </span>

              <span className="eq-stat-value">
                {stats.total}
              </span>
            </div>
          </div>

          <div className="eq-return-stat-card">
            <div className="eq-stat-icon-wrapper eq-stat-icon-inuse">
              {isManager ? (
                <PackageCheck
                  size={22}
                />
              ) : (
                <RotateCcw
                  size={22}
                />
              )}
            </div>

            <div className="eq-stat-info">
              <span className="eq-stat-label">
                {isManager
                  ? "Pending Return Requests"
                  : "In Use (Needs Return)"}
              </span>

              <span className="eq-stat-value">
                {stats.inUse}
              </span>
            </div>
          </div>

          <div className="eq-return-stat-card">
            <div className="eq-stat-icon-wrapper eq-stat-icon-allocated">
              <Truck size={22} />
            </div>

            <div className="eq-stat-info">
              <span className="eq-stat-label">
                {isManager
                  ? "Waiting for User Receipt"
                  : "Pending receipt"}
              </span>

              <span className="eq-stat-value">
                {stats.allocated}
              </span>
            </div>
          </div>

          <div className="eq-return-stat-card">
            <div className="eq-stat-icon-wrapper eq-stat-icon-completed">
              <CheckCircle2
                size={22}
              />
            </div>

            <div className="eq-stat-info">
              <span className="eq-stat-label">
                {isManager
                  ? "Accepted"
                  : "Returned"}
              </span>

              <span className="eq-stat-value">
                {stats.completed}
              </span>
            </div>
          </div>

        </div>

        {/* =================================================
            CONTENT
        ================================================= */}

        <section className="eq-return-content-card">

          {/* ===============================================
              TOOLBAR
          =============================================== */}

          <div className="eq-return-toolbar">

            <div className="eq-return-search">
              <Search size={18} />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Search equipment, asset code, experiment..."
              />
            </div>

            <button
              type="button"
              className="eq-action-btn"
              onClick={() =>
                void loadData()
              }
              disabled={loading}
            >
              <RotateCcw
                size={15}
              />

              {loading
                ? "Loading..."
                : "Refresh"}
            </button>

          </div>

          {/* ===============================================
              TABS
          =============================================== */}

          <div className="eq-return-tabs">

            <button
              type="button"
              className={
                tabFilter === "all"
                  ? "eq-return-tab active"
                  : "eq-return-tab"
              }
              onClick={() =>
                setTabFilter(
                  "all"
                )
              }
            >
              All

              <span>
                {stats.total}
              </span>
            </button>

            <button
              type="button"
              className={
                tabFilter === "inuse"
                  ? "eq-return-tab active"
                  : "eq-return-tab"
              }
              onClick={() =>
                setTabFilter(
                  "inuse"
                )
              }
            >
              {isManager
                ? "Pending return confirmation"
                : "Needs Return"}

              <span>
                {stats.inUse}
              </span>
            </button>

            <button
              type="button"
              className={
                tabFilter ===
                  "allocated"
                  ? "eq-return-tab active"
                  : "eq-return-tab"
              }
              onClick={() =>
                setTabFilter(
                  "allocated"
                )
              }
            >
              Pending receipt

              <span>
                {stats.allocated}
              </span>
            </button>

            <button
              type="button"
              className={
                tabFilter ===
                  "completed"
                  ? "eq-return-tab active"
                  : "eq-return-tab"
              }
              onClick={() =>
                setTabFilter(
                  "completed"
                )
              }
            >
              Returned

              <span>
                {stats.completed}
              </span>
            </button>

          </div>

          {/* ===============================================
              TABLE
          =============================================== */}

          <div className="eq-return-table-wrapper">

            <table className="eq-return-table">

              <thead>
                <tr>
                  <th>
                    Equipment
                  </th>

                  <th>
                    Asset Code
                  </th>

                  <th>
                    Experiment / Phase
                  </th>

                  <th>
                    Usage Period
                  </th>

                  {isManager && (
                    <th>
                      Returner
                    </th>
                  )}

                  <th>
                    Status
                  </th>

                  <th>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>

                {loading ? (
                  <tr>
                    <td
                      colSpan={
                        isManager
                          ? 7
                          : 6
                      }
                      className="eq-table-empty"
                    >
                      Loading data...
                    </td>
                  </tr>
                ) : paginatedItems.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={
                        isManager
                          ? 7
                          : 6
                      }
                      className="eq-table-empty"
                    >
                      No matching equipment found.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map(
                    (item) => {
                      const returnRecord =
                        getReturnForAllocation(
                          item.allocationEquipmentDetailId
                        );

                      return (
                        <tr
                          key={
                            item.allocationEquipmentDetailId
                          }
                        >

                          {/* DEVICE */}

                          <td>
                            <div className="eq-device-cell">

                              <div className="eq-device-icon">
                                <Cpu
                                  size={
                                    17
                                  }
                                />
                              </div>

                              <div>
                                <strong>
                                  {getEquipmentDisplayName(
                                    item
                                  )}
                                </strong>

                                <small>
                                  {item.allocatedEquipmentTypeName ||
                                    item.requestedEquipmentTypeName ||
                                    "-"}
                                </small>
                              </div>

                            </div>
                          </td>

                          {/* ASSET CODE */}

                          <td>
                            <div className="eq-code-cell">

                              <strong>
                                {item.assetCode ||
                                  "-"}
                              </strong>

                              {item.serialNumber && (
                                <small>
                                  SN:{" "}
                                  {
                                    item.serialNumber
                                  }
                                </small>
                              )}

                            </div>
                          </td>

                          {/* EXPERIMENT */}

                          <td>
                            <div className="eq-experiment-cell">

                              <strong>
                                {item.experimentName ||
                                  "-"}
                              </strong>

                              <small>
                                {resolvePhaseDisplayName(
                                  item,
                                  experimentPhasesMap[item.experimentId ?? 0] || [],
                                  experimentReqsMap[item.experimentId ?? 0] || []
                                )}
                              </small>

                            </div>
                          </td>

                          {/* DATE */}

                          <td>
                            <div className="eq-date-cell">

                              <span>
                                {formatDate(
                                  item.startDate
                                )}
                              </span>

                              <span>
                                →
                              </span>

                              <span>
                                {formatDate(
                                  item.endDate
                                )}
                              </span>

                            </div>
                          </td>

                          {/* MANAGER RETURNER */}

                          {isManager && (
                            <td>
                              <div className="eq-user-cell">

                                <strong>
                                  {getPlanReturnerName(
                                    item,
                                    returnRecord,
                                    planResearcherMap,
                                    experimentResearcherMap,
                                    returnerNamesById
                                  )}
                                </strong>

                                {returnRecord?.returnDate && (
                                  <small>
                                    {formatDate(
                                      returnRecord.returnDate
                                    )}
                                  </small>
                                )}

                              </div>
                            </td>
                          )}

                          {/* STATUS */}

                          <td>
                            {renderStatus(
                              item
                            )}
                          </td>

                          {/* ACTION */}

                          <td>
                            {renderActions(
                              item
                            )}
                          </td>

                        </tr>
                      );
                    }
                  )
                )}

              </tbody>

            </table>

          </div>

          {/* ===============================================
              PAGINATION
          =============================================== */}

          {!loading &&
            filteredItems.length >
            0 && (
              <Pagination
                currentPage={
                  currentPage
                }
                pageSize={
                  pageSize
                }
                totalItems={
                  filteredItems.length
                }
                onPageChange={
                  setCurrentPage
                }
                onPageSizeChange={
                  setPageSize
                }
              />
            )}

        </section>

        {/* =================================================
            HANDOVER MODAL
        ================================================= */}

        {handoverModalItem && (
          <div
            className="eq-modal-overlay"
            onMouseDown={(
              event
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeHandoverModal();
              }
            }}
          >
            <div className="eq-modal">

              <div className="eq-modal-header">

                <div>
                  <h2>
                    Receive Equipment
                  </h2>

                  <p>
                    Confirm that you have received
                    the equipment and started
                    using it.
                  </p>
                </div>

                <button
                  type="button"
                  className="eq-modal-close"
                  onClick={
                    closeHandoverModal
                  }
                  disabled={
                    actionLoading
                  }
                >
                  ×
                </button>

              </div>

              <div className="eq-modal-body">

                <div className="eq-modal-device">

                  <div className="eq-device-icon">
                    <Truck
                      size={20}
                    />
                  </div>

                  <div>
                    <strong>
                      {getEquipmentDisplayName(
                        handoverModalItem
                      )}
                    </strong>

                    <span>
                      {handoverModalItem.assetCode ||
                        "No asset code"}
                    </span>
                  </div>

                </div>

                <div className="eq-modal-info-grid">

                  <div>
                    <span>
                      Experiment
                    </span>

                    <strong>
                      {handoverModalItem.experimentName ||
                        "-"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Phase
                    </span>

                    <strong>
                      {resolvePhaseDisplayName(
                        handoverModalItem,
                        experimentPhasesMap[handoverModalItem.experimentId ?? 0] || [],
                        experimentReqsMap[handoverModalItem.experimentId ?? 0] || []
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Start
                    </span>

                    <strong>
                      {formatDate(
                        handoverModalItem.startDate
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      End
                    </span>

                    <strong>
                      {formatDate(
                        handoverModalItem.endDate
                      )}
                    </strong>
                  </div>

                </div>

                <div className="eq-modal-notice">
                  After confirming receipt,
                  the allocation status will
                  change to{" "}
                  <strong>
                    InUse
                  </strong>
                  .
                </div>

              </div>

              <div className="eq-modal-footer">

                <button
                  type="button"
                  className="eq-modal-btn-cancel"
                  onClick={
                    closeHandoverModal
                  }
                  disabled={
                    actionLoading
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="eq-modal-btn-handover"
                  onClick={() =>
                    void handleConfirmHandover()
                  }
                  disabled={
                    actionLoading
                  }
                >
                  <Truck
                    size={15}
                  />

                  {actionLoading
                    ? "Processing..."
                    : "Confirm Receipt"}
                </button>

              </div>

            </div>
          </div>
        )}

        {/* =================================================
            RETURN MODAL
        ================================================= */}

        {returnModalItem && (
          <div
            className="eq-modal-overlay"
            onMouseDown={(
              event
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeReturnModal();
              }
            }}
          >
            <div className="eq-modal eq-return-modal">

              {/* ===========================================
                  HEADER
              =========================================== */}

              <div className="eq-modal-header">

                <div>
                  <h2>
                    {isManager
                      ? "Confirm Equipment Return"
                      : isDamagedReturnFlow
                        ? "Report Damage & Return Equipment"
                        : "Return Equipment"}
                  </h2>

                  <p>
                    {isManager
                      ? "Review the equipment information and condition before acceptance."
                      : isDamagedReturnFlow
                        ? "Record damage and submit a return request for equipment that was damaged during use."
                        : "Report the equipment condition before submitting a return request."}
                  </p>
                </div>

                <button
                  type="button"
                  className="eq-modal-close"
                  onClick={
                    closeReturnModal
                  }
                  disabled={
                    actionLoading
                  }
                >
                  ×
                </button>

              </div>

              {/* ===========================================
                  BODY
              =========================================== */}

              <div className="eq-modal-body">

                {/* DEVICE */}

                <div className="eq-modal-device">

                  <div className="eq-device-icon">
                    <RotateCcw
                      size={20}
                    />
                  </div>

                  <div>
                    <strong>
                      {getEquipmentDisplayName(
                        returnModalItem
                      )}
                    </strong>

                    <span>
                      {returnModalItem.assetCode ||
                        "No asset code"}
                    </span>
                  </div>

                </div>

                {/* INFO */}

                <div className="eq-modal-info-grid">

                  <div>
                    <span>
                      Experiment
                    </span>

                    <strong>
                      {returnModalItem.experimentName ||
                        "-"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Phase
                    </span>

                    <strong>
                      {resolvePhaseDisplayName(
                        returnModalItem,
                        experimentPhasesMap[returnModalItem.experimentId ?? 0] || [],
                        experimentReqsMap[returnModalItem.experimentId ?? 0] || []
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Serial Number
                    </span>

                    <strong>
                      {returnModalItem.serialNumber ||
                        "-"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Quantity
                    </span>

                    <strong>
                      {returnModalItem.quantity ||
                        1}
                    </strong>
                  </div>

                </div>

                {/* =========================================
                    MANAGER
                ========================================= */}

                {isManager ? (
                  <>

                    <div className="eq-manager-summary-grid">
                      <div className="eq-form-group">
                        <label>
                          Returner
                        </label>

                        <input
                          type="text"
                          className="eq-readonly-input"
                          value={
                            currentReturnRecord?.returnedByUser?.fullName ||
                            currentReturnRecord?.returnedByUser?.username ||
                            (returnModalItem.allocationPlanId
                              ? planResearcherMap[returnModalItem.allocationPlanId]
                              : undefined) ||
                            (returnModalItem.experimentId
                              ? experimentResearcherMap[returnModalItem.experimentId]
                              : undefined) ||
                            (currentReturnRecord?.returnedBy
                              ? returnerNamesById[currentReturnRecord.returnedBy] ||
                              `User #${currentReturnRecord.returnedBy}`
                              : "-")
                          }
                          disabled
                        />
                      </div>

                      <div className="eq-form-group">
                        <label>
                          Return Date
                        </label>

                        <input
                          type="text"
                          className="eq-readonly-input"
                          value={formatDate(
                            currentReturnRecord?.returnDate
                          )}
                          disabled
                        />
                      </div>
                    </div>

                    <div className="eq-manager-summary-grid">
                      <div className="eq-form-group">
                        <label>
                          Condition After
                          Use
                        </label>

                        <input
                          type="text"
                          className="eq-readonly-input"
                          value={
                            currentReturnRecord?.conditionAfter ||
                            "-"
                          }
                          disabled
                        />
                      </div>

                      <div className="eq-form-group">
                        <label>
                          Damaged
                        </label>

                        <input
                          type="text"
                          className={
                            currentReturnRecord?.isDamaged
                              ? "eq-readonly-input eq-readonly-input-danger"
                              : "eq-readonly-input eq-readonly-input-success"
                          }
                          value={
                            currentReturnRecord?.isDamaged
                              ? "Yes"
                              : "No"
                          }
                          disabled
                        />
                      </div>
                    </div>

                    {currentReturnRecord?.damageDescription && (
                      <div className="eq-form-group eq-form-group-highlight">

                        <label>
                          Damage Description
                        </label>

                        <textarea
                          className="eq-readonly-textarea"
                          value={
                            currentReturnRecord.damageDescription
                          }
                          disabled
                          rows={3}
                        />

                      </div>
                    )}

                    <div className="eq-form-group">

                      <label>
                        Returner's
                        Notes
                      </label>

                      <textarea
                        className="eq-readonly-textarea"
                        value={
                          currentReturnRecord?.note ||
                          ""
                        }
                        disabled
                        rows={3}
                        placeholder="No notes"
                      />

                    </div>

                    {currentReturnStatus ===
                      "pending" && (
                        <div className="eq-form-group">

                          <label>
                            Rejection Reason
                            <span>
                              {" "}
                              (required when
                              rejecting)
                            </span>
                          </label>

                          <textarea
                            value={
                              rejectReason
                            }
                            onChange={(
                              event
                            ) =>
                              setRejectReason(
                                event
                                  .target
                                  .value
                              )
                            }
                            rows={3}
                            placeholder="Enter the reason if the equipment does not meet acceptance requirements..."
                          />

                        </div>
                      )}

                    {currentReturnStatus ===
                      "rejected" &&
                      currentReturnRecord?.note && (
                        <div className="eq-form-group">

                          <label>
                            Previous rejection
                            reason
                          </label>

                          <textarea
                            value={
                              currentReturnRecord.note
                            }
                            disabled
                            rows={3}
                          />

                        </div>
                      )}

                    {currentReturnStatus ===
                      "confirmed" && (
                        <div className="eq-modal-notice">

                          <CheckCircle2
                            size={16}
                          />

                          <span>
                            This request has been
                            confirmed and
                            accepted
                            {currentReturnRecord?.confirmedAt
                              ? ` on ${formatDate(
                                currentReturnRecord.confirmedAt
                              )}`
                              : ""}
                            .
                          </span>

                        </div>
                      )}

                  </>
                ) : (
                  <>

                    {/* =====================================
                        FIELD USER
                    ===================================== */}

                    <div className="eq-form-group">

                      <label>
                        Equipment Condition
                        After Use
                      </label>

                      <select
                        value={
                          returnCondition
                        }
                        onChange={(
                          event
                        ) =>
                          setReturnCondition(
                            event.target
                              .value as EquipmentConditionLevel
                          )
                        }
                      >
                        <option value="Good">
                          Good
                        </option>

                        <option value="Fair">
                          Fair
                        </option>

                        <option value="Poor">
                          Poor
                        </option>

                        <option value="Critical">
                          Critical -
                          Critical
                        </option>

                      </select>

                    </div>

                    {(returnCondition ===
                      "Poor" ||
                      returnCondition ===
                      "Critical") && (
                        <div className="eq-form-group">

                          <label>
                            Issue Description
                            <span>
                              {" "}
                              *
                            </span>
                          </label>

                          <textarea
                            value={
                              damageDescription
                            }
                            onChange={(
                              event
                            ) =>
                              setDamageDescription(
                                event
                                  .target
                                  .value
                              )
                            }
                            rows={4}
                            placeholder="Describe damage, errors, or issues requiring inspection/maintenance..."
                          />

                        </div>
                      )}

                    <div className="eq-form-group">

                      <label>
                        Notes
                      </label>

                      <textarea
                        value={
                          returnNotes
                        }
                        onChange={(
                          event
                        ) =>
                          setReturnNotes(
                            event
                              .target
                              .value
                          )
                        }
                        rows={4}
                        placeholder="Enter notes about equipment use or handover..."
                      />

                    </div>

                    <div className="eq-modal-notice">

                      <span>
                        After submitting the
                        request, the equipment will remain in
                        the status{" "}
                        <strong>
                          Pending return confirmation
                        </strong>
                        . The equipment is only considered
                        returned after
                        sau khi Manager
                        acceptance.
                      </span>

                    </div>

                  </>
                )}

              </div>

              {/* ===========================================
                  FOOTER
              =========================================== */}

              <div className="eq-modal-footer">

                <button
                  type="button"
                  className="eq-modal-btn-cancel"
                  onClick={
                    closeReturnModal
                  }
                  disabled={
                    actionLoading
                  }
                >
                  {isManager &&
                    currentReturnStatus !==
                    "pending"
                    ? "Close"
                    : "Cancel"}
                </button>

                {/* MANAGER PENDING */}

                {isManager &&
                  currentReturnStatus ===
                  "pending" && (
                    <>

                      <button
                        type="button"
                        className="eq-modal-btn-cancel"
                        onClick={() =>
                          void handleRejectReturn()
                        }
                        disabled={
                          actionLoading
                        }
                      >
                        <XCircle
                          size={15}
                        />

                        {actionLoading
                          ? "Processing..."
                          : "Reject"}
                      </button>

                      <button
                        type="button"
                        className="eq-modal-btn-handover"
                        onClick={() =>
                          void handleConfirmReturn()
                        }
                        disabled={
                          actionLoading
                        }
                      >
                        <CheckCircle2
                          size={15}
                        />

                        {actionLoading
                          ? "Processing..."
                          : "Confirm Equipment Return"}
                      </button>

                    </>
                  )}

                {/* FIELD USER */}

                {!isManager && (
                  <button
                    type="button"
                    className="eq-modal-btn-confirm"
                    onClick={() =>
                      void handleConfirmReturn()
                    }
                    disabled={
                      actionLoading
                    }
                  >
                    <RotateCcw
                      size={15}
                    />

                    {actionLoading
                      ? "Submitting..."
                      : isDamagedReturnFlow
                        ? "Submit Damage Report & Return"
                        : "Submit Return Request"}
                  </button>
                )}

              </div>

            </div>
          </div>
        )}

        {/* =================================================
            TOAST
        ================================================= */}

        <ToastPopup
          visible={
            toast.visible
          }
          type={
            toast.type
          }
          title={
            toast.title
          }
          message={
            toast.message
          }
          onClose={() =>
            setToast(
              (previous) => ({
                ...previous,
                visible: false,
              })
            )
          }
        />

      </div>
    </DashboardLayout>
  );
}