import { MapPin, Sprout, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { LandUtilizationMetric } from "../../../types/dashboard";

interface LandUtilizationCardProps {
  data: LandUtilizationMetric;
}

export default function LandUtilizationCard({ data }: LandUtilizationCardProps) {
  const navigate = useNavigate();

  return (
    <div className="dashboard-card" style={{ height: "100%" }}>
      {/* Header */}
      <div className="dashboard-card-header">
        <div className="card-title-group">
          <div className="card-title-icon icon-amber-soft">
            <MapPin size={18} />
          </div>
          <div>
            <h3 className="dashboard-card-title">
              Land Utilization & Soil Profiles
            </h3>
            <p className="dashboard-card-subtitle">
              Cultivated area vs available plot reserves & soil properties
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/land-resources")}
          style={{
            border: "none",
            background: "none",
            color: "#16a34a",
            cursor: "pointer",
            padding: 4,
          }}
          title="Open Land Manager"
        >
          <ArrowUpRight size={16} />
        </button>
      </div>

      {/* Main Area KPI Overview */}
      <div style={{ margin: "16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <span style={{ fontSize: "11px", color: "#64748b" }}>Active Cultivation Area</span>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", fontFamily: "var(--heading, sans-serif)" }}>
              {data.inUseAreaSize.toLocaleString()} <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>m²</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "11px", color: "#64748b" }}>Total Farm Reserve</span>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#334155", fontFamily: "var(--heading, sans-serif)" }}>
              {data.totalAreaSize.toLocaleString()} <span style={{ fontSize: "11px", color: "#64748b" }}>m²</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginBottom: 4 }}>
            <span>Overall Coverage:</span>
            <strong style={{ color: "#16a34a", fontWeight: 700 }}>
              {data.utilizationPercent}% In Use
            </strong>
          </div>
          <div style={{ width: "100%", height: "10px", background: "#f1f5f9", borderRadius: 9999, overflow: "hidden", display: "flex" }}>
            <div
              style={{
                width: `${data.utilizationPercent}%`,
                background: "#16a34a",
                height: "100%",
                transition: "width 0.3s ease",
              }}
              title={`In Use: ${data.inUseAreaSize.toLocaleString()} m²`}
            />
            <div
              style={{
                width: `${Math.max(0, 100 - data.utilizationPercent)}%`,
                background: "#fde68a",
                height: "100%",
                transition: "width 0.3s ease",
              }}
              title={`Available: ${data.availableAreaSize.toLocaleString()} m²`}
            />
          </div>
        </div>
      </div>

      {/* Soil Type Distribution Grid */}
      <div>
        <h4 style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <Sprout size={13} style={{ color: "#16a34a" }} /> Soil Classification Breakdown
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, fontSize: "11px" }}>
          {data.soilTypeDistribution.length === 0 ? (
            <div style={{ gridColumn: "span 2", textAlign: "center", padding: "8px", color: "#94a3b8" }}>
              No soil type data recorded
            </div>
          ) : (
            data.soilTypeDistribution.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "8px 12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "#1e293b" }}>{item.soilType}</div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>
                    {item.count} plots • {item.area.toLocaleString()} m²
                  </div>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: 9999, background: "#16a34a" }} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
