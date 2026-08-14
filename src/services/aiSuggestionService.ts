import api from "./api";
import type {
  AISuggestionInput,
  AISuggestionPlan,
  AISuggestionResponse,
} from "../types/aiSuggestion";

/**
 * Formats ISO date or raw date string to DD/MM/YYYY
 */
function formatDateShort(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * Calculates date offsets in ISO format string (YYYY-MM-DD)
 */
function addDays(baseDateStr: string, days: number): string {
  const base = baseDateStr ? new Date(baseDateStr) : new Date();
  if (Number.isNaN(base.getTime())) return new Date().toISOString().split("T")[0];
  base.setDate(base.getDate() + days);
  return base.toISOString().split("T")[0];
}

function calculateDiffDays(startDateStr: string, endDateStr: string): number {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 30;
  const diffTime = Math.max(0, end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 30;
}

/**
 * Helper to generate 5 AI Plan suggestions in RAM
 */
function generateMockAISuggestions(input: AISuggestionInput): AISuggestionResponse {
  const baseStart = input.experiment.expectStartDate || new Date().toISOString().split("T")[0];
  const baseEnd = input.experiment.expectEndDate || addDays(baseStart, 30);
  const totalDays = calculateDiffDays(baseStart, baseEnd);

  const formattedStart = formatDateShort(baseStart);
  const formattedEnd = formatDateShort(baseEnd);

  const rawPhases = input.experimentPhases.length > 0 ? input.experimentPhases : [
    { phaseName: "Initial Preparation & Soil Sampling", phaseDescription: "Baseline field survey and site setup", phaseOrder: 1, expectedStartDate: baseStart, expectedEndDate: addDays(baseStart, Math.floor(totalDays * 0.3)), status: "Planned" as const },
    { phaseName: "Treatment Execution & Monitoring", phaseDescription: "Apply treatment regimens and log daily sensor data", phaseOrder: 2, expectedStartDate: addDays(baseStart, Math.floor(totalDays * 0.3) + 1), expectedEndDate: addDays(baseStart, Math.floor(totalDays * 0.8)), status: "Planned" as const },
    { phaseName: "Data Synthesis & Site Cleanup", phaseDescription: "Final specimen collection and site restoration", phaseOrder: 3, expectedStartDate: addDays(baseStart, Math.floor(totalDays * 0.8) + 1), expectedEndDate: baseEnd, status: "Planned" as const },
  ];

  const rawEquip = input.equipmentRequirements.length > 0 ? input.equipmentRequirements : [
    { equipmentTypeId: 1, equipmentTypeName: "Soil Analysis Kit", quantity: 2, allowSubstitute: true, minAcceptableEfficiency: 85, note: "Calibrated" },
  ];

  const rawHuman = input.humanRequirements.length > 0 ? input.humanRequirements : [
    { roleId: 3, roleName: "Researcher", quantity: 1, requiredSkillId: null, requiredSkillName: "Field Survey", workingHoursPerDay: 8, note: "Lead investigator" },
  ];

  const rawLand = input.landRequirements.length > 0 ? input.landRequirements : [
    { requiredArea: 500, requiredSoilType: "Sandy Loam", note: "Primary plot" },
  ];

  const suggestions: AISuggestionPlan[] = [
    {
      id: "ai-plan-1",
      title: "Balanced Optimization Plan",
      strategyBadge: "Recommended",
      description: "Standard balanced approach optimizing timeline risk with safety margins for equipment and human effort.",
      estimatedDurationDays: totalDays,
      totalResourceScore: 92,
      rationale: [
        "Distributes workload evenly across 3 distinct phases.",
        "Includes a 15% safety buffer for weather-dependent field sampling.",
        "Optimal equipment utilization avoiding bottleneck schedules."
      ],
      changesSummary: [
        {
          field: "Timeline",
          from: `${totalDays} Days (${formattedStart} → ${formattedEnd})`,
          to: `${totalDays} Days (Balanced across 3 phases)`
        },
        {
          field: "Equipment Requirements",
          from: rawEquip.map((e) => `${e.equipmentTypeName || "Equipment"} Qty: ${e.quantity}`).join(", ") || "Baseline Equipment",
          to: rawEquip.map((e) => `${e.equipmentTypeName || "Equipment"} Qty: ${Math.max(1, e.quantity)} (Min Eff: 80%)`).join(", ")
        },
        {
          field: "Human Resources",
          from: rawHuman.map((h) => `${h.roleName || "Personnel"} Qty: ${h.quantity}`).join(", ") || "Baseline Personnel",
          to: rawHuman.map((h) => `${h.roleName || "Personnel"} Qty: ${Math.max(1, h.quantity)} (8h/day)`).join(", ")
        },
        {
          field: "Land Area",
          from: rawLand.map((l) => `${l.requiredArea} m²`).join(", ") || "500 m²",
          to: rawLand.map((l) => `${l.requiredArea} m² (Standard plot)`).join(", ") || "500 m²"
        }
      ],
      experimentPhases: rawPhases.map((p, idx) => ({
        phaseName: p.phaseName,
        phaseDescription: p.phaseDescription || `Optimized execution phase ${idx + 1}`,
        phaseOrder: idx + 1,
        expectedStartDate: formatDateShort(p.expectedStartDate || baseStart),
        expectedEndDate: formatDateShort(p.expectedEndDate || baseEnd),
        status: "Planned"
      })),
      equipmentRequirements: rawEquip.map((e) => ({
        equipmentTypeId: e.equipmentTypeId,
        equipmentTypeName: e.equipmentTypeName || "Equipment",
        quantity: Math.max(1, e.quantity),
        allowSubstitute: true,
        minAcceptableEfficiency: Math.max(70, e.minAcceptableEfficiency || 80),
        note: e.note || "Standard allocation"
      })),
      humanRequirements: rawHuman.map((h) => ({
        roleId: h.roleId,
        roleName: h.roleName || "Personnel",
        quantity: Math.max(1, h.quantity),
        requiredSkillId: h.requiredSkillId,
        requiredSkillName: h.requiredSkillName,
        workingHoursPerDay: h.workingHoursPerDay || 8,
        note: h.note || "Standard schedule"
      })),
      landRequirements: rawLand.map((l) => ({
        requiredArea: l.requiredArea,
        requiredSoilType: l.requiredSoilType,
        note: l.note
      }))
    },
    {
      id: "ai-plan-2",
      title: "Fast-Track Accelerated Schedule",
      strategyBadge: "Fastest Execution",
      description: "Compresses total duration by overlapping preparation and field deployment phases with increased personnel capacity.",
      estimatedDurationDays: Math.max(5, Math.floor(totalDays * 0.75)),
      totalResourceScore: 85,
      rationale: [
        "Reduces total timeline by approximately 25%.",
        "Increases human resource staffing to enable parallel task execution.",
        "Requires high-efficiency equipment readiness."
      ],
      changesSummary: [
        {
          field: "Timeline",
          from: `${totalDays} Days (${formattedStart} → ${formattedEnd})`,
          to: `${Math.max(5, Math.floor(totalDays * 0.75))} Days (25% faster via task overlap)`
        },
        {
          field: "Equipment Requirements",
          from: rawEquip.map((e) => `${e.equipmentTypeName || "Equipment"} Qty: ${e.quantity}`).join(", ") || "Baseline Equipment",
          to: rawEquip.map((e) => `${e.equipmentTypeName || "Equipment"} Qty: ${e.quantity + 1} (High Eff: 90% required)`).join(", ")
        },
        {
          field: "Human Resources",
          from: rawHuman.map((h) => `${h.roleName || "Personnel"} Qty: ${h.quantity} (8h/day)`).join(", ") || "Baseline Personnel",
          to: rawHuman.map((h) => `${h.roleName || "Personnel"} Qty: ${h.quantity + 1} (10h/day shift)`).join(", ")
        },
        {
          field: "Land Area",
          from: rawLand.map((l) => `${l.requiredArea} m²`).join(", ") || "500 m²",
          to: rawLand.map((l) => `${l.requiredArea} m² (High-intensity plot usage)`).join(", ") || "500 m²"
        }
      ],
      experimentPhases: rawPhases.map((p, idx) => {
        const compressedStart = addDays(baseStart, Math.floor((idx * totalDays * 0.75) / rawPhases.length));
        const compressedEnd = addDays(compressedStart, Math.max(2, Math.floor((totalDays * 0.75) / rawPhases.length)));
        return {
          phaseName: `${p.phaseName} (Accelerated)`,
          phaseDescription: `${p.phaseDescription || "Accelerated execution phase"}. Overlapped tasks.`,
          phaseOrder: idx + 1,
          expectedStartDate: formatDateShort(compressedStart),
          expectedEndDate: formatDateShort(compressedEnd),
          status: "Planned"
        };
      }),
      equipmentRequirements: rawEquip.map((e) => ({
        equipmentTypeId: e.equipmentTypeId,
        equipmentTypeName: e.equipmentTypeName || "Equipment",
        quantity: Math.max(2, e.quantity + 1),
        allowSubstitute: false,
        minAcceptableEfficiency: 90,
        note: `${e.note || ""} (Requires high-efficiency performance)`
      })),
      humanRequirements: rawHuman.map((h) => ({
        roleId: h.roleId,
        roleName: h.roleName || "Personnel",
        quantity: h.quantity + 1,
        requiredSkillId: h.requiredSkillId,
        requiredSkillName: h.requiredSkillName,
        workingHoursPerDay: 10,
        note: `${h.note || ""} (Accelerated 10h/day shift)`
      })),
      landRequirements: rawLand.map((l) => ({
        requiredArea: l.requiredArea,
        requiredSoilType: l.requiredSoilType,
        note: l.note
      }))
    },
    {
      id: "ai-plan-3",
      title: "Resource-Efficient Plan",
      strategyBadge: "Cost & Resource Saver",
      description: "Minimizes equipment overlap and reduces required staff hours by staggering phase starts.",
      estimatedDurationDays: Math.floor(totalDays * 1.15),
      totalResourceScore: 95,
      rationale: [
        "Lowers overall equipment footprint by sequential utilization.",
        "Ideal for tight equipment availability windows.",
        "Slightly extended duration in exchange for maximum cost efficiency."
      ],
      changesSummary: [
        {
          field: "Timeline",
          from: `${totalDays} Days (${formattedStart} → ${formattedEnd})`,
          to: `${Math.floor(totalDays * 1.15)} Days (Staggered sequential execution)`
        },
        {
          field: "Equipment Requirements",
          from: rawEquip.map((e) => `${e.equipmentTypeName || "Equipment"} Qty: ${e.quantity}`).join(", ") || "Baseline Equipment",
          to: rawEquip.map((e) => `${e.equipmentTypeName || "Equipment"} Qty: ${Math.max(1, e.quantity)} (Sequential sharing)`).join(", ")
        },
        {
          field: "Human Resources",
          from: rawHuman.map((h) => `${h.roleName || "Personnel"} Qty: ${h.quantity} (8h/day)`).join(", ") || "Baseline Personnel",
          to: rawHuman.map((h) => `${h.roleName || "Personnel"} Qty: ${Math.max(1, h.quantity)} (6h/day shift)`).join(", ")
        },
        {
          field: "Land Area",
          from: rawLand.map((l) => `${l.requiredArea} m²`).join(", ") || "500 m²",
          to: rawLand.map((l) => `${l.requiredArea} m² (Staggered plot usage)`).join(", ") || "500 m²"
        }
      ],
      experimentPhases: rawPhases.map((p, idx) => {
        const staggeredStart = addDays(baseStart, Math.floor((idx * totalDays * 1.15) / rawPhases.length));
        const staggeredEnd = addDays(staggeredStart, Math.floor((totalDays * 1.15) / rawPhases.length));
        return {
          phaseName: p.phaseName,
          phaseDescription: `${p.phaseDescription || "Sequential phase execution"}. Zero resource contention.`,
          phaseOrder: idx + 1,
          expectedStartDate: formatDateShort(staggeredStart),
          expectedEndDate: formatDateShort(staggeredEnd),
          status: "Planned"
        };
      }),
      equipmentRequirements: rawEquip.map((e) => ({
        equipmentTypeId: e.equipmentTypeId,
        equipmentTypeName: e.equipmentTypeName || "Equipment",
        quantity: Math.max(1, e.quantity),
        allowSubstitute: true,
        minAcceptableEfficiency: 75,
        note: `${e.note || ""} (Sequential sharing)`
      })),
      humanRequirements: rawHuman.map((h) => ({
        roleId: h.roleId,
        roleName: h.roleName || "Personnel",
        quantity: Math.max(1, h.quantity),
        requiredSkillId: h.requiredSkillId,
        requiredSkillName: h.requiredSkillName,
        workingHoursPerDay: 6,
        note: `${h.note || ""} (6h/day standard shift)`
      })),
      landRequirements: rawLand.map((l) => ({
        requiredArea: l.requiredArea,
        requiredSoilType: l.requiredSoilType,
        note: l.note
      }))
    },
    {
      id: "ai-plan-4",
      title: "High-Precision Soil & Quality Plan",
      strategyBadge: "Maximum Accuracy",
      description: "Allocates additional verification and sub-sampling buffer periods to maximize research data fidelity.",
      estimatedDurationDays: Math.floor(totalDays * 1.1),
      totalResourceScore: 88,
      rationale: [
        "Adds dedicated validation checkpoints between experiment phases.",
        "Enforces strict equipment efficiency standards (>= 90%).",
        "Recommended for high-impact publishing research."
      ],
      changesSummary: [
        {
          field: "Timeline",
          from: `${totalDays} Days (${formattedStart} → ${formattedEnd})`,
          to: `${Math.floor(totalDays * 1.1)} Days (Includes verification & quality audit buffers)`
        },
        {
          field: "Equipment Requirements",
          from: rawEquip.map((e) => `${e.equipmentTypeName || "Equipment"} (Min Eff: ${e.minAcceptableEfficiency || 80}%)`).join(", ") || "Baseline Equipment",
          to: rawEquip.map((e) => `${e.equipmentTypeName || "Equipment"} (Min Eff: 95% High Precision)`).join(", ")
        },
        {
          field: "Human Resources",
          from: rawHuman.map((h) => `${h.roleName || "Personnel"} Qty: ${h.quantity}`).join(", ") || "Baseline Personnel",
          to: rawHuman.map((h) => `${h.roleName || "Personnel"} Qty: ${h.quantity} (Data Audit Emphasis)`).join(", ")
        },
        {
          field: "Land Area",
          from: rawLand.map((l) => `${l.requiredArea} m²`).join(", ") || "500 m²",
          to: rawLand.map((l) => `${Math.ceil(l.requiredArea * 1.1)} m² (+10% research buffer zone)`).join(", ") || "550 m²"
        }
      ],
      experimentPhases: rawPhases.flatMap((p, idx) => [
        {
          phaseName: p.phaseName,
          phaseDescription: p.phaseDescription || "Primary research phase",
          phaseOrder: idx * 2 + 1,
          expectedStartDate: formatDateShort(p.expectedStartDate || baseStart),
          expectedEndDate: formatDateShort(p.expectedEndDate || baseEnd),
          status: "Planned" as const
        }
      ]),
      equipmentRequirements: rawEquip.map((e) => ({
        equipmentTypeId: e.equipmentTypeId,
        equipmentTypeName: e.equipmentTypeName || "Equipment",
        quantity: Math.max(1, e.quantity),
        allowSubstitute: false,
        minAcceptableEfficiency: 95,
        note: "High precision calibration required"
      })),
      humanRequirements: rawHuman.map((h) => ({
        roleId: h.roleId,
        roleName: h.roleName || "Personnel",
        quantity: h.quantity,
        requiredSkillId: h.requiredSkillId,
        requiredSkillName: h.requiredSkillName,
        workingHoursPerDay: 8,
        note: "Data audit & quality control emphasis"
      })),
      landRequirements: rawLand.map((l) => ({
        requiredArea: Math.ceil(l.requiredArea * 1.1),
        requiredSoilType: l.requiredSoilType,
        note: `${l.note || ""} (Includes 10% buffer zone)`
      }))
    },
    {
      id: "ai-plan-5",
      title: "Adaptive Risk-Mitigated Plan",
      strategyBadge: "High Reliability",
      description: "Integrates flexible equipment substitution permissions and backup land plot allocations to safeguard against field disruptions.",
      estimatedDurationDays: totalDays,
      totalResourceScore: 90,
      rationale: [
        "Allows 100% equipment substitution to eliminate single-point-of-failure bottlenecks.",
        "Includes contingency buffer for weather delays.",
        "Flexible working hours to accommodate field availability."
      ],
      changesSummary: [
        {
          field: "Timeline",
          from: `${totalDays} Days (${formattedStart} → ${formattedEnd})`,
          to: `${totalDays} Days (Includes weather delay contingency)`
        },
        {
          field: "Equipment Requirements",
          from: rawEquip.map((e) => `${e.equipmentTypeName || "Equipment"} (No substitution)`).join(", ") || "Baseline Equipment",
          to: rawEquip.map((e) => `${e.equipmentTypeName || "Equipment"} (100% substitution fallback)`).join(", ")
        },
        {
          field: "Human Resources",
          from: rawHuman.map((h) => `${h.roleName || "Personnel"} (Fixed 8h shift)`).join(", ") || "Baseline Personnel",
          to: rawHuman.map((h) => `${h.roleName || "Personnel"} (Flexible shift schedule)`).join(", ")
        },
        {
          field: "Land Area",
          from: rawLand.map((l) => `${l.requiredArea} m²`).join(", ") || "500 m²",
          to: rawLand.map((l) => `${l.requiredArea} m² (+Backup plot registered)`).join(", ") || "500 m²"
        }
      ],
      experimentPhases: rawPhases.map((p, idx) => ({
        phaseName: `${p.phaseName} (Adaptive)`,
        phaseDescription: p.phaseDescription || "Adaptive phase execution with contingency windows",
        phaseOrder: idx + 1,
        expectedStartDate: formatDateShort(p.expectedStartDate || baseStart),
        expectedEndDate: formatDateShort(p.expectedEndDate || baseEnd),
        status: "Planned"
      })),
      equipmentRequirements: rawEquip.map((e) => ({
        equipmentTypeId: e.equipmentTypeId,
        equipmentTypeName: e.equipmentTypeName || "Equipment",
        quantity: e.quantity,
        allowSubstitute: true,
        minAcceptableEfficiency: 70,
        note: "Substitution fallback enabled"
      })),
      humanRequirements: rawHuman.map((h) => ({
        roleId: h.roleId,
        roleName: h.roleName || "Personnel",
        quantity: h.quantity,
        requiredSkillId: h.requiredSkillId,
        requiredSkillName: h.requiredSkillName,
        workingHoursPerDay: 8,
        note: "Flexible schedule"
      })),
      landRequirements: rawLand.map((l) => ({
        requiredArea: l.requiredArea,
        requiredSoilType: l.requiredSoilType,
        note: `${l.note || ""} (Backup plot registered)`
      }))
    }
  ];

  return { suggestions };
}

/**
 * Service function to generate AI experiment plan suggestions in RAM.
 * Generates 5 optimized plans based on experiment parameters.
 */
export async function generateAISuggestions(
  input: AISuggestionInput
): Promise<AISuggestionResponse> {
  // Simulate AI computation time
  await new Promise((resolve) => setTimeout(resolve, 500));
  return generateMockAISuggestions(input);
}
