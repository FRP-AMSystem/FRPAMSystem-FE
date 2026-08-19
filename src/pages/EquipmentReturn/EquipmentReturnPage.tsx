import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowDownRight,
  CheckCircle2,
  Cpu,
  Layers,
  PackageCheck,
  RotateCcw,
  Search,
  Sparkles,
  Truck,
  XCircle,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import ToastPopup, { type ToastType } from "../../components/common/ToastPopup";

import {
  getMyAllocationEquipmentDetails,
  getAllocationEquipmentDetails,
  handoverEquipmentDetail,
  returnEquipmentDetail,
} from "../../services/allocationDetailService";

import { getStoredRole } from "../../config/rolePermissions";

import type { AllocationEquipmentDetail } from "../../types/allocationDetail";
import type { EquipmentConditionLevel } from "../../types/equipmentInstance";

import "./EquipmentReturnPage.css";

type TabFilter = "all" | "inuse" | "allocated" | "completed";

function formatDate(val?: string | null): string {
  if (!val) return "-";
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? val : d.toLocaleDateString("vi-VN");
}

export default function EquipmentReturnPage() {
  const role = getStoredRole();
  const isManager = role === "Manager" || role === "Admin";
  const isFieldStaff = role === "Seasonal" || role === "Technician" || role === "Student";

  const [items, setItems] = useState<AllocationEquipmentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tabFilter, setTabFilter] = useState<TabFilter>("all");

  // Action Modals
  const [returnModalItem, setReturnModalItem] = useState<AllocationEquipmentDetail | null>(null);
  const [handoverModalItem, setHandoverModalItem] = useState<AllocationEquipmentDetail | null>(null);
  const [returnCondition, setReturnCondition] = useState<EquipmentConditionLevel>("Good");
  const [returnNotes, setReturnNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{
    visible: boolean;
    type: ToastType;
    title?: string;
    message: string;
  }>({
    visible: false,
    type: "error",
    message: "",
  });

  const showToast = (message: string, type: ToastType = "error", title?: string) => {
    setToast({
      visible: true,
      type,
      title:
        title ||
        (type === "error"
          ? "Lỗi xử lý"
          : type === "success"
          ? "Thành công"
          : "Thông báo"),
      message,
    });
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      let list: AllocationEquipmentDetail[] = [];
      
      if (isManager) {
        // Manager loads all allocated equipment across plans to inspect and confirm returns
        list = await getAllocationEquipmentDetails({ size: 400 });
      } else {
        // Field staff loads equipment assigned to their experiments
        try {
          list = await getMyAllocationEquipmentDetails({ size: 400 });
        } catch {
          list = await getAllocationEquipmentDetails({ size: 400 });
        }

        if (!Array.isArray(list) || list.length === 0) {
          const allList = await getAllocationEquipmentDetails({ size: 400 }).catch(() => []);
          if (allList.length > 0) {
            list = allList;
          }
        }
      }

      setItems(list || []);
    } catch (err: any) {
      showToast(err?.message || "Không thể tải danh sách thiết bị.", "error");
    } finally {
      setLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Calculations
  const stats = useMemo(() => {
    const total = items.length;
    const inUse = items.filter((i) => i.status === "InUse").length;
    const allocated = items.filter(
      (i) => i.status === "Allocated" || i.status === "Reserved" || !i.status
    ).length;
    const completed = items.filter((i) => i.status === "Completed").length;
    return { total, inUse, allocated, completed };
  }, [items]);

  // Filtering
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const status = item.status || "Allocated";
      const matchesTab =
        tabFilter === "all" ||
        (tabFilter === "inuse" && status === "InUse") ||
        (tabFilter === "allocated" && (status === "Allocated" || status === "Reserved")) ||
        (tabFilter === "completed" && status === "Completed");

      if (!matchesTab) return false;

      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase();
      const name = (item.allocatedEquipmentTypeName || "").toLowerCase();
      const instName = (item.equipmentInstanceName || "").toLowerCase();
      const code = (item.assetCode || "").toLowerCase();
      const serial = (item.serialNumber || "").toLowerCase();
      const exp = (item.experimentName || "").toLowerCase();
      const phase = (item.phaseName || "").toLowerCase();

      return (
        name.includes(q) ||
        instName.includes(q) ||
        code.includes(q) ||
        serial.includes(q) ||
        exp.includes(q) ||
        phase.includes(q)
      );
    });
  }, [items, tabFilter, searchTerm]);

  // Handover Execution (Seasonal / Technician)
  const handleConfirmHandover = async () => {
    if (!handoverModalItem) return;
    try {
      setActionLoading(true);
      await handoverEquipmentDetail(handoverModalItem.allocationEquipmentDetailId);
      showToast(
        `Đã tiếp nhận thiết bị "${handoverModalItem.equipmentInstanceName || handoverModalItem.assetCode || "thiết bị"}" vào sử dụng (InUse)!`,
        "success",
        "Tiếp nhận thiết bị thành công"
      );
      setHandoverModalItem(null);
      await loadData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Không thể tiếp nhận thiết bị.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Return / Confirmation Execution
  const handleConfirmReturn = async () => {
    if (!returnModalItem) return;
    try {
      setActionLoading(true);
      await returnEquipmentDetail(returnModalItem.allocationEquipmentDetailId, returnNotes);
      
      if (isManager) {
        showToast(
          `Đã xác nhận nghiệm thu và nhận thiết bị "${returnModalItem.equipmentInstanceName || returnModalItem.assetCode || "thiết bị"}" về kho (Available)!`,
          "success",
          "Xác nhận trả thiết bị thành công"
        );
      } else {
        showToast(
          `Đã bàn giao trả thiết bị "${returnModalItem.equipmentInstanceName || returnModalItem.assetCode || "thiết bị"}" về kho thành công!`,
          "success",
          "Trả thiết bị thành công"
        );
      }

      setReturnModalItem(null);
      setReturnNotes("");
      await loadData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Không thể thực hiện thao tác hoàn trả.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="equipment-return-page">
        {/* Header */}
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
                ? "Kiểm tra nghiệm thu và xác nhận tiếp nhận hoàn trả máy móc, thiết bị thực địa từ Kỹ thuật viên (Technician) và Thời vụ (Seasonal) về lại kho tài nguyên."
                : "Danh sách máy móc và trang thiết bị thực địa được phân bổ cho các ca làm việc và đề tài của bạn. Thực hiện tiếp nhận máy và gửi trả thiết bị sau khi hoàn thành nhiệm vụ."}
            </p>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="eq-return-stats-grid">
          <div className="eq-return-stat-card">
            <div className="eq-stat-icon-wrapper eq-stat-icon-all">
              <Cpu size={22} />
            </div>
            <div className="eq-stat-info">
              <span className="eq-stat-label">
                {isManager ? "Tổng thiết bị phân bổ" : "Tổng thiết bị được giao"}
              </span>
              <span className="eq-stat-value">{stats.total}</span>
            </div>
          </div>

          <div className="eq-return-stat-card">
            <div className="eq-stat-icon-wrapper eq-stat-icon-inuse">
              {isManager ? <PackageCheck size={22} /> : <RotateCcw size={22} />}
            </div>
            <div className="eq-stat-info">
              <span className="eq-stat-label">
                {isManager ? "Cần xác nhận trả (In Use)" : "Đang sử dụng (Cần trả)"}
              </span>
              <span className="eq-stat-value" style={{ color: isManager ? "#059669" : "#dc2626" }}>
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
                {isManager ? "Chờ nhân viên nhận máy" : "Chờ tiếp nhận máy"}
              </span>
              <span className="eq-stat-value" style={{ color: "#2563eb" }}>
                {stats.allocated}
              </span>
            </div>
          </div>

          <div className="eq-return-stat-card">
            <div className="eq-stat-icon-wrapper eq-stat-icon-completed">
              <CheckCircle2 size={22} />
            </div>
            <div className="eq-stat-info">
              <span className="eq-stat-label">
                {isManager ? "Đã nghiệm thu nhập kho" : "Đã hoàn trả về kho"}
              </span>
              <span className="eq-stat-value" style={{ color: "#16a34a" }}>
                {stats.completed}
              </span>
            </div>
          </div>
        </div>

        {/* Controls & Search */}
        <div className="eq-return-controls">
          <div className="eq-return-search-box">
            <Search className="eq-return-search-icon" size={17} />
            <input
              type="text"
              placeholder="Tìm theo tên máy, mã tài sản, số serial, đề tài, giai đoạn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="eq-return-search-input"
            />
          </div>

          <div className="eq-return-filter-tabs">
            <button
              type="button"
              className={`eq-return-tab-btn ${tabFilter === "all" ? "active" : ""}`}
              onClick={() => setTabFilter("all")}
            >
              Tất cả <span className="eq-tab-counter">{stats.total}</span>
            </button>
            <button
              type="button"
              className={`eq-return-tab-btn ${tabFilter === "inuse" ? "active" : ""}`}
              onClick={() => setTabFilter("inuse")}
            >
              {isManager ? "Cần xác nhận trả" : "Đang sử dụng (Cần trả)"}{" "}
              <span className="eq-tab-counter">{stats.inUse}</span>
            </button>
            <button
              type="button"
              className={`eq-return-tab-btn ${tabFilter === "allocated" ? "active" : ""}`}
              onClick={() => setTabFilter("allocated")}
            >
              {isManager ? "Chờ giao máy" : "Chờ nhận máy"}{" "}
              <span className="eq-tab-counter">{stats.allocated}</span>
            </button>
            <button
              type="button"
              className={`eq-return-tab-btn ${tabFilter === "completed" ? "active" : ""}`}
              onClick={() => setTabFilter("completed")}
            >
              {isManager ? "Đã nhập kho" : "Đã hoàn trả"}{" "}
              <span className="eq-tab-counter">{stats.completed}</span>
            </button>
          </div>
        </div>

        {/* Table Card */}
        <div className="eq-return-table-card">
          {loading ? (
            <div className="eq-empty-state">
              <p>Đang tải danh sách thiết bị...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="eq-empty-state">
              <Cpu size={40} color="#cbd5e1" style={{ margin: "0 auto 12px" }} />
              <h3>Không tìm thấy thiết bị nào</h3>
              <p>Không có trang thiết bị nào phù hợp với bộ lọc hiện tại của bạn.</p>
            </div>
          ) : (
            <table className="eq-return-table">
              <thead>
                <tr>
                  <th>Tên thiết bị & Mã tài sản</th>
                  <th>Loại thiết bị</th>
                  <th>Đề tài & Giai đoạn</th>
                  <th>Thời hạn phân bổ</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: "right" }}>
                    {isManager ? "Thao tác Quản lý" : "Thao tác"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const status = item.status || "Allocated";
                  const isAllocated = status === "Allocated" || status === "Reserved";
                  const isInUse = status === "InUse";
                  const isCompleted = status === "Completed";

                  return (
                    <tr key={item.allocationEquipmentDetailId}>
                      <td>
                        <div className="eq-name-title">
                          {item.equipmentInstanceName || item.assetCode || "Máy thực địa"}
                        </div>
                        <div className="eq-asset-code">
                          Mã tài sản: <strong>{item.assetCode || "Chưa gán mã"}</strong>
                          {item.serialNumber && ` • S/N: ${item.serialNumber}`}
                        </div>
                      </td>

                      <td>{item.allocatedEquipmentTypeName || "Thiết bị tiêu chuẩn"}</td>

                      <td>
                        <div className="eq-experiment-tag">
                          {item.experimentName || `Allocation #${item.allocationPlanId}`}
                        </div>
                        {item.phaseName && (
                          <div className="eq-phase-tag">
                            <Layers size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                            {item.phaseName}
                          </div>
                        )}
                      </td>

                      <td>
                        {formatDate(item.startDate)} → {formatDate(item.endDate)}
                      </td>

                      <td>
                        {isInUse ? (
                          <span className="eq-badge eq-badge-inuse">
                            <Sparkles size={11} /> Đang sử dụng
                          </span>
                        ) : isCompleted ? (
                          <span className="eq-badge eq-badge-completed">
                            <CheckCircle2 size={11} /> {isManager ? "Đã nhập kho" : "Đã hoàn trả"}
                          </span>
                        ) : (
                          <span className="eq-badge eq-badge-allocated">
                            <Truck size={11} /> Chờ nhận máy
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        {/* Allocating State */}
                        {isAllocated && (
                          isManager ? (
                            <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                              Chờ nhân viên nhận
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="eq-btn-handover"
                              onClick={() => setHandoverModalItem(item)}
                              title="Xác nhận tiếp nhận thiết bị vào ca làm việc"
                            >
                              <ArrowDownRight size={13} /> Nhận thiết bị
                            </button>
                          )
                        )}

                        {/* In Use State: Differentiated by Role */}
                        {isInUse && (
                          isManager ? (
                            <button
                              type="button"
                              className="eq-btn-confirm-return"
                              onClick={() => {
                                setReturnModalItem(item);
                                setReturnCondition("Good");
                                setReturnNotes("");
                              }}
                              title="Manager xác nhận nghiệm thu và tiếp nhận máy về kho"
                            >
                              <PackageCheck size={13} /> Xác nhận trả thiết bị
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="eq-btn-return"
                              onClick={() => {
                                setReturnModalItem(item);
                                setReturnCondition("Good");
                                setReturnNotes("");
                              }}
                              title="Nhân viên gửi trả thiết bị về kho sau ca làm việc"
                            >
                              <RotateCcw size={13} /> Trả thiết bị
                            </button>
                          )
                        )}

                        {/* Completed State */}
                        {isCompleted && (
                          <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                            {isManager ? "Đã nhập kho" : "Hoàn tất"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal: Nhận thiết bị (Field Staff) */}
        {handoverModalItem && (
          <div className="eq-modal-backdrop" onClick={() => !actionLoading && setHandoverModalItem(null)}>
            <div className="eq-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="eq-modal-header">
                <h3>
                  <PackageCheck size={18} color="#16a34a" /> Tiếp nhận thiết bị vào ca làm việc
                </h3>
                <button
                  type="button"
                  className="eq-modal-close-btn"
                  onClick={() => !actionLoading && setHandoverModalItem(null)}
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="eq-modal-body">
                <p style={{ margin: "0 0 10px", color: "#334155" }}>
                  Bạn đang xác nhận tiếp nhận máy móc để phục vụ nhiệm vụ thực địa:
                </p>

                <div className="eq-modal-info-box">
                  <div className="eq-modal-info-row">
                    <span>Tên thiết bị:</span>
                    <strong>{handoverModalItem.equipmentInstanceName || "Máy thực địa"}</strong>
                  </div>
                  <div className="eq-modal-info-row">
                    <span>Mã tài sản:</span>
                    <strong>{handoverModalItem.assetCode || "N/A"}</strong>
                  </div>
                  <div className="eq-modal-info-row">
                    <span>Đề tài / Giai đoạn:</span>
                    <strong>{handoverModalItem.experimentName || `Plan #${handoverModalItem.allocationPlanId}`}</strong>
                  </div>
                  <div className="eq-modal-info-row">
                    <span>Thời hạn phân bổ:</span>
                    <strong>{formatDate(handoverModalItem.startDate)} → {formatDate(handoverModalItem.endDate)}</strong>
                  </div>
                </div>

                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 12px", borderRadius: "8px", fontSize: "12.5px", color: "#166534" }}>
                  💡 Sau khi nhận máy, trạng thái thiết bị sẽ chuyển sang <strong>In Use (Đang sử dụng)</strong>.
                </div>
              </div>

              <div className="eq-modal-footer">
                <button
                  type="button"
                  className="eq-modal-btn-cancel"
                  onClick={() => setHandoverModalItem(null)}
                  disabled={actionLoading}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="eq-modal-btn-handover"
                  onClick={() => void handleConfirmHandover()}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Đang xử lý..." : "Xác nhận nhận thiết bị"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Trả thiết bị / Xác nhận trả thiết bị */}
        {returnModalItem && (
          <div className="eq-modal-backdrop" onClick={() => !actionLoading && setReturnModalItem(null)}>
            <div className="eq-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="eq-modal-header">
                <h3>
                  {isManager ? (
                    <>
                      <PackageCheck size={18} color="#16a34a" /> Xác nhận Nghiệm thu & Nhận trả thiết bị về kho
                    </>
                  ) : (
                    <>
                      <RotateCcw size={18} color="#dc2626" /> Bàn giao trả thiết bị sau khi sử dụng
                    </>
                  )}
                </h3>
                <button
                  type="button"
                  className="eq-modal-close-btn"
                  onClick={() => !actionLoading && setReturnModalItem(null)}
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="eq-modal-body">
                <p style={{ margin: "0 0 10px", color: "#334155" }}>
                  {isManager
                    ? "Quản lý / Thủ kho thực hiện kiểm tra nghiệm thu tình trạng máy khi thu hồi về kho:"
                    : "Bàn giao hoàn trả thiết bị từ thực địa về lại cho Quản lý / Kho thiết bị:"}
                </p>

                <div className="eq-modal-info-box">
                  <div className="eq-modal-info-row">
                    <span>Tên thiết bị:</span>
                    <strong>{returnModalItem.equipmentInstanceName || "Máy thực địa"}</strong>
                  </div>
                  <div className="eq-modal-info-row">
                    <span>Mã tài sản:</span>
                    <strong>{returnModalItem.assetCode || "N/A"}</strong>
                  </div>
                  <div className="eq-modal-info-row">
                    <span>Trạng thái hiện tại:</span>
                    <strong style={{ color: "#059669" }}>In Use (Đang sử dụng)</strong>
                  </div>
                </div>

                <div className="eq-modal-field">
                  <label>Tình trạng thiết bị khi nghiệm thu thu hồi:</label>
                  <select
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value as EquipmentConditionLevel)}
                  >
                    <option value="Good">Hoạt động tốt (Good)</option>
                    <option value="Normal">Bình thường (Normal)</option>
                    <option value="NeedMaintenance">Cần bảo dưỡng định kỳ (Need Maintenance)</option>
                    <option value="Broken">Hỏng hóc / Cần sửa chữa (Broken)</option>
                  </select>
                </div>

                <div className="eq-modal-field">
                  <label>Ghi chú kiểm tra & Biên bản bàn giao trả:</label>
                  <textarea
                    rows={3}
                    placeholder="Ghi nhận tình trạng pin, phụ kiện, vệ sinh máy, sự cố phát sinh..."
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                  />
                </div>

                <div style={{ background: isManager ? "#f0fdf4" : "#fef2f2", border: `1px solid ${isManager ? "#bbf7d0" : "#fecaca"}`, padding: "10px 12px", borderRadius: "8px", fontSize: "12.5px", color: isManager ? "#166534" : "#991b1b" }}>
                  {isManager ? (
                    <>
                      💡 Thiết bị sau khi xác nhận sẽ được thu hồi về kho và chuyển sang trạng thái <strong>Available (Sẵn sàng)</strong> để phân bổ cho các đề tài khác.
                    </>
                  ) : (
                    <>
                      ⚠️ Thiết bị sẽ hoàn tất phân bổ (Completed) và trạng thái trong kho sẽ chuyển thành <strong>Available (Sẵn sàng)</strong>.
                    </>
                  )}
                </div>
              </div>

              <div className="eq-modal-footer">
                <button
                  type="button"
                  className="eq-modal-btn-cancel"
                  onClick={() => setReturnModalItem(null)}
                  disabled={actionLoading}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className={isManager ? "eq-modal-btn-handover" : "eq-modal-btn-confirm"}
                  onClick={() => void handleConfirmReturn()}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    "Đang xử lý..."
                  ) : isManager ? (
                    <>
                      <CheckCircle2 size={15} /> Xác nhận trả thiết bị
                    </>
                  ) : (
                    <>
                      <RotateCcw size={15} /> Gửi trả thiết bị
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Toast */}
        <ToastPopup
          visible={toast.visible}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
        />
      </div>
    </DashboardLayout>
  );
}
