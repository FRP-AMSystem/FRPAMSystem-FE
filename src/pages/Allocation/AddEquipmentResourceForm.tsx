import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  createAllocationEquipmentDetail,
} from "../../services/allocationDetailService";

import {
  getAvailableEquipmentInstances,
} from "../../services/equipmentInstanceService";

import {
  getExperimentEquipmentRequirements,
} from "../../services/experimentEquipmentRequirementService";

import type {
  AllocationDetailStatus,
} from "../../types/allocationDetail";

import type {
  EquipmentInstance,
} from "../../types/equipmentInstance";

import type {
  ExperimentEquipmentRequirement,
} from "../../types/experimentEquipmentRequirement";

import "./AllocationResourceForm.css";

interface AddEquipmentResourceFormProps {
  allocationPlanId: number;
  experimentId: number;
  onCreated: () => void | Promise<void>;
  onCancel: () => void;
}

interface FormState {
  expEquipmentReqId: string;
  equipmentInstanceId: string;
  quantity: string;
  isSubstitute: boolean;
  efficiencyRate: string;
  startDate: string;
  endDate: string;
  status: AllocationDetailStatus;
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
      "Cannot create equipment allocation."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Cannot create equipment allocation.";
}

function normalizeEfficiencyToPercent(
  value?: number | null
): number {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return 100;
  }

  return value <= 1
    ? value * 100
    : value;
}

function toDateTimePayload(
  value: string,
  endOfDay = false
): string {
  if (!value) {
    return "";
  }

  return endOfDay
    ? `${value}T23:59:59`
    : `${value}T00:00:00`;
}

function getEquipmentInstanceLabel(
  instance: EquipmentInstance
): string {
  const name =
    instance.assetCode ||
    `Equipment Instance #${instance.equipmentInstanceId}`;

  const information: string[] = [
    `#${instance.equipmentInstanceId}`,
    name,
  ];

  if (instance.serialNumber) {
    information.push(
      `Serial: ${instance.serialNumber}`
    );
  }

  information.push(
    `Condition: ${instance.conditionLevel}`
  );

  information.push(
    `Status: ${instance.status}`
  );

  return information.join(
    " - "
  );
}

