import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getEquipmentTypes,
} from "../../services/equipmentService";

import {
  getEquipmentCategories,
} from "../../services/equipmentCategoryService";

import {
  deleteEquipmentInstance,
  getEquipmentInstances,
} from "../../services/equipmentInstanceService";

import type {
  EquipmentCategory,
  EquipmentInstance,
  EquipmentType,
} from "../../types/equipment";

import "./EquipmentList.css";

type TabType =
  | "instances"
  | "types"
  | "categories";

type Role =
  | "Manager"
  | "Researcher"
  | "Technician"
  | "Student";

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
            title?: string;
            errors?: Record<
              string,
              string[]
            >;
          };
        };
      }
    ).response;

    if (
      response?.data?.message
    ) {
      return response.data.message;
    }

    if (
      response?.data?.errors
    ) {
      return Object.values(
        response.data.errors
      )
        .flat()
        .join(" ");
    }

    if (
      response?.data?.title
    ) {
      return response.data.title;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Failed to load equipment data.";
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
    instance.instanceName ||
    instance.assetCode ||
    instance.code ||
    instance.equipmentTypeName ||
    instance.typeName ||
    `Equipment #${instance.equipmentInstanceId}`
  );
}

function getInstanceCode(
  instance: EquipmentInstance
): string {
  return (
    instance.assetCode ||
    instance.code ||
    "-"
  );
}

function getInstanceTypeName(
  instance: EquipmentInstance
): string {
  return (
    instance.equipmentTypeName ||
    instance.typeName ||
    `Equipment type #${instance.equipmentTypeId}`
  );
}

function getInstanceCategoryName(
  instance: EquipmentInstance
): string {
  if (
    instance.equipmentCategoryName
  ) {
    return instance.equipmentCategoryName;
  }

  if (
    instance.equipmentCategoryId
  ) {
    return `Category #${instance.equipmentCategoryId}`;
  }

  return "-";
}

export default function EquipmentList() {
  const savedRole =
    localStorage.getItem("role");

  const role: Role =
    savedRole === "Manager" ||
    savedRole === "Researcher" ||
    savedRole === "Technician" ||
    savedRole === "Student"
      ? savedRole
      : "Student";

  const [
    activeTab,
    setActiveTab,
  ] = useState<TabType>(
    "instances"
  );

  const [
    instances,
    setInstances,
  ] = useState<
    EquipmentInstance[]
  >([]);

  const [
    types,
    setTypes,
  ] = useState<
    EquipmentType[]
  >([]);

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

  const canManage =
    role === "Researcher";

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
            size: 100,
          }),

          getEquipmentTypes({
            page: 1,
            size: 100,
          }),

          getEquipmentCategories({
            page: 1,
            size: 100,
          }),
        ]);

        setInstances(
          Array.isArray(instanceData)
            ? instanceData
            : []
        );

        setTypes(
          Array.isArray(typeData)
            ? typeData
            : []
        );

        setCategories(
          Array.isArray(categoryData)
            ? categoryData
            : []
        );
      } catch (loadError) {
        console.error(
          "Failed to load equipment data:",
          loadError
        );

        setError(
          getErrorMessage(loadError)
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
            getInstanceCode(item),
            getInstanceTypeName(item),
            getInstanceCategoryName(item),
            item.serialNumber,
            item.status,
            item.conditionLevel,
            item.location,
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
        window.confirm(
          `Delete "${getInstanceName(
            instance
          )}"?`
        );

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

          {canManage && (
            <button
              type="button"
              className="equipment-create-btn"
              onClick={() => {
                window.alert(
                  "The create equipment form will be added in the next step."
                );
              }}
            >
              + Add Equipment
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
                        <th>ID</th>
                        <th>
                          Instance Name
                        </th>
                        <th>
                          Asset Code
                        </th>
                        <th>Type</th>
                        <th>
                          Category
                        </th>
                        <th>
                          Condition
                        </th>
                        <th>Status</th>
                        <th>
                          Serial Number
                        </th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredInstances.map(
                        (item) => (
                          <tr
                            key={
                              item.equipmentInstanceId
                            }
                          >
                            <td>
                              #
                              {
                                item.equipmentInstanceId
                              }
                            </td>

                            <td>
                              {getInstanceName(
                                item
                              )}
                            </td>

                            <td>
                              {getInstanceCode(
                                item
                              )}
                            </td>

                            <td>
                              {getInstanceTypeName(
                                item
                              )}
                            </td>

                            <td>
                              {getInstanceCategoryName(
                                item
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
                                {item.status ||
                                  "Unknown"}
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
                                  onClick={() => {
                                    window.alert(
                                      `Equipment instance #${item.equipmentInstanceId}`
                                    );
                                  }}
                                >
                                  View
                                </button>

                                {canManage && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        window.alert(
                                          `Edit equipment instance #${item.equipmentInstanceId}`
                                        );
                                      }}
                                    >
                                      Edit
                                    </button>

                                    <button
                                      type="button"
                                      className="danger-btn"
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
                                      {deletingId ===
                                      item.equipmentInstanceId
                                        ? "Deleting..."
                                        : "Delete"}
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
                            colSpan={9}
                            className="empty-cell"
                          >
                            No equipment
                            instances found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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
                        <th>ID</th>
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
                      {filteredTypes.map(
                        (item) => (
                          <tr
                            key={
                              item.equipmentTypeId
                            }
                          >
                            <td>
                              #
                              {
                                item.equipmentTypeId
                              }
                            </td>

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
                                  onClick={() => {
                                    window.alert(
                                      `Equipment type #${item.equipmentTypeId}`
                                    );
                                  }}
                                >
                                  View
                                </button>

                                {canManage && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        window.alert(
                                          `Edit equipment type #${item.equipmentTypeId}`
                                        );
                                      }}
                                    >
                                      Edit
                                    </button>

                                    <button
                                      type="button"
                                      className="danger-btn"
                                      onClick={() => {
                                        window.alert(
                                          "Delete equipment type will be implemented with its own form."
                                        );
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      )}

                      {filteredTypes.length ===
                        0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="empty-cell"
                          >
                            No equipment
                            types found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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
                        <th>ID</th>
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
                      {filteredCategories.map(
                        (item) => (
                          <tr
                            key={
                              item.equipmentCategoryId
                            }
                          >
                            <td>
                              #
                              {
                                item.equipmentCategoryId
                              }
                            </td>

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
                                  onClick={() => {
                                    window.alert(
                                      `Equipment category #${item.equipmentCategoryId}`
                                    );
                                  }}
                                >
                                  View
                                </button>

                                {canManage && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        window.alert(
                                          `Edit equipment category #${item.equipmentCategoryId}`
                                        );
                                      }}
                                    >
                                      Edit
                                    </button>

                                    <button
                                      type="button"
                                      className="danger-btn"
                                      onClick={() => {
                                        window.alert(
                                          "Delete category will be implemented with its own form."
                                        );
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      )}

                      {filteredCategories.length ===
                        0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="empty-cell"
                          >
                            No equipment
                            categories found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}