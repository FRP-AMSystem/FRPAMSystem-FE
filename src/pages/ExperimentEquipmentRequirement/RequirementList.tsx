import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  deleteExperimentEquipmentRequirement,
  getExperimentEquipmentRequirements,
} from "../../services/experimentEquipmentRequirementService";

import type { ExperimentEquipmentRequirement } from "../../types/experimentEquipmentRequirement";

import "./RequirementList.css";

type Role = "Manager" | "Researcher" | "Technician" | "Student";

export default function RequirementList() {
  const navigate = useNavigate();

  const role = (localStorage.getItem("role") || "Student") as Role;

  const canCreateRequirement = role === "Researcher";
  const canEditRequirement = role === "Researcher";
  const canDeleteRequirement = role === "Researcher";

  const [requirements, setRequirements] = useState<
    ExperimentEquipmentRequirement[]
  >([]);

  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);

  const loadRequirements = async () => {
    try {
      setLoading(true);

      const data = await getExperimentEquipmentRequirements({
        keyword,
        page: 1,
        size: 50,
      });

      setRequirements(data);
    } catch (error) {
      console.error("Failed to load equipment requirements:", error);
      setRequirements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequirements();
  }, []);

  const handleSearch = () => {
    loadRequirements();
  };

  const handleDelete = async (id: number) => {
    if (!canDeleteRequirement) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this requirement?"
    );

    if (!confirmed) return;

    try {
      await deleteExperimentEquipmentRequirement(id);
      await loadRequirements();
    } catch (error) {
      console.error("Delete requirement failed:", error);
    }
  };

  const getRequirementId = (item: ExperimentEquipmentRequirement) => {
    return item.requirementId || item.experimentEquipmentRequirementId || 0;
  };

  return (
    <DashboardLayout>
      <div className="requirement-page">
        <div className="requirement-header">
          <div>
            <h1>Equipment Requirements</h1>
            <p>
              Researcher creates and updates requirements. Manager reviews and
              approves or rejects allocations. Technician and Student only view
              information.
            </p>
          </div>

          {canCreateRequirement && (
            <button
              className="requirement-create-btn"
              onClick={() => navigate("/equipment-requirements/create")}
            >
              + Create Requirement
            </button>
          )}
        </div>

        <div className="requirement-toolbar">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search by experiment, equipment or note..."
          />

          <button onClick={handleSearch}>Search</button>
        </div>

        <div className="requirement-table-card">
          <h3>Requirement List</h3>

          {loading ? (
            <p className="loading-text">Loading requirements...</p>
          ) : (
            <table className="requirement-table">
              <thead>
                <tr>
                  <th>ID</th>
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
                  const id = getRequirementId(item);

                  return (
                    <tr key={id}>
                      <td>#{id}</td>

                      <td>
                        {item.experimentName ||
                          `Experiment #${item.experimentId}`}
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
                          {item.allowSubstitute ? "Allowed" : "Not allowed"}
                        </span>
                      </td>

                      <td>{item.minAcceptableEfficiency}%</td>

                      <td>{item.note || "-"}</td>

                      <td>
                        <div className="requirement-actions">
                          <button
                            onClick={() =>
                              navigate(`/equipment-requirements/${id}`)
                            }
                          >
                            View
                          </button>

                          {canEditRequirement && (
                            <button
                              onClick={() =>
                                navigate(`/equipment-requirements/edit/${id}`)
                              }
                            >
                              Edit
                            </button>
                          )}

                          {canDeleteRequirement && (
                            <button
                              className="danger-btn"
                              onClick={() => handleDelete(id)}
                            >
                              Delete
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
                      No equipment requirements found.
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