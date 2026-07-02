import { useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../../layouts/DashboardLayout";
import { createExperiment } from "../../services/experimentService";

import "./ExperimentForm.css";

export default function CreateExperiment() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    experimentName: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "Draft",
    priority: "Medium",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
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

      await createExperiment({
        experimentName: form.experimentName,
        description: form.description,
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
        priority: form.priority,
      });

      navigate("/experiments");
    } catch (err) {
      console.error(err);
      setError("Create experiment failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="experiment-form-page">
        <div className="experiment-form-header">
          <div>
            <p className="breadcrumb">Dashboard / Experiments / Create</p>
            <h1>Create Experiment</h1>
            <span>Create an experiment before adding equipment requirements.</span>
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
              placeholder="Example: Plant Growth Monitoring"
              required
            />

            <label>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe experiment purpose..."
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
            <select name="priority" value={form.priority} onChange={handleChange}>
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
                {saving ? "Saving..." : "Create Experiment"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}