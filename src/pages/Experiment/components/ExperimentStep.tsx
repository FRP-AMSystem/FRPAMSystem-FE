import React from "react";
import { Calendar } from "lucide-react";
import "../PlanningWizard.css";

export interface ExperimentStepData {
  experimentName: string;
  description: string;
  expectStartDate: string;
  expectEndDate: string;
  deadline: string;
  priority: string;
}

interface ExperimentStepProps {
  data: ExperimentStepData;
  onChange: (data: Partial<ExperimentStepData>) => void;
}

const priorityOptions = [
  { value: "0", label: "Low" },
  { value: "1", label: "Medium" },
  { value: "2", label: "High" },
  { value: "3", label: "Urgent" },
];

export const ExperimentStep: React.FC<ExperimentStepProps> = ({
  data,
  onChange,
}) => {
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    onChange({ [name]: value });
  };

  return (
    <div className="planning-card">
      <div className="planning-card-header">
        <div>
          <h2>Step 1: General Experiment Information</h2>
          <p>Provide essential experiment details, goals, and schedule boundaries.</p>
        </div>
      </div>

      <div className="planning-form-grid">
        <div className="planning-form-full planning-field-group">
          <label>
            Experiment Name <span className="planning-required">*</span>
          </label>
          <input
            type="text"
            name="experimentName"
            value={data.experimentName}
            onChange={handleInputChange}
            placeholder="e.g. Pine Plantation Soil Quality Assessment 2026"
            className="planning-input"
            required
          />
        </div>

        <div className="planning-field-group">
          <label>
            Priority Level <span className="planning-required">*</span>
          </label>
          <select
            name="priority"
            value={data.priority}
            onChange={handleInputChange}
            className="planning-select"
          >
            {priorityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="planning-field-group">
          <label>
            Expected Start Date <span className="planning-required">*</span>
          </label>
          <div className="planning-date-wrapper">
            <input
              type="date"
              name="expectStartDate"
              value={data.expectStartDate}
              onChange={handleInputChange}
              className="planning-input"
              required
            />
            <div className="planning-date-icon">
              <Calendar size={18} />
            </div>
          </div>
        </div>

        <div className="planning-field-group">
          <label>
            Expected End Date <span className="planning-required">*</span>
          </label>
          <div className="planning-date-wrapper">
            <input
              type="date"
              name="expectEndDate"
              value={data.expectEndDate}
              onChange={handleInputChange}
              className="planning-input"
              required
            />
            <div className="planning-date-icon">
              <Calendar size={18} />
            </div>
          </div>
        </div>

        <div className="planning-field-group">
          <label>
            Submission Deadline <span className="planning-required">*</span>
          </label>
          <div className="planning-date-wrapper">
            <input
              type="date"
              name="deadline"
              value={data.deadline}
              onChange={handleInputChange}
              className="planning-input"
              required
            />
            <div className="planning-date-icon">
              <Calendar size={18} />
            </div>
          </div>
        </div>

        <div className="planning-form-full planning-field-group">
          <label>Description & Objectives</label>
          <textarea
            name="description"
            rows={4}
            value={data.description}
            onChange={handleInputChange}
            placeholder="Describe the research objectives, methodology, and target outcomes..."
            className="planning-textarea"
          />
        </div>
      </div>
    </div>
  );
};
