import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getAllocationPlanById,
  updateAllocationPlan,
} from "../../services/allocationPlanService";

import type {
  AllocationPlan,
  AllocationPlanStatus,
} from "../../types/allocationPlan";

import "./CreateAllocation.css";

interface EditAllocationFormState {
  fitnessScore: string;
}

function isEditableStatus(
  status: AllocationPlanStatus
): boolean {
  return status === "Draft" || status === "Pending";
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
            title?: string;
          };
        };
      }
    ).response;

    return (
      response?.data?.message ??
      response?.data?.title ??
      "Update allocation plan failed."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Update allocation plan failed.";
}

export default function EditAllocation() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const allocationPlanId = Number(id);

  const [plan, setPlan] =
    useState<AllocationPlan | null>(null);

  const [form, setForm] =
    useState<EditAllocationFormState>({
      fitnessScore: "",
    });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAllocationPlan() {
      if (
        !Number.isInteger(allocationPlanId) ||
        allocationPlanId <= 0
      ) {
        setError("Allocation plan ID is invalid.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data =
          await getAllocationPlanById(
            allocationPlanId
          );

        setPlan(data);

        setForm({
          fitnessScore:
            data.fitnessScore !== null &&
            data.fitnessScore !== undefined
              ? String(data.fitnessScore)
              : "",
        });
      } catch (loadError) {
        console.error(
          "Failed to load allocation plan:",
          loadError
        );

        setError(
          getErrorMessage(loadError) ||
            "Cannot load allocation plan."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadAllocationPlan();
  }, [allocationPlanId]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    if (!plan) {
      setError("Allocation plan not found.");
      return;
    }

    if (!isEditableStatus(plan.approveStatus)) {
      setError(
        `Allocation plan with status ${plan.approveStatus} cannot be edited.`
      );
      return;
    }

    const fitnessScore =
      form.fitnessScore.trim() === ""
        ? null
        : Number(form.fitnessScore);

    if (
      fitnessScore !== null &&
      (Number.isNaN(fitnessScore) ||
        fitnessScore < 0 ||
        fitnessScore > 100)
    ) {
      setError(
        "Fitness score must be between 0 and 100."
      );
      return;
    }

    try {
      setSaving(true);

      await updateAllocationPlan(
        allocationPlanId,
        {
          experimentId: plan.experimentId,
          fitnessScore,
          approveStatus: plan.approveStatus,
        }
      );

      navigate(
        `/allocation/${allocationPlanId}`
      );
    } catch (submitError) {
      console.error(
        "Failed to update allocation plan:",
        submitError
      );

      setError(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="create-allocation-page">
          <p>Loading allocation plan...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!plan) {
    return (
      <DashboardLayout>
        <div className="create-allocation-page">
          <div className="create-header">
            <div>
              <p className="breadcrumb">
                Dashboard / Allocation / Edit
              </p>

              <h1>Allocation Plan Not Found</h1>

              <span>
                The requested allocation plan could not be
                loaded.
              </span>
            </div>

            <button
              type="button"
              className="back-btn"
              onClick={() =>
                navigate("/allocation")
              }
            >
              Back
            </button>
          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  const canEdit = isEditableStatus(
    plan.approveStatus
  );

  return (
    <DashboardLayout>
      <div className="create-allocation-page">
        <div className="create-header">
          <div>
            <p className="breadcrumb">
              Dashboard / Allocation / Edit
            </p>

            <h1>
              Edit Allocation Plan #
              {plan.allocationPlanId}
            </h1>

            <span>
              Update the fitness score of this allocation
              plan.
            </span>
          </div>

          <button
            type="button"
            className="back-btn"
            onClick={() =>
              navigate(
                `/allocation/${plan.allocationPlanId}`
              )
            }
          >
            Back
          </button>
        </div>

        {error && (
          <div className="form-error">{error}</div>
        )}

        {!canEdit && (
          <div className="form-error">
            This allocation plan cannot be edited because
            its current status is{" "}
            <strong>{plan.approveStatus}</strong>.
          </div>
        )}

        <form
          className="allocation-form"
          onSubmit={handleSubmit}
        >
          <div className="form-card">
            <h3>Allocation Information</h3>

            <label htmlFor="experiment">
              Experiment
            </label>

            <input
              id="experiment"
              value={`#${plan.experimentId} - ${
                plan.experimentName ??
                "Unknown experiment"
              }`}
              disabled
            />

            <label htmlFor="fitnessScore">
              Fitness Score (%)
            </label>

            <input
              id="fitnessScore"
              type="number"
              name="fitnessScore"
              min="0"
              max="100"
              step="0.01"
              value={form.fitnessScore}
              onChange={handleChange}
              placeholder="Example: 85"
              disabled={!canEdit}
            />

            <label htmlFor="approveStatus">
              Current Status
            </label>

            <input
              id="approveStatus"
              value={plan.approveStatus}
              disabled
            />

            <div className="form-note">
              Approval status is not changed from this
              form. Manager actions use the separate
              Approve, Reject and Cancel APIs.
            </div>
          </div>

          <div className="form-card">
            <h3>Current Summary</h3>

            <div className="experiment-preview">
              <div>
                <span>Experiment Name</span>

                <strong>
                  {plan.experimentName ??
                    "Unknown experiment"}
                </strong>
              </div>

              <div>
                <span>Fitness Score</span>

                <strong>
                  {plan.fitnessScore !== null
                    ? `${plan.fitnessScore}%`
                    : "Not set"}
                </strong>
              </div>

              <div>
                <span>Land Details</span>

                <strong>
                  {plan.landDetailCount ?? 0}
                </strong>
              </div>

              <div>
                <span>Equipment Details</span>

                <strong>
                  {plan.equipmentDetailCount ?? 0}
                </strong>
              </div>

              <div>
                <span>Human Details</span>

                <strong>
                  {plan.humanDetailCount ?? 0}
                </strong>
              </div>

              <div>
                <span>Schedules</span>

                <strong>
                  {plan.scheduleCount ?? 0}
                </strong>
              </div>

              <div>
                <span>Current Status</span>

                <strong>
                  {plan.approveStatus}
                </strong>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() =>
                  navigate(
                    `/allocation/${plan.allocationPlanId}`
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="save-btn"
                disabled={saving || !canEdit}
              >
                {saving
                  ? "Saving..."
                  : "Update Allocation"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}