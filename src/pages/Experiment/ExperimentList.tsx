import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Trash2 } from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import {
  deleteExperiment,
  getExperiments,
} from "../../services/experimentService";
import type { ExperimentResponse } from "../../types/experiment";

import "./ExperimentList.css";

type Role = "Manager" | "Researcher" | "Technician" | "Student";

const priorityLabels: Record<number, string> = {
  0: "Low",
  1: "Medium",
  2: "High",
  3: "Urgent",
};

function formatDate(date?: string | null): string {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsedDate);
}

function getStatusClass(status?: string | null): string {
  const normalizedStatus = (status || "unknown")
    .replace(/\s+/g, "")
    .toLowerCase();

  return `experiment-status status-${normalizedStatus}`;
}

function getPriorityLabel(priority?: number | null): string {
  if (priority === null || priority === undefined) {
    return "-";
  }

  return priorityLabels[priority] ?? String(priority);
}

function getErrorMessage(error: unknown): string {
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
          };
        };
      }
    ).response;

    return (
      response?.data?.message ||
      response?.data?.title ||
      "Unable to process the request."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to process the request.";
}

export default function ExperimentList() {
  const navigate = useNavigate();

  const role = (localStorage.getItem("role") || "Student") as Role;
  const isResearcher = role === "Admin" || role === "Manager" || role === "Researcher";

  const [experiments, setExperiments] = useState<ExperimentResponse[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadExperiments = useCallback(async (searchKeyword = "") => {
    try {
      setLoading(true);
      setError("");

      const data = await getExperiments({
        keyword: searchKeyword.trim() || undefined,
        page: 1,
        size: 50,
      });

      setExperiments(data);
    } catch (loadError) {
      console.error("Failed to load experiments:", loadError);
      setExperiments([]);
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadExperiments();
  }, [loadExperiments]);

  const handleSearch = () => {
    void loadExperiments(keyword);
  };

  const handleDelete = async (experiment: ExperimentResponse) => {
    if (!isResearcher || deletingId !== null) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${experiment.experimentName}"?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(experiment.experimentId);
      setError("");

      await deleteExperiment(experiment.experimentId);
      await loadExperiments(keyword);
    } catch (deleteError) {
      console.error("Delete experiment failed:", deleteError);
      setError(getErrorMessage(deleteError));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="experiment-page">
        <div className="experiment-header">
          <div>
            <h1>Experiments</h1>
            <p>
              Create an experiment first, then define its resource requirements
              and prepare an allocation plan.
            </p>
          </div>

          {isResearcher && (
            <button
              type="button"
              className="experiment-create-btn"
              onClick={() => navigate("/experiments/create")}
            >
              + Create Experiment
            </button>
          )}
        </div>

        <div className="experiment-toolbar">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch();
              }
            }}
            placeholder="Search experiments..."
            disabled={loading}
          />

          <button type="button" onClick={handleSearch} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {error && <div className="experiment-error">{error}</div>}

        <div className="experiment-table-card">
          <h3>Experiment List</h3>

          {loading ? (
            <p className="loading-text">Loading experiments...</p>
          ) : (
            <table className="experiment-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Experiment Name</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Expected Start</th>
                  <th>Expected End</th>
                  <th>Deadline</th>
                  <th>Researcher</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {experiments.map((item) => {
                  const isDeleting = deletingId === item.experimentId;

                  return (
                    <tr key={item.experimentId}>
                      <td>#{item.experimentId}</td>
                      <td>{item.experimentName || "-"}</td>
                      <td>{getPriorityLabel(item.priority)}</td>
                      <td>
                        <span className={getStatusClass(item.status)}>
                          {item.status || "Unknown"}
                        </span>
                      </td>
                      <td>{formatDate(item.expectStartDate)}</td>
                      <td>{formatDate(item.expectEndDate)}</td>
                      <td>{formatDate(item.deadline)}</td>
                      <td>{item.researcherName || item.createdByName || "-"}</td>
                      <td>
                        <div className="experiment-actions">
                          <button
                            type="button"
                            className="action-btn-pill view"
                            onClick={() =>
                              navigate(`/experiments/${item.experimentId}`)
                            }
                            disabled={deletingId !== null}
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </button>

                          {isResearcher && (
                            <button
                              type="button"
                              className="action-btn-pill edit"
                              onClick={() =>
                                navigate(
                                  `/experiments/${item.experimentId}/edit`
                                )
                              }
                              disabled={deletingId !== null}
                            >
                              <Pencil size={12} />
                              <span>Edit</span>
                            </button>
                          )}

                          {isResearcher && (
                            <button
                              type="button"
                              className="action-btn-pill delete"
                              onClick={() => void handleDelete(item)}
                              disabled={deletingId !== null}
                            >
                              <Trash2 size={12} />
                              <span>{isDeleting ? "Deleting..." : "Delete"}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {experiments.length === 0 && (
                  <tr>
                    <td colSpan={9} className="empty-cell">
                      No experiments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
