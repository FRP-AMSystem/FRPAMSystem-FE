import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Layers, Users, MapPin } from "lucide-react";
import type { ResourceStatusBreakdown } from "../../../types/dashboard";

interface ResourceStatusDonutGroupProps {
  breakdowns: {
    equipment: ResourceStatusBreakdown;
    personnel: ResourceStatusBreakdown;
    land: ResourceStatusBreakdown;
  };
}

export default function ResourceStatusDonutGroup({
  breakdowns,
}: ResourceStatusDonutGroupProps) {
  const cards = [
    {
      key: "equipment",
      title: "Equipment Fleet",
      icon: <Layers size={14} style={{ color: "#2563eb" }} />,
      breakdown: breakdowns.equipment,
      unit: "Units",
      inUseLabel: "In Field",
      availableLabel: "Available",
      maintenanceLabel: "Service",
    },
    {
      key: "personnel",
      title: "Personnel Staff",
      icon: <Users size={14} style={{ color: "#16a34a" }} />,
      breakdown: breakdowns.personnel,
      unit: "Staff",
      inUseLabel: "Assigned",
      availableLabel: "Ready",
      maintenanceLabel: "Inactive",
    },
    {
      key: "land",
      title: "Land Resource",
      icon: <MapPin size={14} style={{ color: "#d97706" }} />,
      breakdown: breakdowns.land,
      unit: "Plots",
      inUseLabel: "In Use",
      availableLabel: "Ready",
      maintenanceLabel: "Fallow",
    },
  ];

  return (
    <div className="dashboard-card" style={{ height: "100%" }}>
      {/* Header */}
      <div className="dashboard-card-header">
        <div className="card-title-group">
          <div className="card-title-icon icon-blue-soft">
            <Layers size={18} />
          </div>
          <div>
            <h3 className="dashboard-card-title">
              3-Pillar Resource Distribution
            </h3>
            <p className="dashboard-card-subtitle">
              Availability vs allocated load across primary assets
            </p>
          </div>
        </div>
      </div>

      {/* 3 Donut Sub Cards Grid - No hover tooltip popup */}
      <div className="donuts-container">
        {cards.map((card) => {
          const bd = card.breakdown;
          const pieData = bd.items
            .filter((item) => item.value > 0)
            .map((item) => ({
              ...item,
              unit: card.unit,
            }));

          const hasData = pieData.length > 0;

          return (
            <div key={card.key} className="donut-sub-card">
              <div className="donut-sub-title">
                {card.icon}
                <span>{card.title}</span>
              </div>

              <div className="donut-chart-wrapper">
                {hasData ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          innerRadius={34}
                          outerRadius={48}
                          paddingAngle={3}
                          dataKey="value"
                          isAnimationActive={false}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="donut-center-metric">
                      <span className="donut-center-pct">{bd.utilizationRate}%</span>
                      <span className="donut-center-lbl">Active</span>
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      color: "#94a3b8",
                    }}
                  >
                    No items
                  </div>
                )}
              </div>

              {/* Legend List */}
              <div className="donut-legend-list">
                <div className="donut-legend-item">
                  <span className="legend-dot-label">
                    <span className="legend-dot" style={{ background: "#10b981" }} />
                    {card.availableLabel}:
                  </span>
                  <strong className="legend-val" style={{ color: "#15803d" }}>
                    {bd.available}
                  </strong>
                </div>

                <div className="donut-legend-item">
                  <span className="legend-dot-label">
                    <span className="legend-dot" style={{ background: "#3b82f6" }} />
                    {card.inUseLabel}:
                  </span>
                  <strong className="legend-val" style={{ color: "#2563eb" }}>
                    {bd.inUse}
                  </strong>
                </div>

                {bd.maintenanceOrBusy > 0 && (
                  <div className="donut-legend-item">
                    <span className="legend-dot-label">
                      <span className="legend-dot" style={{ background: "#f59e0b" }} />
                      {card.maintenanceLabel}:
                    </span>
                    <strong className="legend-val" style={{ color: "#d97706" }}>
                      {bd.maintenanceOrBusy}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "8px 12px",
          textAlign: "center",
          fontSize: "11px",
          color: "#64748b",
        }}
      >
        Total Inventory: <strong style={{ color: "#0f172a" }}>{breakdowns.equipment.total}</strong> Machines • <strong style={{ color: "#0f172a" }}>{breakdowns.personnel.total}</strong> Staff • <strong style={{ color: "#0f172a" }}>{breakdowns.land.total}</strong> Plots
      </div>
    </div>
  );
}
