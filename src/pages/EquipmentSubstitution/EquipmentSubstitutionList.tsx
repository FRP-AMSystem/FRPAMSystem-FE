import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  ArrowRightLeft,
  Pencil,
  Plus,
  RotateCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getEquipmentTypes,
} from "../../services/equipmentService";

import {
  createEquipmentSubstitution,
  deleteEquipmentSubstitution,
  getEquipmentSubstitutions,
  updateEquipmentSubstitution,
} from "../../services/equipmentSubstitutionService";

import type {
  EquipmentType,
} from "../../types/equipment";

import type {
  EquipmentSubstitution,
  EquipmentSubstitutionRequest,
} from "../../types/equipmentSubstitution";

import "./EquipmentSubstitutionList.css";

type Role =
  | "Manager"
  | "Researcher"
  | "Technician"
  | "Student";

interface FormState {
  primaryEquipmentTypeId: string;
  subEquipmentTypeId: string;

  efficiencyPercent: string;
  timeMultiplier: string;

  note: string;
}

const emptyForm: FormState = {
  primaryEquipmentTypeId: "",
  subEquipmentTypeId: "",

  efficiencyPercent: "100",
  timeMultiplier: "1",

  note: "",
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

function formatDate(
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

  return date.toLocaleDateString(
    "vi-VN"
  );
}

function getEquipmentTypeName(
  equipmentType: EquipmentType
): string {
  return (
    equipmentType.equipmentTypeName ||
    `Equipment Type #${equipmentType.equipmentTypeId}`
  );
}

function getEfficiencyPercent(
  value: number
): number {
  if (
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.round(
    value * 100
  );
}

function getEfficiencyClassName(
  efficiencyRate: number
): string {
  const percent =
    getEfficiencyPercent(
      efficiencyRate
    );

  if (percent >= 90) {
    return "equipment-substitution-efficiency-high";
  }

  if (percent >= 70) {
    return "equipment-substitution-efficiency-medium";
  }

  return "equipment-substitution-efficiency-low";
}

export default function EquipmentSubstitutionList() {
  const role =
    getCurrentRole();

  const canManage =
    role === "Admin" || role === "Manager";

  const [
    items,
    setItems,
  ] = useState<
    EquipmentSubstitution[]
  >([]);

  const [
    equipmentTypes,
    setEquipmentTypes,
  ] = useState<
    EquipmentType[]
  >([]);

  const [
    keyword,
    setKeyword,
  ] = useState("");

  const [
    appliedKeyword,
    setAppliedKeyword,
  ] = useState("");

  const [
    primaryFilter,
    setPrimaryFilter,
  ] = useState("");

  const [
    substituteFilter,
    setSubstituteFilter,
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
    EquipmentSubstitution | null
  >(null);

  const [
    form,
    setForm,
  ] = useState<FormState>(
    emptyForm
  );

  const equipmentTypeMap =
    useMemo(() => {
      return new Map(
        equipmentTypes.map(
          (equipmentType) => [
            equipmentType.equipmentTypeId,
            getEquipmentTypeName(
              equipmentType
            ),
          ]
        )
      );
    }, [equipmentTypes]);

  const selectedPrimaryType =
    useMemo(() => {
      const id =
        Number(
          form.primaryEquipmentTypeId
        );

      return equipmentTypes.find(
        (equipmentType) =>
          equipmentType.equipmentTypeId ===
          id
      );
    }, [
      equipmentTypes,
      form.primaryEquipmentTypeId,
    ]);

  const selectedSubstituteType =
    useMemo(() => {
      const id =
        Number(
          form.subEquipmentTypeId
        );

      return equipmentTypes.find(
        (equipmentType) =>
          equipmentType.equipmentTypeId ===
          id
      );
    }, [
      equipmentTypes,
      form.subEquipmentTypeId,
    ]);

  const loadData =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const [
          substitutionData,
          equipmentTypeData,
        ] = await Promise.all([
          getEquipmentSubstitutions({
            keyword:
              appliedKeyword ||
              undefined,

            primaryEquipmentTypeId:
              primaryFilter
                ? Number(
                    primaryFilter
                  )
                : undefined,

            subEquipmentTypeId:
              substituteFilter
                ? Number(
                    substituteFilter
                  )
                : undefined,

            page: 1,
            size: 300,
          }),

          getEquipmentTypes({
            page: 1,
            size: 300,
          }),
        ]);

        setItems(
          Array.isArray(
            substitutionData
          )
            ? substitutionData
            : []
        );

        setEquipmentTypes(
          Array.isArray(
            equipmentTypeData
          )
            ? equipmentTypeData
            : []
        );
      } catch (loadError) {
        console.error(
          "Load equipment substitutions failed:",
          loadError
        );

        setError(
          getErrorMessage(
            loadError
          )
        );

        setItems([]);
        setEquipmentTypes([]);
      } finally {
        setLoading(false);
      }
    }, [
      appliedKeyword,
      primaryFilter,
      substituteFilter,
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
    item: EquipmentSubstitution
  ) => {
    setEditing(item);

    setForm({
      primaryEquipmentTypeId:
        String(
          item.primaryEquipmentTypeId
        ),

      subEquipmentTypeId:
        String(
          item.subEquipmentTypeId
        ),

      efficiencyPercent:
        String(
          getEfficiencyPercent(
            item.efficiencyRate
          )
        ),

      timeMultiplier:
        String(
          item.timeMultiplier
        ),

      note:
        item.note || "",
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

  const handleSearch = () => {
    setAppliedKeyword(
      keyword.trim()
    );
  };

  const clearFilters = () => {
    setKeyword("");
    setAppliedKeyword("");
    setPrimaryFilter("");
    setSubstituteFilter("");
    setError("");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    const primaryEquipmentTypeId =
      Number(
        form.primaryEquipmentTypeId
      );

    const subEquipmentTypeId =
      Number(
        form.subEquipmentTypeId
      );

    const efficiencyPercent =
      Number(
        form.efficiencyPercent
      );

    const timeMultiplier =
      Number(
        form.timeMultiplier
      );

    if (
      !Number.isInteger(
        primaryEquipmentTypeId
      ) ||
      primaryEquipmentTypeId <= 0
    ) {
      setError(
        "Please select a valid primary equipment type."
      );

      return;
    }

    if (
      !Number.isInteger(
        subEquipmentTypeId
      ) ||
      subEquipmentTypeId <= 0
    ) {
      setError(
        "Please select a valid substitute equipment type."
      );

      return;
    }

    if (
      primaryEquipmentTypeId ===
      subEquipmentTypeId
    ) {
      setError(
        "Primary and substitute equipment types must be different."
      );

      return;
    }

    if (
      !Number.isFinite(
        efficiencyPercent
      ) ||
      efficiencyPercent <= 0 ||
      efficiencyPercent > 100
    ) {
      setError(
        "Efficiency must be greater than 0 and less than or equal to 100."
      );

      return;
    }

    if (
      !Number.isFinite(
        timeMultiplier
      ) ||
      timeMultiplier <= 0
    ) {
      setError(
        "Time multiplier must be greater than 0."
      );

      return;
    }

    const duplicate =
      items.some(
        (item) =>
          item.primaryEquipmentTypeId ===
            primaryEquipmentTypeId &&
          item.subEquipmentTypeId ===
            subEquipmentTypeId &&
          item.equipmentSubstitutionId !==
            editing?.equipmentSubstitutionId
      );

    if (duplicate) {
      setError(
        "This equipment substitution already exists."
      );

      return;
    }

    const payload:
      EquipmentSubstitutionRequest = {
      primaryEquipmentTypeId,

      subEquipmentTypeId,

      efficiencyRate:
        efficiencyPercent /
        100,

      timeMultiplier,

      note:
        form.note.trim() ||
        null,
    };

    try {
      setSaving(true);
      setError("");

      if (editing) {
        await updateEquipmentSubstitution(
          editing.equipmentSubstitutionId,
          payload
        );
      } else {
        await createEquipmentSubstitution(
          payload
        );
      }

      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);

      await loadData();
    } catch (submitError) {
      console.error(
        "Save equipment substitution failed:",
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
    item: EquipmentSubstitution
  ) => {
    const primaryName =
      item.primaryEquipmentTypeName ||
      equipmentTypeMap.get(
        item.primaryEquipmentTypeId
      ) ||
      `Equipment type #${item.primaryEquipmentTypeId}`;

    const substituteName =
      item.subEquipmentTypeName ||
      equipmentTypeMap.get(
        item.subEquipmentTypeId
      ) ||
      `Equipment type #${item.subEquipmentTypeId}`;

    const confirmed =
      window.confirm(
        `Delete substitution "${primaryName}" → "${substituteName}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        item.equipmentSubstitutionId
      );

      setError("");

      await deleteEquipmentSubstitution(
        item.equipmentSubstitutionId
      );

      setItems(
        (current) =>
          current.filter(
            (value) =>
              value.equipmentSubstitutionId !==
              item.equipmentSubstitutionId
          )
      );
    } catch (deleteError) {
      console.error(
        "Delete equipment substitution failed:",
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
      keyword ||
      appliedKeyword ||
      primaryFilter ||
      substituteFilter
    );

  return (
    <DashboardLayout>
      <div className="equipment-substitution-page">
        <header className="equipment-substitution-header">
          <div>
            <p>
              Dashboard / Equipment Substitutions
            </p>

            <h1>
              Equipment Substitutions
            </h1>

            <span>
              Define alternative equipment
              types, efficiency rates and time
              multipliers.
            </span>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreate}
            >
              <Plus size={18} />

              Add Substitution
            </button>
          )}
        </header>

        <section className="equipment-substitution-filter">
          <div className="equipment-substitution-search">
            <Search size={18} />

            <input
              type="text"
              value={keyword}
              onChange={(event) =>
                setKeyword(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  handleSearch();
                }
              }}
              placeholder="Search equipment or note..."
            />
          </div>

          <select
            value={primaryFilter}
            onChange={(event) =>
              setPrimaryFilter(
                event.target.value
              )
            }
          >
            <option value="">
              All primary types
            </option>

            {equipmentTypes.map(
              (equipmentType) => (
                <option
                  key={
                    equipmentType.equipmentTypeId
                  }
                  value={
                    equipmentType.equipmentTypeId
                  }
                >
                  {getEquipmentTypeName(
                    equipmentType
                  )}
                </option>
              )
            )}
          </select>

          <select
            value={
              substituteFilter
            }
            onChange={(event) =>
              setSubstituteFilter(
                event.target.value
              )
            }
          >
            <option value="">
              All substitute types
            </option>

            {equipmentTypes.map(
              (equipmentType) => (
                <option
                  key={
                    equipmentType.equipmentTypeId
                  }
                  value={
                    equipmentType.equipmentTypeId
                  }
                >
                  {getEquipmentTypeName(
                    equipmentType
                  )}
                </option>
              )
            )}
          </select>

          <button
            type="button"
            onClick={handleSearch}
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
          <div className="equipment-substitution-error">
            {error}
          </div>
        )}

        <section className="equipment-substitution-card">
          <div className="equipment-substitution-card-title">
            <div>
              <h2>
                Substitution List
              </h2>

              <p>
                {items.length}{" "}
                {items.length === 1
                  ? "substitution"
                  : "substitutions"}
              </p>
            </div>

            <ArrowRightLeft
              size={22}
            />
          </div>

          {loading ? (
            <div className="equipment-substitution-state">
              Loading equipment substitutions...
            </div>
          ) : items.length === 0 ? (
            <div className="equipment-substitution-state">
              No equipment substitutions found.
            </div>
          ) : (
            <div className="equipment-substitution-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>
                      Primary Equipment
                    </th>
                    <th>
                      Substitute Equipment
                    </th>
                    <th>
                      Efficiency
                    </th>
                    <th>
                      Time Multiplier
                    </th>
                    <th>Note</th>
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
                    (item) => {
                      const primaryName =
                        item.primaryEquipmentTypeName ||
                        equipmentTypeMap.get(
                          item.primaryEquipmentTypeId
                        ) ||
                        `Type #${item.primaryEquipmentTypeId}`;

                      const substituteName =
                        item.subEquipmentTypeName ||
                        equipmentTypeMap.get(
                          item.subEquipmentTypeId
                        ) ||
                        `Type #${item.subEquipmentTypeId}`;

                      const efficiencyPercent =
                        getEfficiencyPercent(
                          item.efficiencyRate
                        );

                      return (
                        <tr
                          key={
                            item.equipmentSubstitutionId
                          }
                        >
                          <td>
                            #
                            {
                              item.equipmentSubstitutionId
                            }
                          </td>

                          <td>
                            <strong>
                              {primaryName}
                            </strong>

                            <small>
                              Type #
                              {
                                item.primaryEquipmentTypeId
                              }
                            </small>
                          </td>

                          <td>
                            <strong>
                              {substituteName}
                            </strong>

                            <small>
                              Type #
                              {
                                item.subEquipmentTypeId
                              }
                            </small>
                          </td>

                          <td>
                            <span
                              className={[
                                "equipment-substitution-efficiency",
                                getEfficiencyClassName(
                                  item.efficiencyRate
                                ),
                              ].join(
                                " "
                              )}
                            >
                              {
                                efficiencyPercent
                              }
                              %
                            </span>
                          </td>

                          <td>
                            ×
                            {item.timeMultiplier.toLocaleString(
                              "vi-VN",
                              {
                                maximumFractionDigits:
                                  2,
                              }
                            )}
                          </td>

                          <td>
                            {item.note ||
                              "No note"}
                          </td>

                          <td>
                            {formatDate(
                              item.createdAt
                            )}
                          </td>

                          <td>
                            <div className="equipment-substitution-actions">
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
                                    disabled={
                                      deletingId ===
                                      item.equipmentSubstitutionId
                                    }
                                    title="Delete"
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
            className="equipment-substitution-overlay"
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
              className="equipment-substitution-dialog"
              onSubmit={handleSubmit}
            >
              <div className="equipment-substitution-dialog-head">
                <div>
                  <h2>
                    {editing
                      ? "Edit Equipment Substitution"
                      : "Create Equipment Substitution"}
                  </h2>

                  <p>
                    {selectedPrimaryType &&
                    selectedSubstituteType
                      ? `${getEquipmentTypeName(
                          selectedPrimaryType
                        )} → ${getEquipmentTypeName(
                          selectedSubstituteType
                        )}`
                      : "Select the original and replacement equipment types."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={saving}
                  aria-label="Close substitution form"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="equipment-substitution-form-grid">
                <div className="substitution-form-group">
                  <label htmlFor="primaryEquipmentTypeId">
                    Primary Equipment Type <span className="required">*</span>
                  </label>
                  <select
                    id="primaryEquipmentTypeId"
                    value={form.primaryEquipmentTypeId}
                    onChange={(event) =>
                      updateForm("primaryEquipmentTypeId", event.target.value)
                    }
                    disabled={saving}
                    required
                  >
                    <option value="">Select primary type</option>
                    {equipmentTypes.map((equipmentType) => (
                      <option
                        key={equipmentType.equipmentTypeId}
                        value={equipmentType.equipmentTypeId}
                        disabled={
                          String(equipmentType.equipmentTypeId) ===
                          form.subEquipmentTypeId
                        }
                      >
                        {getEquipmentTypeName(equipmentType)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="substitution-form-group">
                  <label htmlFor="subEquipmentTypeId">
                    Substitute Equipment Type <span className="required">*</span>
                  </label>
                  <select
                    id="subEquipmentTypeId"
                    value={form.subEquipmentTypeId}
                    onChange={(event) =>
                      updateForm("subEquipmentTypeId", event.target.value)
                    }
                    disabled={saving}
                    required
                  >
                    <option value="">Select substitute type</option>
                    {equipmentTypes.map((equipmentType) => (
                      <option
                        key={equipmentType.equipmentTypeId}
                        value={equipmentType.equipmentTypeId}
                        disabled={
                          String(equipmentType.equipmentTypeId) ===
                          form.primaryEquipmentTypeId
                        }
                      >
                        {getEquipmentTypeName(equipmentType)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="substitution-form-group">
                  <label htmlFor="efficiencyPercent">
                    Efficiency (%) <span className="required">*</span>
                  </label>
                  <input
                    id="efficiencyPercent"
                    type="number"
                    min="1"
                    max="100"
                    step="0.01"
                    placeholder="e.g. 80"
                    value={form.efficiencyPercent}
                    onChange={(event) =>
                      updateForm("efficiencyPercent", event.target.value)
                    }
                    disabled={saving}
                    required
                  />
                  <small>Example: 80 means substitute operates at 80% capacity.</small>
                </div>

                <div className="substitution-form-group">
                  <label htmlFor="timeMultiplier">
                    Time Multiplier <span className="required">*</span>
                  </label>
                  <input
                    id="timeMultiplier"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="e.g. 1.25"
                    value={form.timeMultiplier}
                    onChange={(event) =>
                      updateForm("timeMultiplier", event.target.value)
                    }
                    disabled={saving}
                    required
                  />
                  <small>Example: 1.25 means execution takes 25% longer.</small>
                </div>

                <div className="substitution-form-group wide">
                  <label htmlFor="substitutionNote">Note / Context</label>
                  <textarea
                    id="substitutionNote"
                    rows={3}
                    placeholder="Enter any additional conditions or notes for this substitution rule..."
                    value={form.note}
                    onChange={(event) =>
                      updateForm("note", event.target.value)
                    }
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="equipment-substitution-dialog-actions">
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
                  className="primary"
                  disabled={
                    saving ||
                    !form.primaryEquipmentTypeId ||
                    !form.subEquipmentTypeId
                  }
                >
                  {saving ? (
                    <>
                      <RotateCw size={14} className="spin-icon" />
                      <span>Saving...</span>
                    </>
                  ) : editing ? (
                    "Save Changes"
                  ) : (
                    "Create Substitution"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}