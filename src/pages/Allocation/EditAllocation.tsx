import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getAllocationPlanById,
  updateAllocationPlan,
} from "../../services/allocationPlanService";

import type { AllocationPlan } from "../../types/allocationPlan";

import "./CreateAllocation.css";

export default function EditAllocation() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [plan, setPlan] = useState<AllocationPlan | null>(null);

  const [form, setForm] = useState({
    fitnessScore: "",
    approveStatus: "Pending",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAllocationPlan() {
      if (!id) return;

      try {
        setLoading(true);

        const data = await getAllocationPlanById(Number(id));
        setPlan(data);

        setForm({
          fitnessScore:
            data.fitnessScore !== undefined && data.fitnessScore !== null
              ? String(data.fitnessScore)
              : "",
          approveStatus: data.approveStatus || "Pending",
        });
      } catch (err) {
        console.error(err);
        setError("Cannot load allocation plan.");
      } finally {
        setLoading(false);
      }
    }

    loadAllocationPlan();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!id || !plan) {
      setError("Allocation plan not found.");
      return;
    }

    try {
      setSaving(true);

      await updateAllocationPlan(Number(id), {
        experimentId: plan.experimentId,
        fitnessScore: form.fitnessScore ? Number(form.fitnessScore) : 0,
        approveStatus: form.approveStatus,
      });

      navigate(`/allocation/${id}`);
    } catch (err) {
      console.error(err);
      setError("Update allocation plan failed.");
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
          <h1>Allocation Plan Not Found</h1>

          <button className="back-btn" onClick={() => navigate("/allocation")}>
            Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="create-allocation-page">
        <div className="create-header">
          <div>
            <p className="breadcrumb">
              Dashboard / Allocation Planner / Edit Allocation
            </p>

            <h1>Edit Allocation Plan #{plan.allocationPlanId}</h1>

            <span>Update allocation fitness score and approval status.</span>
          </div>

          <button
            type="button"
            className="back-btn"
            onClick={() => navigate(`/allocation/${plan.allocationPlanId}`)}
          >
            Back
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form className="allocation-form" onSubmit={handleSubmit}>
          <div className="form-card">
            <h3>Allocation Plan Information</h3>

            <label>Experiment</label>
            <input
              value={`#${plan.experimentId} - ${plan.experimentName}`}
              disabled
            />

            <label>Fitness Score</label>
            <input
              type="number"
              step="0.01"
              name="fitnessScore"
              value={form.fitnessScore}
              onChange={handleChange}
              placeholder="Example: 85"
            />

            <label>Approve Status</label>
            <select
              name="approveStatus"
              value={form.approveStatus}
              onChange={handleChange}
            >
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <div className="form-note">
              Only Manager can edit allocation plans.
            </div>
          </div>

          <div className="form-card">
            <h3>Current Summary</h3>

            <div className="experiment-preview">
              <div>
                <span>Experiment Name</span>
                <strong>{plan.experimentName}</strong>
              </div>

              <div>
                <span>Land Details</span>
                <strong>{plan.landDetailCount}</strong>
              </div>

              <div>
                <span>Equipment Details</span>
                <strong>{plan.equipmentDetailCount}</strong>
              </div>

              <div>
                <span>Human Details</span>
                <strong>{plan.humanDetailCount}</strong>
              </div>

              <div>
                <span>Schedules</span>
                <strong>{plan.scheduleCount}</strong>
              </div>

              <div>
                <span>Current Status</span>
                <strong>{plan.approveStatus}</strong>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => navigate(`/allocation/${plan.allocationPlanId}`)}
              >
                Cancel
              </button>

              <button type="submit" className="save-btn" disabled={saving}>
                {saving ? "Saving..." : "Update Allocation"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}