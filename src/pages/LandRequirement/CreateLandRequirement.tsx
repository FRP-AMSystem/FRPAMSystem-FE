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

import {
  ArrowLeft,
  LandPlot,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getExperiments,
} from "../../services/experimentService";

import {
  createExperimentLandRequirement,
} from "../../services/experimentLandRequirementService";

import type {
  ExperimentResponse,
} from "../../types/experiment";

import "../ExperimentEquipmentRequirement/RequirementForm.css";

interface LandRequirementFormState {
  experimentId: string;
  requiredArea: string;
  requiredSoilType: string;
  isFixedForExperiment: boolean;
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

  return "Cannot create land requirement.";
}

export default function CreateLandRequirement() {
  const navigate =
    useNavigate();

  const [
    searchParams,
  ] = useSearchParams();

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
  ] = useState<LandRequirementFormState>({
    experimentId:
      experimentIdFromUrl,

    requiredArea: "",
    requiredSoilType: "",
    isFixedForExperiment: false,
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
    async function loadExperiments() {
      try {
        setLoading(true);
        setError("");

        const data =
          await getExperiments({
            page: 1,
            size: 100,
          });

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

        setError(
          getErrorMessage(
            loadError
          )
        );

        setExperiments([]);
      } finally {
        setLoading(false);
      }
    }

    void loadExperiments();
  }, []);

  const handleChange = (
    event: ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    >
  ) => {
    const target =
      event.target;

    const {
      name,
      value,
    } = target;

    if (
      target instanceof
        HTMLInputElement &&
      target.type ===
        "checkbox"
    ) {
      setForm(
        (current) => ({
          ...current,
          [name]:
            target.checked,
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

      const createdRequirement =
        await createExperimentLandRequirement(
          {
            experimentId,
            requiredArea,
            requiredSoilType,

            isFixedForExperiment:
              form.isFixedForExperiment,

            note:
              form.note.trim() ||
              null,
          }
        );

      if (
        createdRequirement.expLandReqId
      ) {
        navigate(
          `/land-requirements/${createdRequirement.expLandReqId}`,
          {
            replace: true,
          }
        );

        return;
      }

      navigate(
        "/land-requirements",
        {
          replace: true,
        }
      );
    } catch (submitError) {
      console.error(
        "Create land requirement failed:",
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
            Loading land requirement form...
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
              Dashboard / Land Requirements / Create
            </p>

            <h1>
              Create Land Requirement
            </h1>

            <p>
              Define the land area and
              soil conditions required
              for an experiment.
            </p>
          </div>

          <button
            type="button"
            className="requirement-back-button"
            onClick={() =>
              navigate(
                "/land-requirements"
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
              <LandPlot
                size={21}
              />

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
              disabled={
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

            <label
              htmlFor="isFixedForExperiment"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
              }}
            >
              <input
                id="isFixedForExperiment"
                type="checkbox"
                name="isFixedForExperiment"
                checked={
                  form.isFixedForExperiment
                }
                onChange={
                  handleChange
                }
              />

              Fixed land for this experiment
            </label>

            <small>
              Enable this option when
              the experiment must use
              the same land resource
              throughout its lifecycle.
            </small>

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
                  Fixed for Experiment
                </span>

                <strong>
                  {form.isFixedForExperiment
                    ? "Yes"
                    : "No"}
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
                    "/land-requirements"
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
                  ? "Creating..."
                  : "Create Land Requirement"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </DashboardLayout>
  );
}