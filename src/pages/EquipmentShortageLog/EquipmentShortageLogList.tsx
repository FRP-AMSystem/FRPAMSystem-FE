import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  AlertTriangle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  createEquipmentShortageLog,
  deleteEquipmentShortageLog,
  getEquipmentShortageLogs,
  updateEquipmentShortageLog,
} from "../../services/equipmentShortageLogService";

import type {
  EquipmentShortageLog,
  EquipmentShortageLogRequest,
} from "../../types/equipmentShortageLog";

import "./EquipmentShortageLogList.css";

type Role =
  | "Manager"
  | "Researcher"
  | "Technician"
  | "Student";

type RequirementType =
  | "Experiment"
  | "Phase";

interface FormState {
  allocationPlanId: string;

  requirementType: RequirementType;
  requirementId: string;

  shortageQuantity: string;
}

const emptyForm: FormState = {
  allocationPlanId: "",

  requirementType: "Experiment",
  requirementId: "",

  shortageQuantity: "1",
};

function getCurrentRole(): Role {
  const storedRole =
    localStorage.getItem("role");

  if (
    storedRole === "Admin" ||
    storedRole === "Manager" ||
    storedRole === "Researcher" ||
    storedRole === "Technician" ||
    storedRole === "Student"
  ) {
    return storedRole;
  }

  return "Student";
}

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

function formatDateTime(
  value?: string | null
): string {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  const hasTime =
    date.getHours() !== 0 ||
    date.getMinutes() !== 0;

  if (!hasTime) {
    return date.toLocaleDateString(
      "vi-VN"
    );
  }

  return `${date.toLocaleDateString("vi-VN")} ${date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
}

function getRequirementType(
  item: EquipmentShortageLog
): RequirementType {
  return item.phaseEquipmentReqId
    ? "Phase"
    : "Experiment";
}

function getRequirementId(
  item: EquipmentShortageLog
): number | null {
  return (
    item.phaseEquipmentReqId ??
    item.expEquipmentReqId ??
    null
  );
}

function getRequirementLabel(
  item: EquipmentShortageLog
): string {
  if (item.phaseEquipmentReqId) {
    return (
      item.phaseName ||
      `Phase requirement #${item.phaseEquipmentReqId}`
    );
  }

  if (item.expEquipmentReqId) {
    return (
      item.experimentName ||
      `Experiment requirement #${item.expEquipmentReqId}`
    );
  }

  return "-";
}

function getQuantityValue(
  value?: number | null
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "-";
  }

  return value.toLocaleString(
    "vi-VN"
  );
}

