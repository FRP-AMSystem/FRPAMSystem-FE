import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import DashboardLayout from "../../layouts/DashboardLayout";

import { getExperimentEquipmentRequirementById } from "../../services/experimentEquipmentRequirementService";
import type { ExperimentEquipmentRequirement } from "../../types/experimentEquipmentRequirement";

import "./RequirementDetail.css";

type Role = "Manager" | "Researcher" | "Technician" | "Student";

function formatEfficiency(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  const percentage = value <= 1 ? value * 100 : value;

  return Number.isInteger(percentage)
    ? `${percentage}%`
    : `${percentage.toFixed(2)}%`;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
      response?.data?.message ??
      response?.data?.title ??
      "Cannot load requirement detail."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Cannot load requirement detail.";
}

export default function RequirementDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const role = (localStorage.getItem("role") || "Student") as Role;
  const canEdit = role === "Admin" || role === "Manager" || role === "Researcher";
  const canCreateAllocation = role === "Admin" || role === "Manager" || role === "Researcher";

  const requirementId = useMemo(() => {
    if (!id) {
      return null;
    }

    const parsedId = Number(id);

    return Number.isInteger(parsedId) && parsedId > 0
      ? parsedId
      : null;
  }, [id]);

  const [requirement, setRequirement] =
    useState<ExperimentEquipmentRequirement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRequirement() {
      if (requirementId === null) {
        setRequirement(null);
        setError("Requirement ID is missing or invalid.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data =
          await getExperimentEquipmentRequirementById(requirementId);

        setRequirement(data);
      } catch (loadError) {
        console.error(
          "Failed to load requirement detail:",
          loadError
        );

        setRequirement(null);
        setError(getErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    }

    void loadRequirement();
  }, [requirementId]);

  const handleBack = () => {
    navigate("/equipment-requirements");
  };

  const handleEditRequirement = () => {
    if (!requirement) {
      return;
    }

    navigate(
      `/equipment-requirements/${requirement.expEquipmentReqId}/edit`
    );
  };

  const handleCreateAllocation = () => {
    if (!requirement) {
      return;
    }

    const searchParams = new URLSearchParams({
      requirementId: String(requirement.expEquipmentReqId),
      experimentId: String(requirement.experimentId),
    });

    navigate(`/allocation/create?${searchParams.toString()}`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="requirement-detail-page">
          <p>Loading requirement detail...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!requirement) {
    return (
      <DashboardLayout>
        <div className="requirement-detail-page">
          <div className="req-detail-not-found">
            <h1>Requirement Not Found</h1>
            <p>
              {error ||
                "The equipment requirement does not exist or could not be loaded."}
            </p>
            <button
              type="button"
              className="req-detail-back-btn"
              onClick={handleBack}
            >
              ← Back
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="requirement-detail-page">
        <div className="req-detail-header">
          <div>
            <button
              type="button"
              className="req-detail-back-btn"
              onClick={handleBack}
            >
              ← Back
            </button>

            <h1>
              Equipment Requirement #{requirement.expEquipmentReqId}
            </h1>

            <p>
              Requirement details for experiment equipment planning and
              allocation preparation.
            </p>
          </div>

          {(canEdit || canCreateAllocation) && (
            <div className="req-detail-header-actions">
              {canEdit && (
                <button
                  type="button"
                  className="req-detail-edit-btn"
                  onClick={handleEditRequirement}
                >
                  Edit Requirement
                </button>
              )}

              {canCreateAllocation && (
                <button
                  type="button"
                  className="req-detail-allocation-btn"
                  onClick={handleCreateAllocation}
                >
                  Create Allocation
                </button>
              )}
            </div>
          )}
        </div>

        {error && <div className="req-detail-error">{error}</div>}

        <div className="req-detail-grid">
          <div className="req-detail-card">
            <h3>Experiment Information</h3>

            <div className="req-detail-row">
              <span>Experiment ID</span>
              <strong>{requirement.experimentId}</strong>
            </div>

            <div className="req-detail-row">
              <span>Experiment Name</span>
              <strong>
                {requirement.experimentName ||
                  `Experiment #${requirement.experimentId}`}
              </strong>
            </div>
          </div>

          <div className="req-detail-card">
            <h3>Equipment Information</h3>

            <div className="req-detail-row">
              <span>Equipment Type ID</span>
              <strong>{requirement.equipmentTypeId}</strong>
            </div>

            <div className="req-detail-row">
              <span>Equipment Type</span>
              <strong>
                {requirement.equipmentTypeName ||
                  `Equipment Type #${requirement.equipmentTypeId}`}
              </strong>
            </div>

            <div className="req-detail-row">
              <span>Quantity</span>
              <strong>{requirement.quantity}</strong>
            </div>
          </div>

          <div className="req-detail-card">
            <h3>Requirement Rules</h3>

            <div className="req-detail-row">
              <span>Allow Substitute</span>
              <strong>
                {requirement.allowSubstitute ? "Allowed" : "Not allowed"}
              </strong>
            </div>

            <div className="req-detail-row">
              <span>Minimum Acceptable Efficiency</span>
              <strong>
                {formatEfficiency(requirement.minAcceptableEfficiency)}
              </strong>
            </div>
          </div>

          <div className="req-detail-card">
            <h3>Additional Information</h3>

            <div className="req-detail-row">
              <span>Created At</span>
              <strong>{formatDateTime(requirement.createdAt)}</strong>
            </div>

            <div className="req-detail-row">
              <span>Updated At</span>
              <strong>{formatDateTime(requirement.updatedAt)}</strong>
            </div>

            <div className="req-detail-row req-detail-row-note">
              <span>Note</span>
              <p className="req-detail-note">
                {requirement.note?.trim() || "No note"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
