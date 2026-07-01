import type { AllocationPlan } from "../../../types/allocationPlan";
import "./RequestTable.css";

interface RequestTableProps {
  requests: AllocationPlan[];
}

export default function RequestTable({ requests }: RequestTableProps) {
  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("vi-VN");
  };

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "status-approved";
      case "pending":
        return "status-pending";
      case "rejected":
        return "status-rejected";
      default:
        return "status-default";
    }
  };

  return (
    <div className="request-table-card">
      <div className="request-table-header">
        <h3>Allocation Plans</h3>
        <span>{requests.length} plans</span>
      </div>

      <table className="request-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Experiment</th>
            <th>Fitness Score</th>
            <th>Created By</th>
            <th>Status</th>
            <th>Created Date</th>
            <th>Resources</th>
          </tr>
        </thead>

        <tbody>
          {requests.length === 0 ? (
            <tr>
              <td colSpan={7} className="empty-table">
                No allocation plans found.
              </td>
            </tr>
          ) : (
            requests.map((plan) => (
              <tr key={plan.allocationPlanId}>
                <td>#{plan.allocationPlanId}</td>
                <td>{plan.experimentName}</td>
                <td>{plan.fitnessScore}</td>
                <td>{plan.createdByName}</td>
                <td>
                  <span className={`status-badge ${getStatusClass(plan.approveStatus)}`}>
                    {plan.approveStatus}
                  </span>
                </td>
                <td>{formatDate(plan.createdAt)}</td>
                <td>
                  Land: {plan.landDetailCount} | Equipment:{" "}
                  {plan.equipmentDetailCount} | Human: {plan.humanDetailCount}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}