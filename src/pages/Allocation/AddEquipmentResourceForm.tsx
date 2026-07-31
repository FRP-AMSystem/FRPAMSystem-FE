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
} from "../../types/equipment";

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
            title?: string;
            errors?: Record<
              string,
              string[]
            >;
          };
        };
      }
    ).response;

    if (response?.data?.message) {
      return response.data.message;
    }

    if (response?.data?.errors) {
      return Object.values(
        response.data.errors
      )
        .flat()
        .join(" ");
    }

    if (response?.data?.title) {
      return response.data.title;
    }
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
    value === undefined
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
    instance.instanceName ||
    instance.assetCode ||
    instance.code ||
    `Equipment Instance #${instance.equipmentInstanceId}`;

  const information: string[] = [
    `#${instance.equipmentInstanceId}`,
    name,
  ];

  if (
    instance.assetCode &&
    instance.assetCode !== name
  ) {
    information.push(
      `Asset: ${instance.assetCode}`
    );
  }

  if (instance.serialNumber) {
    information.push(
      `Serial: ${instance.serialNumber}`
    );
  }

  if (instance.conditionLevel) {
    information.push(
      `Condition: ${instance.conditionLevel}`
    );
  }

  return information.join(" - ");
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
  ] = useState<EquipmentInstance[]>([]);

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
        setError(
          "Allocation plan or experiment ID is invalid."
        );

        setLoadingRequirements(false);
        return;
      }

      try {
        setLoadingRequirements(true);
        setError("");

        const data =
          await getExperimentEquipmentRequirements({
            experimentId,
            page: 1,
            size: 100,
          });

        setRequirements(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (loadError) {
        console.error(
          "Load equipment requirements failed:",
          loadError
        );

        setError(
          getErrorMessage(
            loadError
          )
        );

        setRequirements([]);
      } finally {
        setLoadingRequirements(false);
      }
    }

    void loadRequirements();
  }, [
    allocationPlanId,
    experimentId,
  ]);

  useEffect(() => {
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
        setLoadingInstances(true);
        setError("");

        const data =
          await getAvailableEquipmentInstances(
            equipmentTypeId
          );

        const validInstances =
          Array.isArray(data)
            ? data.filter(
                (instance) =>
                  Number.isInteger(
                    instance.equipmentInstanceId
                  ) &&
                  instance.equipmentInstanceId >
                    0 &&
                  instance.equipmentTypeId ===
                    equipmentTypeId &&
                  instance.status ===
                    "Available"
              )
            : [];

        setEquipmentInstances(
          validInstances
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

        setEquipmentInstances([]);

        setError(
          getErrorMessage(
            loadError
          )
        );
      } finally {
        setLoadingInstances(false);
      }
    }

    void loadEquipmentInstances();
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
          expEquipmentReqId: value,
          equipmentInstanceId: "",
          quantity: "1",
          isSubstitute: false,
          efficiencyRate: requirement
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
          equipmentInstanceId: value,

          // Một instance là một thiết bị cụ thể,
          // nên quantity phải bằng 1.
          quantity: value
            ? "1"
            : current.quantity,
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
      Number(form.quantity);

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
      !Number.isFinite(
        efficiencyPercent
      ) ||
      efficiencyPercent < 0 ||
      efficiencyPercent > 100
    ) {
      setError(
        "Efficiency rate must be between 0 and 100."
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
                {" - "}
                Quantity:{" "}
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
                  selectedEquipmentInstance.code ||
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
                {selectedEquipmentInstance.conditionLevel ||
                  "-"}
              </strong>
            </div>

            <div>
              <span>
                Status
              </span>

              <strong>
                {selectedEquipmentInstance.status ||
                  "-"}
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
          disabled={Boolean(
            selectedEquipmentInstance
          )}
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
          min="0"
          max="100"
          step="0.01"
          value={
            form.efficiencyRate
          }
          onChange={
            handleInputChange
          }
          required
        />

        {selectedRequirement && (
          <small>
            Minimum acceptable
            efficiency:{" "}
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
          onClick={(event) => {
            const input =
              event.currentTarget as HTMLInputElement & {
                showPicker?: () => void;
              };

            input.showPicker?.();
          }}
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
          onClick={(event) => {
            const input =
              event.currentTarget as HTMLInputElement & {
                showPicker?: () => void;
              };

            input.showPicker?.();
          }}
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