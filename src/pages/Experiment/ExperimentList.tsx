import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  deleteExperiment,
  getExperiments,
} from "../../services/experimentService";

import type { ExperimentResponse } from "../../types/experiment";

import "./ExperimentList.css";

type Role = "Manager" | "Researcher" | "Technician" | "Student";

export default function ExperimentList() {
  const navigate = useNavigate();

  const role = (localStorage.getItem("role") || "Student") as Role;

  const canCreateExperiment = role === "Researcher";
  const canEditExperiment = role === "Researcher";
  const canDeleteExperiment = role === "Researcher";

  const [experiments, setExperiments] = useState<ExperimentResponse[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);

  const loadExperiments = async () => {
    try {
      setLoading(true);

      const data = await getExperiments({
        keyword,
        page: 1,
        size: 50,
      });

      setExperiments(data);
    } catch (error) {
      console.error("Failed to load experiments:", error);
      setExperiments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExperiments();
  }, []);

  const handleSearch = () => {
    loadExperiments();
  };

  const handleDelete = async (id: number) => {
    if (!canDeleteExperiment) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this experiment?"
    );

    if (!confirmed) return;

    try {
      await deleteExperiment(id);
      await loadExperiments();
    } catch (error) {
      console.error("Delete experiment failed:", error);
    }
  };

  const getStatusClass = (status?: string | null) => {
    return `experiment-status status-${(status || "unknown").toLowerCase()}`;
  };

  return (
    <DashboardLayout>
      <div className="experiment-page">
        <div className="experiment-header">
          <div>
            <h1>Experiments</h1>
            <p>
              Researcher creates experiments first, then adds equipment
              requirements and sends them to allocation.
            </p>
          </div>

          {canCreateExperiment && (
            <button
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
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search experiments..."
          />

          <button onClick={handleSearch}>Search</button>
        </div>

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
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Created By</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {experiments.map((item) => (
                  <tr key={item.experimentId}>
                    <td>#{item.experimentId}</td>

                    <td>{item.experimentName}</td>

                    <td>{item.priority || "-"}</td>

                    <td>
                      <span className={getStatusClass(item.status)}>
                        {item.status || "Unknown"}
                      </span>
                    </td>

                    <td>
                      {item.startDate
                        ? new Date(item.startDate).toLocaleDateString()
                        : "-"}
                    </td>

                    <td>
                      {item.endDate
                        ? new Date(item.endDate).toLocaleDateString()
                        : "-"}
                    </td>

                    <td>{item.createdByName || "-"}</td>

                    <td>
                      <div className="experiment-actions">
                        <button
                          onClick={() =>
                            navigate(`/experiments/${item.experimentId}`)
                          }
                        >
                          View
                        </button>

                        {canEditExperiment && (
                          <button
                            onClick={() =>
                              navigate(
                                `/experiments/edit/${item.experimentId}`
                              )
                            }
                          >
                            Edit
                          </button>
                        )}

                        {canDeleteExperiment && (
                          <button
                            className="danger-btn"
                            onClick={() => handleDelete(item.experimentId)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {experiments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="empty-cell">
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