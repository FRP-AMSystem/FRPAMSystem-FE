import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  createAllocationLandDetail,
} from "../../services/allocationDetailService";

import {
  getLandResources,
  type LandResource,
} from "../../services/landResourceService";

import type {
  AllocationDetailStatus,
} from "../../types/allocationLand";

import "./AllocationResourceForm.css";

interface AddLandResourceFormProps {
  allocationPlanId: number;
  experimentId: number;
  onCreated: () => void | Promise<void>;
  onCancel: () => void;
}

interface FormState {
  landId: string;
  expLandReqId: string;
  startDate: string;
  endDate: string;
  status: AllocationDetailStatus;
}

function getErrorMessage(error: unknown): string {
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
            errors?: Record<string, string[]>;
          };
        };
      }
    ).response;

    if (response?.data?.message) {
      return response.data.message;
    }

    if (response?.data?.errors) {
      return Object.values(response.data.errors)
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

  return "Cannot create land allocation.";
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

function openDatePicker(
  input: HTMLInputElement
): void {
  const dateInput = input as HTMLInputElement & {
    showPicker?: () => void;
  };

  dateInput.showPicker?.();
}

function getLandLabel(
  land: LandResource
): string {
  const code =
    land.landCode || `Land #${land.landId}`;

  const area = land.areaName
    ? ` - ${land.areaName}`
    : land.areaId
      ? ` - Area #${land.areaId}`
      : "";

  const size =
    Number.isFinite(land.areaSize) &&
    land.areaSize > 0
      ? ` - ${land.areaSize} m²`
      : "";

  const soil = land.soilType
    ? ` - ${land.soilType}`
    : "";

  return `${code}${area}${size}${soil}`;
}

export default function AddLandResourceForm({
  allocationPlanId,
  experimentId,
  onCreated,
  onCancel,
}: AddLandResourceFormProps) {
  const [lands, setLands] = useState<
    LandResource[]
  >([]);

  const [form, setForm] = useState<FormState>({
    landId: "",
    expLandReqId: "",
    startDate: "",
    endDate: "",
    status: "Proposed",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedLand = useMemo(
    () =>
      lands.find(
        (land) =>
          land.landId === Number(form.landId)
      ),
    [lands, form.landId]
  );

  useEffect(() => {
    async function loadAvailableLands() {
      if (
        !Number.isInteger(allocationPlanId) ||
        allocationPlanId <= 0 ||
        !Number.isInteger(experimentId) ||
        experimentId <= 0
      ) {
        setError(
          "Allocation plan or experiment ID is invalid."
        );
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await getLandResources({
          status: "Available",
          page: 1,
          size: 100,
        });

        setLands(
          Array.isArray(data) ? data : []
        );
      } catch (loadError) {
        console.error(
          "Load land resources failed:",
          loadError
        );

        setLands([]);
        setError(getErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    }

    void loadAvailableLands();
  }, [allocationPlanId, experimentId]);

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target;

    setForm((current) => {
      if (
        name === "startDate" &&
        current.endDate &&
        current.endDate < value
      ) {
        return {
          ...current,
          startDate: value,
          endDate: "",
        };
      }

      return {
        ...current,
        [name]: value,
      };
    });
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    if (!selectedLand) {
      setError(
        "Please select an available land resource."
      );
      return;
    }

    const expLandReqId = Number(
      form.expLandReqId
    );

    if (
      !Number.isInteger(expLandReqId) ||
      expLandReqId <= 0
    ) {
      setError(
        "Experiment land requirement ID must be a positive integer."
      );
      return;
    }

    if (!form.startDate || !form.endDate) {
      setError(
        "Please select start and end dates."
      );
      return;
    }

    const startDate = new Date(
      `${form.startDate}T00:00:00`
    );

    const endDate = new Date(
      `${form.endDate}T23:59:59`
    );

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      setError("Allocation dates are invalid.");
      return;
    }

    if (endDate < startDate) {
      setError(
        "End date cannot be before start date."
      );
      return;
    }

    try {
      setSaving(true);

      await createAllocationLandDetail({
        allocationPlanId,
        landId: selectedLand.landId,
        expLandReqId,
        startDate: toDateTimePayload(
          form.startDate
        ),
        endDate: toDateTimePayload(
          form.endDate,
          true
        ),
        status: form.status,
      });

      await onCreated();
    } catch (submitError) {
      console.error(
        "Create land allocation failed:",
        submitError
      );

      setError(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="resource-form-card">
        Loading available land resources...
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
        <h2>Land Resource</h2>

        <label htmlFor="landId">
          Available Land
        </label>

        <select
          id="landId"
          name="landId"
          value={form.landId}
          onChange={handleChange}
          required
        >
          <option value="">
            Select land resource
          </option>

          {lands.map((land) => (
            <option
              key={land.landId}
              value={land.landId}
            >
              {getLandLabel(land)}
            </option>
          ))}
        </select>

        {lands.length === 0 && (
          <small>
            No available land resources were
            returned by the API.
          </small>
        )}

        <label htmlFor="expLandReqId">
          Experiment Land Requirement ID
        </label>

        <input
          id="expLandReqId"
          type="number"
          name="expLandReqId"
          min="1"
          step="1"
          value={form.expLandReqId}
          onChange={handleChange}
          placeholder="Enter expLandReqId"
          required
        />

        <small>
          The current frontend does not have an
          ExperimentLandRequirement service, so
          this ID is entered manually.
        </small>

        {selectedLand && (
          <div className="resource-preview">
            <div>
              <span>Land Code</span>

              <strong>
                {selectedLand.landCode || "-"}
              </strong>
            </div>

            <div>
              <span>Area</span>

              <strong>
                {selectedLand.areaName ||
                  `#${selectedLand.areaId}`}
              </strong>
            </div>

            <div>
              <span>Area Size</span>

              <strong>
                {selectedLand.areaSize} m²
              </strong>
            </div>

            <div>
              <span>Soil Type</span>

              <strong>
                {selectedLand.soilType || "-"}
              </strong>
            </div>

            <div>
              <span>Location</span>

              <strong>
                {selectedLand.location || "-"}
              </strong>
            </div>
          </div>
        )}
      </section>

      <section className="resource-form-card">
        <h2>Allocation Period</h2>

        <label htmlFor="landStartDate">
          Start Date
        </label>

        <input
          id="landStartDate"
          type="date"
          name="startDate"
          value={form.startDate}
          onChange={handleChange}
          onClick={(event) =>
            openDatePicker(event.currentTarget)
          }
          required
        />

        <label htmlFor="landEndDate">
          End Date
        </label>

        <input
          id="landEndDate"
          type="date"
          name="endDate"
          value={form.endDate}
          min={form.startDate || undefined}
          onChange={handleChange}
          onClick={(event) =>
            openDatePicker(event.currentTarget)
          }
          required
        />

        <label htmlFor="landStatus">
          Initial Status
        </label>

        <select
          id="landStatus"
          name="status"
          value={form.status}
          onChange={handleChange}
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
            <span>Allocation Plan</span>

            <strong>
              #{allocationPlanId}
            </strong>
          </div>

          <div>
            <span>Experiment</span>

            <strong>
              #{experimentId}
            </strong>
          </div>

          <div>
            <span>Land Requirement</span>

            <strong>
              {form.expLandReqId
                ? `#${form.expLandReqId}`
                : "-"}
            </strong>
          </div>

          <div>
            <span>Status</span>

            <strong>{form.status}</strong>
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
              saving || lands.length === 0
            }
          >
            {saving
              ? "Adding..."
              : "Add Land"}
          </button>
        </div>
      </section>
    </form>
  );
}