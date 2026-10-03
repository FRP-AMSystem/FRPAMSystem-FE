import React, { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Users,
  Layers,
  Wrench,
  Clock,
  ShieldAlert,
  Info,
  Filter,
} from "lucide-react";
import type {
  ConstraintReport,
  FitnessBreakdown,
  AdjustmentItem,
} from "../../../types/aiSuggestion";
import { getHumanResourceProfiles } from "../../../services/personnelService";
import { getExperimentPhaseById } from "../../../services/experimentPhaseService";

interface AIConstraintReportCardProps {
  constraintReport?: ConstraintReport;
  fitnessBreakdown?: FitnessBreakdown;
  penalties?: AdjustmentItem[];
  conflictCount?: number;
  allocatedHumans?: Array<{ humanResourceId?: number; fullName?: string; roleName?: string }>;
  humanProfiles?: Array<{ humanResourceId?: number; fullName?: string; roleName?: string }>;
  allocatedEquipment?: Array<{ equipmentInstanceId?: number; assetCode?: string; equipmentTypeName?: string }>;
  experimentPhases?: Array<{
    phaseId?: number;
    experimentPhaseId?: number;
    id?: number | string;
    phaseName?: string;
    phaseOrder?: number;
  }>;
}

let cachedHumanProfiles: Array<{ humanResourceId: number; fullName?: string; roleName?: string }> | null = null;
const cachedPhaseNameMap = new Map<number, string>();

