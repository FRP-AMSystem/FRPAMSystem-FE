import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getExperiments,
} from "../../services/experimentService";

import {
  getExperimentEquipmentRequirementById,
} from "../../services/experimentEquipmentRequirementService";

import {
  createAllocationPlan,
} from "../../services/allocationPlanService";

import type {
  ExperimentResponse,
} from "../../types/experiment";

import "./CreateAllocation.css";

interface AllocationFormState {
  experimentId: string;
  fitnessScore: string;
}

function isPositiveInteger(
  value: number
): boolean {
  return (
    Number.isInteger(value) &&
    value > 0
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

    if (response?.data?.title) {
      return response.data.title;
    }

    if (response?.data?.errors) {
      return Object.values(
        response.data.errors
      )
        .flat()
        .join(" ");
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Create allocation failed.";
}


function canCreateAllocationForExperiment(
  status?: string | null
): boolean {
  return (
    status === "Submitted" ||
    status === "Planning"
  );
}

export default function CreateAllocation() {
  const navigate = useNavigate();
  const [searchParams] =
    useSearchParams();

  const experimentIdFromUrl =
    searchParams.get(
      "experimentId"
    ) ?? "";

  const requirementIdFromUrl =
    searchParams.get(
      "requirementId"
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
  ] = useState<AllocationFormState>({
    experimentId:
      experimentIdFromUrl,
    fitnessScore: "80",
  });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

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

  const selectedExperimentAllowsAllocation =
    selectedExperiment
      ? canCreateAllocationForExperiment(
          selectedExperiment.status
        )
      : false;

  useEffect(() => {
    let active = true;

    async function loadFormData() {
      try {
        setLoading(true);
        setError("");

        const experimentData =
          await getExperiments({
            page: 1,
            size: 100,
          });

        if (!active) {
          return;
        }

        setExperiments(
          Array.isArray(
            experimentData
          )
            ? experimentData
            : []
        );

        if (
          experimentIdFromUrl
        ) {
          setForm(
            (current) => ({
              ...current,
              experimentId:
                experimentIdFromUrl,
            })
          );

          return;
        }

        const requirementId =
          Number(
            requirementIdFromUrl
          );

        if (
          requirementIdFromUrl &&
          isPositiveInteger(
            requirementId
          )
        ) {
          const requirement =
            await getExperimentEquipmentRequirementById(
              requirementId
            );

          if (!active) {
            return;
          }

          setForm(
            (current) => ({
              ...current,
              experimentId:
                String(
                  requirement.experimentId
                ),
            })
          );
        }
      } catch (loadError) {
        console.error(
          "Failed to load allocation form data:",
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

    void loadFormData();

    return () => {
      active = false;
    };
  }, [
    experimentIdFromUrl,
    requirementIdFromUrl,
  ]);

  const handleChange = (
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

    setForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  };

  const goBack = () => {
    const experimentId =
      Number(form.experimentId);

    if (
      isPositiveInteger(
        experimentId
      )
    ) {
      navigate(
        `/allocation?experimentId=${experimentId}`
      );
      return;
    }

    navigate("/allocation");
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

    if (
      !isPositiveInteger(
        experimentId
      )
    ) {
      setError(
        "Please select a valid experiment."
      );
      return;
    }

    if (
      !selectedExperiment ||
      !selectedExperimentAllowsAllocation
    ) {
      setError(
        "Allocation can only be created after the experiment has been submitted for planning."
      );
      return;
    }

    const fitnessScore =
      Number(
        form.fitnessScore
      );

    if (
      form.fitnessScore.trim() ===
        "" ||
      Number.isNaN(
        fitnessScore
      ) ||
      fitnessScore < 0 ||
      fitnessScore > 100
    ) {
      setError(
        "Fitness score must be a number between 0 and 100."
      );
      return;
    }

    try {
      setSaving(true);

      const createdPlan =
        await createAllocationPlan({
          experimentId,
          fitnessScore,
          approveStatus: "Draft",
        });

      if (
        createdPlan.allocationPlanId
      ) {
        navigate(
          `/allocation/${createdPlan.allocationPlanId}`,
          {
            replace: true,
          }
        );
        return;
      }

      navigate(
        `/allocation?experimentId=${experimentId}`,
        {
          replace: true,
        }
      );
    } catch (submitError) {
      console.error(
        "Failed to create allocation:",
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
        <div className="create-allocation-page">
          <p>
            Loading allocation form...
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const experimentLocked =
    Boolean(
      experimentIdFromUrl ||
      requirementIdFromUrl
    );

  return (
    <DashboardLayout>
      <div className="create-allocation-page">
        <div className="create-header">
          <div>
            <p className="breadcrumb">
              {form.experimentId
                ? `Dashboard / Experiments / #${form.experimentId} / Allocation / Create`
                : "Dashboard / Allocation / Create"}
            </p>

            <h1>
              Create Allocation Plan
            </h1>

            <span>
              Create a Draft allocation plan for an experiment. Resource assignments are added after the plan is created.
            </span>
          </div>

          <button
            type="button"
            className="back-btn"
            onClick={goBack}
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
          className="allocation-form"
          onSubmit={handleSubmit}
        >
          <div className="form-card">
            <h3>
              Allocation Information
            </h3>

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
                experimentLocked
              }
              required
            >
              <option value="">
                Select experiment
              </option>

              {experiments
                .filter((experiment) =>
                  canCreateAllocationForExperiment(
                    experiment.status
                  )
                )
                .map(
                  (experiment) => (
                    <option
                      key={
                        experiment.experimentId
                      }
                      value={
                        experiment.experimentId
                      }
                    >
                      {experiment.experimentName}
                    </option>
                  )
                )}
            </select>

            {selectedExperiment && (
              <div className="form-note">
                Linked to:{" "}
                {
                  selectedExperiment.experimentName
                }
              </div>
            )}

            <div className="form-note">
              An Allocation Plan belongs to the Experiment as a whole. Equipment, human and land resources are added inside the Allocation Detail after this Draft plan is created.
            </div>

            <label htmlFor="fitnessScore">
              Fitness Score (%)
            </label>

            <input
              id="fitnessScore"
              type="number"
              name="fitnessScore"
              min="0"
              max="100"
              step="0.01"
              value={
                form.fitnessScore
              }
              onChange={
                handleChange
              }
              disabled={saving}
              required
            />
          </div>

          <div className="form-card">
            <h3>Preview</h3>

            <div className="allocation-preview">
              <div>
                <span>Experiment</span>
                <strong>
                  {selectedExperiment
                    ? selectedExperiment.experimentName
                    : "Not selected"}
                </strong>
              </div>

              <div>
                <span>
                  Fitness Score
                </span>
                <strong>
                  {form.fitnessScore
                    ? `${form.fitnessScore}%`
                    : "-"}
                </strong>
              </div>

              <div>
                <span>
                  Initial Status
                </span>
                <strong>
                  Draft
                </strong>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={goBack}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="save-btn"
                disabled={
                  saving ||
                  !form.experimentId ||
                  !selectedExperimentAllowsAllocation
                }
              >
                {saving
                  ? "Creating..."
                  : "Create Draft Plan"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
