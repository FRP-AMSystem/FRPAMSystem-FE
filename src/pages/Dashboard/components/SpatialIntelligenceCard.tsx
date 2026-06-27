import { useState } from "react";
import { Compass, Info } from "lucide-react";

interface ForestZone {
  id: string;
  name: string;
  type: "harvesting" | "regeneration" | "conservation" | "restricted";
  color: string;
  path: string;
  acres: number;
  species: string;
  status: string;
}

const zones: ForestZone[] = [
  // Interactive SVG paths for 4 large custom forest plots
  {
    id: "zone-1",
    name: "North Pine Block (A1)",
    type: "harvesting",
    color: "#2E7D32",
    path: "M 20 20 L 180 20 L 150 140 L 20 100 Z",
    acres: 450,
    species: "Loblolly Pine",
    status: "Active Harvest (85% Utilized)",
  },
  {
    id: "zone-2",
    name: "Riparian Buffer Zone (B3)",
    type: "restricted",
    color: "#F59E0B",
    path: "M 180 20 L 360 40 L 320 180 L 150 140 Z",
    acres: 220,
    species: "Mixed Oak & Maple",
    status: "Restricted (Riparian Overlap Warning)",
  },
  {
    id: "zone-3",
    name: "Valley Replanting (C2)",
    type: "regeneration",
    color: "#10B981",
    path: "M 20 100 L 150 140 L 120 250 L 30 240 Z",
    acres: 310,
    species: "Douglas Fir Saplings",
    status: "Regeneration (Year 3 Growth)",
  },
  {
    id: "zone-4",
    name: "Old-Growth Sanctuary (S1)",
    type: "conservation",
    color: "#065F46",
    path: "M 150 140 L 320 180 L 280 260 L 120 250 Z",
    acres: 640,
    species: "Hemlock & Spruce",
    status: "Protected (Ecological Habitat)",
  },
];

export default function SpatialIntelligenceCard() {
  const [hoveredZone, setHoveredZone] = useState<ForestZone | null>(null);

  return (
    <div className="dashboard-card spatial-card">
      <div className="dashboard-card-header">
        <div>
          <h3 className="dashboard-card-title">
            <Compass size={20} style={{ color: "var(--brand-primary)" }} />
            Spatial Intelligence Map
          </h3>
          <p className="dashboard-card-subtitle">
            Interactive GIS concession layout & environmental plots
          </p>
        </div>
      </div>

      <div className="map-wrapper" style={{ position: "relative" }}>
        {/* SVG Drawing of concession layout */}
        <svg
          viewBox="0 0 380 280"
          width="100%"
          height="100%"
          style={{ padding: "10px", boxSizing: "border-box" }}
        >
          {zones.map((zone) => (
            <path
              key={zone.id}
              d={zone.path}
              fill={zone.color}
              stroke="white"
              strokeWidth={hoveredZone?.id === zone.id ? 3 : 1.5}
              opacity={hoveredZone ? (hoveredZone.id === zone.id ? 0.95 : 0.6) : 0.8}
              className="map-concession"
              onMouseEnter={() => setHoveredZone(zone)}
              onMouseLeave={() => setHoveredZone(null)}
            />
          ))}
        </svg>

        {/* Legend overlay */}
        <div className="map-legend">
          <div className="legend-item">
            <span className="legend-dot" style={{ background: "#2E7D32" }} />
            <span>Harvesting</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: "#F59E0B" }} />
            <span>Restricted</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: "#10B981" }} />
            <span>Regeneration</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: "#065F46" }} />
            <span>Conservation</span>
          </div>
        </div>

        {/* Zone Tooltip Overlay */}
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "12px",
            width: "180px",
            boxShadow: "var(--shadow)",
            zIndex: 10,
            transition: "all 0.2s ease",
            opacity: hoveredZone ? 1 : 0.85,
          }}
        >
          {hoveredZone ? (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: 600,
                  fontSize: "12px",
                  color: "var(--text-h)",
                  marginBottom: "4px",
                }}
              >
                <Info size={14} style={{ color: hoveredZone.color }} />
                <span>{hoveredZone.name}</span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--text)", lineHeight: "1.4" }}>
                <div>Species: <strong>{hoveredZone.species}</strong></div>
                <div>Area: <strong>{hoveredZone.acres} ac</strong></div>
                <div style={{ marginTop: "4px", color: hoveredZone.color, fontWeight: 500 }}>
                  {hoveredZone.status}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                fontSize: "11px",
                color: "var(--text)",
                textAlign: "center",
                padding: "8px 0",
              }}
            >
              Hover over map segments to view zone metrics
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
