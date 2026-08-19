import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Pencil, Sparkles, Trash2 } from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import {
  deleteExperiment,
  getExperiments,
} from "../../services/experimentService";
import type { ExperimentResponse } from "../../types/experiment";
import { getCurrentUserTokenInfo } from "../../utils/storage";

import "./ExperimentList.css";

type Role = "Admin" | "Manager" | "Researcher" | "Technician" | "Student" | "Seasonal";

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

  return priorityLabels[priority] || `Level ${priority}`;
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: { data?: { message?: string; title?: string } } })
      .response !== null
  ) {
    const response = (
      error as { response?: { data?: { message?: string; title?: string } } }
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

export default function MyExperimentList() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentUser = useMemo(() => getCurrentUserTokenInfo(), []);
  const role = currentUser.role as Role;
  const isResearcher = role === "Admin" || role === "Manager" || role === "Researcher";
  const isPrivileged = role === "Admin" || role === "Manager";

  const [experiments, setExperiments] = useState<ExperimentResponse[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(
    (location.state as { message?: string } | null)?.message || null
  );

  const loadExperiments = useCallback(async (searchKeyword = "") => {
    try {
      setLoading(true);
      setError("");

      const user = getCurrentUserTokenInfo();
      const { userId, fullName, email, role: userRole } = user;
      const privileged = userRole === "Admin" || userRole === "Manager";

      const data = await getExperiments({
        keyword: searchKeyword.trim() || undefined,
        researcherId: !privileged && userId > 0 ? userId : undefined,
        page: 1,
        size: 100,
      });

      // Filter experiments by current user's token info if user is Researcher
      const userExperiments = privileged
        ? data
        : data.filter((item) => {
            if (userId > 0 && item.researcherId === userId) return true;
            if (
              fullName &&
              (item.researcherName?.toLowerCase().includes(fullName.toLowerCase()) ||
                item.createdByName?.toLowerCase().includes(fullName.toLowerCase()))
            ) {
              return true;
            }
            if (
              email &&
              (item.researcherEmail?.toLowerCase() === email.toLowerCase() ||
                item.createdByEmail?.toLowerCase() === email.toLowerCase())
            ) {
              return true;
            }
            return false;
          });

      setExperiments(userExperiments);
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
            <h1>My Experiments</h1>
            <p>
              Manage your draft experiment plans, refine resource requirements,
              and prepare allocations before submitting.
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

        {toastMessage && (
          <div className="p-4 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold flex justify-between items-center">
            <span>{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-xs text-emerald-600 hover:text-emerald-900 font-bold ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="experiment-toolbar">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch();
              }
            }}
            placeholder="Search draft experiments..."
            disabled={loading}
          />

          <button type="button" onClick={handleSearch} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {error && <div className="experiment-error">{error}</div>}

        <div className="experiment-table-card">
          <h3>Draft Experiment List</h3>

          {loading ? (
            <p className="loading-text">Loading draft experiments...</p>
          ) : (
            <table className="experiment-table">
              <thead>
                <tr>
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
                      <td style={{ fontWeight: 600 }}>{item.experimentName || "-"}</td>
                      <td>{getPriorityLabel(item.priority)}</td>
                      <td>
                        <span className={getStatusClass(item.status)}>
                          {item.status || "Draft"}
                        </span>
                      </td>
                      <td>{formatDate(item.expectStartDate)}</td>
                      <td>{formatDate(item.expectEndDate)}</td>
                      <td>{formatDate(item.deadline)}</td>
                      <td>{item.researcherName || item.createdByName || "-"}</td>
                      <td>
                        <div className="experiment-actions">
                          {isResearcher && (
                            <button
                              type="button"
                              className="action-btn-pill edit !bg-emerald-600 !text-white hover:!bg-emerald-700"
                              onClick={() =>
                                navigate(`/experiments/${item.experimentId}`)
                              }
                              title="Open Draft & Select Planning Method (Manual or AI)"
                              disabled={deletingId !== null}
                            >
                              <Sparkles size={12} />
                              <span>Open Draft</span>
                            </button>
                          )}

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
                      No draft experiments found.
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
