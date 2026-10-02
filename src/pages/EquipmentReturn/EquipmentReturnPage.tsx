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
import { getAllocationPlanById } from "../../services/allocationPlanService";
import { getExperimentById } from "../../services/experimentService";
import { getExperimentPhases } from "../../services/experimentPhaseService";
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

function getPhaseDisplayName(
  phaseName?: string | null,
  phaseId?: number | null,
  experimentPhaseNames: string[] = []
): string {
  const trimmed = (phaseName ?? "").trim();

  if (trimmed) {
    return trimmed;
  }

  if (experimentPhaseNames.length > 0) {
    const firstPhase = experimentPhaseNames[0]?.trim();
    if (firstPhase) {
      return firstPhase;
    }
  }

  if (typeof phaseId === "number" && Number.isFinite(phaseId)) {
    return `Phase #${phaseId}`;
  }

  return "Không có phase";
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

  const [experimentPhaseNamesMap, setExperimentPhaseNamesMap] = useState<
    Record<number, string[]>
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
          ? "Thành công"
          : type === "error"
            ? "Lỗi xử lý"
            : "Thông báo"),
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

          return;
        }

        /* =================================================
           FIELD USER
        ================================================= */

        const currentUser = getCurrentUserTokenInfo();
        const [allocationList, handovers, returns] = await Promise.all([
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
      } catch (error: any) {
        showToast(
          error?.response?.data
            ?.message ||
            error?.message ||
            "Không thể tải danh sách thiết bị.",
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
      setExperimentPhaseNamesMap({});
      return;
    }

    let cancelled = false;

    void Promise.all(
      experimentIds.map(async (experimentId) => {
        const phases = await getExperimentPhases({
          experimentId,
          size: 200,
        }).catch(() => []);

        return {
          experimentId,
          phaseNames: phases
            .map((phase) => (phase.phaseName || "").trim())
            .filter(Boolean),
        };
      })
    ).then((results) => {
      if (cancelled) return;

      const nextMap: Record<number, string[]> = {};
      results.forEach(({ experimentId, phaseNames }) => {
        nextMap[experimentId] = phaseNames;
      });
      setExperimentPhaseNamesMap(nextMap);
    }).catch(() => {
      if (!cancelled) {
        setExperimentPhaseNamesMap({});
      }
    });

    return () => {
      cancelled = true;
    };
  }, [items]);

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

          const searchable =
            [
              item.allocatedEquipmentTypeName,
              item.requestedEquipmentTypeName,
              item.equipmentInstanceName,
              item.assetCode,
              item.serialNumber,
              item.experimentName,
              item.phaseName,
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
      );
    }, [
      items,
      tabFilter,
      searchTerm,
      isManager,
      submittedReturnIds,
      getReturnForAllocation,
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
          `Đã tiếp nhận thiết bị "${getEquipmentDisplayName(
            handoverModalItem
          )}" vào sử dụng.`,
          "success",
          "Tiếp nhận thiết bị thành công"
        );

        /*
         * Không dùng closeHandoverModal()
         * vì actionLoading đang true.
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
            "Không thể tiếp nhận thiết bị.",
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
              "Không tìm thấy yêu cầu trả thiết bị."
            );
          }

          if (
            normalizeStatus(
              returnRecord.status
            ) !== "pending"
          ) {
            throw new Error(
              "Yêu cầu trả thiết bị không còn ở trạng thái chờ xác nhận."
            );
          }

          await confirmEquipmentReturn(
            returnRecord.id
          );

          showToast(
            `Đã xác nhận nhận lại thiết bị "${getEquipmentDisplayName(
              returnModalItem
            )}".`,
            "success",
            "Xác nhận trả thiết bị thành công"
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
              "Chỉ thiết bị đang sử dụng mới có thể gửi yêu cầu trả."
            );
          }

          if (
            submittedReturnIds.includes(
              returnModalItem.allocationEquipmentDetailId
            )
          ) {
            throw new Error(
              "Bạn đã gửi yêu cầu trả thiết bị này."
            );
          }

          /*
           * EquipmentConditionLevel thực tế:
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
              "Vui lòng mô tả tình trạng hư hỏng hoặc vấn đề của thiết bị."
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
           * KHÔNG chuyển thẳng Completed.
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
           * Giữ Pending trong session.
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
            `Đã gửi yêu cầu trả thiết bị "${getEquipmentDisplayName(
              returnModalItem
            )}". Yêu cầu đang chờ quản lý xác nhận.`,
            "success",
            "Gửi yêu cầu trả thành công"
          );
        }

        /*
         * RESET MODAL TRỰC TIẾP.
         *
         * Không gọi closeReturnModal()
         * vì actionLoading đang true.
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
            "Không thể thực hiện thao tác trả thiết bị.",
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
          "Không tìm thấy yêu cầu trả thiết bị.",
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
          "Yêu cầu này không còn ở trạng thái chờ xử lý.",
          "error"
        );

        return;
      }

      if (
        !rejectReason.trim()
      ) {
        showToast(
          "Vui lòng nhập lý do từ chối.",
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
          `Đã từ chối yêu cầu trả thiết bị "${getEquipmentDisplayName(
            returnModalItem
          )}".`,
          "success",
          "Đã từ chối yêu cầu"
        );

        /*
         * Reset modal trực tiếp.
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
            "Không thể từ chối yêu cầu trả thiết bị.",
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
     * ưu tiên hơn Allocation status.
     */

    if (
      returnStatus ===
        "pending" ||
      submittedLocally
    ) {
      return (
        <span className="eq-status-badge eq-status-pending">
          Chờ xác nhận trả
        </span>
      );
    }

    if (
      returnStatus ===
      "confirmed"
    ) {
      return (
        <span className="eq-status-badge eq-status-completed">
          Đã xác nhận trả
        </span>
      );
    }

    if (
      returnStatus ===
      "rejected"
    ) {
      return (
        <span className="eq-status-badge eq-status-rejected">
          Yêu cầu trả bị từ chối
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
              ? "Bước 2: Chờ Researcher tiếp nhận"
              : "Bước 2: Đã bàn giao - chờ tiếp nhận"}
          </span>
        );
      }

      if (handoverStatus === "rejected") {
        return (
          <span className="eq-status-badge eq-status-rejected">
            Chờ bàn giao lại
          </span>
        );
      }

      return (
        <span className="eq-status-badge eq-status-allocated">
          {isManager ? "Bước 1: Chờ bàn giao" : "Bước 1: Chờ Manager bàn giao"}
        </span>
      );
    }

    switch (normalizedStatus) {
      case "allocated":
      case "reserved":
        return (
          <span className="eq-status-badge eq-status-allocated">
            Chờ tiếp nhận
          </span>
        );

      case "InUse":
        return (
          <span className="eq-status-badge eq-status-inuse">
            Đang sử dụng
          </span>
        );

      case "Completed":
        return (
          <span className="eq-status-badge eq-status-completed">
            Đã hoàn trả
          </span>
        );

      case "Cancelled":
        return (
          <span className="eq-status-badge eq-status-rejected">
            Đã hủy
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
          "Không xác định được người dùng hiện tại.",
          "error",
          "Bàn giao thiết bị"
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
        note: "Manager đã bàn giao thiết bị cho Researcher.",
        status: "Pending",
        confirmedAt: null,
      });

      showToast(
        `Đã tạo yêu cầu bàn giao cho "${getEquipmentDisplayName(item)}".`,
        "success",
        "Bàn giao thiết bị thành công"
      );

      await loadData();
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể bàn giao thiết bị.",
        "error",
        "Bàn giao thiết bị"
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
            Xử lý yêu cầu
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
            Đã nghiệm thu
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
            Xem chi tiết
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
            Bàn giao thiết bị
          </button>
        );
      }

      if (handoverStatus === "pending") {
        return (
          <span className="eq-action-pending">
            <Truck size={15} />
            Bước 2: chờ Researcher xác nhận
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
            Tiếp nhận thiết bị
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
          Tiếp nhận thiết bị
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
            className="eq-action-btn eq-action-damaged"
            onClick={() =>
              openDamagedReturnModal(
                item
              )
            }
          >
            <AlertTriangle
              size={15}
            />
            Báo hỏng
          </button>

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
            Trả thiết bị
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
          Đang chờ xác nhận
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
          Đã hoàn trả
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
                ? "Equipment Return Confirmation (Xác nhận trả thiết bị)"
                : "Equipment Handover & Return (Bàn giao & Trả thiết bị)"}
            </h1>

            <p className="eq-return-description">
              {isManager
                ? "Kiểm tra, nghiệm thu và xác nhận các yêu cầu hoàn trả thiết bị từ nhân sự sử dụng."
                : "Theo dõi thiết bị được phân bổ, thực hiện tiếp nhận và gửi yêu cầu trả thiết bị sau khi hoàn thành công việc."}
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
                  ? "Tổng thiết bị phân bổ"
                  : "Tổng thiết bị được giao"}
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
                  ? "Yêu cầu trả đang chờ"
                  : "Đang sử dụng (Cần trả)"}
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
                  ? "Chờ nhân viên nhận"
                  : "Chờ tiếp nhận"}
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
                  ? "Đã nghiệm thu"
                  : "Đã hoàn trả"}
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
                placeholder="Tìm thiết bị, mã tài sản, thí nghiệm..."
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
                ? "Đang tải..."
                : "Làm mới"}
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
              Tất cả

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
                ? "Chờ xác nhận trả"
                : "Cần trả"}

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
              Chờ tiếp nhận

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
              Đã hoàn trả

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
                    Thiết bị
                  </th>

                  <th>
                    Mã tài sản
                  </th>

                  <th>
                    Thí nghiệm / Phase
                  </th>

                  <th>
                    Thời gian sử dụng
                  </th>

                  {isManager && (
                    <th>
                      Người trả
                    </th>
                  )}

                  <th>
                    Trạng thái
                  </th>

                  <th>
                    Thao tác
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
                      Đang tải dữ liệu...
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
                      Không có thiết bị phù hợp.
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
                                {getPhaseDisplayName(
                                  item.phaseName,
                                  item.phaseId,
                                  experimentPhaseNamesMap[item.experimentId ?? 0] || []
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
                                  {returnRecord?.returnedByUser?.fullName || returnRecord?.returnedByUser?.username  ||
                                    (returnRecord?.returnedBy
                                      ? returnerNamesById[returnRecord.returnedBy] || `Người dùng #${returnRecord.returnedBy}`
                                      : "-")}
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
                    Tiếp nhận thiết bị
                  </h2>

                  <p>
                    Xác nhận bạn đã nhận
                    thiết bị và bắt đầu
                    sử dụng.
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
                        "Không có mã tài sản"}
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
                      {getPhaseDisplayName(
                        handoverModalItem.phaseName,
                        handoverModalItem.phaseId,
                        experimentPhaseNamesMap[handoverModalItem.experimentId ?? 0] || []
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Bắt đầu
                    </span>

                    <strong>
                      {formatDate(
                        handoverModalItem.startDate
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Kết thúc
                    </span>

                    <strong>
                      {formatDate(
                        handoverModalItem.endDate
                      )}
                    </strong>
                  </div>

                </div>

                <div className="eq-modal-notice">
                  Sau khi xác nhận tiếp
                  nhận, trạng thái phân
                  bổ sẽ chuyển sang{" "}
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
                  Hủy
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
                    ? "Đang xử lý..."
                    : "Xác nhận tiếp nhận"}
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
                      ? "Xác nhận trả thiết bị"
                      : isDamagedReturnFlow
                        ? "Báo hỏng & trả thiết bị"
                        : "Trả thiết bị"}
                  </h2>

                  <p>
                    {isManager
                      ? "Kiểm tra thông tin và tình trạng thiết bị trước khi nghiệm thu."
                      : isDamagedReturnFlow
                        ? "Ghi nhận hư hỏng và gửi yêu cầu trả thiết bị đã bị lỗi trong quá trình sử dụng."
                        : "Khai báo tình trạng thiết bị trước khi gửi yêu cầu trả."}
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
                        "Không có mã tài sản"}
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
                      {getPhaseDisplayName(
                        returnModalItem.phaseName,
                        returnModalItem.phaseId,
                        experimentPhaseNamesMap[returnModalItem.experimentId ?? 0] || []
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
                      Số lượng
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
                          Người gửi trả
                        </label>

                        <input
                          type="text"
                          className="eq-readonly-input"
                          value={
                            currentReturnRecord?.returnedByUser?.fullName || currentReturnRecord?.returnedByUser?.username  ||
                            (currentReturnRecord?.returnedBy
                              ? returnerNamesById[currentReturnRecord.returnedBy] || `Người dùng #${currentReturnRecord.returnedBy}`
                              : "-")
                          }
                          disabled
                        />
                      </div>

                      <div className="eq-form-group">
                        <label>
                          Ngày gửi trả
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
                          Tình trạng sau sử
                          dụng
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
                          Có hư hỏng
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
                              ? "Có"
                              : "Không"
                          }
                          disabled
                        />
                      </div>
                    </div>

                    {currentReturnRecord?.damageDescription && (
                      <div className="eq-form-group eq-form-group-highlight">

                        <label>
                          Mô tả hư hỏng
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
                        Ghi chú của người
                        trả
                      </label>

                      <textarea
                        className="eq-readonly-textarea"
                        value={
                          currentReturnRecord?.note ||
                          ""
                        }
                        disabled
                        rows={3}
                        placeholder="Không có ghi chú"
                      />

                    </div>

                    {currentReturnStatus ===
                      "pending" && (
                      <div className="eq-form-group">

                        <label>
                          Lý do từ chối
                          <span>
                            {" "}
                            (bắt buộc nếu
                            từ chối)
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
                          placeholder="Nhập lý do nếu thiết bị chưa đủ điều kiện nghiệm thu..."
                        />

                      </div>
                    )}

                    {currentReturnStatus ===
                      "rejected" &&
                      currentReturnRecord?.note && (
                        <div className="eq-form-group">

                          <label>
                            Lý do đã từ
                            chối
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
                          Yêu cầu này đã
                          được xác nhận
                          nghiệm thu
                          {currentReturnRecord?.confirmedAt
                            ? ` ngày ${formatDate(
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
                        Tình trạng thiết bị
                        sau sử dụng
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
                          Good - Tốt
                        </option>

                        <option value="Fair">
                          Fair - Khá
                        </option>

                        <option value="Poor">
                          Poor - Kém
                        </option>

                        <option value="Critical">
                          Critical - Nghiêm
                          trọng
                        </option>

                      </select>

                    </div>

                    {(returnCondition ===
                      "Poor" ||
                      returnCondition ===
                        "Critical") && (
                      <div className="eq-form-group">

                        <label>
                          Mô tả vấn đề
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
                          placeholder="Mô tả hư hỏng, lỗi hoặc vấn đề cần kiểm tra/bảo dưỡng..."
                        />

                      </div>
                    )}

                    <div className="eq-form-group">

                      <label>
                        Ghi chú
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
                        placeholder="Nhập ghi chú về quá trình sử dụng hoặc bàn giao..."
                      />

                    </div>

                    <div className="eq-modal-notice">

                      <span>
                        Sau khi gửi yêu
                        cầu, thiết bị sẽ ở
                        trạng thái{" "}
                        <strong>
                          Chờ xác nhận trả
                        </strong>
                        . Thiết bị chỉ được
                        xem là đã hoàn trả
                        sau khi Manager
                        nghiệm thu.
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
                    ? "Đóng"
                    : "Hủy"}
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
                          ? "Đang xử lý..."
                          : "Từ chối"}
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
                          ? "Đang xử lý..."
                          : "Xác nhận trả thiết bị"}
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
                      ? "Đang gửi..."
                      : isDamagedReturnFlow
                        ? "Gửi báo hỏng & trả thiết bị"
                        : "Gửi yêu cầu trả"}
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