export default function EquipmentShortageLogList() {
  const role =
    getCurrentRole();

  const canManage =
    role === "Admin" || role === "Manager";

  const [
    items,
    setItems,
  ] = useState<
    EquipmentShortageLog[]
  >([]);

  const [
    allocationFilter,
    setAllocationFilter,
  ] = useState("");

  const [
    experimentRequirementFilter,
    setExperimentRequirementFilter,
  ] = useState("");

  const [
    phaseRequirementFilter,
    setPhaseRequirementFilter,
  ] = useState("");

  const [
    appliedAllocationFilter,
    setAppliedAllocationFilter,
  ] = useState("");

  const [
    appliedExperimentRequirementFilter,
    setAppliedExperimentRequirementFilter,
  ] = useState("");

  const [
    appliedPhaseRequirementFilter,
    setAppliedPhaseRequirementFilter,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

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
    dialogOpen,
    setDialogOpen,
  ] = useState(false);

  const [
    editing,
    setEditing,
  ] = useState<
    EquipmentShortageLog | null
  >(null);

  const [
    form,
    setForm,
  ] = useState<FormState>(
    emptyForm
  );

  const loadData =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await getEquipmentShortageLogs({
            allocationPlanId:
              appliedAllocationFilter
                ? Number(
                    appliedAllocationFilter
                  )
                : undefined,

            expEquipmentReqId:
              appliedExperimentRequirementFilter
                ? Number(
                    appliedExperimentRequirementFilter
                  )
                : undefined,

            phaseEquipmentReqId:
              appliedPhaseRequirementFilter
                ? Number(
                    appliedPhaseRequirementFilter
                  )
                : undefined,

            page: 1,
            size: 300,
          });

        setItems(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (loadError) {
        console.error(
          "Load equipment shortage logs failed:",
          loadError
        );

        setError(
          getErrorMessage(
            loadError
          )
        );

        setItems([]);
      } finally {
        setLoading(false);
      }
    }, [
      appliedAllocationFilter,
      appliedExperimentRequirementFilter,
      appliedPhaseRequirementFilter,
    ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateForm = <
    K extends keyof FormState,
  >(
    name: K,
    value: FormState[K]
  ) => {
    setForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (
    item: EquipmentShortageLog
  ) => {
    setEditing(item);

    setForm({
      allocationPlanId:
        String(
          item.allocationPlanId
        ),

      requirementType:
        getRequirementType(
          item
        ),

      requirementId:
        String(
          getRequirementId(
            item
          ) ?? ""
        ),

      shortageQuantity:
        String(
          item.shortageQuantity
        ),
    });

    setError("");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) {
      return;
    }

    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const applyFilters = () => {
    const allocationId =
      allocationFilter.trim();

    const experimentRequirementId =
      experimentRequirementFilter.trim();

    const phaseRequirementId =
      phaseRequirementFilter.trim();

    if (
      allocationId &&
      (
        !Number.isInteger(
          Number(allocationId)
        ) ||
        Number(allocationId) <= 0
      )
    ) {
      setError(
        "Allocation plan ID filter is invalid."
      );

      return;
    }

    if (
      experimentRequirementId &&
      (
        !Number.isInteger(
          Number(
            experimentRequirementId
          )
        ) ||
        Number(
          experimentRequirementId
        ) <= 0
      )
    ) {
      setError(
        "Experiment requirement ID filter is invalid."
      );

      return;
    }

    if (
      phaseRequirementId &&
      (
        !Number.isInteger(
          Number(
            phaseRequirementId
          )
        ) ||
        Number(
          phaseRequirementId
        ) <= 0
      )
    ) {
      setError(
        "Phase requirement ID filter is invalid."
      );

      return;
    }

    setError("");

    setAppliedAllocationFilter(
      allocationId
    );

    setAppliedExperimentRequirementFilter(
      experimentRequirementId
    );

    setAppliedPhaseRequirementFilter(
      phaseRequirementId
    );
  };

  const clearFilters = () => {
    setAllocationFilter("");
    setExperimentRequirementFilter("");
    setPhaseRequirementFilter("");

    setAppliedAllocationFilter("");
    setAppliedExperimentRequirementFilter("");
    setAppliedPhaseRequirementFilter("");

    setError("");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    const allocationPlanId =
      Number(
        form.allocationPlanId
      );

    const requirementId =
      Number(
        form.requirementId
      );

    const shortageQuantity =
      Number(
        form.shortageQuantity
      );

    if (
      !Number.isInteger(
        allocationPlanId
      ) ||
      allocationPlanId <= 0
    ) {
      setError(
        "Allocation plan ID must be a positive integer."
      );

      return;
    }

    if (
      !Number.isInteger(
        requirementId
      ) ||
      requirementId <= 0
    ) {
      setError(
        "Requirement ID must be a positive integer."
      );

      return;
    }

    if (
      !Number.isInteger(
        shortageQuantity
      ) ||
      shortageQuantity <= 0
    ) {
      setError(
        "Shortage quantity must be a positive integer."
      );

      return;
    }

    const payload:
      EquipmentShortageLogRequest = {
      allocationPlanId,

      expEquipmentReqId:
        form.requirementType ===
        "Experiment"
          ? requirementId
          : null,

      phaseEquipmentReqId:
        form.requirementType ===
        "Phase"
          ? requirementId
          : null,

      shortageQuantity,
    };

    try {
      setSaving(true);
      setError("");

      if (editing) {
        await updateEquipmentShortageLog(
          editing.equipmentShortageLogId,
          payload
        );
      } else {
        await createEquipmentShortageLog(
          payload
        );
      }

      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);

      await loadData();
    } catch (submitError) {
      console.error(
        "Save equipment shortage log failed:",
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

  const handleDelete = async (
    item: EquipmentShortageLog
  ) => {
    const confirmed =
      window.confirm(
        `Delete equipment shortage log #${item.equipmentShortageLogId}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        item.equipmentShortageLogId
      );

      setError("");

      await deleteEquipmentShortageLog(
        item.equipmentShortageLogId
      );

      setItems(
        (current) =>
          current.filter(
            (value) =>
              value.equipmentShortageLogId !==
              item.equipmentShortageLogId
          )
      );
    } catch (deleteError) {
      console.error(
        "Delete equipment shortage log failed:",
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

  const hasActiveFilters =
    Boolean(
      allocationFilter ||
      experimentRequirementFilter ||
      phaseRequirementFilter ||
      appliedAllocationFilter ||
      appliedExperimentRequirementFilter ||
      appliedPhaseRequirementFilter
    );

  return (
    <DashboardLayout>
      <div className="equipment-shortage-page">
        <header className="equipment-shortage-header">
          <div>
            <p>
              Dashboard / Equipment Shortage Logs
            </p>

            <h1>
              Equipment Shortage Logs
            </h1>

            <span>
              Track equipment quantities that
              could not be allocated to an
              experiment or phase requirement.
            </span>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreate}
            >
              <Plus size={18} />

              Add Shortage Log
            </button>
          )}
        </header>

        <section className="equipment-shortage-filter">
          <div className="equipment-shortage-search">
            <Search size={18} />

            <input
              type="number"
              min="1"
              step="1"
              value={
                allocationFilter
              }
              onChange={(event) =>
                setAllocationFilter(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  applyFilters();
                }
              }}
              placeholder="Allocation plan ID"
            />
          </div>

          <input
            type="number"
            min="1"
            step="1"
            value={
              experimentRequirementFilter
            }
            onChange={(event) =>
              setExperimentRequirementFilter(
                event.target.value
              )
            }
            placeholder="Experiment requirement ID"
          />

          <input
            type="number"
            min="1"
            step="1"
            value={
              phaseRequirementFilter
            }
            onChange={(event) =>
              setPhaseRequirementFilter(
                event.target.value
              )
            }
            placeholder="Phase requirement ID"
          />

          <button
            type="button"
            onClick={applyFilters}
          >
            Search
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              className="secondary"
              onClick={clearFilters}
            >
              Clear
            </button>
          )}
        </section>

        {error && (
          <div className="equipment-shortage-error">
            {error}
          </div>
        )}

        <section className="equipment-shortage-card">
          <div className="equipment-shortage-card-title">
            <div>
              <h2>
                Shortage List
              </h2>

              <p>
                {items.length}{" "}
                {items.length === 1
                  ? "shortage record"
                  : "shortage records"}
              </p>
            </div>

            <AlertTriangle
              size={22}
            />
          </div>

          {loading ? (
            <div className="equipment-shortage-state">
              Loading equipment shortage logs...
            </div>
          ) : items.length === 0 ? (
            <div className="equipment-shortage-state">
              No equipment shortage logs found.
            </div>
          ) : (
            <div className="equipment-shortage-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>
                      Allocation Plan
                    </th>
                    <th>
                      Requirement Type
                    </th>
                    <th>
                      Requirement
                    </th>
                    <th>
                      Equipment Type
                    </th>
                    <th>
                      Required
                    </th>
                    <th>
                      Allocated
                    </th>
                    <th>
                      Shortage
                    </th>
                    <th>
                      Created
                    </th>
                    <th>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.map(
                    (item, index) => {
                      const requirementType =
                        getRequirementType(
                          item
                        );

                      const requirementId =
                        getRequirementId(
                          item
                        );

                      return (
                        <tr
                          key={
                            item.equipmentShortageLogId
                          }
                        >
                          <td>
                            #
                            {item.equipmentShortageLogId &&
                            item.equipmentShortageLogId > 0
                              ? item.equipmentShortageLogId
                              : index + 1}
                          </td>

                          <td>
                            <strong>
                              {item.allocationPlanName ||
                                `Allocation #${item.allocationPlanId}`}
                            </strong>

                            <small>
                              Plan #
                              {
                                item.allocationPlanId
                              }
                            </small>
                          </td>

                          <td>
                            <span
                              className={[
                                "equipment-shortage-requirement-badge",
                                requirementType ===
                                "Phase"
                                  ? "phase"
                                  : "experiment",
                              ].join(
                                " "
                              )}
                            >
                              {
                                requirementType
                              }
                            </span>
                          </td>

                          <td>
                            <strong>
                              {getRequirementLabel(
                                item
                              )}
                            </strong>

                            <small>
                              Requirement #
                              {requirementId ||
                                "-"}
                            </small>
                          </td>

                          <td>
                            <strong>
                              {item.equipmentTypeName ||
                                (
                                  item.equipmentTypeId
                                    ? `Equipment type #${item.equipmentTypeId}`
                                    : "-"
                                )}
                            </strong>
                          </td>

                          <td>
                            {getQuantityValue(
                              item.requiredQuantity
                            )}
                          </td>

                          <td>
                            {getQuantityValue(
                              item.allocatedQuantity
                            )}
                          </td>

                          <td>
                            <span className="equipment-shortage-quantity">
                              {item.shortageQuantity.toLocaleString(
                                "vi-VN"
                              )}
                            </span>
                          </td>

                          <td>
                            {formatDateTime(
                              item.createdAt
                            )}
                          </td>

                          <td>
                            <div className="equipment-shortage-actions">
                              {canManage ? (
                                <>
                                  <button
                                    type="button"
                                    className="action-btn-pill edit"
                                    title="Edit"
                                    onClick={() =>
                                      openEdit(
                                        item
                                      )
                                    }
                                  >
                                    <Pencil size={12} />
                                    <span>Edit</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="action-btn-pill delete"
                                    title="Delete"
                                    disabled={
                                      deletingId ===
                                      item.equipmentShortageLogId
                                    }
                                    onClick={() =>
                                      void handleDelete(
                                        item
                                      )
                                    }
                                  >
                                    <Trash2 size={12} />
                                    <span>Delete</span>
                                  </button>
                                </>
                              ) : (
                                <span>
                                  View only
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {dialogOpen && (
          <div
            className="equipment-shortage-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeDialog();
              }
            }}
          >
            <form
              className="equipment-shortage-dialog"
              onSubmit={handleSubmit}
            >
              <div className="equipment-shortage-dialog-head">
                <div>
                  <h2>
                    {editing
                      ? "Edit Equipment Shortage Log"
                      : "Create Equipment Shortage Log"}
                  </h2>

                  <p>
                    Record the shortage for one
                    experiment or phase equipment
                    requirement.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={saving}
                  aria-label="Close shortage log form"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="equipment-shortage-form-grid">
                <label htmlFor="shortageAllocationPlanId">
                  Allocation Plan ID

                  <input
                    id="shortageAllocationPlanId"
                    type="number"
                    min="1"
                    step="1"
                    value={
                      form.allocationPlanId
                    }
                    onChange={(event) =>
                      updateForm(
                        "allocationPlanId",
                        event.target.value
                      )
                    }
                    disabled={saving}
                    required
                  />
                </label>

                <label htmlFor="shortageRequirementType">
                  Requirement Type

                  <select
                    id="shortageRequirementType"
                    value={
                      form.requirementType
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,

                          requirementType:
                            event.target
                              .value as RequirementType,

                          requirementId:
                            "",
                        })
                      )
                    }
                    disabled={saving}
                  >
                    <option value="Experiment">
                      Experiment Requirement
                    </option>

                    <option value="Phase">
                      Phase Requirement
                    </option>
                  </select>
                </label>

                <label htmlFor="shortageRequirementId">
                  {form.requirementType ===
                  "Experiment"
                    ? "Experiment Equipment Requirement ID"
                    : "Phase Equipment Requirement ID"}

                  <input
                    id="shortageRequirementId"
                    type="number"
                    min="1"
                    step="1"
                    value={
                      form.requirementId
                    }
                    onChange={(event) =>
                      updateForm(
                        "requirementId",
                        event.target.value
                      )
                    }
                    disabled={saving}
                    required
                  />
                </label>

                <label htmlFor="shortageQuantity">
                  Shortage Quantity

                  <input
                    id="shortageQuantity"
                    type="number"
                    min="1"
                    step="1"
                    value={
                      form.shortageQuantity
                    }
                    onChange={(event) =>
                      updateForm(
                        "shortageQuantity",
                        event.target.value
                      )
                    }
                    disabled={saving}
                    required
                  />
                </label>
              </div>

              <div className="equipment-shortage-preview">
                <div>
                  <span>
                    Allocation Plan
                  </span>

                  <strong>
                    {form.allocationPlanId
                      ? `#${form.allocationPlanId}`
                      : "-"}
                  </strong>
                </div>

                <div>
                  <span>
                    Requirement Type
                  </span>

                  <strong>
                    {
                      form.requirementType
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Requirement ID
                  </span>

                  <strong>
                    {form.requirementId
                      ? `#${form.requirementId}`
                      : "-"}
                  </strong>
                </div>

                <div>
                  <span>
                    Shortage Quantity
                  </span>

                  <strong>
                    {form.shortageQuantity ||
                      "0"}
                  </strong>
                </div>
              </div>

              <div className="equipment-shortage-dialog-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={closeDialog}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    !form.allocationPlanId ||
                    !form.requirementId ||
                    !form.shortageQuantity
                  }
                >
                  {saving
                    ? "Saving..."
                    : editing
                      ? "Save Changes"
                      : "Create Log"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}