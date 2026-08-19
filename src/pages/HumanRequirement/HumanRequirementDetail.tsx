import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  Clock3,
  Pencil,
  Trash2,
  UserRoundCog,
  Users,
  Wrench,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  deleteExperimentHumanRequirement,
  getExperimentHumanRequirementById,
} from "../../services/experimentHumanRequirementService";

import type {
  ExperimentHumanRequirement,
} from "../../types/experimentHumanRequirement";

import "./HumanRequirementDetail.css";

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

  return "Cannot load human requirement.";
}

function formatDate(
  value?: string | null
): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString();
}

export default function HumanRequirementDetail() {
  const navigate =
    useNavigate();

  const { id } =
    useParams();

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
    ExperimentHumanRequirement | null
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

  useEffect(() => {
    async function loadRequirement() {
      if (
        !Number.isInteger(
          requirementId
        ) ||
        requirementId <= 0
      ) {
        setError(
          "Human requirement ID is invalid."
        );

        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data =
          await getExperimentHumanRequirementById(
            requirementId
          );

        setRequirement(data);
      } catch (loadError) {
        console.error(
          "Load human requirement detail failed:",
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

    void loadRequirement();
  }, [requirementId]);

  const handleDelete = async () => {
    if (
      !requirement ||
      !canManage
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete Human Requirement #${requirement.expHumanReqId}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setError("");

      await deleteExperimentHumanRequirement(
        requirement.expHumanReqId
      );

      navigate(
        "/human-requirements",
        {
          replace: true,
        }
      );
    } catch (deleteError) {
      console.error(
        "Delete human requirement failed:",
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

  return (
    <DashboardLayout>
      <div className="human-detail-page">
        <div className="human-detail-header">
          <div>
            <p className="human-detail-breadcrumb">
              Dashboard / Human Requirements / Detail
            </p>

            <h1>
              Human Requirement Detail
            </h1>

            <p>
              View personnel requirements
              assigned to an experiment.
            </p>
          </div>

          <div className="human-detail-header-actions">
            <button
              type="button"
              className="human-detail-back-button"
              onClick={() =>
                navigate(
                  "/human-requirements"
                )
              }
            >
              <ArrowLeft size={18} />

              Back
            </button>

            {canManage &&
              requirement && (
                <>
                  <button
                    type="button"
                    className="human-detail-edit-button"
                    onClick={() =>
                      navigate(
                        `/human-requirements/${requirement.expHumanReqId}/edit`
                      )
                    }
                  >
                    <Pencil size={18} />

                    Edit
                  </button>

                  <button
                    type="button"
                    className="human-detail-delete-button"
                    disabled={deleting}
                    onClick={() =>
                      void handleDelete()
                    }
                  >
                    <Trash2 size={18} />

                    {deleting
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </>
              )}
          </div>
        </div>

        {error && (
          <div className="human-detail-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="human-detail-state">
            Loading human requirement...
          </div>
        ) : !requirement ? (
          <div className="human-detail-state">
            Human requirement was not found.
          </div>
        ) : (
          <div className="human-detail-layout">
            <section className="human-detail-card">
              <div className="human-detail-card-title">
                <Users size={21} />

                <h2>
                  Requirement Information
                </h2>
              </div>

              <div className="human-detail-grid">
                <div className="human-detail-item">
                  <span>
                    Requirement ID
                  </span>

                  <strong>
                    #
                    {
                      requirement.expHumanReqId
                    }
                  </strong>
                </div>

                <div className="human-detail-item">
                  <span>
                    Experiment
                  </span>

                  <strong>
                    {requirement.experimentName ||
                      `Experiment #${requirement.experimentId}`}
                  </strong>
                </div>

                <div className="human-detail-item">
                  <span>
                    Experiment ID
                  </span>

                  <strong>
                    #
                    {
                      requirement.experimentId
                    }
                  </strong>
                </div>

                <div className="human-detail-item">
                  <span>
                    Required Quantity
                  </span>

                  <strong>
                    {
                      requirement.quantity
                    }
                  </strong>
                </div>
              </div>
            </section>

            <section className="human-detail-card">
              <div className="human-detail-card-title">
                <UserRoundCog size={21} />

                <h2>
                  Role and Skill
                </h2>
              </div>

              <div className="human-detail-grid">
                <div className="human-detail-item">
                  <span>
                    Required Role
                  </span>

                  <strong>
                    {requirement.roleName ||
                      `Role #${requirement.roleId}`}
                  </strong>
                </div>

                <div className="human-detail-item">
                  <span>
                    Role ID
                  </span>

                  <strong>
                    #
                    {
                      requirement.roleId
                    }
                  </strong>
                </div>

                <div className="human-detail-item">
                  <span>
                    Required Skill
                  </span>

                  <strong>
                    {requirement.requiredSkillName ||
                      "No specific skill"}
                  </strong>
                </div>

                <div className="human-detail-item">
                  <span>
                    Skill ID
                  </span>

                  <strong>
                    {requirement.requiredSkillId
                      ? `#${requirement.requiredSkillId}`
                      : "-"}
                  </strong>
                </div>
              </div>
            </section>

            <section className="human-detail-card">
              <div className="human-detail-card-title">
                <Clock3 size={21} />

                <h2>
                  Working Information
                </h2>
              </div>

              <div className="human-detail-grid">
                <div className="human-detail-item">
                  <span>
                    Working Hours Per Day
                  </span>

                  <strong>
                    {requirement.workingHoursPerDay !==
                      null &&
                      requirement.workingHoursPerDay !==
                      undefined
                      ? `${requirement.workingHoursPerDay} hours`
                      : "-"}
                  </strong>
                </div>

                <div className="human-detail-item">
                  <span>
                    Total Daily Hours
                  </span>

                  <strong>
                    {requirement.workingHoursPerDay !==
                      null &&
                      requirement.workingHoursPerDay !==
                      undefined
                      ? `${requirement.quantity * requirement.workingHoursPerDay} hours`
                      : "-"}
                  </strong>
                </div>

                <div className="human-detail-item">
                  <span>
                    Created At
                  </span>

                  <strong>
                    {formatDate(
                      requirement.createdAt
                    )}
                  </strong>
                </div>

                <div className="human-detail-item">
                  <span>
                    Updated At
                  </span>

                  <strong>
                    {formatDate(
                      requirement.updatedAt
                    )}
                  </strong>
                </div>
              </div>
            </section>

            <section className="human-detail-card human-detail-note-card">
              <div className="human-detail-card-title">
                <Wrench size={21} />

                <h2>
                  Note
                </h2>
              </div>

              <p>
                {requirement.note ||
                  "No note was provided."}
              </p>
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}