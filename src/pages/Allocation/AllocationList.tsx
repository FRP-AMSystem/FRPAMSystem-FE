import "./AllocationList.css";
import { useNavigate } from "react-router-dom";

export default function AllocationList() {
    const navigate = useNavigate();
    return (
        <div className="allocation-page">

            <div className="allocation-header">
                <div>
                    <h1>Resource Allocation</h1>

                    <p>
                        Manage and monitor ecological resource distribution
                        across active sectors.
                    </p>
                </div>

                <div className="allocation-actions">
                    <button className="btn-outline">
                        Filter
                    </button>

                    <button
                        className="btn-primary"
                        onClick={() => navigate("/allocation/create")}
                    >
                        + New Allocation
                    </button>
                </div>
            </div>

            <div className="stats-grid">

                <div className="stat-card">
                    <span>TOTAL ALLOCATIONS</span>
                    <h2>1,284</h2>
                    <small>↑ 8.2% from last month</small>
                </div>

                <div className="stat-card">
                    <span>ACTIVE</span>
                    <h2>842</h2>
                    <small>65% of total volume</small>
                </div>

                <div className="stat-card">
                    <span>PENDING</span>
                    <h2>156</h2>
                    <small>12 urgent reviews</small>
                </div>

                <div className="stat-card">
                    <span>COMPLETED</span>
                    <h2>286</h2>
                    <small>FY24 Q3 target met</small>
                </div>

            </div>

            <div className="table-section">

                <div className="table-toolbar">

                    <input
                        type="text"
                        placeholder="Search by plan name, ID or manager..."
                    />

                    <select>
                        <option>Forest (All)</option>
                    </select>

                    <select>
                        <option>Status (All)</option>
                    </select>

                    <button>Date Range</button>

                </div>

                <table>

                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Plan Name</th>
                            <th>Forest</th>
                            <th>Resource Type</th>
                            <th>Budget</th>
                            <th>Priority</th>
                            <th>Status</th>
                        </tr>
                    </thead>

                    <tbody>

                        <tr>
                            <td>#RA-4821</td>
                            <td>Cedar Reforestation Phase II</td>
                            <td>North Ridge Forest</td>
                            <td>Research</td>
                            <td>$14,200</td>
                            <td>High</td>
                            <td>
                                <span className="status active">
                                    ACTIVE
                                </span>
                            </td>
                        </tr>

                        <tr>
                            <td>#RA-4819</td>
                            <td>Soil Sampling Grid Delta</td>
                            <td>Blackwood Basin</td>
                            <td>Analysis</td>
                            <td>$3,450</td>
                            <td>Medium</td>
                            <td>
                                <span className="status conflict">
                                    CONFLICT
                                </span>
                            </td>
                        </tr>

                    </tbody>

                </table>

            </div>

            <div className="map-card">

                <div className="map-info">

                    <h4>Regional Density</h4>

                    <p>
                        Allocation hotspots across North Ridge Sector.
                    </p>

                </div>

            </div>

        </div>
    );
}