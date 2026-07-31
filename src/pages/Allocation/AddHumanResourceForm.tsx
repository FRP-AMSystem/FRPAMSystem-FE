import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  createAllocationHumanDetail,
} from "../../services/allocationDetailService";

import {
  getHumanResourceProfiles,
  type HumanResourceProfile,
} from "../../services/humanResourceProfileService";

import type {
  AllocationDetailStatus,
} from "../../types/allocationHumanDetail";

import "./AllocationResourceForm.css";

interface AddHumanResourceFormProps {
  allocationPlanId: number;
  onCreated: () => void | Promise<void>;
  onCancel: () => void;
}

interface FormState {
  humanResourceId: string;
  workingHours: string;
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

  return "Cannot create human allocation.";
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

function getHumanResourceLabel(
  resource: HumanResourceProfile
): string {
  const name =
    resource.fullName ||
    resource.username ||
    resource.email ||
    `Human resource #${resource.humanResourceId}`;

  const role = resource.roleName
    ? ` - ${resource.roleName}`
    : "";

  return `${name}${role}`;
}

export default function AddHumanResourceForm({
  allocationPlanId,
  onCreated,
  onCancel,
}: AddHumanResourceFormProps) {
  const [resources, setResources] = useState<
    HumanResourceProfile[]
  >([]);

  const [form, setForm] = useState<FormState>({
    humanResourceId: "",
    workingHours: "1",
    startDate: "",
    endDate: "",
    status: "Proposed",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedResource = useMemo(
    () =>
      resources.find(
        (resource) =>
          resource.humanResourceId ===
          Number(form.humanResourceId)
      ),
    [resources, form.humanResourceId]
  );

  useEffect(() => {
    async function loadHumanResources() {
      if (
        !Number.isInteger(allocationPlanId) ||
        allocationPlanId <= 0
      ) {
        setError(
          "Allocation plan ID is invalid."
        );
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data =
          await getHumanResourceProfiles({
            status: "Available",
            page: 1,
            size: 100,
          });

        setResources(
          Array.isArray(data) ? data : []
        );
      } catch (loadError) {
        console.error(
          "Load human resources failed:",
          loadError
        );

        setResources([]);
        setError(getErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    }

    void loadHumanResources();
  }, [allocationPlanId]);

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

    if (!selectedResource) {
      setError(
        "Please select a human resource."
      );
      return;
    }

    const workingHours = Number(
      form.workingHours
    );

    if (
      !Number.isFinite(workingHours) ||
      workingHours <= 0
    ) {
      setError(
        "Working hours must be greater than 0."
      );
      return;
    }

    if (
      selectedResource.maxWorkingHoursPerDay > 0 &&
      workingHours >
        selectedResource.maxWorkingHoursPerDay
    ) {
      setError(
        `Working hours cannot exceed ${selectedResource.maxWorkingHoursPerDay} hours per day.`
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

      await createAllocationHumanDetail({
        allocationPlanId,
        expHumanReqId: null,
        phaseHumanReqId: null,
        humanResourceId:
          selectedResource.humanResourceId,
        workingHours,
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
        "Create human allocation failed:",
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
        Loading available human resources...
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
        <h2>Human Resource</h2>

        <label htmlFor="humanResourceId">
          Available Human Resource
        </label>

        <select
          id="humanResourceId"
          name="humanResourceId"
          value={form.humanResourceId}
          onChange={handleChange}
          required
        >
          <option value="">
            Select human resource
          </option>

          {resources.map((resource) => (
            <option
              key={resource.humanResourceId}
              value={resource.humanResourceId}
            >
              {getHumanResourceLabel(resource)}
            </option>
          ))}
        </select>

        {resources.length === 0 && (
          <small>
            No available human resources were
            returned by the API.
          </small>
        )}

        <label htmlFor="workingHours">
          Working Hours
        </label>

        <input
          id="workingHours"
          type="number"
          name="workingHours"
          min="0.5"
          step="0.5"
          max={
            selectedResource
              ?.maxWorkingHoursPerDay || undefined
          }
          value={form.workingHours}
          onChange={handleChange}
          required
        />

        {selectedResource && (
          <small>
            Maximum:{" "}
            {
              selectedResource.maxWorkingHoursPerDay
            }{" "}
            hours/day. Current workload:{" "}
            {selectedResource.currentWorkload}.
          </small>
        )}
      </section>

      <section className="resource-form-card">
        <h2>Allocation Period</h2>

        <label htmlFor="humanStartDate">
          Start Date
        </label>

        <input
          id="humanStartDate"
          type="date"
          name="startDate"
          value={form.startDate}
          onChange={handleChange}
          onClick={(event) =>
            openDatePicker(event.currentTarget)
          }
          required
        />

        <label htmlFor="humanEndDate">
          End Date
        </label>

        <input
          id="humanEndDate"
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

        <label htmlFor="humanStatus">
          Initial Status
        </label>

        <select
          id="humanStatus"
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
            <span>Human Resource</span>
            <strong>
              {selectedResource
                ? getHumanResourceLabel(
                    selectedResource
                  )
                : "-"}
            </strong>
          </div>

          <div>
            <span>Working Hours</span>
            <strong>
              {form.workingHours || "-"}
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
              saving || resources.length === 0
            }
          >
            {saving
              ? "Adding..."
              : "Add Human"}
          </button>
        </div>
      </section>
    </form>
  );
}