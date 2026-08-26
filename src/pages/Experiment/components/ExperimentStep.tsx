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
  // Lấy ngày hiện tại theo định dạng YYYY-MM-DD
  // Dùng local time để tránh lệch ngày do UTC.
  const getToday = () => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const today = getToday();

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    const updates: Partial<ExperimentStepData> = {
      [name]: value,
    };

    /*
     * Khi Start Date thay đổi:
     * - Nếu End Date nhỏ hơn Start Date mới -> reset End Date.
     * - Nếu Deadline nhỏ hơn Start Date mới -> reset Deadline.
     */
    if (name === "expectStartDate" && value) {
      if (data.expectEndDate && data.expectEndDate < value) {
        updates.expectEndDate = "";
      }

      if (data.deadline && data.deadline < value) {
        updates.deadline = "";
      }
    }

    /*
     * Khi End Date thay đổi:
     * - End Date luôn phải >= Start Date.
     * - Nếu Deadline nhỏ hơn End Date -> reset Deadline.
     */
    if (name === "expectEndDate" && value) {
      if (data.expectStartDate && data.expectStartDate > value) {
        updates.expectStartDate = "";
      }

      if (data.deadline && data.deadline < value) {
        updates.deadline = "";
      }
    }

    /*
     * Khi Deadline thay đổi:
     * - Deadline phải >= End Date.
     * - Deadline cũng phải >= Start Date.
     */
    if (name === "deadline" && value) {
      if (data.expectEndDate && data.expectEndDate > value) {
        updates.expectEndDate = "";
      }

      if (data.expectStartDate && data.expectStartDate > value) {
        updates.expectStartDate = "";
      }
    }

    onChange(updates);
  };

  return (
    <div className="planning-card">
      <div className="planning-card-header">
        <div>
          <h2>Step 1: General Experiment Information</h2>
          <p>
            Provide essential experiment details, goals, and schedule
            boundaries.
          </p>
        </div>
      </div>

      <div className="planning-form-grid">
        {/* Experiment Name */}
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

        {/* Priority */}
        <div className="planning-field-group">
          <label>
            Priority Level <span className="planning-required">*</span>
          </label>

          <select
            name="priority"
            value={data.priority}
            onChange={handleInputChange}
            className="planning-select"
            required
          >
            {priorityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Expected Start Date */}
        <div className="planning-field-group">
          <label>
            Expected Start Date <span className="planning-required">*</span>
          </label>

          <div className="planning-date-wrapper">
            <input
              type="date"
              name="expectStartDate"
              value={data.expectStartDate}
              min={today}
              max={data.expectEndDate || data.deadline || undefined}
              onChange={handleInputChange}
              className="planning-input"
              required
            />

            <div className="planning-date-icon">
              <Calendar size={18} />
            </div>
          </div>
        </div>

        {/* Expected End Date */}
        <div className="planning-field-group">
          <label>
            Expected End Date <span className="planning-required">*</span>
          </label>

          <div className="planning-date-wrapper">
            <input
              type="date"
              name="expectEndDate"
              value={data.expectEndDate}
              min={data.expectStartDate || today}
              max={data.deadline || undefined}
              onChange={handleInputChange}
              className="planning-input"
              required
            />

            <div className="planning-date-icon">
              <Calendar size={18} />
            </div>
          </div>
        </div>

        {/* Submission Deadline */}
        <div className="planning-field-group">
          <label>
            Submission Deadline <span className="planning-required">*</span>
          </label>

          <div className="planning-date-wrapper">
            <input
              type="date"
              name="deadline"
              value={data.deadline}
              min={
                data.expectEndDate ||
                data.expectStartDate ||
                today
              }
              onChange={handleInputChange}
              className="planning-input"
              required
            />

            <div className="planning-date-icon">
              <Calendar size={18} />
            </div>
          </div>
        </div>

        {/* Description */}
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