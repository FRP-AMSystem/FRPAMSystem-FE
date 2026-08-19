import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  deleteExperimentHumanRequirement,
  getExperimentHumanRequirements,
} from "../../services/experimentHumanRequirementService";

import type {
  ExperimentHumanRequirement,
} from "../../types/experimentHumanRequirement";

import "./HumanRequirementList.css";

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

  return "Cannot load human requirements.";
}

function formatHours(
  value?: number | null
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "-";
  }

  return `${value} hour${value === 1 ? "" : "s"
    }`;
}

export default function HumanRequirementList() {
  const navigate =
    useNavigate();

  const role =
    localStorage.getItem(
      "role"
    ) as Role | null;

  const canManage =
    role === "Admin" || role === "Manager" || role === "Researcher";

  const [
    requirements,
    setRequirements,
  ] = useState<
    ExperimentHumanRequirement[]
  >([]);

  const [
    keyword,
    setKeyword,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    deletingId,
    setDeletingId,
  ] = useState<number | null>(
    null
  );

  const [
    error,
    setError,
  ] = useState("");

  const filteredRequirements =
    useMemo(() => {
      const normalizedKeyword =
        keyword
          .trim()
          .toLowerCase();

      if (
        !normalizedKeyword
      ) {
        return requirements;
      }

      return requirements.filter(
        (requirement) => {
          const searchableValues = [
            requirement.expHumanReqId,
            requirement.experimentId,
            requirement.experimentName,
            requirement.roleId,
            requirement.roleName,
            requirement.quantity,
            requirement.requiredSkillId,
            requirement.requiredSkillName,
            requirement.note,
          ];

          return searchableValues.some(
            (value) =>
              String(
                value ?? ""
              )
                .toLowerCase()
                .includes(
                  normalizedKeyword
                )
          );
        }
      );
    }, [
      keyword,
      requirements,
    ]);

  async function loadRequirements() {
    try {
      setLoading(true);
      setError("");

      const data =
        await getExperimentHumanRequirements({
          page: 1,
          size: 100,
        });

      setRequirements(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (loadError) {
      console.error(
        "Load human requirements failed:",
        loadError
      );

      setError(
        getErrorMessage(
          loadError
        )
      );

      setRequirements([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequirements();
  }, []);

  const handleDelete = async (
    requirement:
      ExperimentHumanRequirement
  ) => {
    if (!canManage) {
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
      setDeletingId(
        requirement.expHumanReqId
      );

      setError("");

      await deleteExperimentHumanRequirement(
        requirement.expHumanReqId
      );

      setRequirements(
        (current) =>
          current.filter(
            (item) =>
              item.expHumanReqId !==
              requirement.expHumanReqId
          )
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
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="human-requirement-page">
        <div className="human-requirement-header">
          <div>
            <p className="human-requirement-breadcrumb">
              Dashboard / Human Requirements
            </p>

            <h1>
              Human Requirements
            </h1>

            <p>
              Manage personnel requirements
              for experiments.
            </p>
          </div>

          {canManage && (
            <button
              type="button"
              className="human-requirement-create-button"
              onClick={() =>
                navigate(
                  "/human-requirements/create"
                )
              }
            >
              <Plus size={18} />

              Create Human Requirement
            </button>
          )}
        </div>

        {error && (
          <div className="human-requirement-error">
            {error}
          </div>
        )}

        <div className="human-requirement-toolbar">
          <div className="human-requirement-search">
            <Search size={18} />

            <input
              type="text"
              value={keyword}
              onChange={(event) =>
                setKeyword(
                  event.target.value
                )
              }
              placeholder="Search by experiment, role, skill or note..."
            />
          </div>

          <div className="human-requirement-count">
            <Users size={18} />

            <span>
              {
                filteredRequirements.length
              }{" "}
              requirement
              {filteredRequirements.length ===
                1
                ? ""
                : "s"}
            </span>
          </div>
        </div>

        <div className="human-requirement-table-card">
          {loading ? (
            <div className="human-requirement-state">
              Loading human requirements...
            </div>
          ) : filteredRequirements.length ===
            0 ? (
            <div className="human-requirement-empty">
              <Users size={44} />

              <h3>
                No human requirements found
              </h3>

              <p>
                {keyword
                  ? "No requirement matches your search."
                  : "Create a human requirement for an experiment."}
              </p>

              {canManage &&
                !keyword && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/human-requirements/create"
                      )
                    }
                  >
                    <Plus
                      size={18}
                    />

                    Create Requirement
                  </button>
                )}
            </div>
          ) : (
            <div className="human-requirement-table-wrapper">
              <table className="human-requirement-table">
                <thead>
                  <tr>
                    <th>
                      Experiment
                    </th>

                    <th>
                      Required Role
                    </th>

                    <th>
                      Skill
                    </th>

                    <th>
                      Quantity
                    </th>

                    <th>
                      Hours / Day
                    </th>

                    <th>
                      Note
                    </th>

                    <th>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRequirements.map(
                    (
                      requirement
                    ) => (
                      <tr
                        key={
                          requirement.expHumanReqId
                        }
                      >
                        <td>
                          <div className="human-requirement-main-cell">
                            <strong>
                              {requirement.experimentName ||
                                `Experiment #${requirement.experimentId}`}
                            </strong>

                            <span>
                              ID: #
                              {
                                requirement.experimentId
                              }
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="human-requirement-main-cell">
                            <strong>
                              {requirement.roleName ||
                                `Role #${requirement.roleId}`}
                            </strong>

                            <span>
                              Role ID: #
                              {
                                requirement.roleId
                              }
                            </span>
                          </div>
                        </td>

                        <td>
                          {requirement.requiredSkillName ? (
                            <div className="human-requirement-main-cell">
                              <strong>
                                {
                                  requirement.requiredSkillName
                                }
                              </strong>

                              <span>
                                Skill ID: #
                                {
                                  requirement.requiredSkillId
                                }
                              </span>
                            </div>
                          ) : (
                            <span className="human-requirement-muted">
                              No specific skill
                            </span>
                          )}
                        </td>

                        <td>
                          <span className="human-requirement-quantity">
                            {
                              requirement.quantity
                            }
                          </span>
                        </td>

                        <td>
                          {formatHours(
                            requirement.workingHoursPerDay
                          )}
                        </td>

                        <td>
                          <span
                            className="human-requirement-note"
                            title={
                              requirement.note ||
                              ""
                            }
                          >
                            {requirement.note ||
                              "-"}
                          </span>
                        </td>

                        <td>
                          <div className="human-requirement-actions">
                            <button
                              type="button"
                              className="action-btn-pill view"
                              onClick={() =>
                                navigate(
                                  `/human-requirements/${requirement.expHumanReqId}`
                                )
                              }
                            >
                              <Eye size={12} />
                              <span>View</span>
                            </button>

                            {canManage && (
                              <>
                                <button
                                  type="button"
                                  className="action-btn-pill edit"
                                  onClick={() =>
                                    navigate(
                                      `/human-requirements/${requirement.expHumanReqId}/edit`
                                    )
                                  }
                                >
                                  <Pencil size={12} />
                                  <span>Edit</span>
                                </button>

                                <button
                                  type="button"
                                  className="action-btn-pill delete"
                                  disabled={
                                    deletingId ===
                                    requirement.expHumanReqId
                                  }
                                  onClick={() =>
                                    void handleDelete(requirement)
                                  }
                                >
                                  <Trash2 size={12} />
                                  <span>
                                    {deletingId === requirement.expHumanReqId
                                      ? "..."
                                      : "Delete"}
                                  </span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}