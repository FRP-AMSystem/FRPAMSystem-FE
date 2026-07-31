import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getExperimentEquipmentRequirementById,
  getExperimentEquipmentRequirements,
} from "../../services/experimentEquipmentRequirementService";

import {
  getExperiments,
} from "../../services/experimentService";

import {
  createAllocationPlan,
} from "../../services/allocationPlanService";

import type {
  ExperimentResponse,
} from "../../types/experiment";

import type {
  ExperimentEquipmentRequirement,
} from "../../types/experimentEquipmentRequirement";

import "./CreateAllocation.css";

interface AllocationFormState {
  requirementId: string;
  experimentId: string;
  fitnessScore: string;
}

function getRequirementId(
  requirement: ExperimentEquipmentRequirement
): number {
  return requirement.expEquipmentReqId;
}

function isValidPositiveInteger(
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

export default function CreateAllocation() {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const requirementIdFromUrl =
    searchParams.get(
      "requirementId"
    ) ?? "";

  const experimentIdFromUrl =
    searchParams.get(
      "experimentId"
    ) ?? "";

  const [
    requirements,
    setRequirements,
  ] = useState<
    ExperimentEquipmentRequirement[]
  >([]);

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
    requirementId:
      requirementIdFromUrl,

    experimentId:
      experimentIdFromUrl,

    fitnessScore: "80",
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

  const validRequirements =
    useMemo(() => {
      return requirements.filter(
        (requirement) =>
          isValidPositiveInteger(
            getRequirementId(
              requirement
            )
          )
      );
    }, [requirements]);

  const selectedRequirement =
    useMemo(() => {
      const requirementId =
        Number(
          form.requirementId
        );

      if (
        !isValidPositiveInteger(
          requirementId
        )
      ) {
        return undefined;
      }

      return validRequirements.find(
        (requirement) =>
          getRequirementId(
            requirement
          ) === requirementId
      );
    }, [
      form.requirementId,
      validRequirements,
    ]);

  const selectedExperiment =
    useMemo(() => {
      const experimentId =
        Number(
          form.experimentId
        );

      if (
        !isValidPositiveInteger(
          experimentId
        )
      ) {
        return undefined;
      }

      return experiments.find(
        (experiment) =>
          experiment.experimentId ===
          experimentId
      );
    }, [
      experiments,
      form.experimentId,
    ]);

  useEffect(() => {
    async function loadFormData() {
      try {
        setLoading(true);
        setError("");

        const experimentData =
          await getExperiments({
            page: 1,
            size: 100,
          });

        setExperiments(
          Array.isArray(
            experimentData
          )
            ? experimentData
            : []
        );

        const requirementId =
          Number(
            requirementIdFromUrl
          );

        if (
          requirementIdFromUrl &&
          isValidPositiveInteger(
            requirementId
          )
        ) {
          const requirement =
            await getExperimentEquipmentRequirementById(
              requirementId
            );

          setRequirements([
            requirement,
          ]);

          setForm(
            (currentForm) => ({
              ...currentForm,

              requirementId:
                String(
                  requirement.expEquipmentReqId
                ),

              experimentId:
                String(
                  requirement.experimentId
                ),
            })
          );

          return;
        }

        const requirementData =
          await getExperimentEquipmentRequirements();

        setRequirements(
          Array.isArray(
            requirementData
          )
            ? requirementData
            : []
        );

        const experimentId =
          Number(
            experimentIdFromUrl
          );

        if (
          experimentIdFromUrl &&
          isValidPositiveInteger(
            experimentId
          )
        ) {
          setForm(
            (currentForm) => ({
              ...currentForm,

              experimentId:
                experimentIdFromUrl,
            })
          );
        }
      } catch (loadError) {
        console.error(
          "Failed to load allocation form data:",
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

    void loadFormData();
  }, [
    experimentIdFromUrl,
    requirementIdFromUrl,
  ]);

  const handleRequirementChange = (
    event: React.ChangeEvent<
      HTMLSelectElement
    >
  ) => {
    const requirementId =
      event.target.value;

    const numericRequirementId =
      Number(requirementId);

    const requirement =
      validRequirements.find(
        (item) =>
          getRequirementId(
            item
          ) ===
          numericRequirementId
      );

    setError("");

    setForm(
      (currentForm) => ({
        ...currentForm,

        requirementId,

        experimentId:
          requirement
            ? String(
                requirement.experimentId
              )
            : currentForm.experimentId,
      })
    );
  };

  const handleChange = (
    event: React.ChangeEvent<
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
      (currentForm) => ({
        ...currentForm,
        [name]: value,
      })
    );
  };

  const handleSubmit = async (
    event: React.FormEvent<
      HTMLFormElement
    >
  ) => {
    event.preventDefault();

    setError("");

    const experimentId =
      Number(
        form.experimentId
      );

    if (
      !isValidPositiveInteger(
        experimentId
      )
    ) {
      setError(
        "Please select a valid experiment."
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
        createdPlan?.allocationPlanId
      ) {
        navigate(
          `/allocation/${createdPlan.allocationPlanId}`
        );

        return;
      }

      navigate(
        "/allocation"
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
            Loading allocation
            form...
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="create-allocation-page">
        <div className="create-header">
          <div>
            <p className="breadcrumb">
              Dashboard / Allocation
              / Create
            </p>

            <h1>
              Create Allocation Plan
            </h1>

            <span>
              Create a draft
              allocation plan for an
              experiment.
            </span>
          </div>

          <button
            type="button"
            className="back-btn"
            onClick={() =>
              navigate(
                "/allocation"
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
          className="allocation-form"
          onSubmit={
            handleSubmit
          }
        >
          <div className="form-card">
            <h3>
              Allocation Information
            </h3>

            <label htmlFor="requirementId">
              Equipment Requirement
            </label>

            <select
              id="requirementId"
              name="requirementId"
              value={
                form.requirementId
              }
              onChange={
                handleRequirementChange
              }
              disabled={Boolean(
                requirementIdFromUrl
              )}
            >
              <option value="">
                Select a requirement
                (optional)
              </option>

              {validRequirements.map(
                (requirement) => {
                  const requirementId =
                    getRequirementId(
                      requirement
                    );

                  return (
                    <option
                      key={
                        requirementId
                      }
                      value={
                        requirementId
                      }
                    >
                      Requirement #
                      {requirementId}
                      {" - "}
                      {requirement.equipmentTypeName ||
                        `Equipment Type #${requirement.equipmentTypeId}`}
                      {" - "}
                      Experiment #
                      {
                        requirement.experimentId
                      }
                      {" - "}
                      Quantity:{" "}
                      {
                        requirement.quantity
                      }
                    </option>
                  );
                }
              )}
            </select>

            {validRequirements.length ===
              0 && (
              <div className="form-note">
                No valid equipment
                requirements were found.
              </div>
            )}

            <div className="form-note">
              Selecting an equipment
              requirement will
              automatically select its
              related experiment. The
              Allocation Plan stores
              the experiment ID.
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
              disabled={Boolean(
                selectedRequirement
              )}
              required
            >
              <option value="">
                Select an experiment
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
                    Experiment #
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
              placeholder="Example: 80"
              required
            />

            <div className="form-note">
              The allocation will
              initially be created with
              status{" "}
              <strong>
                Draft
              </strong>
              . The Manager can approve
              or reject it later.
            </div>
          </div>

          <div className="form-card">
            <h3>
              Allocation Preview
            </h3>

            <div className="experiment-preview">
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
                  {selectedExperiment
                    ? `#${selectedExperiment.experimentId}`
                    : form.experimentId
                      ? `#${form.experimentId}`
                      : "-"}
                </strong>
              </div>

              <div>
                <span>
                  Requirement ID
                </span>

                <strong>
                  {selectedRequirement
                    ? `#${selectedRequirement.expEquipmentReqId}`
                    : "No requirement selected"}
                </strong>
              </div>

              <div>
                <span>
                  Equipment Type
                </span>

                <strong>
                  {selectedRequirement
                    ? selectedRequirement.equipmentTypeName ||
                      `Equipment Type #${selectedRequirement.equipmentTypeId}`
                    : "-"}
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
                  Requested Quantity
                </span>

                <strong>
                  {selectedRequirement?.quantity ??
                    "-"}
                </strong>
              </div>

              <div>
                <span>
                  Allow Substitute
                </span>

                <strong>
                  {selectedRequirement
                    ? selectedRequirement.allowSubstitute
                      ? "Allowed"
                      : "Not allowed"
                    : "-"}
                </strong>
              </div>

              <div>
                <span>
                  Minimum Efficiency
                </span>

                <strong>
                  {selectedRequirement
                    ? `${selectedRequirement.minAcceptableEfficiency}%`
                    : "-"}
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
                disabled={saving}
                onClick={() =>
                  navigate(
                    "/allocation"
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="save-btn"
                disabled={
                  saving ||
                  !form.experimentId
                }
              >
                {saving
                  ? "Creating..."
                  : "Create Allocation"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}