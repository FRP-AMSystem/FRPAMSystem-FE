import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getExperimentById,
  updateExperiment,
} from "../../services/experimentService";

import "./ExperimentForm.css";

interface ExperimentFormState {
  experimentName: string;
  description: string;

  startDate: string;
  endDate: string;
  deadline: string;

  status: string;
  priority: string;
}

function toDateInputValue(
  value?: string | null
): string {
  if (!value) {
    return "";
  }

  return value.slice(
    0,
    10
  );
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

    if (
      response?.data?.message
    ) {
      return response.data.message;
    }

    if (
      response?.data?.error
    ) {
      return response.data.error;
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

  return (
    "Update experiment failed. " +
    "Please try again."
  );
}

export default function EditExperiment() {
  const navigate =
    useNavigate();

  const {
    id,
  } = useParams<{
    id: string;
  }>();

  const experimentId =
    Number(id);

  const [
    form,
    setForm,
  ] = useState<ExperimentFormState>({
    experimentName: "",
    description: "",

    startDate: "",
    endDate: "",
    deadline: "",

    status: "Draft",

    priority: "1",
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

  useEffect(() => {
    let active = true;

    async function loadExperiment() {
      if (
        !id ||
        !Number.isInteger(
          experimentId
        ) ||
        experimentId <= 0
      ) {
        if (active) {
          setError(
            "Invalid experiment ID."
          );

          setLoading(false);
        }

        return;
      }

      try {
        setLoading(true);
        setError("");

        const data =
          await getExperimentById(
            experimentId
          );

        if (!active) {
          return;
        }

        setForm({
          experimentName:
            data.experimentName ||
            "",

          description:
            data.description ||
            "",

          startDate:
            toDateInputValue(
              data.expectStartDate
            ),

          endDate:
            toDateInputValue(
              data.expectEndDate
            ),

          deadline:
            toDateInputValue(
              data.deadline
            ),

          status:
            data.status ||
            "Draft",

          priority:
            String(
              data.priority ??
              1
            ),
        });
      } catch (loadError) {
        console.error(
          "Load experiment failed:",
          loadError
        );

        if (active) {
          setError(
            getErrorMessage(
              loadError
            )
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadExperiment();

    return () => {
      active = false;
    };
  }, [
    id,
    experimentId,
  ]);

  const handleChange = (
    event: ChangeEvent<
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
    >
  ) => {
    const {
      name,
      value,
    } = event.target;

    setError("");

    setForm(
      (current) => ({
        ...current,
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
        experimentId
      ) ||
      experimentId <= 0
    ) {
      setError(
        "Invalid experiment ID."
      );

      return;
    }

    if (
      !form.experimentName.trim()
    ) {
      setError(
        "Experiment name is required."
      );

      return;
    }

    if (
      form.startDate &&
      form.endDate &&
      form.startDate >
      form.endDate
    ) {
      setError(
        "End date must be after start date."
      );

      return;
    }

    if (
      form.deadline &&
      form.startDate &&
      form.deadline <
      form.startDate
    ) {
      setError(
        "Deadline cannot be earlier than the start date."
      );

      return;
    }

    const priority =
      Number(
        form.priority
      );

    if (
      !Number.isInteger(
        priority
      ) ||
      priority < 0 ||
      priority > 3
    ) {
      setError(
        "Priority is invalid."
      );

      return;
    }

    try {
      setSaving(true);

      await updateExperiment(
        experimentId,
        {
          experimentName:
            form.experimentName.trim(),

          description:
            form.description.trim() ||
            undefined,

          expectStartDate:
            form.startDate ||
            undefined,

          expectEndDate:
            form.endDate ||
            undefined,

          deadline:
            form.deadline ||
            undefined,

          status:
            form.status,

          priority,
        }
      );

      navigate(
        `/experiments/${experimentId}`,
        {
          replace: true,
        }
      );
    } catch (submitError) {
      console.error(
        "Update experiment failed:",
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
        <div className="experiment-form-page">
          <p>
            Loading experiment...
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="experiment-form-page">
        <div className="experiment-form-header">
          <div>
            <p className="breadcrumb">
              Dashboard / Experiments / Edit
            </p>

            <h1>
              Edit Experiment
            </h1>

            <span>
              Update experiment information.
            </span>
          </div>

          <button
            type="button"
            className="back-btn"
            onClick={() =>
              navigate(
                `/experiments/${experimentId}`
              )
            }
          >
            Back
          </button>
        </div>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <form
          className="experiment-form-grid"
          onSubmit={
            handleSubmit
          }
        >
          <div className="experiment-form-card">
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
              disabled={
                saving
              }
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
              disabled={
                saving
              }
              rows={5}
            />

            <label htmlFor="startDate">
              Expected Start Date
            </label>

            <input
              id="startDate"
              type="date"
              name="startDate"
              value={
                form.startDate
              }
              onChange={
                handleChange
              }
              disabled={
                saving
              }
            />

            <label htmlFor="endDate">
              Expected End Date
            </label>

            <input
              id="endDate"
              type="date"
              name="endDate"
              min={
                form.startDate ||
                undefined
              }
              value={
                form.endDate
              }
              onChange={
                handleChange
              }
              disabled={
                saving
              }
            />

            <label htmlFor="deadline">
              Deadline
            </label>

            <input
              id="deadline"
              type="date"
              name="deadline"
              min={
                form.startDate ||
                undefined
              }
              value={
                form.deadline
              }
              onChange={
                handleChange
              }
              disabled={
                saving
              }
            />

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
            >
              <option value="Draft">
                Draft
              </option>

              <option value="Pending">
                Pending
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
              disabled={
                saving
              }
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
          </div>

          <div className="experiment-form-card">
            <h3>
              Preview
            </h3>

            <div className="experiment-preview">
              <div>
                <span>
                  Name
                </span>

                <strong>
                  {form.experimentName ||
                    "Not entered"}
                </strong>
              </div>

              <div>
                <span>
                  Status
                </span>

                <strong>
                  {form.status}
                </strong>
              </div>

              <div>
                <span>
                  Priority
                </span>

                <strong>
                  {form.priority === "0"
                    ? "Low"
                    : form.priority === "1"
                      ? "Medium"
                      : form.priority === "2"
                        ? "High"
                        : "Urgent"}
                </strong>
              </div>

              <div>
                <span>
                  Expected Duration
                </span>

                <strong>
                  {form.startDate ||
                    "-"}{" "}
                  →{" "}
                  {form.endDate ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>
                  Deadline
                </span>

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
                disabled={
                  saving
                }
                onClick={() =>
                  navigate(
                    `/experiments/${experimentId}`
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="save-btn"
                disabled={
                  saving
                }
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}