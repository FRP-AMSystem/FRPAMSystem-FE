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
  LandPlot,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getExperiments,
} from "../../services/experimentService";

import {
  getExperimentLandRequirementById,
  updateExperimentLandRequirement,
} from "../../services/experimentLandRequirementService";

import type {
  ExperimentResponse,
} from "../../types/experiment";

import "../ExperimentEquipmentRequirement/RequirementForm.css";

interface LandRequirementFormState {
  experimentId: string;
  requiredArea: string;
  requiredSoilType: string;
  note: string;
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
      return "Land requirement was not found.";
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

  return "Cannot update land requirement.";
}


function isDraftExperimentStatus(
  status?: string | null
): boolean {
  return (
    status === "Draft" ||
    status === "Created"
  );
}

export default function EditLandRequirement() {
  const navigate =
    useNavigate();

  const {
    id,
  } = useParams();

  const requirementId =
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
  ] = useState<LandRequirementFormState>({
    experimentId: "",
    requiredArea: "",
    requiredSoilType: "",
    note: "",
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
          requirementId
        ) ||
        requirementId <= 0
      ) {
        setError(
          "Invalid land requirement ID."
        );

        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [
          requirement,
          experimentData,
        ] =
          await Promise.all([
            getExperimentLandRequirementById(
              requirementId
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
              requirement.experimentId
            ),

          requiredArea:
            String(
              requirement.requiredArea
            ),

          requiredSoilType:
            requirement.requiredSoilType ??
            "",

          note:
            requirement.note ??
            "",
        });
      } catch (loadError) {
        console.error(
          "Load land requirement edit form failed:",
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
  }, [requirementId]);

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

    const experimentId =
      Number(
        form.experimentId
      );

    const requiredArea =
      Number(
        form.requiredArea
      );

    const requiredSoilType =
      form.requiredSoilType.trim();

    const note =
      form.note.trim();

    if (
      !Number.isInteger(
        requirementId
      ) ||
      requirementId <= 0
    ) {
      setError(
        "Invalid land requirement ID."
      );

      return;
    }

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

    if (
      !selectedExperiment ||
      !isDraftExperimentStatus(
        selectedExperiment.status
      )
    ) {
      setError(
        "Land requirements can only be edited while the experiment is in Draft status."
      );
      return;
    }

    if (
      !Number.isFinite(
        requiredArea
      ) ||
      requiredArea <= 0
    ) {
      setError(
        "Required area must be greater than 0."
      );

      return;
    }

    if (
      !requiredSoilType
    ) {
      setError(
        "Please enter the required soil type."
      );

      return;
    }

    try {
      setSaving(true);

      await updateExperimentLandRequirement(
        requirementId,
        {
          experimentId,
          requiredArea,
          requiredSoilType,

          note:
            note || null,
        }
      );

      navigate(
        `/land-requirements/${requirementId}`,
        {
          replace: true,
        }
      );
    } catch (submitError) {
      console.error(
        "Update land requirement failed:",
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
            Loading land requirement...
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
              Dashboard / Land Requirements / Edit
            </p>

            <h1>
              Edit Land Requirement
            </h1>

            <p>
              Update the required land
              area and soil conditions
              for this experiment.
            </p>
          </div>

          <button
            type="button"
            className="requirement-back-button"
            onClick={() =>
              navigate(
                `/land-requirements/${requirementId}`
              )
            }
          >
            <ArrowLeft size={18} />

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
              <LandPlot size={21} />

              <h2>
                Land Requirement Information
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
              disabled
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

            <label htmlFor="requiredArea">
              Required Area (m²)
            </label>

            <input
              id="requiredArea"
              type="number"
              name="requiredArea"
              min="0.01"
              step="0.01"
              value={
                form.requiredArea
              }
              onChange={
                handleChange
              }
              placeholder="Example: 500"
              required
            />

            <label htmlFor="requiredSoilType">
              Required Soil Type
            </label>

            <input
              id="requiredSoilType"
              type="text"
              name="requiredSoilType"
              value={
                form.requiredSoilType
              }
              onChange={
                handleChange
              }
              placeholder="Example: Loamy soil"
              required
            />

            <label htmlFor="note">
              Note
            </label>

            <textarea
              id="note"
              name="note"
              rows={5}
              value={
                form.note
              }
              onChange={
                handleChange
              }
              placeholder="Enter additional land requirements..."
            />
          </section>

          <section className="requirement-form-card">
            <h2>
              Requirement Preview
            </h2>

            <div className="requirement-preview">
              <div>
                <span>
                  Requirement ID
                </span>

                <strong>
                  #
                  {requirementId}
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
                  Required Area
                </span>

                <strong>
                  {form.requiredArea
                    ? `${form.requiredArea} m²`
                    : "-"}
                </strong>
              </div>

              <div>
                <span>
                  Soil Type
                </span>

                <strong>
                  {form.requiredSoilType ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>
                  Note
                </span>

                <strong>
                  {form.note.trim() ||
                    "No note"}
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
                    `/land-requirements/${requirementId}`
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
                  !form.requiredArea ||
                  !form.requiredSoilType.trim()
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