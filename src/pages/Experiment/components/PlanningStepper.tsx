import React from "react";
import { Check } from "lucide-react";
import "../PlanningWizard.css";

interface StepItem {
  id: number;
  label: string;
  description: string;
}

const STEPS: StepItem[] = [
  { id: 1, label: "Experiment Info", description: "Metadata & timeline" },
  { id: 2, label: "Phases", description: "Execution phases" },
  { id: 3, label: "Equipment", description: "Equipment requirements" },
  { id: 4, label: "Human Resources", description: "Personnel & skill needs" },
  { id: 5, label: "Land & Area", description: "Land & soil requirements" },
];

interface PlanningStepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export const PlanningStepper: React.FC<PlanningStepperProps> = ({
  currentStep,
  onStepClick,
}) => {
  return (
    <div className="planning-stepper-card">
      <div className="planning-stepper-list">
        {STEPS.map((step) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isClickable = onStepClick && step.id <= currentStep;

          return (
            <div
              key={step.id}
              onClick={() => {
                if (isClickable) {
                  onStepClick(step.id);
                }
              }}
              className={`planning-step-item ${isClickable ? "clickable" : ""}`}
            >
              <div
                className={`planning-step-circle ${
                  isCompleted
                    ? "completed"
                    : isCurrent
                    ? "current"
                    : "upcoming"
                }`}
              >
                {isCompleted ? <Check size={18} /> : step.id}
              </div>
              <div className="planning-step-info">
                <span
                  className={`planning-step-title ${
                    isCurrent
                      ? "current"
                      : isCompleted
                      ? "completed"
                      : ""
                  }`}
                >
                  {step.label}
                </span>
                <span className="planning-step-desc">{step.description}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
