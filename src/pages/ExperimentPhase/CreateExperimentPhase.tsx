import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  ArrowLeft,
  CalendarCheck2,
  CalendarDays,
  Layers3,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getExperiments,
} from "../../services/experimentService";

import {
  createExperimentPhase,
} from "../../services/experimentPhaseService";

import type {
  ExperimentResponse,
} from "../../types/experiment";

import type {
  ExperimentPhaseStatus,
} from "../../types/experimentPhase";

import "../ExperimentEquipmentRequirement/RequirementForm.css";
import "./ExperimentPhaseForm.css";

interface ExperimentPhaseFormState {
  experimentId: string;
  phaseName: string;
  phaseDescription: string;
  phaseOrder: string;
  expectedStartDate: string;
  expectedEndDate: string;
  status: ExperimentPhaseStatus;
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
          status?: number;
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

    if (
      response?.status === 401
    ) {
      return "Your login session is invalid or expired. Please sign in again.";
    }

    if (
      response?.status === 403
    ) {
      return "You do not have permission to create an experiment phase.";
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

    return (
      response?.data?.message ||
      response?.data?.error ||
      response?.data?.title ||
      "Cannot create experiment phase."
    );
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return "Cannot create experiment phase.";
}

function formatPreviewDate(
  value: string
): string {
  if (!value) {
    return "-";
  }

  const date =
    new Date(
      `${value}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "vi-VN"
  );
}

function getStatusLabel(
  status: ExperimentPhaseStatus
): string {
  return status === "InProgress"
    ? "In Progress"
    : status;
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

export default function CreateExperimentPhase() {
  const navigate =
    useNavigate();

  const [
    searchParams,
  ] = useSearchParams();

  const startDateInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const endDateInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const experimentIdFromUrl =
    searchParams.get(
      "experimentId"
    ) ?? "";

  const [
    experiments,
    setExperiments,
  ] = useState<
    ExperimentResponse[]
  >([]);

  const [
    form,
    setForm,
  ] = useState<ExperimentPhaseFormState>({
    experimentId:
      experimentIdFromUrl,

    phaseName: "",
    phaseDescription: "",
    phaseOrder: "1",
    expectedStartDate: "",
    expectedEndDate: "",
    status: "Planned",
  });

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const selectedExperiment =
    useMemo(() => {
      return experiments.find(
        (experiment) =>
          experiment.experimentId ===
          Number(
            form.experimentId
          )
      );
    }, [
      experiments,
      form.experimentId,
    ]);

  const dateRangeIsValid =
    Boolean(
      form.expectedStartDate &&
      form.expectedEndDate &&
      form.expectedEndDate >=
        form.expectedStartDate
    );

  const canSubmit =
    Boolean(
      form.experimentId &&
      form.phaseName.trim() &&
      form.phaseOrder &&
      form.expectedStartDate &&
      form.expectedEndDate &&
      dateRangeIsValid
    );

  useEffect(() => {
    let active = true;

    async function loadExperiments() {
      try {
        setLoading(true);
        setError("");

        const data =
          await getExperiments({
            page: 1,
            size: 100,
          });

        if (!active) {
          return;
        }

        setExperiments(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (loadError) {
        console.error(
          "Load experiments failed:",
          loadError
        );

        if (!active) {
          return;
        }

        setError(
          getErrorMessage(
            loadError
          )
        );

        setExperiments([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadExperiments();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (
      !experimentIdFromUrl
    ) {
      return;
    }

    setForm(
      (current) => ({
        ...current,
        experimentId:
          experimentIdFromUrl,
      })
    );
  }, [experimentIdFromUrl]);

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
      name ===
      "expectedStartDate"
    ) {
      setForm(
        (current) => ({
          ...current,

          expectedStartDate:
            value,

          expectedEndDate:
            current.expectedEndDate &&
            current.expectedEndDate <
              value
              ? ""
              : current.expectedEndDate,
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

  const handleDateWrapperKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    input: HTMLInputElement | null
  ) => {
    if (
      event.key !== "Enter" &&
      event.key !== " "
    ) {
      return;
    }

    event.preventDefault();

    openDatePicker(
      input
    );
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    const experimentId =
      Number(
        form.experimentId
      );

    const phaseName =
      form.phaseName.trim();

    const phaseDescription =
      form.phaseDescription.trim();

    const phaseOrder =
      Number(
        form.phaseOrder
      );

    if (
      !Number.isInteger(
        experimentId
      ) ||
      experimentId <= 0
    ) {
      setError(
        "Please select a valid experiment."
      );

      return;
    }

    if (!phaseName) {
      setError(
        "Please enter the phase name."
      );

      return;
    }

    if (
      !Number.isInteger(
        phaseOrder
      ) ||
      phaseOrder <= 0
    ) {
      setError(
        "Phase order must be a positive integer."
      );

      return;
    }

    if (
      !form.expectedStartDate
    ) {
      setError(
        "Please select the expected start date."
      );

      return;
    }

    if (
      !form.expectedEndDate
    ) {
      setError(
        "Please select the expected end date."
      );

      return;
    }

    if (
      form.expectedEndDate <
      form.expectedStartDate
    ) {
      setError(
        "Expected end date cannot be earlier than expected start date."
      );

      return;
    }

    try {
      setSaving(true);
      setError("");

      const createdPhase =
        await createExperimentPhase({
          experimentId,
          phaseName,

          phaseDescription:
            phaseDescription ||
            null,

          phaseOrder,

          expectedStartDate:
            form.expectedStartDate,

          expectedEndDate:
            form.expectedEndDate,

          status:
            form.status,
        });

      if (
        createdPhase.experimentPhaseId
      ) {
        navigate(
          `/experiment-phases/${createdPhase.experimentPhaseId}`,
          {
            replace: true,
          }
        );

        return;
      }

      navigate(
        `/experiments/${experimentId}`,
        {
          replace: true,
        }
      );
    } catch (submitError) {
      console.error(
        "Create experiment phase failed:",
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

  const handleBack = () => {
    const selectedExperimentId =
      Number(
        form.experimentId ||
        experimentIdFromUrl
      );

    if (
      Number.isInteger(
        selectedExperimentId
      ) &&
      selectedExperimentId > 0
    ) {
      navigate(
        `/experiments/${selectedExperimentId}`
      );

      return;
    }

    navigate(
      "/experiment-phases"
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="requirement-form-page">
          <div className="requirement-form-loading">
            Loading experiment phase form...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="requirement-form-page experiment-phase-form-page">
        <div className="requirement-form-header">
          <div>
            <p className="requirement-breadcrumb">
              Dashboard / Experiment Phases / Create
            </p>

            <h1>
              Create Experiment Phase
            </h1>

            <p>
              Define a stage, timeline and
              status for an experiment.
            </p>
          </div>

          <button
            type="button"
            className="requirement-back-button"
            onClick={
              handleBack
            }
          >
            <ArrowLeft
              size={18}
            />

            Back
          </button>
        </div>

        {error && (
          <div className="requirement-form-error">
            {error}
          </div>
        )}

        <form
          className="requirement-form-layout experiment-phase-form-layout"
          onSubmit={
            handleSubmit
          }
        >
          <section className="requirement-form-card experiment-phase-main-card">
            <div className="experiment-phase-card-heading">
              <div className="experiment-phase-heading-icon">
                <Layers3
                  size={21}
                />
              </div>

              <div>
                <h2>
                  Phase Information
                </h2>

                <p>
                  Enter the phase details
                  and planned execution
                  period.
                </p>
              </div>
            </div>

            <div className="experiment-phase-field">
              <label htmlFor="experimentId">
                Experiment
              </label>

              <select
                id="experimentId"
                name="experimentId"
                value={
                  form.experimentId
                }
                onChange={
                  handleChange
                }
                disabled={
                  saving ||
                  Boolean(
                    experimentIdFromUrl
                  )
                }
                required
              >
                <option value="">
                  Select experiment
                </option>

                {experiments.map(
                  (experiment) => (
                    <option
                      key={
                        experiment.experimentId
                      }
                      value={
                        experiment.experimentId
                      }
                    >
                      #
                      {
                        experiment.experimentId
                      }
                      {" - "}
                      {
                        experiment.experimentName
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="experiment-phase-field">
              <label htmlFor="phaseName">
                Phase Name
              </label>

              <input
                id="phaseName"
                type="text"
                name="phaseName"
                value={
                  form.phaseName
                }
                onChange={
                  handleChange
                }
                placeholder="Example: Preparation Phase"
                disabled={saving}
                maxLength={200}
                required
              />
            </div>

            <div className="experiment-phase-field">
              <label htmlFor="phaseDescription">
                Phase Description
              </label>

              <textarea
                id="phaseDescription"
                name="phaseDescription"
                rows={4}
                value={
                  form.phaseDescription
                }
                onChange={
                  handleChange
                }
                placeholder="Describe the work performed during this phase..."
                disabled={saving}
              />
            </div>

            <div className="experiment-phase-field">
              <label htmlFor="phaseOrder">
                Phase Order
              </label>

              <input
                id="phaseOrder"
                type="number"
                name="phaseOrder"
                min="1"
                step="1"
                value={
                  form.phaseOrder
                }
                onChange={
                  handleChange
                }
                placeholder="Example: 1"
                disabled={saving}
                required
              />
            </div>

            <div className="phase-date-section">
              <div className="phase-date-section-header">
                <div>
                  <h3>
                    Planned Timeline
                  </h3>

                  <p>
                    Select the expected
                    start and end dates for
                    this phase.
                  </p>
                </div>

                {dateRangeIsValid && (
                  <span className="phase-date-valid-badge">
                    Valid timeline
                  </span>
                )}
              </div>

              <div className="phase-date-grid">
                <div className="phase-date-field">
                  <label htmlFor="expectedStartDate">
                    Expected Start Date
                  </label>

                  <div
                    className="phase-date-input-wrap"
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      openDatePicker(
                        startDateInputRef.current
                      )
                    }
                    onKeyDown={(event) =>
                      handleDateWrapperKeyDown(
                        event,
                        startDateInputRef.current
                      )
                    }
                  >
                    <div className="phase-date-icon">
                      <CalendarDays
                        size={19}
                      />
                    </div>

                    <input
                      ref={
                        startDateInputRef
                      }
                      id="expectedStartDate"
                      type="date"
                      name="expectedStartDate"
                      value={
                        form.expectedStartDate
                      }
                      max={
                        form.expectedEndDate ||
                        undefined
                      }
                      onChange={
                        handleChange
                      }
                      onClick={(event) => {
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
                    Planned starting date
                    of this phase.
                  </small>
                </div>

                <div className="phase-date-field">
                  <label htmlFor="expectedEndDate">
                    Expected End Date
                  </label>

                  <div
                    className={[
                      "phase-date-input-wrap",
                      !form.expectedStartDate
                        ? "phase-date-input-disabled"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    role="button"
                    tabIndex={
                      form.expectedStartDate
                        ? 0
                        : -1
                    }
                    aria-disabled={
                      !form.expectedStartDate
                    }
                    onClick={() => {
                      if (
                        !form.expectedStartDate
                      ) {
                        return;
                      }

                      openDatePicker(
                        endDateInputRef.current
                      );
                    }}
                    onKeyDown={(event) => {
                      if (
                        !form.expectedStartDate
                      ) {
                        return;
                      }

                      handleDateWrapperKeyDown(
                        event,
                        endDateInputRef.current
                      );
                    }}
                  >
                    <div className="phase-date-icon phase-date-icon-end">
                      <CalendarCheck2
                        size={19}
                      />
                    </div>

                    <input
                      ref={
                        endDateInputRef
                      }
                      id="expectedEndDate"
                      type="date"
                      name="expectedEndDate"
                      value={
                        form.expectedEndDate
                      }
                      min={
                        form.expectedStartDate ||
                        undefined
                      }
                      onChange={
                        handleChange
                      }
                      onClick={(event) => {
                        event.stopPropagation();

                        openDatePicker(
                          event.currentTarget
                        );
                      }}
                      disabled={
                        saving ||
                        !form.expectedStartDate
                      }
                      required
                    />
                  </div>

                  <small>
                    Must be equal to or
                    later than the start
                    date.
                  </small>
                </div>
              </div>
            </div>

            <div className="experiment-phase-field">
              <label htmlFor="status">
                Status
              </label>

              <select
                id="status"
                name="status"
                value={
                  form.status
                }
                onChange={
                  handleChange
                }
                disabled={saving}
                required
              >
                <option value="Planned">
                  Planned
                </option>

                <option value="InProgress">
                  In Progress
                </option>

                <option value="Completed">
                  Completed
                </option>

                <option value="Cancelled">
                  Cancelled
                </option>
              </select>
            </div>
          </section>

          <section className="requirement-form-card experiment-phase-preview-card">
            <div className="experiment-phase-preview-heading">
              <h2>
                Phase Preview
              </h2>

              <p>
                Review the information
                before creating the phase.
              </p>
            </div>

            <div className="requirement-preview experiment-phase-preview">
              <div>
                <span>
                  Experiment
                </span>

                <strong>
                  {selectedExperiment
                    ? selectedExperiment.experimentName
                    : "Not selected"}
                </strong>
              </div>

              <div>
                <span>
                  Experiment ID
                </span>

                <strong>
                  {form.experimentId
                    ? `#${form.experimentId}`
                    : "-"}
                </strong>
              </div>

              <div>
                <span>
                  Phase Name
                </span>

                <strong>
                  {form.phaseName.trim() ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>
                  Phase Order
                </span>

                <strong>
                  {form.phaseOrder ||
                    "-"}
                </strong>
              </div>

              <div className="experiment-phase-preview-date">
                <span>
                  Start Date
                </span>

                <strong>
                  <CalendarDays
                    size={16}
                  />

                  {formatPreviewDate(
                    form.expectedStartDate
                  )}
                </strong>
              </div>

              <div className="experiment-phase-preview-date">
                <span>
                  End Date
                </span>

                <strong>
                  <CalendarCheck2
                    size={16}
                  />

                  {formatPreviewDate(
                    form.expectedEndDate
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Status
                </span>

                <strong className="experiment-phase-preview-status">
                  {getStatusLabel(
                    form.status
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Description
                </span>

                <strong>
                  {form.phaseDescription.trim() ||
                    "No description"}
                </strong>
              </div>
            </div>

            <div className="requirement-form-actions experiment-phase-form-actions">
              <button
                type="button"
                className="requirement-cancel-button"
                disabled={saving}
                onClick={
                  handleBack
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="requirement-save-button"
                disabled={
                  saving ||
                  !canSubmit
                }
              >
                {saving
                  ? "Creating..."
                  : "Create Phase"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </DashboardLayout>
  );
}