export const AIConstraintReportCard: React.FC<AIConstraintReportCardProps> = ({
  constraintReport,
  fitnessBreakdown,
  penalties,
  conflictCount = 0,
  allocatedHumans,
  humanProfiles,
  allocatedEquipment,
  experimentPhases,
}) => {
  const [filterMode, setFilterMode] = useState<"all" | "hard" | "soft">("all");
  const [dynamicallyLoadedPhases, setDynamicallyLoadedPhases] = useState<Record<number, string>>({});

  // 1. Preload human profiles if not already available
  const [loadedProfiles, setLoadedProfiles] = useState<
    Array<{ humanResourceId: number; fullName?: string; roleName?: string }>
  >([]);

  useEffect(() => {
    if (humanProfiles && humanProfiles.length > 0) return;
    if (cachedHumanProfiles && cachedHumanProfiles.length > 0) {
      setLoadedProfiles(cachedHumanProfiles);
      return;
    }
    let cancelled = false;
    getHumanResourceProfiles()
      .then((items) => {
        if (!cancelled && Array.isArray(items)) {
          const mapped = items.map((p) => ({
            humanResourceId: p.humanResourceId,
            fullName: p.fullName || (p as any).name,
            roleName: p.roleName,
          }));
          cachedHumanProfiles = mapped;
          setLoadedProfiles(mapped);
        }
      })
      .catch((err) => {
        console.warn("Failed to load human profiles for constraint diagnostics:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [humanProfiles]);

  // 2. Build Human Map (ID -> Name and Role)
  const humanMap = useMemo(() => {
    const map = new Map<number, { name: string; role?: string }>();
    const pool = [
      ...(humanProfiles || []),
      ...loadedProfiles,
      ...(allocatedHumans || []).map((h) => ({
        humanResourceId: h.humanResourceId,
        fullName: h.fullName,
        roleName: h.roleName,
      })),
    ];
    pool.forEach((p) => {
      if (p.humanResourceId && p.fullName) {
        map.set(Number(p.humanResourceId), {
          name: p.fullName,
          role: p.roleName,
        });
      }
    });
    return map;
  }, [humanProfiles, loadedProfiles, allocatedHumans]);

  // 3. Build Equipment Map (Instance ID -> AssetCode / Name)
  const equipMap = useMemo(() => {
    const map = new Map<string, string>();
    (allocatedEquipment || []).forEach((e) => {
      const idStr = String(e.equipmentInstanceId);
      const label = e.assetCode || e.equipmentTypeName || `Equipment #${idStr}`;
      map.set(idStr, label);
    });
    return map;
  }, [allocatedEquipment]);

  // 4. Build Phase Map
  const phaseMap = useMemo(() => {
    const map = new Map<number, string>();

    // Seed from module cache
    cachedPhaseNameMap.forEach((name, id) => {
      map.set(id, name);
    });

    // Seed from dynamic state
    Object.entries(dynamicallyLoadedPhases).forEach(([idStr, name]) => {
      map.set(Number(idStr), name);
    });

    // Seed from props
    (experimentPhases || []).forEach((p, idx) => {
      const id = (p as any).phaseId ?? (p as any).experimentPhaseId ?? (p as any).id;
      const order = (p as any).phaseOrder;
      const name = p.phaseName || `Phase ${order || idx + 1}`;
      if (id !== undefined && id !== null) {
        map.set(Number(id), name);
        cachedPhaseNameMap.set(Number(id), name);
      }
      if (order !== undefined && order !== null) {
        if (!map.has(Number(order))) {
          map.set(Number(order), name);
        }
      }
    });

    // Seed from fitnessBreakdown pillar phases
    const pillarPhases = [
      ...(fitnessBreakdown?.equipment?.phases || []),
      ...(fitnessBreakdown?.land?.phases || []),
      ...(fitnessBreakdown?.human?.phases || []),
      ...(fitnessBreakdown?.maintenance?.phases || []),
    ];
    pillarPhases.forEach((ph, idx) => {
      const phId = (ph as any).phaseId ?? (ph as any).experimentPhaseId ?? (ph as any).id;
      if (phId !== undefined && phId !== null && !map.has(Number(phId))) {
        const name = ph.phaseName || `Phase ${idx + 1}`;
        map.set(Number(phId), name);
        cachedPhaseNameMap.set(Number(phId), name);
      }
    });

    return map;
  }, [experimentPhases, fitnessBreakdown, dynamicallyLoadedPhases]);

  // 5. Auto-fetch missing phases referenced in conflict text by ID
  useEffect(() => {
    const allTexts: string[] = [
      ...(constraintReport?.landConflicts || []),
      ...(constraintReport?.humanConflicts || []),
      ...(constraintReport?.equipmentConflicts || []),
      ...(constraintReport?.scheduleConflicts || []),
      ...(constraintReport?.maintenanceConflicts || []),
      ...(constraintReport?.roleConflicts || []),
      ...(constraintReport?.skillConflicts || []),
      ...(constraintReport?.deadlineConflicts || []),
    ];

    const phaseIdsToFetch = new Set<number>();
    allTexts.forEach((text) => {
      if (!text) return;
      const matches = text.matchAll(/Phase\s+(\d+)/gi);
      for (const m of matches) {
        const pId = Number(m[1]);
        if (
          pId > 0 &&
          !phaseMap.has(pId) &&
          !cachedPhaseNameMap.has(pId) &&
          !dynamicallyLoadedPhases[pId]
        ) {
          phaseIdsToFetch.add(pId);
        }
      }
    });

    if (phaseIdsToFetch.size === 0) return;

    let cancelled = false;
    const fetchPromises = Array.from(phaseIdsToFetch).map(async (pId) => {
      try {
        const phase = await getExperimentPhaseById(pId);
        if (phase && phase.phaseName) {
          cachedPhaseNameMap.set(pId, phase.phaseName);
          return { pId, name: phase.phaseName };
        }
      } catch (err) {
        console.warn(`Could not resolve phase #${pId}:`, err);
      }
      return null;
    });

    Promise.all(fetchPromises).then((results) => {
      if (cancelled) return;
      const updates: Record<number, string> = {};
      results.forEach((r) => {
        if (r) updates[r.pId] = r.name;
      });
      if (Object.keys(updates).length > 0) {
        setDynamicallyLoadedPhases((prev) => ({ ...prev, ...updates }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [constraintReport, phaseMap, dynamicallyLoadedPhases]);

  // 6. Collect Soft Penalty Reasons from BE Fitness Breakdown
  const softPenaltyReasons = useMemo(() => {
    const reasons = new Set<string>();
    const addPenalty = (p?: AdjustmentItem) => {
      if (!p) return;
      const factorLower = (p.factor || "").toLowerCase();
      const typeLower = (p.type || "").toLowerCase();
      const isSoft =
        factorLower.includes("soft") ||
        typeLower.includes("soft") ||
        factorLower.includes("warning") ||
        (typeof p.points === "number" && p.points < 0);
      if (isSoft && p.reason) {
        reasons.add(p.reason.trim().toLowerCase());
      }
    };

    (penalties || []).forEach(addPenalty);
    (fitnessBreakdown?.penalties || []).forEach(addPenalty);
    (fitnessBreakdown?.land?.penalties || []).forEach(addPenalty);
    (fitnessBreakdown?.human?.penalties || []).forEach(addPenalty);
    (fitnessBreakdown?.equipment?.penalties || []).forEach(addPenalty);
    (fitnessBreakdown?.maintenance?.penalties || []).forEach(addPenalty);

    return reasons;
  }, [penalties, fitnessBreakdown]);

  // Clean raw phase names (e.g. "Phase 1:" -> "Phase 1")
  const cleanPhaseName = (rawName?: string): string => {
    if (!rawName) return "";
    let s = rawName.trim();
    s = s.replace(/[:\-–—\s]+$/, "");
    return s;
  };

  const getPhaseDisplay = (id: number): string => {
    const rawName =
      phaseMap.get(id) ||
      cachedPhaseNameMap.get(id) ||
      dynamicallyLoadedPhases[id];
    const name = cleanPhaseName(rawName);
    if (name) {
      return name;
    }
    return `Phase #${id}`;
  };

  // Universal Phase replacement helper
  const formatPhaseReferences = (msg: string): string => {
    if (!msg || typeof msg !== "string") return msg;
    let text = msg;

    // 1. "Phase X has insufficient human resource quantity."
    text = text.replace(
      /Phase\s+(\d+)\s+has\s+insufficient\s+human\s+resource\s+quantity\.?/gi,
      (_, phaseIdStr) => {
        const pId = Number(phaseIdStr);
        const display = getPhaseDisplay(pId);
        return `[${display}] has insufficient human resource fulfillment.`;
      }
    );

    // 2. "Phase X has insufficient equipment quantity."
    text = text.replace(
      /Phase\s+(\d+)\s+has\s+insufficient\s+equipment\s+quantity\.?/gi,
      (_, phaseIdStr) => {
        const pId = Number(phaseIdStr);
        const display = getPhaseDisplay(pId);
        return `[${display}] has insufficient equipment quantity.`;
      }
    );

    // 3. Generic "Phase X" anywhere in message
    text = text.replace(/\bPhase\s+(\d+)\b/gi, (_, phaseIdStr) => {
      const pId = Number(phaseIdStr);
      const display = getPhaseDisplay(pId);
      return `[${display}]`;
    });

    return text;
  };

  // Conflict formatters (English with real names & roles)
  const formatHumanConflict = (msg: string): string => {
    if (!msg || typeof msg !== "string") return msg;
    let text = msg;

    text = text.replace(/Human\s+resource\s+(\d+)\s+is\s+double-booked\.?/gi, (_, idStr) => {
      const id = Number(idStr);
      const info = humanMap.get(id);
      const name = info?.name || `Personnel #${id}`;
      const role = info?.role ? ` (${info.role})` : "";
      return `Personnel ${name}${role} is double-booked across concurrent phases.`;
    });

    text = text.replace(/Human\s+resource\s+(\d+)/gi, (_, idStr) => {
      const id = Number(idStr);
      const info = humanMap.get(id);
      const name = info?.name || `Personnel #${id}`;
      return `Personnel ${name}`;
    });

    text = formatPhaseReferences(text);

    return text;
  };

  const formatEquipmentConflict = (msg: string): string => {
    if (!msg || typeof msg !== "string") return msg;
    let text = msg;

    text = formatPhaseReferences(text);

    text = text.replace(/Equipment\s+([A-Za-z0-9-_]+)\s+overlaps\s+with\s+an\s+existing\s+allocation\.?/gi, (_, code) => {
      return `Equipment unit ${code} overlaps with an existing allocation.`;
    });

    text = text.replace(/Equipment\s+is\s+double-booked\s+inside\s+the\s+candidate\s+plan\.?/gi, () => {
      return `Equipment unit is double-booked across overlapping phases in this candidate plan.`;
    });

    text = text.replace(/Equipment\s+instance\s+(\d+)\s+is\s+double-booked\.?/gi, (_, idStr) => {
      const label = equipMap.get(idStr) || `#${idStr}`;
      return `Equipment unit (${label}) is double-booked across concurrent phases.`;
    });

    text = text.replace(/Equipment\s+(\d+)\s+is\s+double-booked\.?/gi, (_, idStr) => {
      const label = equipMap.get(idStr) || `#${idStr}`;
      return `Equipment unit ${label} is double-booked.`;
    });

    return text;
  };

  const formatLandConflict = (msg: string): string => {
    if (!msg || typeof msg !== "string") return msg;
    let text = msg;

    text = formatPhaseReferences(text);

    text = text.replace(/Land\s+is\s+double-booked\s+inside\s+the\s+candidate\s+plan\.?/gi, () => {
      return `Land plot is double-booked across overlapping phases in this candidate plan.`;
    });

    text = text.replace(/Land\s+([A-Za-z0-9-_]+)\s+is\s+larger\s+than\s+required\s+and\s+may\s+waste\s+area\.?/gi, (_, plotCode) => {
      return `Land plot ${plotCode} is larger than required and may waste area.`;
    });

    return text;
  };

  const formatScheduleConflict = (msg: string): string => {
    if (!msg || typeof msg !== "string") return msg;
    return formatPhaseReferences(msg);
  };

  // Classify each violation into "hard" (critical blocker) vs "soft" (optimization warning)
  const getItemSeverity = (
    category: "land" | "human" | "equipment" | "schedule" | "maintenance",
    rawText: string
  ): "hard" | "soft" => {
    if (!rawText) return "hard";
    const lower = rawText.trim().toLowerCase();
    const cleanLower = lower.replace(/\.+$/, "");

    // 1. Direct match with soft penalty reasons recorded by the BE solver
    if (softPenaltyReasons.has(lower) || softPenaltyReasons.has(cleanLower)) {
      return "soft";
    }

    for (const r of softPenaltyReasons) {
      const cleanR = r.replace(/\.+$/, "");
      if (cleanR.length > 5 && (lower.includes(cleanR) || cleanR.includes(cleanLower))) {
        return "soft";
      }
    }

    // 2. Known soft constraint patterns from GA optimization solver:
    if (
      lower.includes("insufficient human resource") ||
      lower.includes("insufficient equipment quantity") ||
      lower.includes("insufficient quantity") ||
      lower.includes("insufficient") ||
      lower.includes("larger than required") ||
      lower.includes("waste area") ||
      lower.includes("substitute at") ||
      lower.includes("substitute efficiency") ||
      lower.includes("workload balance") ||
      lower.includes("excessive workload") ||
      lower.includes("workload") ||
      lower.includes("soft") ||
      lower.includes("warning") ||
      lower.includes("minor shift") ||
      category === "maintenance"
    ) {
      return "soft";
    }

    // 3. Known hard constraints (strictly physical impossibilities that block approval):
    return "hard";
  };

  const getConflictResolution = (
    rawText: string,
    category: "land" | "human" | "equipment" | "schedule" | "maintenance",
    isHard: boolean
  ): string => {
    const lower = rawText.toLowerCase();

    if (!isHard) {
      if (
        category === "human" ||
        lower.includes("human resource") ||
        lower.includes("human") ||
        lower.includes("personnel")
      ) {
        return "Recommendation: Reassign available personnel or adjust phase staffing requirements.";
      }
      if (
        category === "equipment" ||
        lower.includes("insufficient equipment") ||
        lower.includes("equipment quantity")
      ) {
        return "Recommendation: Allow compatible equipment substitutes or assign additional inventory units.";
      }
      if (lower.includes("larger than required") || lower.includes("waste area")) {
        return "Recommendation: Consider a smaller plot or accept the area buffer to proceed.";
      }
      if (lower.includes("substitute")) {
        return "Recommendation: Plan uses an equipment substitute with valid efficiency; verify acceptable operating threshold.";
      }
      if (category === "maintenance" || lower.includes("maintenance")) {
        return "Recommendation: Schedule maintenance before or after experiment phases to avoid equipment downtime.";
      }
      if (lower.includes("workload") || lower.includes("hours")) {
        return "Recommendation: Balance working hours across team members to prevent fatigue.";
      }
      return "Recommendation: Optimization preference warning; review parameters or proceed if acceptable.";
    }

    // Hard constraints
    if (category === "human" || lower.includes("human") || lower.includes("personnel")) {
      return "Resolution: Adjust personnel assignments to eliminate schedule overlaps across phases.";
    }
    if (category === "land" || lower.includes("land")) {
      return "Resolution: Allocate an available land plot matching required soil type and area size.";
    }
    if (lower.includes("overlaps with an existing allocation")) {
      return "Resolution: Assign another available equipment unit or reschedule phase dates to avoid external conflict.";
    }
    if (lower.includes("double-booked")) {
      return "Resolution: Separate resource unit assignments between concurrent phases.";
    }
    return "Resolution: Mandatory constraint violation must be resolved before plan execution.";
  };

  const renderCategoryBadge = (
    items: string[],
    category: "land" | "human" | "equipment" | "schedule" | "maintenance"
  ) => {
    const hard = items.filter((it) => getItemSeverity(category, it) === "hard").length;
    const soft = items.filter((it) => getItemSeverity(category, it) === "soft").length;

    if (hard > 0 && soft > 0) {
      return (
        <span className="cat-badge-split">
          <span className="cat-badge hard">{hard} Critical Issue{hard > 1 ? "s" : ""}</span>
          <span className="cat-badge soft">{soft} Warning{soft > 1 ? "s" : ""}</span>
        </span>
      );
    }
    if (soft > 0) {
      return <span className="cat-badge soft">{soft} Warning{soft > 1 ? "s" : ""}</span>;
    }
    return <span className="cat-badge hard">{hard} Critical Issue{hard > 1 ? "s" : ""}</span>;
  };

  const renderConflictItem = (
    rawText: string,
    formattedText: string,
    category: "land" | "human" | "equipment" | "schedule" | "maintenance",
    key: number
  ) => {
    const severity = getItemSeverity(category, rawText);
    const isHard = severity === "hard";
    const resolutionText = getConflictResolution(rawText, category, isHard);

    return (
      <li key={key} className={`conflict-item ${severity}`}>
        <div className="conflict-header-row">
          {isHard ? (
            <span className="violation-severity-badge hard">
              <ShieldAlert size={12} />
              CRITICAL ISSUE (HARD CONSTRAINT)
            </span>
          ) : (
            <span className="violation-severity-badge soft">
              <AlertTriangle size={12} />
              WARNING (SOFT CONSTRAINT)
            </span>
          )}
          <span className="conflict-severity-note">
            {isHard
              ? "• Must be resolved: Blocks plan approval & execution"
              : "• Optimization warning: Incurs fitness penalty (-5 pts) • Does not block approval"}
          </span>
        </div>
        <span className="item-text">{formattedText}</span>
        <span className={`action-hint ${severity}`}>
          {resolutionText}
        </span>
      </li>
    );
  };

  // Group raw conflicts
  const landConflicts = constraintReport?.landConflicts ?? [];
  const humanConflicts = constraintReport?.humanConflicts ?? [];
  const equipmentConflicts = constraintReport?.equipmentConflicts ?? [];
  const maintenanceConflicts = constraintReport?.maintenanceConflicts ?? [];
  const skillConflicts = constraintReport?.skillConflicts ?? [];
  const roleConflicts = constraintReport?.roleConflicts ?? [];
  const deadlineConflicts = constraintReport?.deadlineConflicts ?? [];
  const scheduleConflicts = constraintReport?.scheduleConflicts ?? [];

  const allHumanIssues = [
    ...humanConflicts,
    ...roleConflicts.map((c) =>
      c.startsWith("Role") ? c : `[Role Mismatch] ${c}`
    ),
    ...skillConflicts.map((c) =>
      c.startsWith("Skill") ? c : `[Skill Mismatch] ${c}`
    ),
  ];

  const allScheduleIssues = [...deadlineConflicts, ...scheduleConflicts];

  // All combined conflict items for accurate global counting
  const allConflictItems = useMemo(
    () => [
      ...landConflicts.map((item) => ({ item, category: "land" as const })),
      ...allHumanIssues.map((item) => ({ item, category: "human" as const })),
      ...equipmentConflicts.map((item) => ({ item, category: "equipment" as const })),
      ...allScheduleIssues.map((item) => ({ item, category: "schedule" as const })),
      ...maintenanceConflicts.map((item) => ({ item, category: "maintenance" as const })),
    ],
    [
      landConflicts,
      allHumanIssues,
      equipmentConflicts,
      allScheduleIssues,
      maintenanceConflicts,
    ]
  );

  const calculatedHardCount = useMemo(() => {
    return allConflictItems.filter(({ item, category }) => getItemSeverity(category, item) === "hard").length;
  }, [allConflictItems, softPenaltyReasons]);

  const calculatedSoftCount = useMemo(() => {
    return allConflictItems.filter(({ item, category }) => getItemSeverity(category, item) === "soft").length;
  }, [allConflictItems, softPenaltyReasons]);

  const hardViolations = constraintReport?.hardViolationCount ?? calculatedHardCount;
  const softViolations = constraintReport?.softViolationCount ?? calculatedSoftCount;
  const isFeasible =
    constraintReport?.isFeasible ??
    (hardViolations === 0 && conflictCount === 0);

  // Filter items per category based on active filterMode
  const visibleLand = landConflicts.filter((item) =>
    filterMode === "all" ? true : getItemSeverity("land", item) === filterMode
  );
  const visibleHuman = allHumanIssues.filter((item) =>
    filterMode === "all" ? true : getItemSeverity("human", item) === filterMode
  );
  const visibleEquipment = equipmentConflicts.filter((item) =>
    filterMode === "all" ? true : getItemSeverity("equipment", item) === filterMode
  );
  const visibleSchedule = allScheduleIssues.filter((item) =>
    filterMode === "all" ? true : getItemSeverity("schedule", item) === filterMode
  );
  const visibleMaintenance = maintenanceConflicts.filter((item) =>
    filterMode === "all" ? true : getItemSeverity("maintenance", item) === filterMode
  );

  const totalVisibleCount =
    visibleLand.length +
    visibleHuman.length +
    visibleEquipment.length +
    visibleSchedule.length +
    visibleMaintenance.length;

  return (
    <div className="ai-constraint-report-container">
      {/* Feasibility Status Banner */}
      <div
        className={`ai-feasibility-banner ${
          isFeasible ? "feasible" : "infeasible"
        }`}
      >
        <div className="banner-icon">
          {isFeasible ? (
            <CheckCircle2 size={22} className="text-emerald-600" />
          ) : (
            <XCircle size={22} className="text-rose-600" />
          )}
        </div>
        <div className="banner-content">
          <div className="banner-title">
            {isFeasible
              ? "Allocation Plan Feasible"
              : "Allocation Plan Infeasible (Action Required)"}
          </div>
          <p className="banner-desc">
            {isFeasible
              ? "This allocation plan satisfies all mandatory hard constraints and is ready for submission."
              : `Detected ${hardViolations} hard constraint violation(s) and ${softViolations} soft constraint warning(s). Hard violations must be resolved before the plan can proceed.`}
          </p>
        </div>
        <div className="banner-tags">
          <span
            className={`violation-pill hard ${
              hardViolations > 0 ? "has-error" : ""
            }`}
          >
            <strong>{hardViolations}</strong> Hard Violations
          </span>
          <span
            className={`violation-pill soft ${
              softViolations > 0 ? "has-warn" : ""
            }`}
          >
            <strong>{softViolations}</strong> Soft Violations
          </span>
        </div>
      </div>

      {/* Hard vs Soft Explanation Cards */}
      <div className="ai-constraint-types-grid">
        <div className="constraint-type-card hard">
          <div className="card-top">
            <div className="badge-icon red">
              <ShieldAlert size={15} />
            </div>
            <h5>Hard Constraints</h5>
            <span className="count-badge red">{hardViolations} issue(s)</span>
          </div>
          <p className="card-sub">
            Mandatory execution criteria (valid land plots, required roles, skills, and equipment units). Plans cannot execute with unresolved hard violations.
          </p>
        </div>

        <div className="constraint-type-card soft">
          <div className="card-top">
            <div className="badge-icon amber">
              <AlertTriangle size={15} />
            </div>
            <h5>Soft Constraints</h5>
            <span className="count-badge amber">{softViolations} warning(s)</span>
          </div>
          <p className="card-sub">
            Optimization preferences (workload balance, equipment substitute efficiency, schedule shifts). Violations apply penalty points to the fitness score.
          </p>
        </div>
      </div>

      {/* Categorized Conflict Details */}
      <div className="ai-conflict-categories">
        <div className="conflict-section-header">
          <h4 className="section-heading">
            Constraint Violations & Diagnostics by Resource Type
          </h4>

          {/* Interactive Filter Pills */}
          {allConflictItems.length > 0 && (
            <div className="conflict-filter-bar">
              <span className="filter-label">
                <Filter size={12} /> Filter:
              </span>
              <button
                type="button"
                className={`conflict-filter-btn ${filterMode === "all" ? "active" : ""}`}
                onClick={() => setFilterMode("all")}
              >
                All ({allConflictItems.length})
              </button>
              <button
                type="button"
                className={`conflict-filter-btn hard ${filterMode === "hard" ? "active" : ""}`}
                onClick={() => setFilterMode("hard")}
              >
                <ShieldAlert size={12} />
                Critical Issues ({calculatedHardCount})
              </button>
              <button
                type="button"
                className={`conflict-filter-btn soft ${filterMode === "soft" ? "active" : ""}`}
                onClick={() => setFilterMode("soft")}
              >
                <AlertTriangle size={12} />
                Warnings ({calculatedSoftCount})
              </button>
            </div>
          )}
        </div>

        {/* 1. Land Conflicts */}
        {visibleLand.length > 0 && (
          <div className="conflict-category-card land">
            <div className="category-header">
              <div className="cat-title">
                <Layers size={16} className="text-emerald-600" />
                <span>Land Resource Constraints</span>
              </div>
              {renderCategoryBadge(visibleLand, "land")}
            </div>
            <ul className="conflict-list">
              {visibleLand.map((item, idx) =>
                renderConflictItem(
                  item,
                  formatLandConflict(item),
                  "land",
                  idx
                )
              )}
            </ul>
          </div>
        )}

        {/* 2. Human & Role & Skill Conflicts */}
        {visibleHuman.length > 0 && (
          <div className="conflict-category-card human">
            <div className="category-header">
              <div className="cat-title">
                <Users size={16} className="text-emerald-600" />
                <span>Personnel, Role & Skill Constraints</span>
              </div>
              {renderCategoryBadge(visibleHuman, "human")}
            </div>
            <ul className="conflict-list">
              {visibleHuman.map((item, idx) =>
                renderConflictItem(
                  item,
                  formatHumanConflict(item),
                  "human",
                  idx
                )
              )}
            </ul>
          </div>
        )}

        {/* 3. Equipment Conflicts */}
        {visibleEquipment.length > 0 && (
          <div className="conflict-category-card equipment">
            <div className="category-header">
              <div className="cat-title">
                <Wrench size={16} className="text-emerald-600" />
                <span>Equipment & Machinery Constraints</span>
              </div>
              {renderCategoryBadge(visibleEquipment, "equipment")}
            </div>
            <ul className="conflict-list">
              {visibleEquipment.map((item, idx) =>
                renderConflictItem(
                  item,
                  formatEquipmentConflict(item),
                  "equipment",
                  idx
                )
              )}
            </ul>
          </div>
        )}

        {/* 4. Schedule & Timeline Conflicts */}
        {visibleSchedule.length > 0 && (
          <div className="conflict-category-card schedule">
            <div className="category-header">
              <div className="cat-title">
                <Clock size={16} className="text-emerald-600" />
                <span>Schedule & Timeline Constraints</span>
              </div>
              {renderCategoryBadge(visibleSchedule, "schedule")}
            </div>
            <ul className="conflict-list">
              {visibleSchedule.map((item, idx) =>
                renderConflictItem(
                  item,
                  formatScheduleConflict(item),
                  "schedule",
                  idx
                )
              )}
            </ul>
          </div>
        )}

        {/* 5. Maintenance Conflicts */}
        {visibleMaintenance.length > 0 && (
          <div className="conflict-category-card maintenance">
            <div className="category-header">
              <div className="cat-title">
                <Wrench size={16} className="text-emerald-600" />
                <span>Equipment Maintenance Overlap</span>
              </div>
              {renderCategoryBadge(visibleMaintenance, "maintenance")}
            </div>
            <ul className="conflict-list">
              {visibleMaintenance.map((item, idx) =>
                renderConflictItem(
                  item,
                  formatPhaseReferences(item),
                  "maintenance",
                  idx
                )
              )}
            </ul>
          </div>
        )}

        {/* Empty state: No conflicts matching current filter */}
        {totalVisibleCount === 0 && (
          <div className="no-conflicts-box">
            <CheckCircle2 size={32} className="text-emerald-600" />
            <h5>
              {filterMode === "all"
                ? "No Constraint Violations Detected"
                : filterMode === "hard"
                ? "No Critical Blocking Issues Found"
                : "No Soft Constraint Warnings Found"}
            </h5>
            <p>
              {filterMode === "all"
                ? "All land plots, personnel assignments, equipment instances, and schedule dates are fully compatible."
                : filterMode === "hard"
                ? "There are no hard blockers preventing plan approval and execution."
                : "There are no soft optimization penalties detected for this candidate plan."}
            </p>
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="ai-constraint-footer-note">
        <Info size={15} className="text-slate-400" />
        <span>
          <strong>Genetic Algorithm Optimization:</strong> The solver iteratively evaluates resource combinations to eliminate hard constraint violations and maximize the overall fitness score.
        </span>
      </div>
    </div>
  );
};

export default AIConstraintReportCard;
