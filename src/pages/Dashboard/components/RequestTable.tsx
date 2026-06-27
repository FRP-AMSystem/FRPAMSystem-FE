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
  // TODO: Replace request list with API pagination
  // TODO: Add search handlers for "future searching"
  // TODO: Add filter states for "future filtering" (e.g. filter by priority or status)
  // TODO: Add sort handlers for column clicks (e.g. sort by Request ID or Date)

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // TODO: Connect query to API search query params
    console.log("Future Search Query:", event.target.value);
  };

  const handleSort = (columnKey: string) => {
    // TODO: Trigger API refetch with orderby clause (columnKey)
    console.log("Future Sort column:", columnKey);
  };

  const handleFilter = (filterKey: string, filterValue: string) => {
    // TODO: Apply filter parameters to API search string
    console.log("Future Filter:", filterKey, filterValue);
  };

  const handlePageChange = (direction: "prev" | "next") => {
    // TODO: Fetch previous/next page index from API pagination response
    console.log("Future Page Change direction:", direction);
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
          <button className="create-request-btn">
            + Create Request
          </button>
        </div>
      </div>

      {/* Table Main Container */}
      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("id")} style={{ cursor: "pointer" }}>
                REQUEST ID
              </th>
              <th onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
                EXPERIMENT NAME
              </th>
              <th onClick={() => handleSort("priority")} style={{ cursor: "pointer" }}>
                PRIORITY
              </th>
              <th onClick={() => handleSort("date")} style={{ cursor: "pointer" }}>
                DATE
              </th>
              <th onClick={() => handleSort("status")} style={{ cursor: "pointer" }}>
                STATUS
              </th>
              <th style={{ textAlign: "right" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td style={{ color: "#1B5E20", fontWeight: 700 }}>
                  <span className="request-link-id">{request.id}</span>
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
                  <span className="table-action-link">
                    View Details
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Pagination Footer */}
      <div className="table-footer">
        <div className="table-footer-summary">
          Showing 4 of 8 pending requests
        </div>
        <div className="table-pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => handlePageChange("prev")}
            title="Previous Page"
          >
            &lt;
          </button>
          <button
            className="pagination-btn"
            onClick={() => handlePageChange("next")}
            title="Next Page"
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
}
