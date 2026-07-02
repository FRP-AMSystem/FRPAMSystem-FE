import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import DashboardLayout from "../../layouts/DashboardLayout";
import type { AllocationPlan } from "../../types/allocationPlan";

import {
  getAllocationPlanById,
  approveAllocationPlan,
  rejectAllocationPlan,
  cancelAllocationPlan,
} from "../../services/allocationPlanService";

import "./AllocationDetail.css";

type Role = "Manager" | "Researcher" | "Technician" | "Student";

const permissions: Record<
  Role,
  {
    canEdit: boolean;
    canApprove: boolean;
    canReject: boolean;
    canCancel: boolean;
  }
> = {
  Manager: {
    canEdit: true,
    canApprove: true,
    canReject: true,
    canCancel: true,
  },
  Researcher: {
    canEdit: false,
    canApprove: false,
    canReject: false,
    canCancel: false,
  },
  Technician: {
    canEdit: false,
    canApprove: false,
    canReject: false,
    canCancel: false,
  },
  Student: {
    canEdit: false,
    canApprove: false,
    canReject: false,
    canCancel: false,
  },
};

export default function AllocationDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const role = (localStorage.getItem("role") || "Student") as Role;
  const permission = permissions[role] || permissions.Student;

  const [plan, setPlan] = useState<AllocationPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlan = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await getAllocationPlanById(Number(id));
      setPlan(data);
    } catch (error) {
      console.error("Failed to fetch allocation detail:", error);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [id]);

  const handleApprove = async () => {
    if (!plan || !permission.canApprove) return;

    try {
      await approveAllocationPlan(plan.allocationPlanId);
      await fetchPlan();
    } catch (error) {
      console.error("Approve failed:", error);
    }
  };

  const handleReject = async () => {
    if (!plan || !permission.canReject) return;

    try {
      await rejectAllocationPlan(plan.allocationPlanId);
      await fetchPlan();
    } catch (error) {
      console.error("Reject failed:", error);
    }
  };

  const handleCancel = async () => {
    if (!plan || !permission.canCancel) return;

    try {
      await cancelAllocationPlan(plan.allocationPlanId);
      await fetchPlan();
    } catch (error) {
      console.error("Cancel failed:", error);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("vi-VN");
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="allocation-detail-page">
          <p>Loading allocation detail...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!plan) {
    return (
      <DashboardLayout>
        <div className="allocation-detail-page">
          <h1>Allocation Not Found</h1>
          <button onClick={() => navigate("/allocation")}>Back</button>
        </div>
      </DashboardLayout>
    );
  }

  const isPending = plan.approveStatus === "Pending";

  return (
    <DashboardLayout>
      <div className="allocation-detail-page">
        <div className="allocation-detail-header">
          <div>
            <button
              className="back-btn"
              onClick={() => navigate("/allocation")}
            >
              ← Back
            </button>

            <h1>Allocation #{plan.allocationPlanId}</h1>
            <p>{plan.experimentName}</p>
          </div>

          <span
            className={`status-badge status-${plan.approveStatus.toLowerCase()}`}
          >
            {plan.approveStatus}
          </span>
        </div>

        <div className="allocation-detail-grid">
          <div className="detail-card">
            <h3>Experiment Information</h3>

            <div className="detail-row">
              <span>Experiment ID</span>
              <strong>{plan.experimentId}</strong>
            </div>

            <div className="detail-row">
              <span>Experiment Name</span>
              <strong>{plan.experimentName}</strong>
            </div>

            <div className="detail-row">
              <span>Fitness Score</span>
              <strong>{plan.fitnessScore}%</strong>
            </div>

            <div className="detail-row">
              <span>Created By</span>
              <strong>{plan.createdByName || "-"}</strong>
            </div>
          </div>

          <div className="detail-card">
            <h3>Resource Summary</h3>

            <div className="resource-summary-grid">
              <div>
                <span>Land</span>
                <strong>{plan.landDetailCount}</strong>
              </div>

              <div>
                <span>Equipment</span>
                <strong>{plan.equipmentDetailCount}</strong>
              </div>

              <div>
                <span>Human</span>
                <strong>{plan.humanDetailCount}</strong>
              </div>

              <div>
                <span>Schedule</span>
                <strong>{plan.scheduleCount}</strong>
              </div>
            </div>
          </div>

          <div className="detail-card">
            <h3>Approval Information</h3>

            <div className="detail-row">
              <span>Status</span>
              <strong>{plan.approveStatus}</strong>
            </div>

            <div className="detail-row">
              <span>Approved By</span>
              <strong>{plan.approveByName || "-"}</strong>
            </div>

            <div className="detail-row">
              <span>Approved At</span>
              <strong>{formatDate(plan.approvedAt)}</strong>
            </div>
          </div>

          <div className="detail-card">
            <h3>Timestamps</h3>

            <div className="detail-row">
              <span>Created At</span>
              <strong>{formatDate(plan.createdAt)}</strong>
            </div>

            <div className="detail-row">
              <span>Updated At</span>
              <strong>{formatDate(plan.updatedAt)}</strong>
            </div>
          </div>
        </div>

        <div className="detail-actions-card">
          <h3>Actions</h3>

          <div className="detail-actions">
            {permission.canEdit && (
              <button
                onClick={() =>
                  navigate(`/allocation/edit/${plan.allocationPlanId}`)
                }
              >
                Edit
              </button>
            )}

            {permission.canApprove && isPending && (
              <button className="success-btn" onClick={handleApprove}>
                Approve
              </button>
            )}

            {permission.canReject && isPending && (
              <button className="warning-btn" onClick={handleReject}>
                Reject
              </button>
            )}

            {permission.canCancel && isPending && (
              <button className="secondary-btn" onClick={handleCancel}>
                Cancel
              </button>
            )}

            {!permission.canEdit &&
              !permission.canApprove &&
              !permission.canReject &&
              !permission.canCancel && (
                <p className="readonly-note">
                  Your account has read-only permission for this allocation.
                </p>
              )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}