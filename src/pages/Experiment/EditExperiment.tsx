import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getExperimentById,
  updateExperiment,
} from "../../services/experimentService";

import "./ExperimentForm.css";

export default function EditExperiment() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState({
    experimentName: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "Draft",
    priority: "Medium",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const experimentId = Number(id);

  useEffect(() => {
    const loadExperiment = async () => {
      try {
        setLoading(true);

        const data = await getExperimentById(experimentId);

        setForm({
          experimentName: data.experimentName || "",
          description: data.description || "",
          startDate: data.startDate ? data.startDate.slice(0, 10) : "",
          endDate: data.endDate ? data.endDate.slice(0, 10) : "",
          status: data.status || "Draft",
          priority: data.priority || "Medium",
        });
      } catch (error) {
        console.error("Load experiment failed:", error);
        setError("Cannot load experiment.");
      } finally {
        setLoading(false);
      }
    };

    if (experimentId) {
      loadExperiment();
    }
  }, [experimentId]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
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

    if (!form.experimentName.trim()) {
      setError("Experiment name is required.");
      return;
    }

    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      setError("End date must be after start date.");
      return;
    }

    try {
      setSaving(true);

      await updateExperiment(experimentId, {
        experimentName: form.experimentName.trim(),
        description: form.description.trim(),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        status: form.status,
        priority: form.priority,
      });

      navigate("/experiments");
    } catch (error) {
      console.error("Update experiment failed:", error);
      setError("Update experiment failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="experiment-form-page">
          <p>Loading experiment...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="experiment-form-page">
        <div className="experiment-form-header">
          <div>
            <p className="breadcrumb">Dashboard / Experiments / Edit</p>
            <h1>Edit Experiment</h1>
            <span>Update experiment information.</span>
          </div>

          <button
            type="button"
            className="back-btn"
            onClick={() => navigate("/experiments")}
          >
            Back
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form className="experiment-form-grid" onSubmit={handleSubmit}>
          <div className="experiment-form-card">
            <h3>Experiment Information</h3>

            <label>Experiment Name</label>
            <input
              name="experimentName"
              value={form.experimentName}
              onChange={handleChange}
              required
            />

            <label>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={5}
            />

            <label>Start Date</label>
            <input
              type="date"
              name="startDate"
              value={form.startDate}
              onChange={handleChange}
            />

            <label>End Date</label>
            <input
              type="date"
              name="endDate"
              value={form.endDate}
              onChange={handleChange}
            />

            <label>Status</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="Draft">Draft</option>
              <option value="Pending">Pending</option>
              <option value="InProgress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <label>Priority</label>
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          <div className="experiment-form-card">
            <h3>Preview</h3>

            <div className="experiment-preview">
              <div>
                <span>Name</span>
                <strong>{form.experimentName || "Not entered"}</strong>
              </div>

              <div>
                <span>Status</span>
                <strong>{form.status}</strong>
              </div>

              <div>
                <span>Priority</span>
                <strong>{form.priority}</strong>
              </div>

              <div>
                <span>Duration</span>
                <strong>
                  {form.startDate || "-"} → {form.endDate || "-"}
                </strong>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => navigate("/experiments")}
              >
                Cancel
              </button>

              <button type="submit" className="save-btn" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}