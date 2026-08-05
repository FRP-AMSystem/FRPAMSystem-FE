import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  CalendarDays,
  Layers3,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getExperiments,
} from "../../services/experimentService";

import {
  getExperimentPhaseById,
  updateExperimentPhase,
} from "../../services/experimentPhaseService";

import type {
  ExperimentResponse,
} from "../../types/experiment";

import type {
  ExperimentPhaseStatus,
} from "../../types/experimentPhase";

import "../ExperimentEquipmentRequirement/RequirementForm.css";

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
      response?.status === 404
    ) {
      return "Experiment phase was not found.";
    }

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

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return "Cannot update experiment phase.";
}

function formatDateForInput(
  value?: string | null
): string {
  if (!value) {
    return "";
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return value;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getStatusLabel(
  status: ExperimentPhaseStatus
): string {
  if (
    status === "InProgress"
  ) {
    return "In Progress";
  }

  return status;
}

export default function EditExperimentPhase() {
  const navigate =
    useNavigate();

  const {
    id,
  } = useParams();

  const phaseId =
    Number(id);

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
    experimentId: "",
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

  useEffect(() => {
    async function loadData() {
      if (
        !Number.isInteger(
          phaseId
        ) ||
        phaseId <= 0
      ) {
        setError(
          "Invalid experiment phase ID."
        );

        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [
          phaseData,
          experimentData,
        ] = await Promise.all([
          getExperimentPhaseById(
            phaseId
          ),

          getExperiments({
            page: 1,
            size: 100,
          }),
        ]);

        setExperiments(
          Array.isArray(
            experimentData
          )
            ? experimentData
            : []
        );

        setForm({
          experimentId:
            String(
              phaseData.experimentId
            ),

          phaseName:
            phaseData.phaseName ??
            "",

          phaseDescription:
            phaseData.phaseDescription ??
            "",

          phaseOrder:
            String(
              phaseData.phaseOrder ??
                1
            ),

          expectedStartDate:
            formatDateForInput(
              phaseData.expectedStartDate
            ),

          expectedEndDate:
            formatDateForInput(
              phaseData.expectedEndDate
            ),

          status:
            phaseData.status ??
            "Planned",
        });
      } catch (loadError) {
        console.error(
          "Load experiment phase edit data failed:",
          loadError
        );

        setError(
          getErrorMessage(
            loadError
          )
        );
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [phaseId]);

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

    setForm(
      (currentForm) => ({
        ...currentForm,
        [name]: value,
      })
    );
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    if (
      !Number.isInteger(
        phaseId
      ) ||
      phaseId <= 0
    ) {
      setError(
        "Invalid experiment phase ID."
      );

      return;
    }

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

      await updateExperimentPhase(
        phaseId,
        {
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
        }
      );

      navigate(
        `/experiment-phases/${phaseId}`,
        {
          replace: true,
        }
      );
    } catch (submitError) {
      console.error(
        "Update experiment phase failed:",
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="requirement-form-page">
          <div className="requirement-form-loading">
            Loading experiment phase...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="requirement-form-page">
        <div className="requirement-form-header">
          <div>
            <p className="requirement-breadcrumb">
              Dashboard / Experiment Phases / Edit
            </p>

            <h1>
              Edit Experiment Phase
            </h1>

            <p>
              Update the phase information,
              timeline, order and current
              status.
            </p>
          </div>

          <button
            type="button"
            className="requirement-back-button"
            onClick={() =>
              navigate(
                `/experiment-phases/${phaseId}`
              )
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
          className="requirement-form-layout"
          onSubmit={
            handleSubmit
          }
        >
          <section className="requirement-form-card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <Layers3
                size={21}
              />

              <h2>
                Phase Information
              </h2>
            </div>

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
                saving
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
              disabled={
                saving
              }
              required
            />

            <label htmlFor="phaseDescription">
              Phase Description
            </label>

            <textarea
              id="phaseDescription"
              name="phaseDescription"
              rows={5}
              value={
                form.phaseDescription
              }
              onChange={
                handleChange
              }
              placeholder="Describe the work performed during this phase..."
              disabled={
                saving
              }
            />

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
              disabled={
                saving
              }
              required
            />

            <label htmlFor="expectedStartDate">
              Expected Start Date
            </label>

            <div
              style={{
                position:
                  "relative",
              }}
            >
              <CalendarDays
                size={18}
                style={{
                  position:
                    "absolute",
                  left: "13px",
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  pointerEvents:
                    "none",
                }}
              />

              <input
                id="expectedStartDate"
                type="date"
                name="expectedStartDate"
                value={
                  form.expectedStartDate
                }
                onChange={
                  handleChange
                }
                style={{
                  paddingLeft:
                    "42px",
                }}
                disabled={
                  saving
                }
                required
              />
            </div>

            <label htmlFor="expectedEndDate">
              Expected End Date
            </label>

            <div
              style={{
                position:
                  "relative",
              }}
            >
              <CalendarDays
                size={18}
                style={{
                  position:
                    "absolute",
                  left: "13px",
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  pointerEvents:
                    "none",
                }}
              />

              <input
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
                style={{
                  paddingLeft:
                    "42px",
                }}
                disabled={
                  saving
                }
                required
              />
            </div>

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
              disabled={
                saving
              }
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
          </section>

          <section className="requirement-form-card">
            <h2>
              Phase Preview
            </h2>

            <div className="requirement-preview">
              <div>
                <span>
                  Phase ID
                </span>

                <strong>
                  #{phaseId}
                </strong>
              </div>

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

              <div>
                <span>
                  Expected Start Date
                </span>

                <strong>
                  {form.expectedStartDate ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>
                  Expected End Date
                </span>

                <strong>
                  {form.expectedEndDate ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>
                  Status
                </span>

                <strong>
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

            <div className="requirement-form-actions">
              <button
                type="button"
                className="requirement-cancel-button"
                disabled={
                  saving
                }
                onClick={() =>
                  navigate(
                    `/experiment-phases/${phaseId}`
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="requirement-save-button"
                disabled={
                  saving ||
                  !form.experimentId ||
                  !form.phaseName.trim() ||
                  !form.phaseOrder ||
                  !form.expectedStartDate ||
                  !form.expectedEndDate
                }
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </DashboardLayout>
  );
}