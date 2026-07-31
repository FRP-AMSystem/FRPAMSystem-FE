import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import DashboardLayout from "../../layouts/DashboardLayout";

import { getExperimentById } from "../../services/experimentService";
import type { ExperimentResponse } from "../../types/experiment";

import "./ExperimentDetail.css";

type Role = "Manager" | "Researcher" | "Technician" | "Student";

const priorityLabels: Record<number, string> = {
  0: "Low",
  1: "Medium",
  2: "High",
  3: "Urgent",
};

function formatDate(value?: string | null): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("vi-VN");
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("vi-VN");
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as
      | { message?: string; error?: string }
      | undefined;

    return (
      responseData?.message ||
      responseData?.error ||
      error.message ||
      "Unable to load experiment."
    );
  }

  if (error instanceof Error) return error.message;
  return "Unable to load experiment.";
}

export default function ExperimentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const role = (localStorage.getItem("role") || "Student") as Role;
  const canManageExperiment = role === "Researcher";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [experiment, setExperiment] = useState<ExperimentResponse | null>(null);

  useEffect(() => {
    const experimentId = Number(id);

    if (!id || !Number.isInteger(experimentId) || experimentId <= 0) {
      setError("Invalid experiment ID.");
      setLoading(false);
      return;
    }

    let active = true;

    const loadExperiment = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getExperimentById(experimentId);

        if (active) {
          setExperiment(data);
        }
      } catch (loadError) {
        if (active) {
          setExperiment(null);
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadExperiment();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="experiment-detail-page">
          <p>Loading experiment...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !experiment) {
    return (
      <DashboardLayout>
        <div className="experiment-detail-page">
          <div className="detail-header">
            <div>
              <p className="breadcrumb">Dashboard / Experiments / Detail</p>
              <h1>Experiment Detail</h1>
            </div>

            <button
              type="button"
              className="back-btn"
              onClick={() => navigate("/experiments")}
            >
              Back
            </button>
          </div>

          <p className="error-message">{error || "Experiment not found."}</p>
        </div>
      </DashboardLayout>
    );
  }

  const priority =
    experiment.priority === null || experiment.priority === undefined
      ? "-"
      : priorityLabels[experiment.priority] ?? String(experiment.priority);

  return (
    <DashboardLayout>
      <div className="experiment-detail-page">
        <div className="detail-header">
          <div>
            <p className="breadcrumb">
              Dashboard / Experiments / #{experiment.experimentId}
            </p>
            <h1>{experiment.experimentName}</h1>
          </div>

          <button
            type="button"
            className="back-btn"
            onClick={() => navigate("/experiments")}
          >
            Back
          </button>
        </div>

        <div className="detail-grid">
          <div className="detail-card">
            <h3>General Information</h3>

            <div className="detail-item">
              <span>ID</span>
              <strong>#{experiment.experimentId}</strong>
            </div>

            <div className="detail-item">
              <span>Status</span>
              <strong>{experiment.status || "-"}</strong>
            </div>

            <div className="detail-item">
              <span>Priority</span>
              <strong>{priority}</strong>
            </div>

            <div className="detail-item">
              <span>Researcher</span>
              <strong>
                {experiment.researcherName || experiment.createdByName || "-"}
              </strong>
            </div>
          </div>

          <div className="detail-card">
            <h3>Schedule</h3>

            <div className="detail-item">
              <span>Expected Start Date</span>
              <strong>{formatDate(experiment.expectStartDate)}</strong>
            </div>

            <div className="detail-item">
              <span>Expected End Date</span>
              <strong>{formatDate(experiment.expectEndDate)}</strong>
            </div>

            <div className="detail-item">
              <span>Deadline</span>
              <strong>{formatDate(experiment.deadline)}</strong>
            </div>
          </div>

          <div className="detail-card">
            <h3>Audit Information</h3>

            <div className="detail-item">
              <span>Created By</span>
              <strong>{experiment.createdByName || "-"}</strong>
            </div>

            <div className="detail-item">
              <span>Created At</span>
              <strong>{formatDateTime(experiment.createdAt)}</strong>
            </div>

            <div className="detail-item">
              <span>Updated At</span>
              <strong>{formatDateTime(experiment.updatedAt)}</strong>
            </div>
          </div>
        </div>

        <div className="detail-card description-card">
          <h3>Description</h3>
          <p>{experiment.description || "No description provided."}</p>
        </div>

        {canManageExperiment && (
          <div className="detail-actions">
            <button
              type="button"
              className="edit-btn"
              onClick={() =>
                navigate(`/experiments/${experiment.experimentId}/edit`)
              }
            >
              Edit Experiment
            </button>

            <button
              type="button"
              className="requirement-btn"
              onClick={() =>
                navigate(
                  `/equipment-requirements/create?experimentId=${experiment.experimentId}`
                )
              }
            >
              Create Requirement
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
