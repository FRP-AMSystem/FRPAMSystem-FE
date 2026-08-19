import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import { useNotification } from "../../context/NotificationContext";

import { getExperiments } from "../../services/experimentService";
import { getEquipmentInstances } from "../../services/equipmentInstanceService";
import { getHumanResourceProfiles } from "../../services/humanResourceProfileService";
import { getLandResources } from "../../services/landResourceService";
import { getExperimentPhases } from "../../services/experimentPhaseService";
import {
  createExperimentEquipmentRequirement,
  getExperimentEquipmentRequirements,
} from "../../services/experimentEquipmentRequirementService";
import {
  createExperimentHumanRequirement,
  getExperimentHumanRequirements,
} from "../../services/experimentHumanRequirementService";
import {
  createExperimentLandRequirement,
  getExperimentLandRequirements,
} from "../../services/experimentLandRequirementService";
import { createAllocationPlan } from "../../services/allocationPlanService";
import {
  createAllocationEquipmentDetail,
  createAllocationHumanDetail,
  createAllocationLandDetail,
} from "../../services/allocationDetailService";
import { getCurrentUserTokenInfo } from "../../utils/storage";

import type { ExperimentResponse } from "../../types/experiment";
import type { EquipmentInstance } from "../../types/equipmentInstance";
import type { HumanResourceProfile } from "../../types/humanResourceProfile";
import type { LandResource } from "../../types/landResource";
import type { ExperimentPhase } from "../../types/experimentPhase";
import type { ExperimentEquipmentRequirement } from "../../types/experimentEquipmentRequirement";
import type { ExperimentHumanRequirement } from "../../types/experimentHumanRequirement";
import type { ExperimentLandRequirement } from "../../types/experimentLandRequirement";

import "./CreateAllocation.css";

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function convertDateToIso(d?: string | null, endOfDay = false): string {
  if (!d) return new Date().toISOString();
  if (d.includes("T")) return d;
  const clean = d.slice(0, 10);
  return endOfDay ? `${clean}T23:59:59` : `${clean}T00:00:00`;
}

