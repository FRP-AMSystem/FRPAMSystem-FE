import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  Users,
  Wrench,
  ShieldCheck,
  Calculator,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import type {
  FitnessBreakdown,
  PillarBreakdown,
} from "../../../types/aiSuggestion";
import { getEquipmentTypes } from "../../../services/equipmentService";

interface AIFitnessScoreBreakdownProps {
  breakdown?: FitnessBreakdown;
  fitnessScore?: number;
  penaltyScore?: number;
  bonusScore?: number;
  experimentPhases?: Array<{ phaseId?: number; phaseName?: string }>;
  equipmentTypes?: Array<{ equipmentTypeId?: number; equipmentTypeName?: string; name?: string }>;
}

let cachedEquipmentTypes: Array<{ equipmentTypeId: number; name?: string; equipmentTypeName?: string }> | null = null;

export function formatScoreNumber(
  val: number | string | null | undefined,
  maxDecimals = 2
): string {
  if (val === null || val === undefined) return "0";
  const num = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(num)) return String(val);
  return Number(num.toFixed(maxDecimals)).toString();
}

export function formatCalculationString(calc?: string | null): string {
  if (!calc) return "-";
  return calc.replace(/\d+\.\d{3,}/g, (match) => {
    const n = parseFloat(match);
    return Number.isFinite(n) ? Number(n.toFixed(2)).toString() : match;
  });
}

/**
 * Transforms raw BE adjustment strings containing cryptic IDs (e.g. Type 4, Phase 65, RequiredEquipmentTypeId=6)
 * into human-readable Vietnamese labels with actual Phase names and Equipment Type names.
 */
