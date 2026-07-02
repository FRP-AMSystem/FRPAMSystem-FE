import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import DashboardLayout from "../../layouts/DashboardLayout";

import { getExperimentEquipmentRequirementById } from "../../services/experimentEquipmentRequirementService";
import type { ExperimentEquipmentRequirement } from "../../types/experimentEquipmentRequirement";

import "./RequirementDetail.css";

type Role = "Manager" | "Researcher" | "Technician" | "Student";

export default function RequirementDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const role = (localStorage.getItem("role") || "Student") as Role;
  const canEdit = role === "Researcher";

  const [requirement, setRequirement] =
    useState<ExperimentEquipmentRequirement | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRequirement() {
      if (!id) return;

      try {
        setLoading(true);
        const data = await getExperimentEquipmentRequirementById(Number(id));
        setRequirement(data);
      } catch (error) {
        console.error("Failed to load requirement detail:", error);
        setRequirement(null);
      } finally {
        setLoading(false);
      }
    }

    loadRequirement();
  }, [id]);

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
          <h1>Requirement Not Found</h1>
          <button onClick={() => navigate("/equipment-requirements")}>
            Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const requirementId =
    requirement.requirementId ||
    requirement.experimentEquipmentRequirementId ||
    Number(id);

  return (
    <DashboardLayout>
      <div className="requirement-detail-page">
        <div className="requirement-detail-header">
          <div>
            <button
              className="back-btn"
              onClick={() => navigate("/equipment-requirements")}
            >
              ← Back
            </button>

            <h1>Equipment Requirement #{requirementId}</h1>

            <p>
              Requirement details for experiment equipment planning and manager
              allocation review.
            </p>
          </div>

          {canEdit && (
            <button
              className="edit-btn"
              onClick={() =>
                navigate(`/equipment-requirements/edit/${requirementId}`)
              }
            >
              Edit Requirement
            </button>
          )}
        </div>

        <div className="requirement-detail-grid">
          <div className="detail-card">
            <h3>Experiment Information</h3>

            <div className="detail-row">
              <span>Experiment ID</span>
              <strong>{requirement.experimentId}</strong>
            </div>

            <div className="detail-row">
              <span>Experiment Name</span>
              <strong>
                {requirement.experimentName ||
                  `Experiment #${requirement.experimentId}`}
              </strong>
            </div>
          </div>

          <div className="detail-card">
            <h3>Equipment Information</h3>

            <div className="detail-row">
              <span>Equipment Type ID</span>
              <strong>{requirement.equipmentTypeId}</strong>
            </div>

            <div className="detail-row">
              <span>Equipment Type</span>
              <strong>
                {requirement.equipmentTypeName ||
                  `Equipment Type #${requirement.equipmentTypeId}`}
              </strong>
            </div>

            <div className="detail-row">
              <span>Quantity</span>
              <strong>{requirement.quantity}</strong>
            </div>
          </div>

          <div className="detail-card">
            <h3>Requirement Rules</h3>

            <div className="detail-row">
              <span>Allow Substitute</span>
              <strong>
                {requirement.allowSubstitute ? "Allowed" : "Not allowed"}
              </strong>
            </div>

            <div className="detail-row">
              <span>Minimum Acceptable Efficiency</span>
              <strong>{requirement.minAcceptableEfficiency}%</strong>
            </div>
          </div>

          <div className="detail-card">
            <h3>Note</h3>

            <p className="note-text">{requirement.note || "No note"}</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}