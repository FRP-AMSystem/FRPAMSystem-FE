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

    if (response?.data?.message) {
      return response.data.message;
    }

    if (response?.data?.errors) {
      return Object.values(
        response.data.errors
      )
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

  return "Cannot create land requirement.";
}

function isPositiveInteger(
  value: number
): boolean {
  return (
    Number.isInteger(value) &&
    value > 0
  );
}


function isDraftExperimentStatus(
  status?: string | null
): boolean {
  return (
    status === "Draft" ||
    status === "Created"
  );
}

export default function CreateLandRequirement() {
  const navigate = useNavigate();
  const [searchParams] =
    useSearchParams();

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
    note: "",
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

  const selectedExperimentIsEditable =
    selectedExperiment
      ? isDraftExperimentStatus(
          selectedExperiment.status
        )
      : false;

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

        if (active) {
          setError(
            getErrorMessage(
              loadError
            )
          );
          setExperiments([]);
        }
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
    if (!experimentIdFromUrl) {
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

    setForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  };

  const goBack = () => {
    const experimentId =
      Number(
        form.experimentId ||
        experimentIdFromUrl
      );

    if (
      isPositiveInteger(
        experimentId
      )
    ) {
      navigate(
        `/land-requirements?experimentId=${experimentId}`
      );
      return;
    }

    navigate(
      "/land-requirements"
    );
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    const experimentId =
      Number(form.experimentId);

    const requiredArea =
      Number(form.requiredArea);

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
      !selectedExperimentIsEditable
    ) {
      setError(
        "Land requirements can only be created while the experiment is in Draft status."
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

    try {
      setSaving(true);

      await createExperimentLandRequirement({
        experimentId,
        requiredArea,
        requiredSoilType:
          form.requiredSoilType.trim() ||
          null,
        note:
          form.note.trim() ||
          null,
      });

      navigate(
        `/land-requirements?experimentId=${experimentId}`,
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
              {experimentIdFromUrl
                ? `Dashboard / Experiments / #${experimentIdFromUrl} / Land Requirements / Create`
                : "Dashboard / Land Requirements / Create"}
            </p>

            <h1>
              Create Land Requirement
            </h1>

            <p>
              Define land area and soil requirements for the selected experiment.
            </p>
          </div>

          <button
            type="button"
            className="requirement-back-button"
            onClick={goBack}
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
          onSubmit={handleSubmit}
        >
          <section className="requirement-form-card">
            <div className="requirement-card-heading">
              <LandPlot size={20} />
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

            <label htmlFor="requiredArea">
              Required Area
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
              disabled={saving}
              placeholder="Example: 10"
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
              disabled={saving}
              placeholder="Example: Loamy soil"
            />

            <label htmlFor="note">
              Note
            </label>

            <textarea
              id="note"
              name="note"
              rows={4}
              value={form.note}
              onChange={
                handleChange
              }
              disabled={saving}
              placeholder="Optional note..."
            />
          </section>

          <section className="requirement-form-card">
            <h2>Preview</h2>

            <div className="requirement-preview">
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
                  Required Area
                </span>
                <strong>
                  {form.requiredArea ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>
                  Required Soil Type
                </span>
                <strong>
                  {form.requiredSoilType.trim() ||
                    "Not specified"}
                </strong>
              </div>

              <div>
                <span>Note</span>
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
                onClick={goBack}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="requirement-save-button"
                disabled={
                  saving ||
                  !selectedExperimentIsEditable ||
                  !form.experimentId ||
                  !form.requiredArea
                }
              >
                {saving
                  ? "Creating..."
                  : "Create Requirement"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </DashboardLayout>
  );
}