export function formatAdjustmentReason(
  reason?: string | null,
  phaseMap?: Map<number, string>,
  equipTypeMap?: Map<number, string>,
  roleMap?: Map<number, string>
): string {
  if (!reason || typeof reason !== "string") return reason || "";

  let text = reason;

  // Case 1: Substitution key-value string from backend:
  // e.g. "RequiredEquipmentTypeId=6, AllocatedEquipmentTypeId=9, EquipmentInstanceId=14, AssetCode=PHM-2026-002, EfficiencyRate=0.80, TimeMultiplier=1.20, IsSubstitute=true."
  if (
    text.includes("RequiredEquipmentTypeId=") ||
    text.includes("AllocatedEquipmentTypeId=")
  ) {
    const reqMatch = text.match(/RequiredEquipmentTypeId=(\d+)/i);
    const allocMatch = text.match(/AllocatedEquipmentTypeId=(\d+)/i);
    const assetMatch = text.match(/AssetCode=([^,;.]+)/i);
    const effMatch = text.match(/EfficiencyRate=([\d.]+)/i);
    const timeMatch = text.match(/TimeMultiplier=([\d.]+)/i);

    const reqId = reqMatch ? Number(reqMatch[1]) : null;
    const allocId = allocMatch ? Number(allocMatch[1]) : null;

    const reqName =
      reqId && equipTypeMap?.get(reqId)
        ? equipTypeMap.get(reqId)!
        : reqId
        ? `Type #${reqId}`
        : "Required Equipment";

    const allocName =
      allocId && equipTypeMap?.get(allocId)
        ? equipTypeMap.get(allocId)!
        : allocId
        ? `Type #${allocId}`
        : "Substitute Equipment";

    const asset = assetMatch ? assetMatch[1].trim() : null;
    const effVal = effMatch ? parseFloat(effMatch[1]) : null;
    const eff =
      effVal !== null ? `${Math.round(effVal * 100)}%` : null;
    const timeVal = timeMatch ? parseFloat(timeMatch[1]) : null;
    const time = timeVal !== null ? `${timeVal}x` : null;

    const metaTokens: string[] = [];
    if (asset) metaTokens.push(`Asset: ${asset}`);
    if (eff) metaTokens.push(`Efficiency: ${eff}`);
    if (time) metaTokens.push(`Time Multiplier: ${time}`);

    return `Substitution: ${reqName} ➔ ${allocName}${
      metaTokens.length > 0 ? ` (${metaTokens.join(" • ")})` : ""
    }`;
  }

  // Case 2: Equipment quantity fulfillment:
  // e.g. "Phase 65 equipment requirement (Type 4) quantity fulfillment: 1/1."
  // e.g. "Phase 67 equipment requirement (Type 6) quantity fulfillment: 2/10."
  text = text.replace(
    /Phase\s+(\d+)\s+equipment\s+requirement\s+\(Type\s+(\d+)\)\s+quantity\s+fulfillment:\s*(\d+\/\d+)\.?/gi,
    (_, pId, tId, ratio) => {
      const pName = phaseMap?.get(Number(pId)) || `Phase #${pId}`;
      const tName = equipTypeMap?.get(Number(tId)) || `Type #${tId}`;
      const parts = ratio.split("/");
      const isComplete = parts[0] === parts[1] && parts[0] !== "0";
      const isZero = parts[0] === "0";
      const statusLabel = isComplete
        ? `Fulfillment: ${ratio} (Complete)`
        : isZero
        ? `Unallocated (${ratio})`
        : `Partial fulfillment (${ratio})`;
      return `[${pName}] ${tName} — ${statusLabel}`;
    }
  );

  // Case 3: Human requirement fulfillment:
  // e.g. "Phase 65 human requirement (Role 2) quantity fulfillment: 1/1."
  text = text.replace(
    /Phase\s+(\d+)\s+human\s+requirement\s+\(Role\s+(\d+)\)\s+quantity\s+fulfillment:\s*(\d+\/\d+)\.?/gi,
    (_, pId, rId, ratio) => {
      const pName = phaseMap?.get(Number(pId)) || `Phase #${pId}`;
      const rName = roleMap?.get(Number(rId)) || `Role #${rId}`;
      return `[${pName}] Personnel (${rName}) — Fulfillment: ${ratio}`;
    }
  );

  // Case 4: Insufficient equipment/human:
  // e.g. "Phase 65 has insufficient equipment quantity."
  text = text.replace(
    /Phase\s+(\d+)\s+has\s+insufficient\s+equipment\s+quantity\.?/gi,
    (_, pId) => {
      const pName = phaseMap?.get(Number(pId)) || `Phase #${pId}`;
      return `[${pName}] Insufficient equipment quantity required`;
    }
  );
  text = text.replace(
    /Phase\s+(\d+)\s+has\s+insufficient\s+human\s+quantity\.?/gi,
    (_, pId) => {
      const pName = phaseMap?.get(Number(pId)) || `Phase #${pId}`;
      return `[${pName}] Insufficient personnel headcount required`;
    }
  );

  // Case 5: Land overlap:
  text = text.replace(
    /The candidate assigns the same land to overlapping phases\.?/gi,
    "Land Conflict: Same land plot assigned to overlapping phases"
  );

  // Case 6: Fallback for any remaining "Phase (\d+)"
  text = text.replace(/\bPhase\s+(\d+)\b/gi, (match, pId) => {
    const pName = phaseMap?.get(Number(pId));
    return pName ? `[${pName}]` : match;
  });

  // Case 7: Fallback for any remaining "(Type (\d+))" or "Type (\d+)"
  text = text.replace(/\(Type\s+(\d+)\)/gi, (match, tId) => {
    const tName = equipTypeMap?.get(Number(tId));
    return tName ? `(${tName})` : match;
  });

  text = text.replace(/\bType\s+(\d+)\b/gi, (match, tId) => {
    const tName = equipTypeMap?.get(Number(tId));
    return tName ? tName : match;
  });

  // Case 8: Fallback for Role (\d+)
  text = text.replace(/\bRole\s+(\d+)\b/gi, (match, rId) => {
    const rName = roleMap?.get(Number(rId));
    return rName ? rName : match;
  });

  return text;
}

