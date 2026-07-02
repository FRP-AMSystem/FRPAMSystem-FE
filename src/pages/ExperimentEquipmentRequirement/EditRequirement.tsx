import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import DashboardLayout from "../../layouts/DashboardLayout";

import { getExperiments } from "../../services/experimentService";
import { getEquipmentTypes } from "../../services/equipmentService";

import {
  getExperimentEquipmentRequirementById,
  updateExperimentEquipmentRequirement,
} from "../../services/experimentEquipmentRequirementService";

import type { ExperimentResponse } from "../../types/experiment";
import type { EquipmentType } from "../../types/equipment";

import "./RequirementForm.css";

export default function EditRequirement() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [experiments, setExperiments] = useState<ExperimentResponse[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);

  const [form, setForm] = useState({
    experimentId: "",
    equipmentTypeId: "",
    quantity: "1",
    allowSubstitute: "true",
    minAcceptableEfficiency: "80",
    note: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const selectedExperiment = useMemo(() => {
    return experiments.find(
      (item) => item.experimentId === Number(form.experimentId)
    );
  }, [experiments, form.experimentId]);

  const selectedEquipmentType = useMemo(() => {
    return equipmentTypes.find(
      (item) => item.equipmentTypeId === Number(form.equipmentTypeId)
    );
  }, [equipmentTypes, form.equipmentTypeId]);

  useEffect(() => {
    async function loadData() {
      if (!id) return;

      try {
        setLoading(true);

        const [requirementData, experimentData, equipmentTypeData] =
          await Promise.all([
            getExperimentEquipmentRequirementById(Number(id)),
            getExperiments(),
            getEquipmentTypes(),
          ]);

        setExperiments(experimentData);
        setEquipmentTypes(equipmentTypeData);

        setForm({
          experimentId: String(requirementData.experimentId),
          equipmentTypeId: String(requirementData.equipmentTypeId),
          quantity: String(requirementData.quantity),
          allowSubstitute: String(requirementData.allowSubstitute),
          minAcceptableEfficiency: String(
            requirementData.minAcceptableEfficiency
          ),
          note: requirementData.note || "",
        });
      } catch (err) {
        console.error(err);
        setError("Cannot load requirement data.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!id) {
      setError("Requirement not found.");
      return;
    }

    if (!form.experimentId) {
      setError("Please select an experiment.");
      return;
    }

    if (!form.equipmentTypeId) {
      setError("Please select an equipment type.");
      return;
    }

    if (Number(form.quantity) <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }

    try {
      setSaving(true);

      await updateExperimentEquipmentRequirement(Number(id), {
        experimentId: Number(form.experimentId),
        equipmentTypeId: Number(form.equipmentTypeId),
        quantity: Number(form.quantity),
        allowSubstitute: form.allowSubstitute === "true",
        minAcceptableEfficiency: Number(form.minAcceptableEfficiency),
        note: form.note,
      });

      navigate("/equipment-requirements");
    } catch (err) {
      console.error(err);
      setError("Update equipment requirement failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="requirement-form-page">
          <p>Loading requirement data...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="requirement-form-page">
        <div className="requirement-form-header">
          <div>
            <p className="breadcrumb">
              Dashboard / Equipment Requirements / Edit
            </p>

            <h1>Edit Equipment Requirement #{id}</h1>

            <span>Update equipment requirement information.</span>
          </div>

          <button
            type="button"
            className="back-btn"
            onClick={() => navigate("/equipment-requirements")}
          >
            Back
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form className="requirement-form-grid" onSubmit={handleSubmit}>
          <div className="requirement-form-card">
            <h3>Requirement Information</h3>

            <label>Experiment</label>
            <select
              name="experimentId"
              value={form.experimentId}
              onChange={handleChange}
              required
            >
              <option value="">Select experiment</option>

              {experiments.map((experiment) => (
                <option
                  key={experiment.experimentId}
                  value={experiment.experimentId}
                >
                  #{experiment.experimentId} - {experiment.experimentName}
                </option>
              ))}
            </select>

            <label>Equipment Type</label>
            <select
              name="equipmentTypeId"
              value={form.equipmentTypeId}
              onChange={handleChange}
              required
            >
              <option value="">Select equipment type</option>

              {equipmentTypes.map((type) => (
                <option key={type.equipmentTypeId} value={type.equipmentTypeId}>
                  #{type.equipmentTypeId} - {type.typeName}
                </option>
              ))}
            </select>

            <label>Quantity</label>
            <input
              type="number"
              min="1"
              name="quantity"
              value={form.quantity}
              onChange={handleChange}
              required
            />

            <label>Allow Substitute</label>
            <select
              name="allowSubstitute"
              value={form.allowSubstitute}
              onChange={handleChange}
            >
              <option value="true">Allow substitute equipment</option>
              <option value="false">Do not allow substitute</option>
            </select>

            <label>Min Acceptable Efficiency (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              name="minAcceptableEfficiency"
              value={form.minAcceptableEfficiency}
              onChange={handleChange}
              required
            />

            <label>Note</label>
            <textarea
              name="note"
              value={form.note}
              onChange={handleChange}
              placeholder="Optional note..."
              rows={4}
            />
          </div>

          <div className="requirement-form-card">
            <h3>Preview</h3>

            <div className="requirement-preview">
              <div>
                <span>Selected Experiment</span>
                <strong>
                  {selectedExperiment
                    ? selectedExperiment.experimentName
                    : "Not selected"}
                </strong>
              </div>

              <div>
                <span>Selected Equipment Type</span>
                <strong>
                  {selectedEquipmentType
                    ? selectedEquipmentType.typeName
                    : "Not selected"}
                </strong>
              </div>

              <div>
                <span>Quantity</span>
                <strong>{form.quantity}</strong>
              </div>

              <div>
                <span>Substitute</span>
                <strong>
                  {form.allowSubstitute === "true"
                    ? "Allowed"
                    : "Not allowed"}
                </strong>
              </div>

              <div>
                <span>Min Efficiency</span>
                <strong>{form.minAcceptableEfficiency}%</strong>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => navigate("/equipment-requirements")}
              >
                Cancel
              </button>

              <button type="submit" className="save-btn" disabled={saving}>
                {saving ? "Saving..." : "Update Requirement"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}