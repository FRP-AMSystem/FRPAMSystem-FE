import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import axios from "axios";

import {
  CalendarCheck2,
  CalendarDays,
  Clock3,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  createExperiment,
} from "../../services/experimentService";

import "./ExperimentForm.css";

interface ExperimentFormState {
  experimentName: string;
  description: string;
  expectStartDate: string;
  expectEndDate: string;
  deadline: string;
  priority: string;
}

const priorityLabels: Record<string, string> = {
  "0": "Low",
  "1": "Medium",
  "2": "High",
  "3": "Urgent",
};

function convertDateToIso(
  date: string
): string {
  return new Date(
    `${date}T00:00:00`
  ).toISOString();
}

function getTodayDateValue(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getApiErrorMessage(
  error: unknown
): string {
  if (!axios.isAxiosError(error)) {
    return "Create experiment failed.";
  }

  const responseData =
    error.response?.data;

  if (responseData?.errors) {
    const messages =
      Object.entries(
        responseData.errors
      )
        .flatMap(
          ([field, value]) => {
            const fieldErrors =
              Array.isArray(value)
                ? value
                : [String(value)];

            return fieldErrors.map(
              (message) =>
                `${field}: ${String(
                  message
                )}`
            );
          }
        )
        .join(" ");

    if (messages) {
      return messages;
    }
  }

  return (
    responseData?.message ||
    responseData?.title ||
    `Create experiment failed${
      error.response?.status
        ? ` (${error.response.status})`
        : ""
    }.`
  );
}

function openDatePicker(
  input: HTMLInputElement | null
): void {
  if (!input || input.disabled) {
    return;
  }

  try {
    input.focus();

    if (
      typeof input.showPicker ===
      "function"
    ) {
      input.showPicker();
    }
  } catch (error) {
    console.warn(
      "Unable to open date picker:",
      error
    );

    input.focus();
  }
}

export default function CreateExperiment() {
  const navigate =
    useNavigate();

  const today =
    getTodayDateValue();

  const startDateInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const endDateInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const deadlineInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [
    form,
    setForm,
  ] = useState<ExperimentFormState>({
    experimentName: "",
    description: "",
    expectStartDate: "",
    expectEndDate: "",
    deadline: "",
    priority: "1",
  });

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const handleChange = (
    event: ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    >
  ) => {
    const {
      name,
      value,
    } = event.target;

    setError("");

    if (
      name === "expectStartDate"
    ) {
      setForm(
        (currentForm) => ({
          ...currentForm,

          expectStartDate:
            value,

          expectEndDate:
            currentForm.expectEndDate &&
            currentForm.expectEndDate <
              value
              ? ""
              : currentForm.expectEndDate,

          deadline:
            currentForm.deadline &&
            currentForm.deadline <
              value
              ? ""
              : currentForm.deadline,
        })
      );

      return;
    }

    if (
      name === "expectEndDate"
    ) {
      setForm(
        (currentForm) => ({
          ...currentForm,

          expectEndDate:
            value,

          deadline:
            currentForm.deadline &&
            currentForm.deadline <
              value
              ? ""
              : currentForm.deadline,
        })
      );

      return;
    }

    setForm(
      (currentForm) => ({
        ...currentForm,
        [name]: value,
      })
    );
  };

  const handleDateWrapperKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    input: HTMLInputElement | null
  ) => {
    if (
      event.key !== "Enter" &&
      event.key !== " "
    ) {
      return;
    }

    event.preventDefault();

    openDatePicker(input);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    const experimentName =
      form.experimentName.trim();

    const description =
      form.description.trim();

    if (!experimentName) {
      setError(
        "Experiment name is required."
      );
      return;
    }

    if (!form.expectStartDate) {
      setError(
        "Expected start date is required."
      );
      return;
    }

    if (!form.expectEndDate) {
      setError(
        "Expected end date is required."
      );
      return;
    }

    if (
      form.expectStartDate <
      today
    ) {
      setError(
        "Expected start date cannot be earlier than today."
      );
      return;
    }

    if (!form.deadline) {
      setError(
        "Deadline is required."
      );
      return;
    }

    if (
      form.expectStartDate >
      form.expectEndDate
    ) {
      setError(
        "Expected end date must be after the expected start date."
      );
      return;
    }

    if (
      form.deadline <
      form.expectEndDate
    ) {
      setError(
        "Deadline must be on or after the expected end date."
      );
      return;
    }

    const researcherId =
      Number(
        localStorage.getItem(
          "userId"
        )
      );

    if (
      !Number.isInteger(
        researcherId
      ) ||
      researcherId <= 0
    ) {
      setError(
        "Researcher information was not found. Please log in again."
      );
      return;
    }

    const priority =
      Number(form.priority);

    if (
      !Number.isInteger(priority)
    ) {
      setError(
        "Priority is invalid."
      );
      return;
    }

    try {
      setSaving(true);

      await createExperiment({
        experimentName,
        description,
        researcherId,

        expectStartDate:
          convertDateToIso(
            form.expectStartDate
          ),

        expectEndDate:
          convertDateToIso(
            form.expectEndDate
          ),

        deadline:
          convertDateToIso(
            form.deadline
          ),

        priority,

        // The initial status is controlled by the system.
        status: "Draft",
      });

      navigate("/experiments");
    } catch (submitError) {
      console.error(
        "Create experiment error:",
        submitError
      );

      setError(
        getApiErrorMessage(
          submitError
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const endDateDisabled =
    saving ||
    !form.expectStartDate;

  const deadlineDisabled =
    saving ||
    !form.expectEndDate;

  return (
    <DashboardLayout>
      <div className="experiment-form-page">
        <div className="experiment-form-header">
          <div>
            <p className="breadcrumb">
              Dashboard / Experiments / Create
            </p>

            <h1>
              Create Experiment
            </h1>

            <span>
              Create an experiment before adding equipment requirements.
            </span>
          </div>

          <button
            type="button"
            className="back-btn"
            onClick={() =>
              navigate(
                "/experiments"
              )
            }
          >
            Back
          </button>
        </div>

        {error && (
          <div
            className="form-error"
            role="alert"
          >
            {error}
          </div>
        )}

        <form
          className="experiment-form-grid"
          onSubmit={
            handleSubmit
          }
        >
          <section className="experiment-form-card">
            <h3>
              Experiment Information
            </h3>

            <label htmlFor="experimentName">
              Experiment Name
            </label>

            <input
              id="experimentName"
              name="experimentName"
              value={
                form.experimentName
              }
              onChange={
                handleChange
              }
              placeholder="Example: Plant Growth Monitoring"
              disabled={saving}
              required
            />

            <label htmlFor="description">
              Description
            </label>

            <textarea
              id="description"
              name="description"
              value={
                form.description
              }
              onChange={
                handleChange
              }
              placeholder="Describe experiment purpose..."
              rows={5}
              disabled={saving}
            />

            <div className="experiment-date-section">
              <div className="experiment-date-section-heading">
                <div>
                  <h4>
                    Planned Timeline
                  </h4>

                  <p>
                    Select the expected dates for this experiment.
                  </p>
                </div>
              </div>

              <div className="experiment-date-fields">
                <div className="experiment-date-field">
                  <label htmlFor="expectStartDate">
                    Expected Start Date
                  </label>

                  <div
                    className="experiment-date-input-wrap"
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      openDatePicker(
                        startDateInputRef.current
                      )
                    }
                    onKeyDown={(
                      event
                    ) =>
                      handleDateWrapperKeyDown(
                        event,
                        startDateInputRef.current
                      )
                    }
                  >
                    <span className="experiment-date-icon">
                      <CalendarDays
                        size={18}
                      />
                    </span>

                    <input
                      ref={
                        startDateInputRef
                      }
                      id="expectStartDate"
                      type="date"
                      name="expectStartDate"
                      value={
                        form.expectStartDate
                      }
                      min={today}
                      onChange={
                        handleChange
                      }
                      onClick={(
                        event
                      ) => {
                        event.stopPropagation();

                        openDatePicker(
                          event.currentTarget
                        );
                      }}
                      disabled={saving}
                      required
                    />
                  </div>

                  <small>
                    Planned start date of the experiment.
                  </small>
                </div>

                <div className="experiment-date-field">
                  <label htmlFor="expectEndDate">
                    Expected End Date
                  </label>

                  <div
                    className={[
                      "experiment-date-input-wrap",
                      endDateDisabled
                        ? "experiment-date-input-disabled"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    role="button"
                    tabIndex={
                      endDateDisabled
                        ? -1
                        : 0
                    }
                    aria-disabled={
                      endDateDisabled
                    }
                    onClick={() => {
                      if (
                        endDateDisabled
                      ) {
                        return;
                      }

                      openDatePicker(
                        endDateInputRef.current
                      );
                    }}
                    onKeyDown={(
                      event
                    ) => {
                      if (
                        endDateDisabled
                      ) {
                        return;
                      }

                      handleDateWrapperKeyDown(
                        event,
                        endDateInputRef.current
                      );
                    }}
                  >
                    <span className="experiment-date-icon experiment-date-icon-end">
                      <CalendarCheck2
                        size={18}
                      />
                    </span>

                    <input
                      ref={
                        endDateInputRef
                      }
                      id="expectEndDate"
                      type="date"
                      name="expectEndDate"
                      value={
                        form.expectEndDate
                      }
                      min={
                        form.expectStartDate ||
                        undefined
                      }
                      onChange={
                        handleChange
                      }
                      onClick={(
                        event
                      ) => {
                        event.stopPropagation();

                        openDatePicker(
                          event.currentTarget
                        );
                      }}
                      disabled={
                        endDateDisabled
                      }
                      required
                    />
                  </div>

                  <small>
                    Must be on or after the expected start date.
                  </small>
                </div>

                <div className="experiment-date-field experiment-deadline-field">
                  <label htmlFor="deadline">
                    Deadline
                  </label>

                  <div
                    className={[
                      "experiment-date-input-wrap",
                      deadlineDisabled
                        ? "experiment-date-input-disabled"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    role="button"
                    tabIndex={
                      deadlineDisabled
                        ? -1
                        : 0
                    }
                    aria-disabled={
                      deadlineDisabled
                    }
                    onClick={() => {
                      if (
                        deadlineDisabled
                      ) {
                        return;
                      }

                      openDatePicker(
                        deadlineInputRef.current
                      );
                    }}
                    onKeyDown={(
                      event
                    ) => {
                      if (
                        deadlineDisabled
                      ) {
                        return;
                      }

                      handleDateWrapperKeyDown(
                        event,
                        deadlineInputRef.current
                      );
                    }}
                  >
                    <span className="experiment-date-icon experiment-date-icon-deadline">
                      <Clock3
                        size={18}
                      />
                    </span>

                    <input
                      ref={
                        deadlineInputRef
                      }
                      id="deadline"
                      type="date"
                      name="deadline"
                      value={
                        form.deadline
                      }
                      min={
                        form.expectEndDate ||
                        undefined
                      }
                      onChange={
                        handleChange
                      }
                      onClick={(
                        event
                      ) => {
                        event.stopPropagation();

                        openDatePicker(
                          event.currentTarget
                        );
                      }}
                      disabled={
                        deadlineDisabled
                      }
                      required
                    />
                  </div>

                  <small>
                    Must be on or after the expected end date.
                  </small>
                </div>
              </div>
            </div>

            <label htmlFor="priority">
              Priority
            </label>

            <select
              id="priority"
              name="priority"
              value={
                form.priority
              }
              onChange={
                handleChange
              }
              disabled={saving}
            >
              <option value="0">
                Low
              </option>

              <option value="1">
                Medium
              </option>

              <option value="2">
                High
              </option>

              <option value="3">
                Urgent
              </option>
            </select>
          </section>

          <section className="experiment-form-card experiment-preview-card">
            <h3>
              Preview
            </h3>

            <div className="experiment-preview">
              <div>
                <span>Name</span>

                <strong>
                  {form.experimentName ||
                    "Not entered"}
                </strong>
              </div>

              <div>
                <span>Priority</span>

                <strong>
                  {priorityLabels[
                    form.priority
                  ] ?? "Unknown"}
                </strong>
              </div>

              <div>
                <span>
                  Expected Duration
                </span>

                <strong>
                  {form.expectStartDate ||
                    "-"}{" "}
                  →{" "}
                  {form.expectEndDate ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>Deadline</span>

                <strong>
                  {form.deadline ||
                    "-"}
                </strong>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                disabled={saving}
                onClick={() =>
                  navigate(
                    "/experiments"
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="save-btn"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Create Experiment"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </DashboardLayout>
  );
}
