import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  Eye,
  Pencil,
  Plus,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getEquipmentTypes,
} from "../../services/equipmentService";

import {
  getEquipmentCategories,
} from "../../services/equipmentCategoryService";

import {
  createEquipmentInstance,
  deleteEquipmentInstance,
  getEquipmentInstanceById,
  getEquipmentInstances,
  updateEquipmentInstance,
} from "../../services/equipmentInstanceService";

import type {
  EquipmentCategory,
  EquipmentType,
} from "../../types/equipment";

import type {
  EquipmentConditionLevel,
  EquipmentInstance,
  EquipmentInstanceRequest,
  EquipmentInstanceStatus,
} from "../../types/equipmentInstance";

import {
  usePopup,
} from "../../context/PopupContext";

import "./EquipmentList.css";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";

type TabType =
  | "instances"
  | "types"
  | "categories";

type Role =
  | "Admin"
  | "Manager"
  | "Researcher"
  | "Technician"
  | "Student"
  | "Seasonal";

type InstanceDialogMode =
  | "create"
  | "view"
  | "edit"
  | null;

interface InstanceFormState {
  equipmentTypeId: string;
  assetCode: string;
  serialNumber: string;
  totalUsageHours: string;
  lastMaintenanceDate: string;
  usageHoursSinceMaintenance: string;
  nextMaintenanceDate: string;
  conditionLevel: EquipmentConditionLevel;
  status: EquipmentInstanceStatus;
  effectiveMaintenanceIntervalHours: string;
  maintenanceCount: string;
  note: string;
}

const emptyInstanceForm: InstanceFormState = {
  equipmentTypeId: "",
  assetCode: "",
  serialNumber: "",
  totalUsageHours: "0",
  lastMaintenanceDate: "",
  usageHoursSinceMaintenance: "0",
  nextMaintenanceDate: "",
  conditionLevel: "Good",
  status: "Available",
  effectiveMaintenanceIntervalHours: "",
  maintenanceCount: "0",
  note: "",
};

const EQUIPMENT_CONDITIONS: EquipmentConditionLevel[] = [
  "Good",
  "Fair",
  "Poor",
  "Critical",
];

const EQUIPMENT_STATUSES: EquipmentInstanceStatus[] = [
  "Available",
  "Reserved",
  "InUse",
  "Maintenance",
  "Damaged",
  "Missing",
  "Returned",
];

function getErrorMessage(
  error: unknown
): string {
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
            errors?: Record<
              string,
              string[]
            >;
          };
        };
      }
    ).response;

    if (response?.data?.errors) {
      return Object.values(
        response.data.errors
      )
        .flat()
        .join(" ");
    }

    return (
      response?.data?.message ||
      response?.data?.error ||
      response?.data?.title ||
      "Unable to complete the request."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to complete the request.";
}

function getCategoryName(
  category: EquipmentCategory
): string {
  return (
    category.categoryName ||
    category.name ||
    `Category #${category.equipmentCategoryId}`
  );
}

function getTypeName(
  equipmentType: EquipmentType
): string {
  return (
    equipmentType.equipmentTypeName ||
    equipmentType.typeName ||
    equipmentType.name ||
    `Equipment type #${equipmentType.equipmentTypeId}`
  );
}

function getTypeCategoryName(
  equipmentType: EquipmentType
): string {
  return (
    equipmentType.equipmentCategoryName ||
    equipmentType.categoryName ||
    `Category #${equipmentType.equipmentCategoryId}`
  );
}

function getInstanceName(
  instance: EquipmentInstance
): string {
  return (
    instance.assetCode ||
    instance.equipmentTypeName ||
    instance.serialNumber ||
    `Equipment #${instance.equipmentInstanceId}`
  );
}

function getInstanceTypeName(
  instance: EquipmentInstance,
  types: EquipmentType[]
): string {
  if (instance.equipmentTypeName) {
    return instance.equipmentTypeName;
  }

  const equipmentType = types.find(
    (item) =>
      item.equipmentTypeId ===
      instance.equipmentTypeId
  );

  return equipmentType
    ? getTypeName(equipmentType)
    : `Equipment type #${instance.equipmentTypeId}`;
}

function getInstanceCategoryName(
  instance: EquipmentInstance,
  types: EquipmentType[],
  categories: EquipmentCategory[]
): string {
  const equipmentType = types.find(
    (item) =>
      item.equipmentTypeId ===
      instance.equipmentTypeId
  );

  if (!equipmentType) {
    return "-";
  }

  const category = categories.find(
    (item) =>
      item.equipmentCategoryId ===
      equipmentType.equipmentCategoryId
  );

  return category
    ? getCategoryName(category)
    : getTypeCategoryName(equipmentType);
}

