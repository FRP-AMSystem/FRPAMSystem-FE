import { useNavigate } from "react-router-dom";
import StatusBadge from "./StatusBadge";

interface ExperimentRequest {
  id: string;
  name: string;
  priority: "URGENT" | "MEDIUM" | "LOW";
  date: string;
  status: "Pending Review" | "Review Started" | "Pending";
}

interface RequestTableProps {
  requests: ExperimentRequest[];
}

export default function RequestTable({ requests }: RequestTableProps) {
  const navigate = useNavigate();

  const handleAction = (requestName?: string) => {
    if (requestName) {
      navigate("/admin/logs", { state: { search: requestName } });
    } else {
      navigate("/admin/logs");
    }
  };

  return (
    <div className="dashboard-panel requests-panel">
      {/* Table Title and Topbar Section */}
      <div className="panel-header" style={{ marginBottom: "20px", borderBottom: "none" }}>
        <div>
          <h3 className="panel-title">Pending Experiment Requests</h3>
          <p className="panel-subtitle">Current queue requiring management approval</p>
        </div>
        <div>
          {/* Header Action Button */}
          <button className="create-request-btn" onClick={() => handleAction()}>
            + Create Request
          </button>
        </div>
      </div>

      {/* Table Main Container */}
      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>REQUEST ID</th>
              <th>EXPERIMENT NAME</th>
              <th>PRIORITY</th>
              <th>DATE</th>
              <th>STATUS</th>
              <th style={{ textAlign: "right" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {requests.length > 0 ? (
              requests.map((request) => (
                <tr key={request.id}>
                  <td style={{ color: "#1B5E20", fontWeight: 700 }}>
                    <span className="request-link-id" onClick={() => handleAction(request.name)} style={{ cursor: "pointer" }}>
                      {request.id}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500, color: "#111827" }}>
                    {request.name}
                  </td>
                  <td>
                    <StatusBadge type="priority" value={request.priority} />
                  </td>
                  <td style={{ color: "#6B7280", fontSize: "13px" }}>
                    {request.date}
                  </td>
                  <td>
                    <StatusBadge type="status" value={request.status} />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {/* Action Link Button */}
                    <span className="table-action-link" onClick={() => handleAction(request.name)} style={{ cursor: "pointer" }}>
                      View Details
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "#6B7280" }}>
                  No pending requests requiring review.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination Footer */}
      <div className="table-footer">
        <div className="table-footer-summary">
          {requests.length > 0
            ? `Showing ${requests.length} of ${requests.length} pending requests`
            : "0 requests pending"}
        </div>
        <div className="table-pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => handleAction()}
            title="Previous Page"
          >
            &lt;
          </button>
          <button
            className="pagination-btn"
            onClick={() => handleAction()}
            title="Next Page"
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
}
