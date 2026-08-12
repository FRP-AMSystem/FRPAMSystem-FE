import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import DashboardLayout from "../../layouts/DashboardLayout";
import { createExperiment, submitExperiment } from "../../services/experimentService";

import "./ExperimentForm.css";

interface ExperimentFormState {
  experimentName: string;
  description: string;
  expectStartDate: string;
  expectEndDate: string;
  deadline: string;
  status: string;
  priority: string;
}

const priorityLabels: Record<string, string> = {
  "0": "Low",
  "1": "Medium",
  "2": "High",
  "3": "Urgent",
};

function convertDateToIso(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return "Create experiment failed.";
  }

  const responseData = error.response?.data;

  if (responseData?.errors) {
    const messages = Object.entries(responseData.errors)
      .flatMap(([field, value]) => {
        const fieldErrors = Array.isArray(value)
          ? value
          : [String(value)];

        return fieldErrors.map(
          (message) => `${field}: ${String(message)}`
        );
      })
      .join(" ");

    if (messages) {
      return messages;
    }
  }

  return (
    responseData?.message ||
    responseData?.title ||
    `Create experiment failed${error.response?.status
      ? ` (${error.response.status})`
      : ""
    }.`
  );
}

export default function CreateExperiment() {
  const navigate = useNavigate();

  const [form, setForm] = useState<ExperimentFormState>({
    experimentName: "",
    description: "",
    expectStartDate: "",
    expectEndDate: "",
    deadline: "",
    status: "Draft",
    priority: "1",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement |
      HTMLSelectElement |
      HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const experimentName = form.experimentName.trim();
    const description = form.description.trim();

    if (!experimentName) {
      setError("Experiment name is required.");
      return;
    }

    if (!form.expectStartDate) {
      setError("Expected start date is required.");
      return;
    }

    if (!form.expectEndDate) {
      setError("Expected end date is required.");
      return;
    }

    if (!form.deadline) {
      setError("Deadline is required.");
      return;
    }

    if (form.expectStartDate > form.expectEndDate) {
      setError(
        "Expected end date must be after the expected start date."
      );
      return;
    }

    if (form.deadline < form.expectEndDate) {
      setError(
        "Deadline must be on or after the expected end date."
      );
      return;
    }

    const researcherId = Number(
      localStorage.getItem("userId")
    );

    if (
      !Number.isInteger(researcherId) ||
      researcherId <= 0
    ) {
      setError(
        "Researcher information was not found. Please log in again."
      );
      return;
    }

    const priority = Number(form.priority);

    if (!Number.isInteger(priority)) {
      setError("Priority is invalid.");
      return;
    }

    try {
      setSaving(true);

      const created = await createExperiment({
        experimentName,
        description,
        researcherId,
        expectStartDate: convertDateToIso(
          form.expectStartDate
        ),
        expectEndDate: convertDateToIso(
          form.expectEndDate
        ),
        deadline: convertDateToIso(form.deadline),
        priority,
        status: "Draft",
      });

      if (form.status === "Submitted" && created?.experimentId) {
        try {
          await submitExperiment(created.experimentId);
        } catch (submitErr) {
          console.warn("Auto-submit failed after creation:", submitErr);
        }
      }

      navigate("/experiments");
    } catch (err) {
      console.error("Create experiment error:", err);
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="experiment-form-page">
        <div className="experiment-form-header">
          <div>
            <p className="breadcrumb">
              Dashboard / Experiments / Create
            </p>

            <h1>Create Experiment</h1>

            <span>
              Create an experiment before adding equipment
              requirements.
            </span>
          </div>

          <button
            type="button"
            className="back-btn"
            onClick={() => navigate("/experiments")}
          >
            Back
          </button>
        </div>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <form
          className="experiment-form-grid"
          onSubmit={handleSubmit}
        >
          <div className="experiment-form-card">
            <h3>Experiment Information</h3>

            <label htmlFor="experimentName">
              Experiment Name
            </label>

            <input
              id="experimentName"
              name="experimentName"
              value={form.experimentName}
              onChange={handleChange}
              placeholder="Example: Plant Growth Monitoring"
              required
            />

            <label htmlFor="description">
              Description
            </label>

            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe experiment purpose..."
              rows={5}
            />

            <label htmlFor="expectStartDate">
              Expected Start Date
            </label>

            <input
              id="expectStartDate"
              type="date"
              name="expectStartDate"
              value={form.expectStartDate}
              onChange={handleChange}
              required
            />

            <label htmlFor="expectEndDate">
              Expected End Date
            </label>

            <input
              id="expectEndDate"
              type="date"
              name="expectEndDate"
              value={form.expectEndDate}
              min={form.expectStartDate || undefined}
              onChange={handleChange}
              required
            />

            <label htmlFor="deadline">
              Deadline
            </label>

            <input
              id="deadline"
              type="date"
              name="deadline"
              value={form.deadline}
              min={
                form.expectEndDate ||
                form.expectStartDate ||
                undefined
              }
              onChange={handleChange}
              required
            />

            <label htmlFor="status">
              Status
            </label>

            <select
              id="status"
              name="status"
              value={form.status}
              onChange={handleChange}
            >
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Planning">Planning</option>
              <option value="Ready">Ready</option>
              <option value="Running">Running</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <label htmlFor="priority">
              Priority
            </label>

            <select
              id="priority"
              name="priority"
              value={form.priority}
              onChange={handleChange}
            >
              <option value="0">Low</option>
              <option value="1">Medium</option>
              <option value="2">High</option>
              <option value="3">Urgent</option>
            </select>
          </div>

          <div className="experiment-form-card">
            <h3>Preview</h3>

            <div className="experiment-preview">
              <div>
                <span>Name</span>

                <strong>
                  {form.experimentName || "Not entered"}
                </strong>
              </div>

              <div>
                <span>Status</span>
                <strong>{form.status}</strong>
              </div>

              <div>
                <span>Priority</span>

                <strong>
                  {priorityLabels[form.priority] ??
                    "Unknown"}
                </strong>
              </div>

              <div>
                <span>Expected Duration</span>

                <strong>
                  {form.expectStartDate || "-"} →{" "}
                  {form.expectEndDate || "-"}
                </strong>
              </div>

              <div>
                <span>Deadline</span>

                <strong>
                  {form.deadline || "-"}
                </strong>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() =>
                  navigate("/experiments")
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="save-btn"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Create Experiment"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}