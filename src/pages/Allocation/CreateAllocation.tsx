import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./CreateAllocation.css";

import { createAllocationPlan } from "../../services/allocationPlanService";
import { getExperiments } from "../../services/experimentService";
import type { ExperimentResponse } from "../../types/experiment";

export default function CreateAllocation() {
  const navigate = useNavigate();

  const [experiments, setExperiments] = useState<ExperimentResponse[]>([]);

  const [form, setForm] = useState({
    experimentId: "",
    fitnessScore: "",
    approveStatus: "Draft",
  });

  const [loadingExperiments, setLoadingExperiments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedExperiment = useMemo(() => {
    return experiments.find(
      (item) => item.experimentId === Number(form.experimentId)
    );
  }, [experiments, form.experimentId]);

  useEffect(() => {
    async function loadExperiments() {
      try {
        setLoadingExperiments(true);
        const data = await getExperiments();
        setExperiments(data);
      } catch (err) {
        console.error(err);
        setError("Cannot load experiments.");
      } finally {
        setLoadingExperiments(false);
      }
    }

    loadExperiments();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const formatDate = (value?: string) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("vi-VN");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.experimentId) {
      setError("Please select an experiment.");
      return;
    }

    try {
      setSaving(true);

      await createAllocationPlan({
        experimentId: Number(form.experimentId),
        fitnessScore: form.fitnessScore ? Number(form.fitnessScore) : undefined,
        approveStatus: "Draft",
      });

      navigate("/allocation");
    } catch (err) {
      console.error(err);
      setError("Create allocation plan failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="create-allocation-page">
      <div className="create-header">
        <div>
          <p className="breadcrumb">
            Dashboard / Allocation Planner / Create Allocation
          </p>

          <h1>Create Allocation Plan</h1>

          <span>Create a new allocation plan from an approved experiment.</span>
        </div>

        <button
          type="button"
          className="back-btn"
          onClick={() => navigate("/allocation")}
        >
          Back
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <form className="allocation-form" onSubmit={handleSubmit}>
        <div className="form-card">
          <h3>Allocation Plan Information</h3>

          <label>Experiment</label>
          <select
            name="experimentId"
            value={form.experimentId}
            onChange={handleChange}
            required
          >
            <option value="">
              {loadingExperiments ? "Loading experiments..." : "Select experiment"}
            </option>

            {experiments.map((experiment) => (
              <option
                key={experiment.experimentId}
                value={experiment.experimentId}
              >
                #{experiment.experimentId} - {experiment.experimentName}
              </option>
            ))}
          </select>

          <label>Fitness Score</label>
          <input
            type="number"
            step="0.01"
            name="fitnessScore"
            value={form.fitnessScore}
            onChange={handleChange}
            placeholder="Optional. Example: 0.85"
          />

          <label>Approve Status</label>
          <select name="approveStatus" value={form.approveStatus} disabled>
            <option value="Draft">Draft</option>
          </select>

          <div className="form-note">
            Equipment, land and human allocation details will be added after the
            allocation plan is created.
          </div>
        </div>

        <div className="form-card">
          <h3>Selected Experiment</h3>

          {selectedExperiment ? (
            <div className="experiment-preview">
              <div>
                <span>Experiment Name</span>
                <strong>{selectedExperiment.experimentName}</strong>
              </div>

              <div>
                <span>Researcher</span>
                <strong>{selectedExperiment.researcherName}</strong>
              </div>

              <div>
                <span>Status</span>
                <strong>{selectedExperiment.status}</strong>
              </div>

              <div>
                <span>Expected Period</span>
                <strong>
                  {formatDate(selectedExperiment.expectStartDate)} -{" "}
                  {formatDate(selectedExperiment.expectEndDate)}
                </strong>
              </div>

              <div>
                <span>Priority</span>
                <strong>{selectedExperiment.priority}</strong>
              </div>

              <div>
                <span>Description</span>
                <p>{selectedExperiment.description || "No description"}</p>
              </div>
            </div>
          ) : (
            <div className="next-step-box">
              <p>Select an experiment to preview its planning information.</p>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate("/allocation")}
            >
              Cancel
            </button>

            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? "Saving..." : "Save Allocation Plan"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}