export const AIFitnessScoreBreakdown: React.FC<AIFitnessScoreBreakdownProps> = ({
  breakdown,
  fitnessScore = 0,
  penaltyScore = 0,
  bonusScore = 0,
  experimentPhases = [],
  equipmentTypes,
}) => {
  const [selectedPillarFilter, setSelectedPillarFilter] = useState<
    "all" | "land" | "human" | "equipment" | "maintenance"
  >("all");
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({
    "land-all": true,
    "human-all": true,
    "equipment-all": true,
    "maintenance-all": true,
  });

  const togglePhaseExpand = (key: string) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // 1. Build Phase Map
  const phaseMap = useMemo(() => {
    const map = new Map<number, string>();
    experimentPhases.forEach((p, idx) => {
      const id = (p as any).phaseId ?? (p as any).experimentPhaseId ?? (p as any).id;
      const order = (p as any).phaseOrder;
      const name = p.phaseName || `Phase ${order || idx + 1}`;
      if (id !== undefined && id !== null) {
        map.set(Number(id), name);
      }
      if (order !== undefined && order !== null) {
        if (!map.has(Number(order))) {
          map.set(Number(order), name);
        }
      }
    });
    const pillarPhases = [
      ...(breakdown?.equipment?.phases || []),
      ...(breakdown?.land?.phases || []),
      ...(breakdown?.human?.phases || []),
      ...(breakdown?.maintenance?.phases || []),
    ];
    pillarPhases.forEach((ph, idx) => {
      const phId = (ph as any).phaseId ?? (ph as any).experimentPhaseId ?? (ph as any).id;
      if (phId && !map.has(Number(phId))) {
        map.set(Number(phId), ph.phaseName || `Phase ${idx + 1}`);
      }
    });
    return map;
  }, [experimentPhases, breakdown]);

  // 2. Build Equipment Types Map with preloading
  const [loadedEquipTypes, setLoadedEquipTypes] = useState<
    Array<{ equipmentTypeId: number; name?: string; equipmentTypeName?: string }>
  >([]);

  useEffect(() => {
    if (equipmentTypes && equipmentTypes.length > 0) return;
    if (cachedEquipmentTypes && cachedEquipmentTypes.length > 0) {
      setLoadedEquipTypes(cachedEquipmentTypes);
      return;
    }
    let cancelled = false;
    getEquipmentTypes({ size: 100 })
      .then((items) => {
        if (!cancelled && Array.isArray(items)) {
          cachedEquipmentTypes = items;
          setLoadedEquipTypes(items);
        }
      })
      .catch((err) => {
        console.warn("Failed to preload equipment types for breakdown:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [equipmentTypes]);

  const equipTypeMap = useMemo(() => {
    const map = new Map<number, string>();
    const list = equipmentTypes && equipmentTypes.length > 0 ? equipmentTypes : loadedEquipTypes;
    list.forEach((t) => {
      const id = t.equipmentTypeId;
      const name = t.equipmentTypeName || t.name;
      if (id && name) {
        map.set(Number(id), name);
      }
    });
    return map;
  }, [equipmentTypes, loadedEquipTypes]);

  // 3. Build Role Map
  const roleMap = useMemo(() => {
    return new Map<number, string>([
      [1, "Admin"],
      [2, "Manager"],
      [3, "Researcher"],
      [4, "Technician"],
      [5, "Seasonal Worker"],
    ]);
  }, []);

  // 4 Pillar values
  const landScore = breakdown?.landScore ?? breakdown?.land?.finalScore ?? 0;
  const humanScore = breakdown?.humanScore ?? breakdown?.human?.finalScore ?? 0;
  const equipmentScore =
    breakdown?.equipmentScore ?? breakdown?.equipment?.finalScore ?? 0;
  const maintenanceScore =
    breakdown?.maintenanceScore ?? breakdown?.maintenance?.finalScore ?? 100;

  const landWeight = 20;
  const humanWeight = 25;
  const equipmentWeight = 40;
  const maintenanceWeight = 15;

  const landContribution = (landScore * landWeight) / 100;
  const humanContribution = (humanScore * humanWeight) / 100;
  const equipmentContribution = (equipmentScore * equipmentWeight) / 100;
  const maintenanceContribution = (maintenanceScore * maintenanceWeight) / 100;

  const globalPenalties = breakdown?.penalties ?? [];
  const globalBonuses = breakdown?.bonuses ?? [];

  const getPhaseName = (phaseId?: number) => {
    if (!phaseId) return "All Phases";
    const found = phaseMap.get(phaseId);
    if (found) return found;
    const foundProp = experimentPhases.find((p) => p.phaseId === phaseId);
    return foundProp?.phaseName || `Phase #${phaseId}`;
  };

  return (
    <div className="ai-fitness-breakdown-wrapper">
      {/* 1. MASTER MATHEMATICAL FORMULA BANNER */}
      <div className="ai-master-formula-banner">
        <div className="formula-header">
          <div className="title-block">
            <Calculator size={18} className="text-emerald-600" />
            <div>
              <h3>Genetic Algorithm Fitness Evaluation</h3>
              <p>Objective function scoring resource allocation candidates by normalized weights</p>
            </div>
          </div>
          <div className="score-summary-pill">
            <span className="text-xs uppercase text-slate-500 font-bold">Fitness Score</span>
            <span className="score-val" style={{ color: "#16a34a" }}>
              {formatScoreNumber(fitnessScore, 1)} <small>/ 100</small>
            </span>
          </div>
        </div>

        {/* Visual Math Expression */}
        <div className="visual-formula-box">
          <div className="formula-blocks">
            {/* Land Block */}
            <div className="formula-token unified-green">
              <span className="token-name">Land</span>
              <span className="token-math">
                {formatScoreNumber(landScore, 1)} × {landWeight}%
              </span>
              <span className="token-sub-val">={formatScoreNumber(landContribution, 2)} pts</span>
            </div>

            <span className="formula-op">+</span>

            {/* Human Block */}
            <div className="formula-token unified-green">
              <span className="token-name">Personnel</span>
              <span className="token-math">
                {formatScoreNumber(humanScore, 1)} × {humanWeight}%
              </span>
              <span className="token-sub-val">={formatScoreNumber(humanContribution, 2)} pts</span>
            </div>

            <span className="formula-op">+</span>

            {/* Equipment Block */}
            <div className="formula-token unified-green">
              <span className="token-name">Equipment</span>
              <span className="token-math">
                {formatScoreNumber(equipmentScore, 1)} × {equipmentWeight}%
              </span>
              <span className="token-sub-val">={formatScoreNumber(equipmentContribution, 2)} pts</span>
            </div>

            <span className="formula-op">+</span>

            {/* Maintenance Block */}
            <div className="formula-token unified-green">
              <span className="token-name">Maintenance</span>
              <span className="token-math">
                {formatScoreNumber(maintenanceScore, 1)} × {maintenanceWeight}%
              </span>
              <span className="token-sub-val">={formatScoreNumber(maintenanceContribution, 2)} pts</span>
            </div>

            <span className="formula-op">−</span>

            {/* Penalties */}
            <div className="formula-token penalty">
              <span className="token-name">Penalties</span>
              <span className="token-math">
                {penaltyScore !== 0
                  ? `−${formatScoreNumber(Math.abs(penaltyScore), 2)}`
                  : "0.00"}
              </span>
            </div>

            <span className="formula-op">+</span>

            {/* Bonuses */}
            <div className="formula-token bonus">
              <span className="token-name">Bonus</span>
              <span className="token-math">
                {bonusScore !== 0
                  ? `+${formatScoreNumber(Math.abs(bonusScore), 2)}`
                  : "0.00"}
              </span>
            </div>

            <span className="formula-op">=</span>

            {/* Final Target */}
            <div className="formula-token final">
              <span className="token-name">Final Fitness</span>
              <span className="token-math final-val">
                {formatScoreNumber(fitnessScore, 2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 4 PILLARS SUMMARY CARDS (ALL UNIFIED GREEN THEME) */}
      <div className="ai-pillars-grid">
        {/* Land Pillar */}
        <div
          className={`ai-pillar-card unified-green ${
            selectedPillarFilter === "land" ? "selected" : ""
          }`}
          onClick={() =>
            setSelectedPillarFilter(selectedPillarFilter === "land" ? "all" : "land")
          }
        >
          <div className="pillar-top">
            <div className="pillar-icon unified-green">
              <Layers size={17} />
            </div>
            <div className="pillar-title">
              <h4>Land Compatibility</h4>
              <span className="weight-tag">Weight: {landWeight}%</span>
            </div>
            <div className="pillar-score-badge" style={{ color: "#16a34a" }}>
              {formatScoreNumber(landScore, 1)} <small>/ 100</small>
            </div>
          </div>
          <div className="pillar-progress-bar">
            <div
              className="pillar-progress-fill unified-green"
              style={{
                width: `${Math.min(100, Math.max(0, landScore))}%`,
              }}
            />
          </div>
          <div className="pillar-footer">
            <span>Contribution: <strong>+{formatScoreNumber(landContribution, 2)}</strong> pts</span>
            <span className="calc-note">
              {formatCalculationString(breakdown?.land?.calculation) || "Soil & area match"}
            </span>
          </div>
        </div>

        {/* Human Pillar */}
        <div
          className={`ai-pillar-card unified-green ${
            selectedPillarFilter === "human" ? "selected" : ""
          }`}
          onClick={() =>
            setSelectedPillarFilter(selectedPillarFilter === "human" ? "all" : "human")
          }
        >
          <div className="pillar-top">
            <div className="pillar-icon unified-green">
              <Users size={17} />
            </div>
            <div className="pillar-title">
              <h4>Personnel & Workforce</h4>
              <span className="weight-tag">Weight: {humanWeight}%</span>
            </div>
            <div className="pillar-score-badge" style={{ color: "#16a34a" }}>
              {formatScoreNumber(humanScore, 1)} <small>/ 100</small>
            </div>
          </div>
          <div className="pillar-progress-bar">
            <div
              className="pillar-progress-fill unified-green"
              style={{
                width: `${Math.min(100, Math.max(0, humanScore))}%`,
              }}
            />
          </div>
          <div className="pillar-footer">
            <span>Contribution: <strong>+{formatScoreNumber(humanContribution, 2)}</strong> pts</span>
            <span className="calc-note">
              {breakdown?.human?.adjustments?.length
                ? `${breakdown.human.adjustments.length} adjustment(s)`
                : "Quantity & skill match"}
            </span>
          </div>
        </div>

        {/* Equipment Pillar */}
        <div
          className={`ai-pillar-card unified-green ${
            selectedPillarFilter === "equipment" ? "selected" : ""
          }`}
          onClick={() =>
            setSelectedPillarFilter(
              selectedPillarFilter === "equipment" ? "all" : "equipment"
            )
          }
        >
          <div className="pillar-top">
            <div className="pillar-icon unified-green">
              <Wrench size={17} />
            </div>
            <div className="pillar-title">
              <h4>Equipment & Machinery</h4>
              <span className="weight-tag">Weight: {equipmentWeight}%</span>
            </div>
            <div className="pillar-score-badge" style={{ color: "#16a34a" }}>
              {formatScoreNumber(equipmentScore, 1)} <small>/ 100</small>
            </div>
          </div>
          <div className="pillar-progress-bar">
            <div
              className="pillar-progress-fill unified-green"
              style={{
                width: `${Math.min(100, Math.max(0, equipmentScore))}%`,
              }}
            />
          </div>
          <div className="pillar-footer">
            <span>Contribution: <strong>+{formatScoreNumber(equipmentContribution, 2)}</strong> pts</span>
            <span className="calc-note">
              {formatCalculationString(breakdown?.equipment?.calculation) || "Quantity & substitution efficiency"}
            </span>
          </div>
        </div>

        {/* Maintenance Pillar */}
        <div
          className={`ai-pillar-card unified-green ${
            selectedPillarFilter === "maintenance" ? "selected" : ""
          }`}
          onClick={() =>
            setSelectedPillarFilter(
              selectedPillarFilter === "maintenance" ? "all" : "maintenance"
            )
          }
        >
          <div className="pillar-top">
            <div className="pillar-icon unified-green">
              <ShieldCheck size={17} />
            </div>
            <div className="pillar-title">
              <h4>Maintenance Alignment</h4>
              <span className="weight-tag">Weight: {maintenanceWeight}%</span>
            </div>
            <div className="pillar-score-badge" style={{ color: "#16a34a" }}>
              {formatScoreNumber(maintenanceScore, 1)} <small>/ 100</small>
            </div>
          </div>
          <div className="pillar-progress-bar">
            <div
              className="pillar-progress-fill unified-green"
              style={{
                width: `${Math.min(100, Math.max(0, maintenanceScore))}%`,
              }}
            />
          </div>
          <div className="pillar-footer">
            <span>Contribution: <strong>+{formatScoreNumber(maintenanceContribution, 2)}</strong> pts</span>
            <span className="calc-note">
              {formatCalculationString(breakdown?.maintenance?.calculation) || "Conflict-free schedule"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. DETAILED SUB-SCORES & PHASE ACCORDIONS */}
      <div className="ai-deep-math-section">
        <div className="deep-math-header">
          <div>
            <h4>Phase-by-Phase Evaluation Matrix</h4>
            <p>Evaluation criteria, component weights, reasoning, and score calculations per phase</p>
          </div>

          {/* Unified Clean Filter Buttons */}
          <div className="pillar-filter-buttons">
            <button
              type="button"
              className={`filter-btn ${selectedPillarFilter === "all" ? "active" : ""}`}
              onClick={() => setSelectedPillarFilter("all")}
            >
              <Layers size={13} />
              All Pillars
            </button>
            <button
              type="button"
              className={`filter-btn ${selectedPillarFilter === "land" ? "active" : ""}`}
              onClick={() => setSelectedPillarFilter("land")}
            >
              <Layers size={13} />
              Land
            </button>
            <button
              type="button"
              className={`filter-btn ${selectedPillarFilter === "human" ? "active" : ""}`}
              onClick={() => setSelectedPillarFilter("human")}
            >
              <Users size={13} />
              Personnel
            </button>
            <button
              type="button"
              className={`filter-btn ${selectedPillarFilter === "equipment" ? "active" : ""}`}
              onClick={() => setSelectedPillarFilter("equipment")}
            >
              <Wrench size={13} />
              Equipment
            </button>
            <button
              type="button"
              className={`filter-btn ${selectedPillarFilter === "maintenance" ? "active" : ""}`}
              onClick={() => setSelectedPillarFilter("maintenance")}
            >
              <ShieldCheck size={13} />
              Maintenance
            </button>
          </div>
        </div>

        {/* Render Pillars & Phases */}
        <div className="pillars-deep-list">
          {/* A. LAND PILLAR DRILLDOWN */}
          {(selectedPillarFilter === "all" || selectedPillarFilter === "land") && (
            <PillarDeepCard
              title="Land Allocation Breakdown"
              weight={landWeight}
              pillarData={breakdown?.land}
              fallbackScore={landScore}
              pillarKey="land"
              getPhaseName={getPhaseName}
              expandedPhases={expandedPhases}
              togglePhaseExpand={togglePhaseExpand}
              phaseMap={phaseMap}
              equipTypeMap={equipTypeMap}
              roleMap={roleMap}
            />
          )}

          {/* B. HUMAN PILLAR DRILLDOWN */}
          {(selectedPillarFilter === "all" || selectedPillarFilter === "human") && (
            <PillarDeepCard
              title="Personnel & Workforce Breakdown"
              weight={humanWeight}
              pillarData={breakdown?.human}
              fallbackScore={humanScore}
              pillarKey="human"
              getPhaseName={getPhaseName}
              expandedPhases={expandedPhases}
              togglePhaseExpand={togglePhaseExpand}
              phaseMap={phaseMap}
              equipTypeMap={equipTypeMap}
              roleMap={roleMap}
            />
          )}

          {/* C. EQUIPMENT PILLAR DRILLDOWN */}
          {(selectedPillarFilter === "all" || selectedPillarFilter === "equipment") && (
            <PillarDeepCard
              title="Equipment Allocation Breakdown"
              weight={equipmentWeight}
              pillarData={breakdown?.equipment}
              fallbackScore={equipmentScore}
              pillarKey="equipment"
              getPhaseName={getPhaseName}
              expandedPhases={expandedPhases}
              togglePhaseExpand={togglePhaseExpand}
              phaseMap={phaseMap}
              equipTypeMap={equipTypeMap}
              roleMap={roleMap}
            />
          )}

          {/* D. MAINTENANCE PILLAR DRILLDOWN */}
          {(selectedPillarFilter === "all" || selectedPillarFilter === "maintenance") && (
            <PillarDeepCard
              title="Maintenance & Risk Breakdown"
              weight={maintenanceWeight}
              pillarData={breakdown?.maintenance}
              fallbackScore={maintenanceScore}
              pillarKey="maintenance"
              getPhaseName={getPhaseName}
              expandedPhases={expandedPhases}
              togglePhaseExpand={togglePhaseExpand}
              phaseMap={phaseMap}
              equipTypeMap={equipTypeMap}
              roleMap={roleMap}
            />
          )}
        </div>

        {/* 4. GLOBAL PENALTIES & BONUSES EXPLANATION */}
        {(globalPenalties.length > 0 || globalBonuses.length > 0) && (
          <div className="global-adjustments-card">
            <h5>Global Soft Constraint Penalties & Bonuses</h5>
            <div className="adjustments-list">
              {globalPenalties.map((pen, idx) => (
                <div key={idx} className="adjustment-badge-item penalty">
                  <div className="badge-header">
                    <TrendingDown size={14} className="text-rose-600" />
                    <strong>{pen.factor}</strong>
                    <span className="badge-type">{pen.type || "Penalty"}</span>
                    <span className="badge-math">{formatCalculationString(pen.calculation)}</span>
                  </div>
                  <p className="badge-reason">
                    {formatAdjustmentReason(pen.reason, phaseMap, equipTypeMap, roleMap)}
                  </p>
                </div>
              ))}

              {globalBonuses.map((bon, idx) => (
                <div key={idx} className="adjustment-badge-item bonus">
                  <div className="badge-header">
                    <Sparkles size={14} className="text-emerald-600" />
                    <strong>{bon.factor}</strong>
                    <span className="badge-type">{bon.type || "Bonus"}</span>
                    <span className="badge-math">{formatCalculationString(bon.calculation)}</span>
                  </div>
                  <p className="badge-reason">
                    {formatAdjustmentReason(bon.reason, phaseMap, equipTypeMap, roleMap)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface PillarDeepCardProps {
  title: string;
  weight: number;
  pillarData?: PillarBreakdown;
  fallbackScore: number;
  pillarKey: string;
  getPhaseName: (id?: number) => string;
  expandedPhases: Record<string, boolean>;
  togglePhaseExpand: (key: string) => void;
  phaseMap: Map<number, string>;
  equipTypeMap: Map<number, string>;
  roleMap: Map<number, string>;
}

const PillarDeepCard: React.FC<PillarDeepCardProps> = ({
  title,
  weight,
  pillarData,
  fallbackScore,
  pillarKey,
  getPhaseName,
  expandedPhases,
  togglePhaseExpand,
  phaseMap,
  equipTypeMap,
  roleMap,
}) => {
  const finalScore = pillarData?.finalScore ?? fallbackScore;
  const phases = pillarData?.phases ?? [];
  const adjustments = pillarData?.adjustments ?? [];

  return (
    <div className="pillar-deep-card">
      <div className="pillar-deep-header unified-green">
        <div className="header-left">
          <h5>{title}</h5>
          <span className="formula-tag">
            {formatCalculationString(pillarData?.calculation) || `Weight: ${weight}% • Score: ${formatScoreNumber(finalScore, 1)}/100`}
          </span>
        </div>
        <div className="header-right">
          <span className="final-score-badge" style={{ color: "#16a34a" }}>
            {formatScoreNumber(finalScore, 1)} / 100
          </span>
        </div>
      </div>

      {/* Pillar Adjustments (if any) */}
      {adjustments.length > 0 && (
        <div className="pillar-adjustments-box">
          <div className="adj-title">
            <AlertCircle size={13} className="text-amber-600" />
            <span>Pillar-level Adjustments & Deductions:</span>
          </div>
          <div className="adj-chips">
            {adjustments.map((adj, idx) => {
              const formattedReason = formatAdjustmentReason(
                adj.reason,
                phaseMap,
                equipTypeMap,
                roleMap
              );
              const points = typeof adj.points === "number" ? adj.points : Number(adj.points || 0);
              const isPositive = points >= 80;
              const isPartial = points > 0 && points < 80;
              const chipClass = isPositive ? "positive" : isPartial ? "warning" : "negative";

              return (
                <span key={idx} className={`adj-chip ${chipClass}`}>
                  <strong>{adj.factor}:</strong> {formatScoreNumber(adj.points, 2)} pts ({formattedReason})
                  {adj.calculation ? ` [${formatCalculationString(adj.calculation)}]` : ""}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Phases Matrix */}
      {phases.length > 0 ? (
        <div className="phase-breakdown-list">
          {phases.map((ph, pIdx) => {
            const phaseKey = `${pillarKey}-${ph.phaseId ?? pIdx}`;
            const isExpanded = expandedPhases[phaseKey] ?? true;
            const subScores = ph.subScores ?? [];
            const phAdjustments = ph.adjustments ?? [];
            const phScore = ph.finalScore ?? ph.baseScore ?? 0;

            return (
              <div key={pIdx} className="phase-sub-card">
                <div
                  className="phase-sub-header"
                  onClick={() => togglePhaseExpand(phaseKey)}
                >
                  <div className="phase-title">
                    {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    <strong>{getPhaseName(ph.phaseId)}</strong>
                    <span className="calc-pill">{formatCalculationString(ph.calculation) || "Criteria Calculation"}</span>
                  </div>
                  <div className="phase-score-pill">
                    <span>Phase Score:</span>
                    <strong>{formatScoreNumber(phScore, 1)}/100</strong>
                  </div>
                </div>

                {isExpanded && (
                  <div className="phase-sub-body">
                    {/* SubScores Table */}
                    {subScores.length > 0 ? (
                      <div className="subscores-table-wrapper">
                        <table className="subscores-table">
                          <thead>
                            <tr>
                              <th>Factor / Criteria</th>
                              <th>Type</th>
                              <th>Points</th>
                              <th>Calculation Formula</th>
                              <th>Reasoning & Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subScores.map((sub, sIdx) => (
                              <tr key={sIdx}>
                                <td>
                                  <strong className="factor-name">{sub.factor}</strong>
                                </td>
                                <td>
                                  <span className="subscore-type-badge">
                                    {sub.type || "SubScore"}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className={`score-points ${
                                      (typeof sub.points === "number" ? sub.points : Number(sub.points)) > 0
                                        ? "positive"
                                        : "zero"
                                    }`}
                                  >
                                    {formatScoreNumber(sub.points, 2)} pts
                                  </span>
                                </td>
                                <td>
                                  <code className="math-code">
                                    {formatCalculationString(sub.calculation) || "-"}
                                  </code>
                                </td>
                                <td className="reason-cell">
                                  {formatAdjustmentReason(sub.reason, phaseMap, equipTypeMap, roleMap) || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="empty-subscores">
                        No detailed sub-scores recorded for this phase.
                      </p>
                    )}

                    {/* Phase-level Adjustments */}
                    {phAdjustments.length > 0 && (
                      <div className="phase-adj-box">
                        <div className="ph-adj-title">
                          <AlertCircle size={13} className="text-rose-600" />
                          <span>Phase Deductions & Adjustments:</span>
                        </div>
                        <div className="ph-adj-list">
                          {phAdjustments.map((pa, paIdx) => (
                            <div key={paIdx} className="ph-adj-item">
                              <span className="pa-factor">{pa.factor}:</span>
                              <span className="pa-points">{formatScoreNumber(pa.points, 2)} pts</span>
                              <span className="pa-reason">
                                {formatAdjustmentReason(pa.reason, phaseMap, equipTypeMap, roleMap)}
                              </span>
                              {pa.calculation && (
                                <code className="pa-math">({formatCalculationString(pa.calculation)})</code>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-phase-data">
          <p>
            {formatCalculationString(pillarData?.calculation) ||
              "Overall evaluation applied to the entire allocation plan."}
          </p>
        </div>
      )}
    </div>
  );
};

export default AIFitnessScoreBreakdown;
