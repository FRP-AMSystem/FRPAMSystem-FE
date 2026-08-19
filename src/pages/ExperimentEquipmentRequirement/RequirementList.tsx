import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { Eye, Pencil, Trash2 } from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  deleteExperimentEquipmentRequirement,
  getExperimentEquipmentRequirements,
} from "../../services/experimentEquipmentRequirementService";

import type { ExperimentEquipmentRequirement } from "../../types/experimentEquipmentRequirement";

import "./RequirementList.css";

type Role = "Admin" | "Manager" | "Researcher" | "Technician" | "Student" | "Seasonal";

function formatMinEfficiency(
  value: number | null | undefined
): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  const percentage = value <= 1 ? value * 100 : value;

  return `${Number(percentage.toFixed(2))}%`;
}

export default function RequirementList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const role = (localStorage.getItem("role") || "Seasonal") as Role;

  const canCreateRequirement = role === "Admin" || role === "Manager" || role === "Researcher";
  const canEditRequirement = role === "Admin" || role === "Manager" || role === "Researcher";
  const canDeleteRequirement = role === "Admin" || role === "Manager" || role === "Researcher";

  const experimentIdFromUrl = searchParams.get("experimentId");

  const selectedExperimentId = useMemo(() => {
    if (!experimentIdFromUrl) {
      return undefined;
    }

    const parsedId = Number(experimentIdFromUrl);

    return Number.isInteger(parsedId) && parsedId > 0
      ? parsedId
      : undefined;
  }, [experimentIdFromUrl]);

  const [requirements, setRequirements] = useState<
    ExperimentEquipmentRequirement[]
  >([]);
  const [keyword, setKeyword] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const loadRequirements = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getExperimentEquipmentRequirements({
        keyword: activeKeyword.trim() || undefined,
        experimentId: selectedExperimentId,
        page: 1,
        size: 50,
      });

      setRequirements(Array.isArray(data) ? data : []);
    } catch (loadError) {
      console.error(
        "Failed to load equipment requirements:",
        loadError
      );
      setRequirements([]);
      setError(
        "Cannot load equipment requirements. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [activeKeyword, selectedExperimentId]);

  useEffect(() => {
    void loadRequirements();
  }, [loadRequirements]);

  const selectedExperimentName = useMemo(() => {
    if (selectedExperimentId === undefined) {
      return "";
    }

    return (
      requirements.find(
        (item) => item.experimentId === selectedExperimentId
      )?.experimentName || ""
    );
  }, [requirements, selectedExperimentId]);

  const handleSearch = () => {
    setActiveKeyword(keyword.trim());
  };

  const handleClearSearch = () => {
    setKeyword("");
    setActiveKeyword("");
  };

  const handleCreateRequirement = () => {
    if (selectedExperimentId !== undefined) {
      navigate(
        `/equipment-requirements/create?experimentId=${selectedExperimentId}`
      );
      return;
    }

    navigate("/equipment-requirements/create");
  };

  const handleViewAllRequirements = () => {
    navigate("/equipment-requirements");
  };

  const handleDelete = async (id: number) => {
    if (!canDeleteRequirement || deletingId !== null) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this requirement?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);
      setError("");

      await deleteExperimentEquipmentRequirement(id);
      await loadRequirements();
    } catch (deleteError) {
      console.error(
        "Delete equipment requirement failed:",
        deleteError
      );
      setError(
        "Delete equipment requirement failed. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="requirement-page">
        <div className="requirement-header">
          <div>
            <h1>Equipment Requirements</h1>

            {selectedExperimentId !== undefined ? (
              <p>
                Showing equipment requirements for{" "}
                <strong>
                  {selectedExperimentName ||
                    `Experiment #${selectedExperimentId}`}
                </strong>
                .
              </p>
            ) : (
              <p>
                Researcher creates and updates requirements.
                Manager, Technician and Seasonal can view the
                requirement information.
              </p>
            )}
          </div>

          <div className="requirement-header-actions">
            {selectedExperimentId !== undefined && (
              <button
                type="button"
                className="requirement-secondary-btn"
                onClick={handleViewAllRequirements}
                disabled={deletingId !== null}
              >
                View All Requirements
              </button>
            )}

            {canCreateRequirement && (
              <button
                type="button"
                className="requirement-create-btn"
                onClick={handleCreateRequirement}
                disabled={deletingId !== null}
              >
                + Create Requirement
              </button>
            )}
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="requirement-toolbar">
          <input
            type="text"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch();
              }
            }}
            placeholder="Search by experiment, equipment or note..."
            disabled={loading || deletingId !== null}
          />

          <button
            type="button"
            onClick={handleSearch}
            disabled={loading || deletingId !== null}
          >
            Search
          </button>

          {(keyword || activeKeyword) && (
            <button
              type="button"
              onClick={handleClearSearch}
              disabled={loading || deletingId !== null}
            >
              Clear
            </button>
          )}
        </div>

        <div className="requirement-table-card">
          <h3>Requirement List</h3>

          {loading ? (
            <p className="loading-text">Loading requirements...</p>
          ) : (
            <div className="requirement-table-wrapper">
              <table className="requirement-table">
                <thead>
                  <tr>
                    <th>Experiment</th>
                    <th>Equipment Type</th>
                    <th>Quantity</th>
                    <th>Substitute</th>
                    <th>Min Efficiency</th>
                    <th>Note</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {requirements.map((item) => {
                    const id = item.expEquipmentReqId;
                    const isDeleting = deletingId === id;
                    const actionDisabled = deletingId !== null;

                    return (
                      <tr key={id}>
                        <td>
                          <strong>
                            {item.experimentName ||
                              `Experiment #${item.experimentId}`}
                          </strong>
                        </td>

                        <td>
                          {item.equipmentTypeName ||
                            `Equipment Type #${item.equipmentTypeId}`}
                        </td>

                        <td>{item.quantity}</td>

                        <td>
                          <span
                            className={
                              item.allowSubstitute
                                ? "substitute-yes"
                                : "substitute-no"
                            }
                          >
                            {item.allowSubstitute
                              ? "Allowed"
                              : "Not allowed"}
                          </span>
                        </td>

                        <td>
                          {formatMinEfficiency(
                            item.minAcceptableEfficiency
                          )}
                        </td>

                        <td>{item.note || "-"}</td>

                        <td>
                          <div className="requirement-actions">
                            <button
                              type="button"
                              className="action-btn-pill view"
                              disabled={actionDisabled}
                              onClick={() =>
                                navigate(
                                  `/equipment-requirements/${id}`
                                )
                              }
                            >
                              <Eye size={12} />
                              <span>View</span>
                            </button>

                            {canEditRequirement && (
                              <button
                                type="button"
                                className="action-btn-pill edit"
                                disabled={actionDisabled}
                                onClick={() =>
                                  navigate(
                                    `/equipment-requirements/${id}/edit`
                                  )
                                }
                              >
                                <Pencil size={12} />
                                <span>Edit</span>
                              </button>
                            )}

                            {canDeleteRequirement && (
                              <button
                                type="button"
                                className="action-btn-pill delete"
                                disabled={actionDisabled}
                                onClick={() => void handleDelete(id)}
                              >
                                <Trash2 size={12} />
                                <span>{isDeleting ? "..." : "Delete"}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {requirements.length === 0 && (
                    <tr>
                      <td colSpan={8} className="empty-cell">
                        {selectedExperimentId !== undefined
                          ? "No equipment requirements found for this experiment."
                          : "No equipment requirements found."}
                      </td>
                    </tr>
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
