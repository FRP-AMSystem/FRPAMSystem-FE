import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";

import type { AllocationPlan } from "../../types/allocationPlan";
import {
    getAllocationPlans,
    deleteAllocationPlan,
    approveAllocationPlan,
    rejectAllocationPlan,
    cancelAllocationPlan,
} from "../../services/allocationPlanService";

import "./AllocationList.css";

type Role = "Manager" | "Researcher" | "Technician" | "Student";

const permissions: Record<Role, {
    canCreate: boolean;
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canApprove: boolean;
    canReject: boolean;
    canCancel: boolean;
}> = {
    Manager: {
        canCreate: true,
        canView: true,
        canEdit: true,
        canDelete: true,
        canApprove: true,
        canReject: true,
        canCancel: true,
    },

    Researcher: {
        canCreate: false,
        canView: true,
        canEdit: false,
        canDelete: false,
        canApprove: false,
        canReject: false,
        canCancel: false,
    },

    Technician: {
        canCreate: false,
        canView: true,
        canEdit: false,
        canDelete: false,
        canApprove: false,
        canReject: false,
        canCancel: false,
    },

    Student: {
        canCreate: false,
        canView: true,
        canEdit: false,
        canDelete: false,
        canApprove: false,
        canReject: false,
        canCancel: false,
    },
};

export default function AllocationList() {
    const navigate = useNavigate();

    const role = (localStorage.getItem("role") || "Student") as Role;
    const permission = permissions[role] || permissions.Student;

    const [plans, setPlans] = useState<AllocationPlan[]>([]);
    const [filteredPlans, setFilteredPlans] = useState<AllocationPlan[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    const fetchPlans = async () => {
        try {
            setLoading(true);

            const data = await getAllocationPlans();

            setPlans(data);
            setFilteredPlans(data);
        } catch (error) {
            console.error("Failed to fetch allocation plans:", error);
            setPlans([]);
            setFilteredPlans([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    useEffect(() => {
        let result = [...plans];

        if (searchTerm.trim()) {
            result = result.filter((plan) =>
                plan.experimentName
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase())
            );
        }

        if (statusFilter !== "All") {
            result = result.filter((plan) => plan.approveStatus === statusFilter);
        }

        setFilteredPlans(result);
    }, [searchTerm, statusFilter, plans]);

    const handleDelete = async (id: number) => {
        if (!permission.canDelete) return;

        if (!window.confirm("Are you sure you want to delete this plan?")) return;

        try {
            await deleteAllocationPlan(id);
            await fetchPlans();
        } catch (error) {
            console.error("Delete failed:", error);
        }
    };

    const handleApprove = async (id: number) => {
        if (!permission.canApprove) return;

        try {
            await approveAllocationPlan(id);
            await fetchPlans();
        } catch (error) {
            console.error("Approve failed:", error);
        }
    };

    const handleReject = async (id: number) => {
        if (!permission.canReject) return;

        try {
            await rejectAllocationPlan(id);
            await fetchPlans();
        } catch (error) {
            console.error("Reject failed:", error);
        }
    };

    const handleCancel = async (id: number) => {
        if (!permission.canCancel) return;

        try {
            await cancelAllocationPlan(id);
            await fetchPlans();
        } catch (error) {
            console.error("Cancel failed:", error);
        }
    };

    const formatDate = (date: string | null) => {
        if (!date) return "-";
        return new Date(date).toLocaleDateString("vi-VN");
    };

    const getPageDescription = () => {
        switch (role) {
            case "Manager":
                return "Create, manage, approve, reject, and cancel allocation plans.";
            case "Researcher":
                return "View allocation plans and track experiment approval status.";
            case "Technician":
                return "View allocation information related to equipment and schedules.";
            case "Student":
                return "View assigned experiments, schedules, and allocation results.";
            default:
                return "View allocation plans.";
        }
    };

    return (
        <DashboardLayout>
            <div className="allocation-page">
                <div className="allocation-header">
                    <div>
                        <h1>Allocation Plans</h1>
                        <p>{getPageDescription()}</p>
                    </div>

                    {permission.canCreate && (
                        <button
                            className="primary-btn"
                            onClick={() => navigate("/allocation/create")}
                        >
                            + Create Plan
                        </button>
                    )}
                </div>

                <div className="allocation-toolbar">
                    <input
                        type="text"
                        placeholder="Search experiment name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                </div>

                <div className="allocation-table-card">
                    {loading ? (
                        <p className="table-message">Loading allocation plans...</p>
                    ) : (
                        <table className="allocation-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Experiment</th>
                                    <th>Fitness</th>
                                    <th>Status</th>
                                    <th>Created By</th>
                                    <th>Created Date</th>
                                    <th>Resources</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredPlans.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="empty-table">
                                            No allocation plans found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPlans.map((plan) => (
                                        <tr key={plan.allocationPlanId}>
                                            <td>#{plan.allocationPlanId}</td>
                                            <td>{plan.experimentName || "-"}</td>
                                            <td>{plan.fitnessScore}%</td>
                                            <td>
                                                <span
                                                    className={`status-badge status-${plan.approveStatus.toLowerCase()}`}
                                                >
                                                    {plan.approveStatus}
                                                </span>
                                            </td>
                                            <td>{plan.createdByName || "-"}</td>
                                            <td>{formatDate(plan.createdAt)}</td>
                                            <td>
                                                Land: {plan.landDetailCount} | Equipment:{" "}
                                                {plan.equipmentDetailCount} | Human:{" "}
                                                {plan.humanDetailCount} | Schedule:{" "}
                                                {plan.scheduleCount}
                                            </td>
                                            <td>
                                                <div className="action-group">
                                                    {permission.canView && (
                                                        <button
                                                            onClick={() =>
                                                                navigate(`/allocation/${plan.allocationPlanId}`)
                                                            }
                                                        >
                                                            View
                                                        </button>
                                                    )}

                                                    {permission.canEdit && (
                                                        <button
                                                            onClick={() =>
                                                                navigate(
                                                                    `/allocation/edit/${plan.allocationPlanId}`
                                                                )
                                                            }
                                                        >
                                                            Edit
                                                        </button>
                                                    )}

                                                    {permission.canApprove &&
                                                        plan.approveStatus === "Pending" && (
                                                            <button
                                                                className="success-btn"
                                                                onClick={() =>
                                                                    handleApprove(plan.allocationPlanId)
                                                                }
                                                            >
                                                                Approve
                                                            </button>
                                                        )}

                                                    {permission.canReject &&
                                                        plan.approveStatus === "Pending" && (
                                                            <button
                                                                className="warning-btn"
                                                                onClick={() =>
                                                                    handleReject(plan.allocationPlanId)
                                                                }
                                                            >
                                                                Reject
                                                            </button>
                                                        )}

                                                    {permission.canCancel &&
                                                        plan.approveStatus === "Pending" && (
                                                            <button
                                                                className="secondary-btn"
                                                                onClick={() =>
                                                                    handleCancel(plan.allocationPlanId)
                                                                }
                                                            >
                                                                Cancel
                                                            </button>
                                                        )}

                                                    {permission.canDelete && (
                                                        <button
                                                            className="danger-btn"
                                                            onClick={() =>
                                                                handleDelete(plan.allocationPlanId)
                                                            }
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}