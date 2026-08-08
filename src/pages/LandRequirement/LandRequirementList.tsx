import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  Eye,
  LandPlot,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  deleteExperimentLandRequirement,
  getExperimentLandRequirements,
} from "../../services/experimentLandRequirementService";

import type {
  ExperimentLandRequirement,
} from "../../types/experimentLandRequirement";

import "./LandRequirementList.css";

type Role =
  | "Manager"
  | "Researcher"
  | "Technician"
  | "Student";

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

  return "Cannot load land requirements.";
}

function formatArea(
  area: number
): string {
  if (
    !Number.isFinite(area)
  ) {
    return "-";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits: 2,
    }
  ).format(area);
}

export default function LandRequirementList() {
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
    ExperimentLandRequirement[]
  >([]);

  const [
    keyword,
    setKeyword,
  ] = useState("");

  const [
    searchKeyword,
    setSearchKeyword,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    deletingId,
    setDeletingId,
  ] = useState<
    number | null
  >(null);

  const [
    error,
    setError,
  ] = useState("");

  const loadRequirements =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          const data =
            await getExperimentLandRequirements(
              {
                keyword:
                  searchKeyword ||
                  undefined,

                page: 1,
                size: 100,
              }
            );

          setRequirements(
            Array.isArray(data)
              ? data
              : []
          );
        } catch (loadError) {
          console.error(
            "Load land requirements failed:",
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
      },
      [searchKeyword]
    );

  useEffect(() => {
    void loadRequirements();
  }, [loadRequirements]);

  const handleKeywordChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    setKeyword(
      event.target.value
    );
  };

  const handleSearch = () => {
    setSearchKeyword(
      keyword.trim()
    );
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement>
  ) => {
    if (
      event.key === "Enter"
    ) {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setKeyword("");
    setSearchKeyword("");
  };

  const handleDelete = async (
    requirement: ExperimentLandRequirement
  ) => {
    if (!canManage) {
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
      setDeletingId(
        requirement.expLandReqId
      );

      setError("");

      await deleteExperimentLandRequirement(
        requirement.expLandReqId
      );

      setRequirements(
        (currentRequirements) =>
          currentRequirements.filter(
            (item) =>
              item.expLandReqId !==
              requirement.expLandReqId
          )
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
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="land-requirement-list-page">
        <div className="land-requirement-list-header">
          <div>
            <p className="land-requirement-list-breadcrumb">
              Dashboard / Land Requirements
            </p>

            <h1>
              Land Requirements
            </h1>

            <p className="land-requirement-list-description">
              Manage land area and soil
              requirements for experiments.
            </p>
          </div>

          {canManage && (
            <button
              type="button"
              className="land-requirement-create-button"
              onClick={() =>
                navigate(
                  "/land-requirements/create"
                )
              }
            >
              <Plus size={18} />

              Create Requirement
            </button>
          )}
        </div>

        <section className="land-requirement-toolbar">
          <div className="land-requirement-search-wrapper">
            <Search
              size={18}
              className="land-requirement-search-icon"
            />

            <input
              type="text"
              value={keyword}
              onChange={
                handleKeywordChange
              }
              onKeyDown={
                handleKeyDown
              }
              placeholder="Search by experiment, soil type or note..."
            />
          </div>

          <button
            type="button"
            className="land-requirement-search-button"
            onClick={
              handleSearch
            }
          >
            Search
          </button>

          {(keyword ||
            searchKeyword) && (
            <button
              type="button"
              className="land-requirement-clear-button"
              onClick={
                handleClearSearch
              }
            >
              Clear
            </button>
          )}
        </section>

        {error && (
          <div className="land-requirement-error">
            {error}
          </div>
        )}

        <section className="land-requirement-table-card">
          <div className="land-requirement-table-header">
            <div>
              <h2>
                Requirement List
              </h2>

              <p>
                {
                  requirements.length
                }{" "}
                requirement
                {requirements.length ===
                1
                  ? ""
                  : "s"}
              </p>
            </div>

            <div className="land-requirement-table-icon">
              <LandPlot size={22} />
            </div>
          </div>

          {loading ? (
            <div className="land-requirement-state">
              Loading land requirements...
            </div>
          ) : requirements.length ===
            0 ? (
            <div className="land-requirement-empty-state">
              <LandPlot size={44} />

              <h3>
                No land requirements found
              </h3>

              <p>
                {searchKeyword
                  ? "No requirement matches the current search."
                  : "Create a land requirement for an experiment to get started."}
              </p>

              {canManage &&
                !searchKeyword && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/land-requirements/create"
                      )
                    }
                  >
                    <Plus size={18} />

                    Create Land Requirement
                  </button>
                )}
            </div>
          ) : (
            <div className="land-requirement-table-wrapper">
              <table className="land-requirement-table">
                <thead>
                  <tr>
                    <th>ID</th>

                    <th>
                      Experiment
                    </th>

                    <th>
                      Required Area
                    </th>

                    <th>
                      Soil Type
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
                  {requirements.map(
                    (
                      requirement
                    ) => (
                      <tr
                        key={
                          requirement.expLandReqId
                        }
                      >
                        <td>
                          <span className="land-requirement-id">
                            #
                            {
                              requirement.expLandReqId
                            }
                          </span>
                        </td>

                        <td>
                          <div className="land-requirement-experiment">
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
                          <span className="land-requirement-area">
                            {formatArea(
                              requirement.requiredArea
                            )}{" "}
                            m²
                          </span>
                        </td>

                        <td>
                          <span className="land-requirement-soil">
                            {requirement.requiredSoilType ||
                              "-"}
                          </span>
                        </td>

                        <td>
                          <span className="land-requirement-note">
                            {requirement.note ||
                              "-"}
                          </span>
                        </td>

                        <td>
                          <div className="land-requirement-actions">
                            <button
                              type="button"
                              className="action-btn-pill view"
                              onClick={() =>
                                navigate(
                                  `/land-requirements/${requirement.expLandReqId}`
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
                                      `/land-requirements/${requirement.expLandReqId}/edit`
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
                                    requirement.expLandReqId
                                  }
                                  onClick={() =>
                                    void handleDelete(
                                      requirement
                                    )
                                  }
                                >
                                  <Trash2 size={12} />
                                  <span>
                                    {deletingId ===
                                    requirement.expLandReqId
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
        </section>
      </div>
    </DashboardLayout>
  );
}