export default function AddEquipmentResourceForm({
  allocationPlanId,
  experimentId,
  onCreated,
  onCancel,
}: AddEquipmentResourceFormProps) {
  const [
    requirements,
    setRequirements,
  ] = useState<
    ExperimentEquipmentRequirement[]
  >([]);

  const [
    equipmentInstances,
    setEquipmentInstances,
  ] = useState<
    EquipmentInstance[]
  >([]);

  const [
    form,
    setForm,
  ] = useState<FormState>({
    expEquipmentReqId: "",
    equipmentInstanceId: "",
    quantity: "1",
    isSubstitute: false,
    efficiencyRate: "100",
    startDate: "",
    endDate: "",
    status: "Proposed",
  });

  const [
    loadingRequirements,
    setLoadingRequirements,
  ] = useState(true);

  const [
    loadingInstances,
    setLoadingInstances,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const selectedRequirement =
    useMemo(() => {
      return requirements.find(
        (requirement) =>
          requirement.expEquipmentReqId ===
          Number(
            form.expEquipmentReqId
          )
      );
    }, [
      requirements,
      form.expEquipmentReqId,
    ]);

  const selectedEquipmentInstance =
    useMemo(() => {
      return equipmentInstances.find(
        (instance) =>
          instance.equipmentInstanceId ===
          Number(
            form.equipmentInstanceId
          )
      );
    }, [
      equipmentInstances,
      form.equipmentInstanceId,
    ]);

  useEffect(() => {
    let active = true;

    async function loadRequirements() {
      if (
        !Number.isInteger(
          allocationPlanId
        ) ||
        allocationPlanId <= 0 ||
        !Number.isInteger(
          experimentId
        ) ||
        experimentId <= 0
      ) {
        if (active) {
          setError(
            "Allocation plan or experiment ID is invalid."
          );

          setLoadingRequirements(
            false
          );
        }

        return;
      }

      try {
        setLoadingRequirements(
          true
        );

        setError("");

        const data =
          await getExperimentEquipmentRequirements({
            experimentId,
            page: 1,
            size: 100,
          });

        if (active) {
          setRequirements(
            Array.isArray(data)
              ? data
              : []
          );
        }
      } catch (loadError) {
        console.error(
          "Load equipment requirements failed:",
          loadError
        );

        if (active) {
          setError(
            getErrorMessage(
              loadError
            )
          );

          setRequirements([]);
        }
      } finally {
        if (active) {
          setLoadingRequirements(
            false
          );
        }
      }
    }

    void loadRequirements();

    return () => {
      active = false;
    };
  }, [
    allocationPlanId,
    experimentId,
  ]);

  useEffect(() => {
    let active = true;

    async function loadEquipmentInstances() {
      if (!selectedRequirement) {
        setEquipmentInstances([]);

        setForm(
          (current) => ({
            ...current,
            equipmentInstanceId: "",
          })
        );

        return;
      }

      const equipmentTypeId =
        selectedRequirement.equipmentTypeId;

      if (
        !Number.isInteger(
          equipmentTypeId
        ) ||
        equipmentTypeId <= 0
      ) {
        setEquipmentInstances([]);

        setError(
          "The selected requirement has an invalid equipment type ID."
        );

        return;
      }

      try {
        setLoadingInstances(
          true
        );

        setError("");

        const data =
          await getAvailableEquipmentInstances(
            equipmentTypeId
          );

        if (!active) {
          return;
        }

        setEquipmentInstances(
          Array.isArray(data)
            ? data
            : []
        );

        setForm(
          (current) => ({
            ...current,
            equipmentInstanceId: "",
          })
        );
      } catch (loadError) {
        console.error(
          "Load available equipment instances failed:",
          loadError
        );

        if (active) {
          setEquipmentInstances([]);

          setError(
            getErrorMessage(
              loadError
            )
          );
        }
      } finally {
        if (active) {
          setLoadingInstances(
            false
          );
        }
      }
    }

    void loadEquipmentInstances();

    return () => {
      active = false;
    };
  }, [selectedRequirement]);

  const handleInputChange = (
    event: ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
    >
  ) => {
    const {
      name,
      value,
    } = event.target;

    setError("");

    if (
      name ===
      "expEquipmentReqId"
    ) {
      const requirement =
        requirements.find(
          (item) =>
            item.expEquipmentReqId ===
            Number(value)
        );

      setForm(
        (current) => ({
          ...current,

          expEquipmentReqId:
            value,

          equipmentInstanceId:
            "",

          quantity:
            "1",

          isSubstitute:
            false,

          efficiencyRate:
            requirement
              ? String(
                  normalizeEfficiencyToPercent(
                    requirement.minAcceptableEfficiency
                  )
                )
              : "100",
        })
      );

      return;
    }

    if (
      name ===
      "equipmentInstanceId"
    ) {
      setForm(
        (current) => ({
          ...current,

          equipmentInstanceId:
            value,

          quantity:
            value
              ? "1"
              : current.quantity,
        })
      );

      return;
    }

    if (
      name === "startDate"
    ) {
      setForm(
        (current) => ({
          ...current,

          startDate:
            value,

          endDate:
            current.endDate &&
            current.endDate < value
              ? ""
              : current.endDate,
        })
      );

      return;
    }

    setForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  };

  const handleCheckboxChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const {
      name,
      checked,
    } = event.target;

    setError("");

    setForm(
      (current) => ({
        ...current,
        [name]: checked,
      })
    );
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    if (!selectedRequirement) {
      setError(
        "Please select an equipment requirement."
      );

      return;
    }

    const quantity =
      Number(
        form.quantity
      );

    const efficiencyPercent =
      Number(
        form.efficiencyRate
      );

    const equipmentInstanceId =
      form.equipmentInstanceId
        ? Number(
            form.equipmentInstanceId
          )
        : null;

    if (
      !Number.isInteger(
        quantity
      ) ||
      quantity <= 0
    ) {
      setError(
        "Quantity must be a positive integer."
      );

      return;
    }

    if (
      quantity >
      selectedRequirement.quantity
    ) {
      setError(
        `Quantity cannot exceed ${selectedRequirement.quantity}.`
      );

      return;
    }

    if (
      equipmentInstanceId !==
        null &&
      (
        !Number.isInteger(
          equipmentInstanceId
        ) ||
        equipmentInstanceId <= 0
      )
    ) {
      setError(
        "Please select a valid equipment instance."
      );

      return;
    }

    if (
      equipmentInstanceId !==
        null &&
      quantity !== 1
    ) {
      setError(
        "Quantity must be 1 when a specific equipment instance is selected."
      );

      return;
    }

    if (
      equipmentInstanceId !==
        null &&
      !selectedEquipmentInstance
    ) {
      setError(
        "The selected equipment instance is no longer available."
      );

      return;
    }

    if (
      selectedEquipmentInstance &&
      selectedEquipmentInstance.equipmentTypeId !==
        selectedRequirement.equipmentTypeId
    ) {
      setError(
        "The selected equipment instance does not match the required equipment type."
      );

      return;
    }

    if (
      selectedEquipmentInstance &&
      selectedEquipmentInstance.status !==
        "Available"
    ) {
      setError(
        "The selected equipment instance is no longer available."
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
        "Efficiency rate must be greater than 0 and less than or equal to 100."
      );

      return;
    }

    const minimumEfficiency =
      normalizeEfficiencyToPercent(
        selectedRequirement.minAcceptableEfficiency
      );

    if (
      efficiencyPercent <
      minimumEfficiency
    ) {
      setError(
        `Efficiency rate must be at least ${minimumEfficiency}%.`
      );

      return;
    }

    if (
      !form.startDate ||
      !form.endDate
    ) {
      setError(
        "Please select start and end dates."
      );

      return;
    }

    const startDate =
      new Date(
        `${form.startDate}T00:00:00`
      );

    const endDate =
      new Date(
        `${form.endDate}T23:59:59`
      );

    if (
      Number.isNaN(
        startDate.getTime()
      ) ||
      Number.isNaN(
        endDate.getTime()
      )
    ) {
      setError(
        "Allocation dates are invalid."
      );

      return;
    }

    if (
      endDate <= startDate
    ) {
      setError(
        "End date must be after start date."
      );

      return;
    }

    if (
      form.isSubstitute &&
      !selectedRequirement.allowSubstitute
    ) {
      setError(
        "This requirement does not allow substitute equipment."
      );

      return;
    }

    try {
      setSaving(true);
      setError("");

      await createAllocationEquipmentDetail({
        allocationPlanId,

        expEquipmentReqId:
          selectedRequirement.expEquipmentReqId,

        phaseEquipmentReqId:
          null,

        allocatedEquipmentTypeId:
          selectedRequirement.equipmentTypeId,

        equipmentInstanceId,

        quantity,

        efficiencyRate:
          efficiencyPercent /
          100,

        isSubstitute:
          form.isSubstitute,

        startDate:
          toDateTimePayload(
            form.startDate
          ),

        endDate:
          toDateTimePayload(
            form.endDate,
            true
          ),

        status:
          form.status,
      });

      await onCreated();
    } catch (submitError) {
      console.error(
        "Create equipment allocation failed:",
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

  if (loadingRequirements) {
    return (
      <div className="resource-form-card">
        Loading equipment requirements...
      </div>
    );
  }

  return (
    <form
      className="resource-form-grid"
      onSubmit={handleSubmit}
    >
      {error && (
        <div className="resource-form-error">
          {error}
        </div>
      )}

      <section className="resource-form-card">
        <h2>
          Equipment Information
        </h2>

        <label htmlFor="expEquipmentReqId">
          Equipment Requirement
        </label>

        <select
          id="expEquipmentReqId"
          name="expEquipmentReqId"
          value={
            form.expEquipmentReqId
          }
          onChange={
            handleInputChange
          }
          disabled={saving}
          required
        >
          <option value="">
            Select requirement
          </option>

          {requirements.map(
            (requirement) => (
              <option
                key={
                  requirement.expEquipmentReqId
                }
                value={
                  requirement.expEquipmentReqId
                }
              >
                Requirement #
                {
                  requirement.expEquipmentReqId
                }
                {" - "}
                {requirement.equipmentTypeName ||
                  `Equipment Type #${requirement.equipmentTypeId}`}
                {" - Quantity: "}
                {
                  requirement.quantity
                }
              </option>
            )
          )}
        </select>

        {requirements.length ===
          0 && (
          <small>
            This experiment has no
            equipment requirements.
          </small>
        )}

        <label htmlFor="equipmentInstanceId">
          Equipment Instance
        </label>

        <select
          id="equipmentInstanceId"
          name="equipmentInstanceId"
          value={
            form.equipmentInstanceId
          }
          onChange={
            handleInputChange
          }
          disabled={
            saving ||
            !selectedRequirement ||
            loadingInstances
          }
        >
          <option value="">
            {loadingInstances
              ? "Loading available equipment..."
              : "Allocate by quantity only"}
          </option>

          {equipmentInstances.map(
            (instance) => (
              <option
                key={
                  instance.equipmentInstanceId
                }
                value={
                  instance.equipmentInstanceId
                }
              >
                {getEquipmentInstanceLabel(
                  instance
                )}
              </option>
            )
          )}
        </select>

        {!selectedRequirement && (
          <small>
            Select an equipment
            requirement first.
          </small>
        )}

        {selectedRequirement &&
          !loadingInstances &&
          equipmentInstances.length ===
            0 && (
            <small>
              No available individual
              equipment instance was found
              for this equipment type. The
              allocation can still be
              created by quantity.
            </small>
          )}

        {selectedEquipmentInstance && (
          <div className="resource-preview">
            <div>
              <span>
                Instance ID
              </span>

              <strong>
                #
                {
                  selectedEquipmentInstance.equipmentInstanceId
                }
              </strong>
            </div>

            <div>
              <span>
                Asset Code
              </span>

              <strong>
                {selectedEquipmentInstance.assetCode ||
                  "-"}
              </strong>
            </div>

            <div>
              <span>
                Serial Number
              </span>

              <strong>
                {selectedEquipmentInstance.serialNumber ||
                  "-"}
              </strong>
            </div>

            <div>
              <span>
                Condition
              </span>

              <strong>
                {
                  selectedEquipmentInstance.conditionLevel
                }
              </strong>
            </div>

            <div>
              <span>
                Status
              </span>

              <strong>
                {
                  selectedEquipmentInstance.status
                }
              </strong>
            </div>
          </div>
        )}

        <label htmlFor="quantity">
          Quantity
        </label>

        <input
          id="quantity"
          type="number"
          name="quantity"
          min="1"
          max={
            selectedEquipmentInstance
              ? 1
              : selectedRequirement?.quantity
          }
          value={
            form.quantity
          }
          onChange={
            handleInputChange
          }
          disabled={
            saving ||
            Boolean(
              selectedEquipmentInstance
            )
          }
          required
        />

        {selectedEquipmentInstance && (
          <small>
            Quantity is fixed at 1
            because a specific equipment
            instance is selected.
          </small>
        )}

        <label className="resource-checkbox">
          <input
            type="checkbox"
            name="isSubstitute"
            checked={
              form.isSubstitute
            }
            onChange={
              handleCheckboxChange
            }
            disabled={
              saving ||
              !selectedRequirement
                ?.allowSubstitute
            }
          />

          <div>
            <strong>
              Use substitute equipment
            </strong>

            <small>
              Use another equipment type
              only when the required
              equipment is unavailable.
            </small>
          </div>
        </label>

        <label htmlFor="efficiencyRate">
          Efficiency Rate (%)
        </label>

        <input
          id="efficiencyRate"
          type="number"
          name="efficiencyRate"
          min="0.01"
          max="100"
          step="0.01"
          value={
            form.efficiencyRate
          }
          onChange={
            handleInputChange
          }
          disabled={saving}
          required
        />

        {selectedRequirement && (
          <small>
            Minimum acceptable efficiency:{" "}
            {normalizeEfficiencyToPercent(
              selectedRequirement.minAcceptableEfficiency
            )}
            %
          </small>
        )}
      </section>

      <section className="resource-form-card">
        <h2>
          Allocation Period
        </h2>

        <label htmlFor="startDate">
          Start Date
        </label>

        <input
          id="startDate"
          type="date"
          name="startDate"
          value={
            form.startDate
          }
          onChange={
            handleInputChange
          }
          disabled={saving}
          required
        />

        <label htmlFor="endDate">
          End Date
        </label>

        <input
          id="endDate"
          type="date"
          name="endDate"
          value={
            form.endDate
          }
          min={
            form.startDate ||
            undefined
          }
          onChange={
            handleInputChange
          }
          disabled={saving}
          required
        />

        <label htmlFor="status">
          Initial Status
        </label>

        <select
          id="status"
          name="status"
          value={
            form.status
          }
          onChange={
            handleInputChange
          }
          disabled={saving}
        >
          <option value="Proposed">
            Proposed
          </option>

          <option value="Reserved">
            Reserved
          </option>
        </select>

        <div className="resource-preview">
          <div>
            <span>
              Allocation Plan
            </span>

            <strong>
              #{allocationPlanId}
            </strong>
          </div>

          <div>
            <span>
              Requirement ID
            </span>

            <strong>
              {selectedRequirement
                ? `#${selectedRequirement.expEquipmentReqId}`
                : "-"}
            </strong>
          </div>

          <div>
            <span>
              Equipment Type
            </span>

            <strong>
              {selectedRequirement
                ?.equipmentTypeName ||
                "-"}
            </strong>
          </div>

          <div>
            <span>
              Equipment Type ID
            </span>

            <strong>
              {selectedRequirement
                ? `#${selectedRequirement.equipmentTypeId}`
                : "-"}
            </strong>
          </div>

          <div>
            <span>
              Equipment Instance
            </span>

            <strong>
              {selectedEquipmentInstance
                ? `#${selectedEquipmentInstance.equipmentInstanceId}`
                : "Quantity-based"}
            </strong>
          </div>

          <div>
            <span>
              Minimum Efficiency
            </span>

            <strong>
              {selectedRequirement
                ? `${normalizeEfficiencyToPercent(
                    selectedRequirement.minAcceptableEfficiency
                  )}%`
                : "-"}
            </strong>
          </div>
        </div>

        <div className="resource-form-actions">
          <button
            type="button"
            className="resource-cancel-button"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="resource-save-button"
            disabled={
              saving ||
              requirements.length ===
                0 ||
              loadingInstances
            }
          >
            {saving
              ? "Adding..."
              : "Add Equipment"}
          </button>
        </div>
      </section>
    </form>
  );
}