export default function CreateAllocation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sendLocalNotification, fetchUnreadCount } = useNotification();

  const initialExpId = Number(searchParams.get("experimentId")) || 0;

  // Master Data State
  const [allExperiments, setAllExperiments] = useState<ExperimentResponse[]>([]);
  const [selectedExpId, setSelectedExpId] = useState<number>(initialExpId);

  const [availableEquipment, setAvailableEquipment] = useState<EquipmentInstance[]>([]);
  const [humanProfiles, setHumanProfiles] = useState<HumanResourceProfile[]>([]);
  const [landResources, setLandResources] = useState<LandResource[]>([]);

  // Experiment Specific Context
  const [phases, setPhases] = useState<ExperimentPhase[]>([]);
  const [activePhaseId, setActivePhaseId] = useState<number | null>(null);
  const [equipmentReqs, setEquipmentReqs] = useState<ExperimentEquipmentRequirement[]>([]);
  const [humanReqs, setHumanReqs] = useState<ExperimentHumanRequirement[]>([]);
  const [landReqs, setLandReqs] = useState<ExperimentLandRequirement[]>([]);

  // Selection state per phase: phaseId -> Array of chosen item IDs
  const [selectedEquipByPhase, setSelectedEquipByPhase] = useState<Record<number, number[]>>({});
  const [selectedHumansByPhase, setSelectedHumansByPhase] = useState<Record<number, number[]>>({});

  // Land Plot selection: Strictly 1 land plot for the experiment!
  const [selectedLandId, setSelectedLandId] = useState<number | null>(null);

  // UI State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 1. Fetch initial experiments and system inventory
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        const currentUser = getCurrentUserTokenInfo();
        const { userId, fullName, role } = currentUser;
        const isPrivileged = role === "Admin" || role === "Manager";

        const [expRes, equipRes, humanRes, landRes] = await Promise.all([
          getExperiments({
            researcherId: !isPrivileged && userId > 0 ? userId : undefined,
            size: 100,
          }).catch(() => []),
          getEquipmentInstances({ size: 100 }).catch(() => []),
          getHumanResourceProfiles({ size: 100 }).catch(() => []),
          getLandResources({ size: 100 }).catch(() => []),
        ]);

        // Show active experiments filtered by token user if Researcher
        const rawExps = Array.isArray(expRes) ? expRes : (expRes as any)?.items || [];
        const exps = isPrivileged
          ? rawExps
          : rawExps.filter(
              (item: ExperimentResponse) =>
                (userId > 0 && item.researcherId === userId) ||
                (fullName &&
                  (item.researcherName?.toLowerCase().includes(fullName.toLowerCase()) ||
                    item.createdByName?.toLowerCase().includes(fullName.toLowerCase())))
            );
        setAllExperiments(exps);

        // Filter equipment with Available status
        const equips = Array.isArray(equipRes) ? equipRes : (equipRes as any)?.items || [];
        const availEquips = equips.filter(
          (e: EquipmentInstance) => e.status === "Available" || !e.status
        );
        setAvailableEquipment(availEquips);

        // Strictly filter personnel to only Seasonal and Technician roles
        const humans = Array.isArray(humanRes) ? humanRes : (humanRes as any)?.items || [];
        const fieldStaff = humans.filter((hp: HumanResourceProfile) => {
          const r = (hp.roleName || (hp as any)?.role || "").toLowerCase();
          return r.includes("seasonal") || r.includes("technician");
        });
        setHumanProfiles(fieldStaff);

        const lands = Array.isArray(landRes) ? landRes : (landRes as any)?.items || [];
        setLandResources(lands);

        // Determine default selected experiment
        if (initialExpId && exps.some((e: ExperimentResponse) => e.experimentId === initialExpId)) {
          setSelectedExpId(initialExpId);
        } else if (exps.length > 0) {
          setSelectedExpId(exps[0].experimentId);
        }
      } catch (err: any) {
        console.error("Load initial allocation inventory data failed:", err);
        setError("Failed to load live resource inventory.");
      } finally {
        setLoading(false);
      }
    }

    void loadInitialData();
  }, [initialExpId]);

  // 2. When selectedExpId changes, load specific experiment requirements & phases
  useEffect(() => {
    if (!selectedExpId) return;

    async function loadExperimentDetails(id: number) {
      try {
        const [phasesRes, eReqRes, hReqRes, lReqRes] = await Promise.all([
          getExperimentPhases({ experimentId: id, size: 100 }).catch(() => []),
          getExperimentEquipmentRequirements({ experimentId: id, size: 100 }).catch(() => []),
          getExperimentHumanRequirements({ experimentId: id, size: 100 }).catch(() => []),
          getExperimentLandRequirements({ experimentId: id, size: 100 }).catch(() => []),
        ]);

        // Filter strictly to this experiment
        const allP = Array.isArray(phasesRes) ? phasesRes : [];
        const matchedPhases = allP.filter((p) => p.experimentId === id);
        setPhases(matchedPhases);

        // Set default active phase
        if (matchedPhases.length > 0) {
          setActivePhaseId(matchedPhases[0].experimentPhaseId);
        } else {
          setActivePhaseId(null);
        }

        const allE = Array.isArray(eReqRes) ? eReqRes : [];
        setEquipmentReqs(allE.filter((e) => e.experimentId === id));

        const allH = Array.isArray(hReqRes) ? hReqRes : [];
        setHumanReqs(allH.filter((h) => h.experimentId === id));

        const allL = Array.isArray(lReqRes) ? lReqRes : [];
        setLandReqs(allL.filter((l) => l.experimentId === id));

        // Reset phase selections
        setSelectedEquipByPhase({});
        setSelectedHumansByPhase({});
        setSelectedLandId(null);
      } catch (detailErr) {
        console.warn("Could not load experiment requirements for allocation hub:", detailErr);
      }
    }

    void loadExperimentDetails(selectedExpId);
  }, [selectedExpId]);

  const selectedExp = allExperiments.find((e) => e.experimentId === selectedExpId);
  const activePhase = phases.find((p) => p.experimentPhaseId === activePhaseId);

  // Toggle Equipment for current active phase
  const handleToggleEquipment = (eqId: number) => {
    if (!activePhaseId) return;
    setSelectedEquipByPhase((prev) => {
      const currentList = prev[activePhaseId] || [];
      if (currentList.includes(eqId)) {
        return { ...prev, [activePhaseId]: currentList.filter((id) => id !== eqId) };
      } else {
        return { ...prev, [activePhaseId]: [...currentList, eqId] };
      }
    });
  };

  // Toggle Personnel for current active phase
  const handleToggleHuman = (humanId: number) => {
    if (!activePhaseId) return;
    setSelectedHumansByPhase((prev) => {
      const currentList = prev[activePhaseId] || [];
      if (currentList.includes(humanId)) {
        return { ...prev, [activePhaseId]: currentList.filter((id) => id !== humanId) };
      } else {
        return { ...prev, [activePhaseId]: [...currentList, humanId] };
      }
    });
  };

  // Select Land (Strictly 1 Land Plot for the Experiment)
  const handleSelectLand = (landId: number) => {
    setSelectedLandId((prev) => (prev === landId ? null : landId));
  };

  // Calculate totals
  const totalEquipmentCount = Object.values(selectedEquipByPhase).reduce(
    (acc, list) => acc + list.length,
    0
  );
  const totalHumanCount = Object.values(selectedHumansByPhase).reduce(
    (acc, list) => acc + list.length,
    0
  );

  // Save & Submit Allocation Plan (Manual)
  const handleSaveAndSubmitPlan = async () => {
    if (!selectedExpId || !selectedExp) {
      setError("Please select an experiment first.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // 1. Create Allocation Plan with Pending status
      const createdPlan = await createAllocationPlan({
        experimentId: selectedExpId,
        fitnessScore: 85,
        approveStatus: "Pending",
      });

      const planId = (createdPlan as any)?.allocationPlanId || (createdPlan as any)?.id;
      if (!planId) throw new Error("Failed to initialize allocation plan ID.");

      // 2. Create Equipment details per phase
      for (const [pIdStr, eqIds] of Object.entries(selectedEquipByPhase)) {
        const phaseIdNum = Number(pIdStr);
        const pObj = phases.find((p) => p.experimentPhaseId === phaseIdNum);
        const sDate = convertDateToIso(pObj?.expectedStartDate || selectedExp.expectStartDate);
        const eDate = convertDateToIso(pObj?.expectedEndDate || selectedExp.expectEndDate, true);

        for (const eqId of eqIds) {
          const eqObj = availableEquipment.find((e) => e.equipmentInstanceId === eqId);
          let expEqReqId = equipmentReqs.find((er) => er.equipmentTypeId === eqObj?.equipmentTypeId)?.expEquipmentReqId || equipmentReqs[0]?.expEquipmentReqId;
          
          if (!expEqReqId) {
            try {
              const createdEqReq = await createExperimentEquipmentRequirement({
                experimentId: selectedExpId,
                equipmentTypeId: eqObj?.equipmentTypeId || 1,
                quantity: 1,
                allowSubstitute: true,
                minAcceptableEfficiency: eqObj?.efficiencyRate ?? 1,
              });
              expEqReqId = (createdEqReq as any)?.expEquipmentReqId || (createdEqReq as any)?.id;
            } catch {
              expEqReqId = 1;
            }
          }

          try {
            await createAllocationEquipmentDetail({
              allocationPlanId: planId,
              expEquipmentReqId: expEqReqId || 1,
              phaseEquipmentReqId: phaseIdNum,
              allocatedEquipmentTypeId: eqObj?.equipmentTypeId || 1,
              equipmentInstanceId: eqId,
              quantity: 1,
              efficiencyRate: eqObj?.efficiencyRate ?? 1,
              isSubstitute: false,
              startDate: sDate,
              endDate: eDate,
              status: "Allocated",
            });
          } catch (eErr) {
            console.error("Create equipment allocation detail notice:", eErr);
          }
        }
      }

      // 3. Create Human details per phase
      for (const [pIdStr, hIds] of Object.entries(selectedHumansByPhase)) {
        const phaseIdNum = Number(pIdStr);
        const pObj = phases.find((p) => p.experimentPhaseId === phaseIdNum);
        const sDate = convertDateToIso(pObj?.expectedStartDate || selectedExp.expectStartDate);
        const eDate = convertDateToIso(pObj?.expectedEndDate || selectedExp.expectEndDate, true);

        for (const hId of hIds) {
          const hObj = humanProfiles.find((h) => h.humanResourceId === hId);
          let expHReqId = humanReqs[0]?.expHumanReqId;
          
          if (!expHReqId) {
            try {
              const createdHReq = await createExperimentHumanRequirement({
                experimentId: selectedExpId,
                roleId: hObj?.roleId || 1,
                quantity: 1,
                requiredSkillId: null,
                workingHoursPerDay: hObj?.maxWorkingHoursPerDay || 8,
                note: null,
              });
              expHReqId = (createdHReq as any)?.expHumanReqId || (createdHReq as any)?.id;
            } catch {
              expHReqId = 1;
            }
          }

          try {
            await createAllocationHumanDetail({
              allocationPlanId: planId,
              expHumanReqId: expHReqId || 1,
              phaseHumanReqId: phaseIdNum,
              humanResourceId: hId,
              workingHours: hObj?.maxWorkingHoursPerDay || 8,
              startDate: sDate,
              endDate: eDate,
              status: "Allocated",
            });
          } catch (hErr) {
            console.error("Create human allocation detail notice:", hErr);
          }
        }
      }

      // 4. Create Land detail (Single Land Plot)
      if (selectedLandId) {
        const sDate = convertDateToIso(selectedExp.expectStartDate);
        const eDate = convertDateToIso(selectedExp.expectEndDate, true);
        const selLandObj = landResources.find((l) => l.landId === selectedLandId);

        let expLandReqId = landReqs[0]?.expLandReqId;
        if (!expLandReqId) {
          try {
            const createdReq = await createExperimentLandRequirement({
              experimentId: selectedExpId,
              requiredArea: selLandObj?.areaSize || 1000,
              requiredSoilType: selLandObj?.soilType || "Standard Soil",
              note: "Allocated Land Plot",
            });
            expLandReqId = (createdReq as any)?.expLandReqId || (createdReq as any)?.id;
          } catch (lrErr) {
            console.warn("Auto create experiment land requirement notice:", lrErr);
          }
        }

        try {
          await createAllocationLandDetail({
            allocationPlanId: planId,
            landId: selectedLandId,
            expLandReqId: expLandReqId || 1,
            startDate: sDate,
            endDate: eDate,
            status: "Allocated",
          });
        } catch (lErr) {
          console.error("Create land allocation detail error:", lErr);
        }
      }

      // 5. Notify and navigate
      sendLocalNotification({
        title: "Allocation Plan Submitted",
        message: `Allocation plan for Experiment #${selectedExpId} with ${totalEquipmentCount} equipment and ${totalHumanCount} personnel has been submitted for Manager approval!`,
        notificationType: "Success",
        referenceType: "AllocationPlan",
        referenceId: planId,
      });
      void fetchUnreadCount();

      navigate("/allocation", {
        state: {
          message: `Allocation plan for Experiment "${selectedExp.experimentName}" submitted successfully for Manager approval!`,
        },
      });
    } catch (err: any) {
      console.error("Save & submit allocation plan failed:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to submit allocation plan. Please check inputs."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // AI Allocation Handler
  const handleStartAIAllocation = () => {
    if (!selectedExpId) {
      setError("Please select an experiment first.");
      return;
    }
    navigate(`/experiments/${selectedExpId}/ai-suggestions`);
  };

  return (
    <DashboardLayout>
      <div className="create-allocation-page">
        {/* Header */}
        <div className="create-header">
          <div>
            <p className="breadcrumb">Dashboard / Allocations / Resource Allocation Hub</p>
            <h1>Resource Allocation Hub</h1>
            <p>
              Select an experiment, configure resources per phase (Equipment, Seasonal/Technician workforce, and Land Plot), and submit for Manager approval.
            </p>
          </div>

          <button type="button" onClick={() => navigate("/allocation")} className="back-btn">
            <ArrowLeft size={16} /> Back to Allocations
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        {/* Experiment Context Selector Card */}
        <div className="alloc-exp-picker-card">
          <div className="alloc-picker-row">
            <div>
              <label
                htmlFor="experiment-alloc-select"
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                Target Experiment
              </label>
              <select
                id="experiment-alloc-select"
                value={selectedExpId || ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setSelectedExpId(id);
                }}
                className="alloc-picker-select"
              >
                {allExperiments.length === 0 ? (
                  <option value="">No Active Experiments Found</option>
                ) : (
                  allExperiments.map((exp) => (
                    <option key={exp.experimentId} value={exp.experimentId}>
                      #{exp.experimentId} - {exp.experimentName} ({exp.status || "Active"})
                    </option>
                  ))
                )}
              </select>
            </div>

            {selectedExp && (
              <div className="alloc-exp-meta-items">
                <div className="alloc-exp-meta-item">
                  Schedule: <span style={{ color: "#1e293b", fontWeight: 500 }}>{formatDate(selectedExp.expectStartDate)}</span> →{" "}
                  <span style={{ color: "#1e293b", fontWeight: 500 }}>{formatDate(selectedExp.expectEndDate)}</span>
                </div>
                <div className="alloc-exp-meta-item">
                  Deadline: <span style={{ color: "#1e293b", fontWeight: 500 }}>{formatDate(selectedExp.deadline)}</span>
                </div>
                <div className="alloc-exp-meta-item">
                  <span
                    style={{
                      fontSize: "11.5px",
                      fontWeight: 500,
                      padding: "2px 8px",
                      borderRadius: "5px",
                      background: "#f0f9ff",
                      color: "#0369a1",
                      border: "1px solid #e0f2fe",
                    }}
                  >
                    Priority {selectedExp.priority ?? 1}
                  </span>
                </div>
                <div className="alloc-exp-meta-item">
                  <span
                    style={{
                      fontSize: "11.5px",
                      fontWeight: 500,
                      padding: "2px 8px",
                      borderRadius: "5px",
                      background: "#f8fafc",
                      color: "#475569",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    Status: {selectedExp.status || "Submitted"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 1. Experiment Phases Stepper - Allows choosing active phase to allocate */}
        <div className="alloc-phase-nav-card">
          <div className="alloc-phase-nav-header">
            <div>
              <h3>1. Select Experiment Phase ({phases.length} Phases)</h3>
              <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#64748b", fontWeight: 400 }}>
                Click on a phase below to configure equipment and workforce assignments specifically for that execution window.
              </p>
            </div>
          </div>

          {phases.length === 0 ? (
            <p style={{ color: "#64748b", margin: "10px 0 0", fontSize: "13px", fontWeight: 400 }}>
              No phases defined for this experiment. You can proceed with AI Optimization to auto-generate phased schedules.
            </p>
          ) : (
            <div className="alloc-phase-tabs">
              {phases.map((p) => {
                const isSelected = p.experimentPhaseId === activePhaseId;
                const equipCount = selectedEquipByPhase[p.experimentPhaseId]?.length || 0;
                const humanCount = selectedHumansByPhase[p.experimentPhaseId]?.length || 0;

                return (
                  <button
                    key={p.experimentPhaseId}
                    type="button"
                    onClick={() => setActivePhaseId(p.experimentPhaseId)}
                    className={`alloc-phase-tab ${isSelected ? "active" : ""}`}
                  >
                    <span className="alloc-phase-tab-badge">Phase #{p.phaseOrder ?? 1}</span>
                    <div className="alloc-phase-tab-title">{p.phaseName}</div>
                    <div className="alloc-phase-tab-dates">
                      {formatDate(p.expectedStartDate)} → {formatDate(p.expectedEndDate)}
                    </div>
                    {(equipCount > 0 || humanCount > 0) && (
                      <div style={{ marginTop: "3px", fontSize: "11px", fontWeight: 500, color: "#16a34a" }}>
                        {equipCount} machines • {humanCount} staff
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Interactive Phase Resource Workspace Grid */}
        {activePhase ? (
          <div className="alloc-workspace-grid">
            {/* Left: Phase Equipment Allocation */}
            <div className="alloc-section-card">
              <div className="alloc-section-header">
                <div>
                  <h4>Equipment for "{activePhase.phaseName}"</h4>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 400 }}>
                    Select available units to allocate to this phase.
                  </span>
                </div>
                <span className="alloc-selection-count">
                  {selectedEquipByPhase[activePhase.experimentPhaseId]?.length || 0} Selected
                </span>
              </div>

              {availableEquipment.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: "12.5px", margin: "12px 0", fontWeight: 400 }}>
                  {loading ? "Loading available equipment..." : "No available equipment instances found in the system."}
                </p>
              ) : (
                <div className="alloc-items-list">
                  {availableEquipment.map((eq) => {
                    const isChecked = (
                      selectedEquipByPhase[activePhase.experimentPhaseId] || []
                    ).includes(eq.equipmentInstanceId);

                    return (
                      <div
                        key={eq.equipmentInstanceId}
                        onClick={() => handleToggleEquipment(eq.equipmentInstanceId)}
                        className={`alloc-item-row ${isChecked ? "selected" : ""}`}
                      >
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="alloc-item-checkbox"
                          />
                          <div>
                            <div style={{ fontSize: "13px", color: "#0284c7", fontWeight: 550 }}>
                              {eq.assetCode || `EQ-${eq.equipmentInstanceId}`}
                            </div>
                            <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 400 }}>
                              {eq.equipmentTypeName || `Type #${eq.equipmentTypeId}`} • {eq.conditionLevel || "Good"}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "11.5px", fontWeight: 500, color: "#16a34a" }}>
                            {Math.round((eq.efficiencyRate ?? 1) * 100)}% Eff.
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Phase Personnel Allocation (Seasonal & Technician Only) */}
            <div className="alloc-section-card">
              <div className="alloc-section-header">
                <div>
                  <h4>Personnel for "{activePhase.phaseName}"</h4>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 400 }}>
                    Select seasonal/technician workforce for this phase.
                  </span>
                </div>
                <span className="alloc-selection-count">
                  {selectedHumansByPhase[activePhase.experimentPhaseId]?.length || 0} Selected
                </span>
              </div>

              {humanProfiles.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: "12.5px", margin: "12px 0", fontWeight: 400 }}>
                  {loading ? "Loading workforce data..." : "No seasonal workers or field technicians found."}
                </p>
              ) : (
                <div className="alloc-items-list">
                  {humanProfiles.map((hp) => {
                    const isChecked = (
                      selectedHumansByPhase[activePhase.experimentPhaseId] || []
                    ).includes(hp.humanResourceId);

                    return (
                      <div
                        key={hp.humanResourceId}
                        onClick={() => handleToggleHuman(hp.humanResourceId)}
                        className={`alloc-item-row ${isChecked ? "selected" : ""}`}
                      >
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="alloc-item-checkbox"
                          />
                          <div>
                            <div style={{ fontSize: "13px", color: "#1e293b", fontWeight: 550 }}>
                              {hp.fullName || `Staff #${hp.userId || hp.humanResourceId}`}
                            </div>
                            <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 400 }}>
                              <span style={{ fontWeight: 500, color: "#7e22ce", marginRight: "6px" }}>
                                {hp.roleName || (hp as any)?.role || "Technician"}
                              </span>
                              • {hp.maxWorkingHoursPerDay ?? 8} hrs/day
                            </div>
                          </div>
                        </div>

                        <div>
                          {Array.isArray((hp as any)?.skills) && (hp as any).skills.length > 0 ? (
                            <span style={{ fontSize: "11px", background: "#f0f9ff", color: "#0369a1", padding: "2px 6px", borderRadius: "4px", border: "1px solid #e0f2fe", fontWeight: 500 }}>
                              {typeof (hp as any).skills[0] === "string" ? (hp as any).skills[0] : (hp as any).skills[0]?.skillName}
                            </span>
                          ) : (
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>General</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* 3. Experiment Land Plot Selection (Strictly 1 Plot Allowed) */}
        <div className="alloc-section-card full-width" style={{ marginBottom: "20px" }}>
          <div className="alloc-section-header">
            <div>
              <h4>3. Experiment Land Plot (Strictly Max 1 Plot)</h4>
              <span style={{ fontSize: "12px", color: "#b45309", fontWeight: 450 }}>
                Mỗi Experiment chỉ được phép phân bổ tối đa 01 thửa đất duy nhất cho toàn bộ chu kỳ thí nghiệm.
              </span>
            </div>
            {selectedLandId && (
              <span className="alloc-selection-count">
                Plot #{landResources.find((l) => l.landId === selectedLandId)?.landCode || selectedLandId} Selected
              </span>
            )}
          </div>

          {landResources.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "12.5px", margin: "12px 0", fontWeight: 400 }}>
              {loading ? "Loading land plots..." : "No available land plots found in the system."}
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
              {landResources.map((land) => {
                const isSelected = selectedLandId === land.landId;

                return (
                  <div
                    key={land.landId}
                    onClick={() => handleSelectLand(land.landId)}
                    className={`alloc-land-row ${isSelected ? "selected" : ""}`}
                  >
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <input
                        type="radio"
                        name="land-radio-selection"
                        checked={isSelected}
                        onChange={() => {}}
                        className="alloc-land-radio"
                      />
                      <div>
                        <div style={{ fontSize: "13px", color: "#15803d", fontWeight: 550 }}>
                          {land.landCode || `Plot #${land.landId}`}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 400 }}>
                          {land.soilType || "Standard Soil"} • {land.areaSize?.toLocaleString() || "-"} m²
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="badge-available">Available</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Bottom Summary Bar & Submit Action */}
        <div className="alloc-summary-card">
          <div className="alloc-summary-stats">
            <div className="alloc-stat-pill">
              Equipment Units: <strong>{totalEquipmentCount}</strong>
            </div>
            <div className="alloc-stat-pill">
              Field Workforce: <strong>{totalHumanCount}</strong>
            </div>
            <div className="alloc-stat-pill">
              Land Plot:{" "}
              <strong>
                {selectedLandId
                  ? landResources.find((l) => l.landId === selectedLandId)?.landCode || "Selected (1)"
                  : "None (0/1)"}
              </strong>
            </div>
          </div>

          <div className="alloc-action-buttons">
            <button
              type="button"
              onClick={handleStartAIAllocation}
              disabled={!selectedExpId}
              className="alloc-btn-manual"
            >
              Use AI Suggestion Optimizer
            </button>

            <button
              type="button"
              onClick={() => void handleSaveAndSubmitPlan()}
              disabled={submitting || !selectedExpId}
              className="alloc-btn-ai"
            >
              {submitting ? "Submitting Plan..." : "Save & Submit Allocation Plan"}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}