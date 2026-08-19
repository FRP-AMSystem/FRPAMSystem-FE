import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  CalendarDays,
  Edit3,
  FileText,
  FlaskConical,
  LandPlot,
  Map,
  Trash2,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  deleteExperimentLandRequirement,
  getExperimentLandRequirementById,
} from "../../services/experimentLandRequirementService";

import type {
  ExperimentLandRequirement,
} from "../../types/experimentLandRequirement";

import "./LandRequirementDetail.css";

type Role =
  | "Admin"
  | "Manager"
  | "Researcher"
  | "Technician"
  | "Student"
  | "Seasonal";

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

    if (response?.status === 404) {
      return "Land requirement was not found.";
    }

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

  return "Cannot load land requirement.";
}

function formatDate(
  value?: string | null
): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function formatArea(
  value: number
): string {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits: 2,
    }
  ).format(value);
}

export default function LandRequirementDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const role =
    localStorage.getItem(
      "role"
    ) as Role | null;

  const canManage =
    role === "Admin" || role === "Manager" || role === "Researcher";

  const requirementId =
    Number(id);

  const [
    requirement,
    setRequirement,
  ] = useState<
    ExperimentLandRequirement | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const loadRequirement =
    useCallback(async () => {
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

        const data =
          await getExperimentLandRequirementById(
            requirementId
          );

        setRequirement(data);
      } catch (loadError) {
        console.error(
          "Load land requirement detail failed:",
          loadError
        );

        setError(
          getErrorMessage(
            loadError
          )
        );

        setRequirement(null);
      } finally {
        setLoading(false);
      }
    }, [requirementId]);

  useEffect(() => {
    void loadRequirement();
  }, [loadRequirement]);

  const handleDelete = async () => {
    if (
      !canManage ||
      !requirement
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete Land Requirement #${requirement.expLandReqId}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setError("");

      await deleteExperimentLandRequirement(
        requirement.expLandReqId
      );

      navigate(
        "/land-requirements",
        {
          replace: true,
        }
      );
    } catch (deleteError) {
      console.error(
        "Delete land requirement failed:",
        deleteError
      );

      setError(
        getErrorMessage(
          deleteError
        )
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="land-detail-page">
          <div className="land-detail-state">
            Loading land requirement...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (
    error &&
    !requirement
  ) {
    return (
      <DashboardLayout>
        <div className="land-detail-page">
          <div className="land-detail-error-card">
            <LandPlot size={44} />

            <h2>
              Cannot open requirement
            </h2>

            <p>{error}</p>

            <div className="land-detail-error-actions">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/land-requirements"
                  )
                }
              >
                <ArrowLeft size={18} />
                Back to list
              </button>

              <button
                type="button"
                onClick={() =>
                  void loadRequirement()
                }
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!requirement) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="land-detail-page">
        <div className="land-detail-header">
          <div>
            <p className="land-detail-breadcrumb">
              Dashboard / Land Requirements / Detail
            </p>

            <h1>
              Land Requirement Detail
            </h1>

            <p className="land-detail-description">
              View the land area and soil
              conditions required for this
              experiment.
            </p>
          </div>

          <div className="land-detail-header-actions">
            <button
              type="button"
              className="land-detail-back-button"
              onClick={() =>
                navigate(
                  "/land-requirements"
                )
              }
            >
              <ArrowLeft size={16} />
              Back
            </button>

            {canManage && (
              <>
                <button
                  type="button"
                  className="action-btn-pill edit"
                  onClick={() =>
                    navigate(
                      `/land-requirements/${requirement.expLandReqId}/edit`
                    )
                  }
                >
                  <Edit3 size={14} />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  className="action-btn-pill delete"
                  disabled={deleting}
                  onClick={() =>
                    void handleDelete()
                  }
                >
                  <Trash2 size={14} />
                  <span>
                    {deleting
                      ? "Deleting..."
                      : "Delete"}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="land-detail-error">
            {error}
          </div>
        )}

        <div className="land-detail-layout">
          <section className="land-detail-main-card">
            <div className="land-detail-card-heading">
              <div className="land-detail-card-icon">
                <LandPlot size={22} />
              </div>

              <div>
                <h2>
                  Requirement Information
                </h2>

                <p>
                  Land requirement #
                  {requirement.expLandReqId}
                </p>
              </div>
            </div>

            <div className="land-detail-grid">
              <div className="land-detail-item">
                <div className="land-detail-item-icon">
                  <FlaskConical size={19} />
                </div>

                <div>
                  <span>
                    Experiment
                  </span>

                  <strong>
                    {requirement.experimentName ||
                      `Experiment #${requirement.experimentId}`}
                  </strong>

                  <small>
                    Experiment ID: #
                    {requirement.experimentId}
                  </small>
                </div>
              </div>

              <div className="land-detail-item">
                <div className="land-detail-item-icon">
                  <Map size={19} />
                </div>

                <div>
                  <span>
                    Required Area
                  </span>

                  <strong>
                    {formatArea(
                      requirement.requiredArea
                    )}{" "}
                    m²
                  </strong>
                </div>
              </div>

              <div className="land-detail-item">
                <div className="land-detail-item-icon">
                  <LandPlot size={19} />
                </div>

                <div>
                  <span>
                    Required Soil Type
                  </span>

                  <strong>
                    {requirement.requiredSoilType ||
                      "Not specified"}
                  </strong>
                </div>
              </div>

              <div className="land-detail-item">
                <div className="land-detail-item-icon">
                  <FileText size={19} />
                </div>

                <div>
                  <span>
                    Requirement ID
                  </span>

                  <strong>
                    #
                    {requirement.expLandReqId}
                  </strong>
                </div>
              </div>
            </div>

            <div className="land-detail-note-section">
              <div className="land-detail-note-heading">
                <FileText size={19} />

                <h3>Note</h3>
              </div>

              <p>
                {requirement.note ||
                  "No additional note was provided for this land requirement."}
              </p>
            </div>
          </section>

          <aside className="land-detail-side-card">
            <div className="land-detail-side-heading">
              <CalendarDays size={20} />

              <h2>
                Record Information
              </h2>
            </div>

            <div className="land-detail-record">
              <span>
                Requirement ID
              </span>

              <strong>
                #
                {requirement.expLandReqId}
              </strong>
            </div>

            <div className="land-detail-record">
              <span>
                Created At
              </span>

              <strong>
                {formatDate(
                  requirement.createdAt
                )}
              </strong>
            </div>

            <div className="land-detail-record">
              <span>
                Last Updated
              </span>

              <strong>
                {formatDate(
                  requirement.updatedAt
                )}
              </strong>
            </div>

            <div className="land-detail-side-actions">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/experiments/${requirement.experimentId}`
                  )
                }
              >
                <FlaskConical size={18} />
                View Experiment
              </button>
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}