function toDateInputValue(
  value?: string | null
): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toApiDateTime(
  value: string
): string | null {
  if (!value) {
    return null;
  }

  return `${value}T00:00:00`;
}

function statusLabel(
  status: EquipmentInstanceStatus
): string {
  if (status === "InUse") {
    return "In Use";
  }

  return status;
}

export default function EquipmentList() {
  const {
    showConfirm,
    showAlert,
  } = usePopup();

  const savedRole =
    localStorage.getItem("role");

  const role: Role =
    savedRole === "Admin" ||
    savedRole === "Manager" ||
    savedRole === "Researcher" ||
    savedRole === "Technician" ||
    savedRole === "Student" ||
    savedRole === "Seasonal"
      ? savedRole
      : "Seasonal";

  const canManage =
    role === "Admin" ||
    role === "Manager" ||
    role === "Researcher";

  const [
    activeTab,
    setActiveTab,
  ] = useState<TabType>(
    "instances"
  );

  const [
    instances,
    setInstances,
  ] = useState<EquipmentInstance[]>(
    []
  );

  const [
    types,
    setTypes,
  ] = useState<EquipmentType[]>(
    []
  );

  const [
    categories,
    setCategories,
  ] = useState<
    EquipmentCategory[]
  >([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    deletingId,
    setDeletingId,
  ] = useState<number | null>(
    null
  );

  const [
    error,
    setError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    dialogMode,
    setDialogMode,
  ] =
    useState<InstanceDialogMode>(
      null
    );

  const [
    selectedInstance,
    setSelectedInstance,
  ] =
    useState<EquipmentInstance | null>(
      null
    );

  const [
    form,
    setForm,
  ] =
    useState<InstanceFormState>(
      emptyInstanceForm
    );

  const [
    detailLoading,
    setDetailLoading,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const loadEquipmentData =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const [
          instanceData,
          typeData,
          categoryData,
        ] = await Promise.all([
          getEquipmentInstances({
            page: 1,
            size: 300,
          }),

          getEquipmentTypes({
            page: 1,
            size: 300,
          }),

          getEquipmentCategories({
            page: 1,
            size: 300,
          }),
        ]);

        setInstances(
          Array.isArray(
            instanceData
          )
            ? instanceData
            : []
        );

        setTypes(
          Array.isArray(typeData)
            ? typeData
            : []
        );

        setCategories(
          Array.isArray(
            categoryData
          )
            ? categoryData
            : []
        );
      } catch (loadError) {
        console.error(
          "Failed to load equipment data:",
          loadError
        );

        setError(
          getErrorMessage(
            loadError
          )
        );

        setInstances([]);
        setTypes([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadEquipmentData();
  }, [loadEquipmentData]);

  const normalizedSearch =
    search.trim().toLowerCase();

  const filteredInstances =
    useMemo(() => {
      if (!normalizedSearch) {
        return instances;
      }

      return instances.filter(
        (item) => {
          const searchableText = [
            getInstanceName(item),
            item.assetCode,
            getInstanceTypeName(
              item,
              types
            ),
            getInstanceCategoryName(
              item,
              types,
              categories
            ),
            item.serialNumber,
            item.status,
            item.conditionLevel,
            item.note,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            normalizedSearch
          );
        }
      );
    }, [
      instances,
      types,
      categories,
      normalizedSearch,
    ]);

  const filteredTypes =
    useMemo(() => {
      if (!normalizedSearch) {
        return types;
      }

      return types.filter(
        (item) => {
          const searchableText = [
            getTypeName(item),
            getTypeCategoryName(
              item
            ),
            item.trackingType,
            item.description,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            normalizedSearch
          );
        }
      );
    }, [
      types,
      normalizedSearch,
    ]);

  const filteredCategories =
    useMemo(() => {
      if (!normalizedSearch) {
        return categories;
      }

      return categories.filter(
        (item) => {
          const searchableText = [
            getCategoryName(item),
            item.description,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            normalizedSearch
          );
        }
      );
    }, [
      categories,
      normalizedSearch,
    ]);

  const resetInstanceDialog = () => {
    setDialogMode(null);
    setSelectedInstance(null);
    setForm(emptyInstanceForm);
    setDetailLoading(false);
    setSaving(false);
  };

  const fillFormFromInstance = (
    instance: EquipmentInstance
  ) => {
    setForm({
      equipmentTypeId:
        String(
          instance.equipmentTypeId
        ),

      assetCode:
        instance.assetCode || "",

      serialNumber:
        instance.serialNumber || "",

      totalUsageHours:
        String(
          instance.totalUsageHours ??
            instance.usageHours ??
            0
        ),

      lastMaintenanceDate:
        toDateInputValue(
          instance.lastMaintenanceDate
        ),

      usageHoursSinceMaintenance:
        String(
          instance.usageHoursSinceMaintenance ??
            0
        ),

      nextMaintenanceDate:
        toDateInputValue(
          instance.nextMaintenanceDate
        ),

      conditionLevel:
        EQUIPMENT_CONDITIONS.includes(
          instance.conditionLevel
        )
          ? instance.conditionLevel
          : "Good",

      status:
        EQUIPMENT_STATUSES.includes(
          instance.status
        )
          ? instance.status
          : "Available",

      effectiveMaintenanceIntervalHours:
        instance.effectiveMaintenanceIntervalHours ===
          null ||
        instance.effectiveMaintenanceIntervalHours ===
          undefined
          ? ""
          : String(
              instance.effectiveMaintenanceIntervalHours
            ),

      maintenanceCount:
        String(
          instance.maintenanceCount ??
            0
        ),

      note:
        instance.note || "",
    });
  };

  const openCreateDialog = () => {
    setError("");
    setSuccessMessage("");
    setSelectedInstance(null);

    setForm({
      ...emptyInstanceForm,
      equipmentTypeId:
        types.length > 0
          ? String(
              types[0]
                .equipmentTypeId
            )
          : "",
    });

    setDialogMode("create");
  };

  const openViewDialog = async (
    instance: EquipmentInstance
  ) => {
    try {
      setDetailLoading(true);
      setError("");
      setSuccessMessage("");
      setDialogMode("view");

      const detail =
        await getEquipmentInstanceById(
          instance.equipmentInstanceId
        );

      setSelectedInstance(
        detail
      );

      fillFormFromInstance(
        detail
      );
    } catch (detailError) {
      console.error(
        "Load equipment instance detail failed:",
        detailError
      );

      resetInstanceDialog();

      setError(
        getErrorMessage(
          detailError
        )
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const openEditDialog = async (
    instance: EquipmentInstance
  ) => {
    try {
      setDetailLoading(true);
      setError("");
      setSuccessMessage("");
      setDialogMode("edit");

      const detail =
        await getEquipmentInstanceById(
          instance.equipmentInstanceId
        );

      setSelectedInstance(
        detail
      );

      fillFormFromInstance(
        detail
      );
    } catch (detailError) {
      console.error(
        "Load equipment instance detail failed:",
        detailError
      );

      resetInstanceDialog();

      setError(
        getErrorMessage(
          detailError
        )
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const buildPayload =
    (): EquipmentInstanceRequest | null => {
      const equipmentTypeId =
        Number(
          form.equipmentTypeId
        );

      const totalUsageHours =
        Number(
          form.totalUsageHours
        );

      const usageHoursSinceMaintenance =
        Number(
          form.usageHoursSinceMaintenance
        );

      const maintenanceCount =
        Number(
          form.maintenanceCount
        );

      const effectiveMaintenanceIntervalHours =
        form.effectiveMaintenanceIntervalHours.trim()
          ? Number(
              form.effectiveMaintenanceIntervalHours
            )
          : null;

      if (
        !Number.isInteger(
          equipmentTypeId
        ) ||
        equipmentTypeId <= 0
      ) {
        setError(
          "Please select an equipment type."
        );

        return null;
      }

      if (!form.assetCode.trim()) {
        setError(
          "Asset code is required."
        );

        return null;
      }

      if (
        !Number.isFinite(
          totalUsageHours
        ) ||
        totalUsageHours < 0
      ) {
        setError(
          "Total usage hours must be 0 or greater."
        );

        return null;
      }

      if (
        !Number.isFinite(
          usageHoursSinceMaintenance
        ) ||
        usageHoursSinceMaintenance < 0
      ) {
        setError(
          "Usage hours since maintenance must be 0 or greater."
        );

        return null;
      }

      if (
        !Number.isInteger(
          maintenanceCount
        ) ||
        maintenanceCount < 0
      ) {
        setError(
          "Maintenance count must be 0 or greater."
        );

        return null;
      }

      if (
        effectiveMaintenanceIntervalHours !==
          null &&
        (
          !Number.isFinite(
            effectiveMaintenanceIntervalHours
          ) ||
          effectiveMaintenanceIntervalHours <
            0
        )
      ) {
        setError(
          "Effective maintenance interval must be 0 or greater."
        );

        return null;
      }

      return {
        equipmentTypeId,

        assetCode:
          form.assetCode.trim(),

        serialNumber:
          form.serialNumber.trim() ||
          null,

        totalUsageHours,

        lastMaintenanceDate:
          toApiDateTime(
            form.lastMaintenanceDate
          ),

        usageHoursSinceMaintenance,

        nextMaintenanceDate:
          toApiDateTime(
            form.nextMaintenanceDate
          ),

        conditionLevel:
          form.conditionLevel,

        status:
          dialogMode === "edit" &&
          selectedInstance
            ? selectedInstance.status
            : "Available",

        effectiveMaintenanceIntervalHours,

        maintenanceCount,

        note:
          form.note.trim() ||
          null,
      };
    };

  const handleInstanceSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      dialogMode !== "create" &&
      dialogMode !== "edit"
    ) {
      return;
    }

    const payload =
      buildPayload();

    if (!payload) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      if (
        dialogMode === "edit" &&
        selectedInstance
      ) {
        await updateEquipmentInstance(
          selectedInstance.equipmentInstanceId,
          payload
        );

        setSuccessMessage(
          "Equipment instance updated successfully."
        );
      } else {
        await createEquipmentInstance(
          payload
        );

        setSuccessMessage(
          "Equipment instance created successfully."
        );
      }

      resetInstanceDialog();

      await loadEquipmentData();
    } catch (submitError) {
      console.error(
        "Save equipment instance failed:",
        submitError
      );

      setError(
        getErrorMessage(
          submitError
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInstance =
    async (
      instance: EquipmentInstance
    ) => {
      if (
        !canManage ||
        deletingId !== null
      ) {
        return;
      }

      const instanceId =
        instance.equipmentInstanceId;

      if (
        !Number.isInteger(
          instanceId
        ) ||
        instanceId <= 0
      ) {
        setError(
          "Equipment instance ID is invalid."
        );

        return;
      }

      const confirmed =
        await showConfirm({
          title:
            "Delete Equipment Instance",

          message:
            `Are you sure you want to delete "${getInstanceName(
              instance
            )}"?`,

          confirmText:
            "Delete",

          cancelText:
            "Cancel",

          tone:
            "danger",
        });

      if (!confirmed) {
        return;
      }

      try {
        setDeletingId(
          instanceId
        );

        setError("");
        setSuccessMessage("");

        await deleteEquipmentInstance(
          instanceId
        );

        setInstances(
          (current) =>
            current.filter(
              (item) =>
                item.equipmentInstanceId !==
                instanceId
            )
        );

        setSuccessMessage(
          "Equipment instance deleted successfully."
        );
      } catch (deleteError) {
        console.error(
          "Delete equipment instance failed:",
          deleteError
        );

        setError(
          getErrorMessage(
            deleteError
          )
        );
      } finally {
        setDeletingId(null);
      }
    };

  const handleChangeTab = (
    tab: TabType
  ) => {
    setActiveTab(tab);
    setSearch("");
    setError("");
    setSuccessMessage("");
  };

  const selectedType =
    selectedInstance
      ? types.find(
          (item) =>
            item.equipmentTypeId ===
            selectedInstance.equipmentTypeId
        )
      : null;

  const selectedCategory =
    selectedType
      ? categories.find(
          (item) =>
            item.equipmentCategoryId ===
            selectedType.equipmentCategoryId
        )
      : null;


  const instancePagination = usePagination(filteredInstances, 10);

  const typePagination = usePagination(filteredTypes, 10);

  const categoryPagination = usePagination(filteredCategories, 10);

  return (
    <DashboardLayout>
      <div className="equipment-page">
        <div className="equipment-header">
          <div>
            <h1>
              Equipment Management
            </h1>

            <p>
              View equipment instances,
              equipment types and equipment
              categories.
            </p>
          </div>

          {canManage &&
            activeTab ===
              "instances" && (
              <button
                type="button"
                className="equipment-create-btn"
                onClick={
                  openCreateDialog
                }
              >
                <Plus size={16} />

                Add Equipment
              </button>
            )}
        </div>

        {error && (
          <div
            className="equipment-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {successMessage && (
          <div
            className="equipment-success"
            role="status"
          >
            {successMessage}
          </div>
        )}

        <div className="equipment-toolbar">
          <div className="equipment-tabs">
            <button
              type="button"
              className={
                activeTab ===
                "instances"
                  ? "active"
                  : ""
              }
              onClick={() =>
                handleChangeTab(
                  "instances"
                )
              }
            >
              Instances
            </button>

            <button
              type="button"
              className={
                activeTab === "types"
                  ? "active"
                  : ""
              }
              onClick={() =>
                handleChangeTab(
                  "types"
                )
              }
            >
              Types
            </button>

            <button
              type="button"
              className={
                activeTab ===
                "categories"
                  ? "active"
                  : ""
              }
              onClick={() =>
                handleChangeTab(
                  "categories"
                )
              }
            >
              Categories
            </button>
          </div>

          <input
            type="search"
            className="equipment-search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search equipment..."
          />
        </div>

        {loading ? (
          <div className="equipment-loading">
            Loading equipment data...
          </div>
        ) : (
          <>
            {activeTab ===
              "instances" && (
                <div className="equipment-table-card">
                  <h3>
                    Equipment Instances
                  </h3>

                  <div className="equipment-table-wrapper">
                    <table className="equipment-table">
                      <thead>
                        <tr>
                          <th>
                            Instance Name
                          </th>

                          <th>
                            Asset Code
                          </th>

                          <th>
                            Type
                          </th>

                          <th>
                            Category
                          </th>

                          <th>
                            Condition
                          </th>

                          <th>
                            Status
                          </th>

                          <th>
                            Serial Number
                          </th>

                          <th>
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {instancePagination.paginatedItems.map(
                          (item) => (
                            <tr
                              key={
                                item.equipmentInstanceId
                              }
                            >
                              <td>
                                {getInstanceName(
                                  item
                                )}
                              </td>

                              <td>
                                {item.assetCode ||
                                  "-"}
                              </td>

                              <td>
                                {getInstanceTypeName(
                                  item,
                                  types
                                )}
                              </td>

                              <td>
                                {getInstanceCategoryName(
                                  item,
                                  types,
                                  categories
                                )}
                              </td>

                              <td>
                                {item.conditionLevel ||
                                  "-"}
                              </td>

                              <td>
                                <span
                                  className={`equipment-status status-${(
                                    item.status ||
                                    "unknown"
                                  ).toLowerCase()}`}
                                >
                                  {statusLabel(
                                    item.status
                                  )}
                                </span>
                              </td>

                              <td>
                                {item.serialNumber ||
                                  "-"}
                              </td>

                              <td>
                                <div className="equipment-actions">
                                  <button
                                    type="button"
                                    className="action-btn-pill view"
                                    disabled={
                                      detailLoading
                                    }
                                    onClick={() =>
                                      void openViewDialog(
                                        item
                                      )
                                    }
                                  >
                                    <Eye
                                      size={
                                        12
                                      }
                                    />

                                    <span>
                                      View
                                    </span>
                                  </button>

                                  {canManage && (
                                    <>
                                      <button
                                        type="button"
                                        className="action-btn-pill edit"
                                        disabled={
                                          detailLoading
                                        }
                                        onClick={() =>
                                          void openEditDialog(
                                            item
                                          )
                                        }
                                      >
                                        <Pencil
                                          size={
                                            12
                                          }
                                        />

                                        <span>
                                          Edit
                                        </span>
                                      </button>

                                      <button
                                        type="button"
                                        className="action-btn-pill delete"
                                        disabled={
                                          deletingId ===
                                          item.equipmentInstanceId
                                        }
                                        onClick={() =>
                                          void handleDeleteInstance(
                                            item
                                          )
                                        }
                                      >
                                        <Trash2
                                          size={
                                            12
                                          }
                                        />

                                        <span>
                                          {deletingId ===
                                          item.equipmentInstanceId
                                            ? "Deleting..."
                                            : "Delete"}
                                        </span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        )}

                        {filteredInstances.length ===
                          0 && (
                          <tr>
                            <td
                              colSpan={
                                8
                              }
                              className="empty-cell"
                            >
                              No equipment
                              instances
                              found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                        <Pagination currentPage={instancePagination.currentPage} totalItems={filteredInstances.length} pageSize={instancePagination.pageSize} onPageChange={instancePagination.setCurrentPage} onPageSizeChange={instancePagination.setPageSize} />
                  </div>
                </div>
              )}

            {activeTab ===
              "types" && (
                <div className="equipment-table-card">
                  <h3>
                    Equipment Types
                  </h3>

                  <div className="equipment-table-wrapper">
                    <table className="equipment-table">
                      <thead>
                        <tr>
                          <th>
                            Type Name
                          </th>

                          <th>
                            Category
                          </th>

                          <th>
                            Tracking Type
                          </th>

                          <th>
                            Total Quantity
                          </th>

                          <th>
                            Description
                          </th>

                          <th>
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {typePagination.paginatedItems.map(
                          (item) => (
                            <tr
                              key={
                                item.equipmentTypeId
                              }
                            >
                              <td>
                                {getTypeName(
                                  item
                                )}
                              </td>

                              <td>
                                {getTypeCategoryName(
                                  item
                                )}
                              </td>

                              <td>
                                {item.trackingType ||
                                  "-"}
                              </td>

                              <td>
                                {item.totalQuantity ??
                                  0}
                              </td>

                              <td>
                                {item.description ||
                                  "-"}
                              </td>

                              <td>
                                <div className="equipment-actions">
                                  <button
                                    type="button"
                                    className="action-btn-pill view"
                                    onClick={() =>
                                      showAlert({
                                        title:
                                          "Equipment Type",

                                        message:
                                          `${getTypeName(
                                            item
                                          )}\nCategory: ${getTypeCategoryName(
                                            item
                                          )}\nTracking: ${item.trackingType || "-"}\nQuantity: ${item.totalQuantity ?? 0}\nDescription: ${item.description || "-"}`,
                                      })
                                    }
                                  >
                                    <Eye
                                      size={
                                        12
                                      }
                                    />

                                    <span>
                                      View
                                    </span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        )}

                        {filteredTypes.length ===
                          0 && (
                          <tr>
                            <td
                              colSpan={
                                6
                              }
                              className="empty-cell"
                            >
                              No equipment
                              types found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                        <Pagination currentPage={typePagination.currentPage} totalItems={filteredTypes.length} pageSize={typePagination.pageSize} onPageChange={typePagination.setCurrentPage} onPageSizeChange={typePagination.setPageSize} />
                  </div>
                </div>
              )}

            {activeTab ===
              "categories" && (
                <div className="equipment-table-card">
                  <h3>
                    Equipment Categories
                  </h3>

                  <div className="equipment-table-wrapper">
                    <table className="equipment-table">
                      <thead>
                        <tr>
                          <th>
                            Category Name
                          </th>

                          <th>
                            Description
                          </th>

                          <th>
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {categoryPagination.paginatedItems.map(
                          (item) => (
                            <tr
                              key={
                                item.equipmentCategoryId
                              }
                            >
                              <td>
                                {getCategoryName(
                                  item
                                )}
                              </td>

                              <td>
                                {item.description ||
                                  "-"}
                              </td>

                              <td>
                                <div className="equipment-actions">
                                  <button
                                    type="button"
                                    className="action-btn-pill view"
                                    onClick={() =>
                                      showAlert({
                                        title:
                                          "Equipment Category",

                                        message:
                                          `${getCategoryName(
                                            item
                                          )}\n${item.description || "No description."}`,
                                      })
                                    }
                                  >
                                    <Eye
                                      size={
                                        12
                                      }
                                    />

                                    <span>
                                      View
                                    </span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        )}

                        {filteredCategories.length ===
                          0 && (
                          <tr>
                            <td
                              colSpan={
                                3
                              }
                              className="empty-cell"
                            >
                              No equipment
                              categories
                              found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                        <Pagination currentPage={categoryPagination.currentPage} totalItems={filteredCategories.length} pageSize={categoryPagination.pageSize} onPageChange={categoryPagination.setCurrentPage} onPageSizeChange={categoryPagination.setPageSize} />
                  </div>
                </div>
              )}
          </>
        )}

        {dialogMode && (
          <div
            className="equipment-modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget &&
                !saving
              ) {
                resetInstanceDialog();
              }
            }}
          >
            <div className="equipment-modal">
              <div className="equipment-modal-header">
                <div>
                  <h2>
                    {dialogMode ===
                    "create"
                      ? "Add Equipment Instance"
                      : dialogMode ===
                          "edit"
                        ? "Edit Equipment Instance"
                        : "Equipment Instance Details"}
                  </h2>

                  <p>
                    {dialogMode ===
                    "view"
                      ? "View the latest equipment information from the API."
                      : "Manage equipment identity, condition, usage and maintenance information."}
                  </p>
                </div>

                <button
                  type="button"
                  className="equipment-modal-close"
                  onClick={
                    resetInstanceDialog
                  }
                  disabled={saving}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {detailLoading ? (
                <div className="equipment-modal-loading">
                  <RotateCw
                    size={20}
                    className="spin-icon"
                  />

                  Loading equipment
                  details...
                </div>
              ) : dialogMode ===
                  "view" &&
                selectedInstance ? (
                <>
                  <div className="equipment-detail-body">
                    <div className="equipment-detail-hero">
                      <div>
                        <span>
                          Asset Code
                        </span>

                        <strong>
                          {selectedInstance.assetCode ||
                            "-"}
                        </strong>
                      </div>

                      <span
                        className={`equipment-status status-${selectedInstance.status.toLowerCase()}`}
                      >
                        {statusLabel(
                          selectedInstance.status
                        )}
                      </span>
                    </div>

                    <div className="equipment-detail-grid">
                      <div>
                        <span>
                          Equipment Type
                        </span>

                        <strong>
                          {getInstanceTypeName(
                            selectedInstance,
                            types
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Category
                        </span>

                        <strong>
                          {selectedCategory
                            ? getCategoryName(
                                selectedCategory
                              )
                            : "-"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Serial Number
                        </span>

                        <strong>
                          {selectedInstance.serialNumber ||
                            "-"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Condition
                        </span>

                        <strong>
                          {selectedInstance.conditionLevel}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Total Usage Hours
                        </span>

                        <strong>
                          {selectedInstance.totalUsageHours ??
                            selectedInstance.usageHours ??
                            0}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Usage Since Maintenance
                        </span>

                        <strong>
                          {selectedInstance.usageHoursSinceMaintenance ??
                            0}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Last Maintenance
                        </span>

                        <strong>
                          {selectedInstance.lastMaintenanceDate
                            ? new Date(
                                selectedInstance.lastMaintenanceDate
                              ).toLocaleDateString(
                                "vi-VN"
                              )
                            : "-"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Next Maintenance
                        </span>

                        <strong>
                          {selectedInstance.nextMaintenanceDate
                            ? new Date(
                                selectedInstance.nextMaintenanceDate
                              ).toLocaleDateString(
                                "vi-VN"
                              )
                            : "-"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Maintenance Count
                        </span>

                        <strong>
                          {selectedInstance.maintenanceCount ??
                            0}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Effective Interval
                        </span>

                        <strong>
                          {selectedInstance.effectiveMaintenanceIntervalHours ??
                            "-"}
                        </strong>
                      </div>
                    </div>

                    <div className="equipment-detail-note">
                      <span>
                        Notes
                      </span>

                      <p>
                        {selectedInstance.note ||
                          "No notes."}
                      </p>
                    </div>
                  </div>

                  <div className="equipment-modal-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={
                        resetInstanceDialog
                      }
                    >
                      Close
                    </button>

                    {canManage && (
                      <button
                        type="button"
                        className="primary"
                        onClick={() => {
                          setDialogMode(
                            "edit"
                          );

                          fillFormFromInstance(
                            selectedInstance
                          );
                        }}
                      >
                        <Pencil
                          size={
                            14
                          }
                        />

                        Edit
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <form
                  onSubmit={
                    handleInstanceSubmit
                  }
                >
                  <div className="equipment-modal-form">
                    <div className="equipment-form-group">
                      <label htmlFor="equipmentTypeId">
                        Equipment Type
                        <span>
                          *
                        </span>
                      </label>

                      <select
                        id="equipmentTypeId"
                        value={
                          form.equipmentTypeId
                        }
                        onChange={(event) =>
                          setForm(
                            (
                              current
                            ) => ({
                              ...current,

                              equipmentTypeId:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                        disabled={
                          saving
                        }
                        required
                      >
                        <option value="">
                          Select equipment
                          type
                        </option>

                        {types.map(
                          (
                            item
                          ) => (
                            <option
                              key={
                                item.equipmentTypeId
                              }
                              value={
                                item.equipmentTypeId
                              }
                            >
                              {getTypeName(
                                item
                              )}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="equipment-form-group">
                      <label htmlFor="assetCode">
                        Asset Code
                        <span>
                          *
                        </span>
                      </label>

                      <input
                        id="assetCode"
                        value={
                          form.assetCode
                        }
                        onChange={(event) =>
                          setForm(
                            (
                              current
                            ) => ({
                              ...current,

                              assetCode:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                        placeholder="E.g., EQ-TRAC-001"
                        disabled={
                          saving
                        }
                        required
                      />
                    </div>

                    <div className="equipment-form-group">
                      <label htmlFor="serialNumber">
                        Serial Number
                      </label>

                      <input
                        id="serialNumber"
                        value={
                          form.serialNumber
                        }
                        onChange={(event) =>
                          setForm(
                            (
                              current
                            ) => ({
                              ...current,

                              serialNumber:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                        placeholder="E.g., SN-001"
                        disabled={
                          saving
                        }
                      />
                    </div>

                    <div className="equipment-form-group">
                      <label htmlFor="conditionLevel">
                        Condition
                        <span>
                          *
                        </span>
                      </label>

                      <select
                        id="conditionLevel"
                        value={
                          form.conditionLevel
                        }
                        onChange={(event) =>
                          setForm(
                            (
                              current
                            ) => ({
                              ...current,

                              conditionLevel:
                                event
                                  .target
                                  .value as EquipmentConditionLevel,
                            })
                          )
                        }
                        disabled={
                          saving
                        }
                        required
                      >
                        {EQUIPMENT_CONDITIONS.map(
                          (
                            condition
                          ) => (
                            <option
                              key={
                                condition
                              }
                              value={
                                condition
                              }
                            >
                              {
                                condition
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="equipment-form-group">
                      <label htmlFor="totalUsageHours">
                        Total Usage Hours
                        <span>
                          *
                        </span>
                      </label>

                      <input
                        id="totalUsageHours"
                        type="number"
                        min="0"
                        step="0.5"
                        value={
                          form.totalUsageHours
                        }
                        onChange={(event) =>
                          setForm(
                            (
                              current
                            ) => ({
                              ...current,

                              totalUsageHours:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                        disabled={
                          saving
                        }
                        required
                      />
                    </div>

                    <div className="equipment-form-group">
                      <label htmlFor="usageHoursSinceMaintenance">
                        Hours Since
                        Maintenance
                      </label>

                      <input
                        id="usageHoursSinceMaintenance"
                        type="number"
                        min="0"
                        step="0.5"
                        value={
                          form.usageHoursSinceMaintenance
                        }
                        onChange={(event) =>
                          setForm(
                            (
                              current
                            ) => ({
                              ...current,

                              usageHoursSinceMaintenance:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                        disabled={
                          saving
                        }
                      />
                    </div>

                    <div className="equipment-form-group">
                      <label htmlFor="maintenanceCount">
                        Maintenance
                        Count
                      </label>

                      <input
                        id="maintenanceCount"
                        type="number"
                        min="0"
                        step="1"
                        value={
                          form.maintenanceCount
                        }
                        onChange={(event) =>
                          setForm(
                            (
                              current
                            ) => ({
                              ...current,

                              maintenanceCount:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                        disabled={
                          saving
                        }
                      />
                    </div>

                    <div className="equipment-form-group">
                      <label htmlFor="lastMaintenanceDate">
                        Last Maintenance
                      </label>

                      <input
                        id="lastMaintenanceDate"
                        type="date"
                        value={
                          form.lastMaintenanceDate
                        }
                        max={
                          form.nextMaintenanceDate ||
                          undefined
                        }
                        onClick={(event) => {
                          if (!saving) {
                            event.currentTarget.showPicker?.();
                          }
                        }}
                        onChange={(event) => {
                          const value =
                            event.target.value;

                          setForm(
                            (
                              current
                            ) => ({
                              ...current,
                              lastMaintenanceDate:
                                value,
                              nextMaintenanceDate:
                                current.nextMaintenanceDate &&
                                value &&
                                current.nextMaintenanceDate <
                                  value
                                  ? ""
                                  : current.nextMaintenanceDate,
                            })
                          );
                        }}
                        disabled={
                          saving
                        }
                      />
                    </div>

                    <div className="equipment-form-group">
                      <label htmlFor="nextMaintenanceDate">
                        Next Maintenance
                      </label>

                      <input
                        id="nextMaintenanceDate"
                        type="date"
                        min={
                          form.lastMaintenanceDate ||
                          undefined
                        }
                        value={
                          form.nextMaintenanceDate
                        }
                        onClick={(event) => {
                          if (!saving) {
                            event.currentTarget.showPicker?.();
                          }
                        }}
                        onChange={(event) =>
                          setForm(
                            (
                              current
                            ) => ({
                              ...current,
                              nextMaintenanceDate:
                                event.target.value,
                            })
                          )
                        }
                        disabled={
                          saving
                        }
                      />
                    </div>

                    <div className="equipment-form-group equipment-form-full">
                      <label htmlFor="effectiveMaintenanceIntervalHours">
                        Effective
                        Maintenance
                        Interval Hours
                      </label>

                      <input
                        id="effectiveMaintenanceIntervalHours"
                        type="number"
                        min="0"
                        step="0.5"
                        value={
                          form.effectiveMaintenanceIntervalHours
                        }
                        onChange={(event) =>
                          setForm(
                            (
                              current
                            ) => ({
                              ...current,

                              effectiveMaintenanceIntervalHours:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                        placeholder="Optional"
                        disabled={
                          saving
                        }
                      />
                    </div>

                    <div className="equipment-form-group equipment-form-full">
                      <label htmlFor="note">
                        Notes
                      </label>

                      <textarea
                        id="note"
                        rows={4}
                        value={
                          form.note
                        }
                        onChange={(event) =>
                          setForm(
                            (
                              current
                            ) => ({
                              ...current,

                              note:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                        placeholder="Maintenance notes or other equipment information..."
                        disabled={
                          saving
                        }
                      />
                    </div>
                  </div>

                  <div className="equipment-modal-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={
                        resetInstanceDialog
                      }
                      disabled={
                        saving
                      }
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="primary"
                      disabled={
                        saving
                      }
                    >
                      {saving ? (
                        <>
                          <RotateCw
                            size={
                              14
                            }
                            className="spin-icon"
                          />

                          Saving...
                        </>
                      ) : dialogMode ===
                        "edit" ? (
                        "Save Changes"
                      ) : (
                        "Create Equipment"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
