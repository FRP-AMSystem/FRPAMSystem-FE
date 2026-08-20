import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import axios from "axios";

import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Layers3,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Users,
  Wrench,
  XCircle,
  X,
  Clock3,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import { useNotification } from "../../context/NotificationContext";

import {
  getExperimentById,
  submitExperiment,
  updateExperiment,
} from "../../services/experimentService";

import {
  createAllocationPlan,
  getAllocationPlans,
  approveAllocationPlan,
  rejectAllocationPlan,
} from "../../services/allocationPlanService";

import {
  createExperimentPhase,
  deleteExperimentPhase,
  getExperimentPhases,
} from "../../services/experimentPhaseService";

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

import { generateAISuggestions } from "../../services/aiSuggestionService";
import type {
  AISuggestionInput,
  AISuggestionPlan,
} from "../../types/aiSuggestion";
import type { ExperimentEquipmentRequirement } from "../../types/experimentEquipmentRequirement";
import type { ExperimentHumanRequirement } from "../../types/experimentHumanRequirement";
import type { ExperimentLandRequirement } from "../../types/experimentLandRequirement";

import { PlanningMethodSelector } from "./components/PlanningMethodSelector";
import { AISuggestionList } from "./components/AISuggestionList";

import type {
  ExperimentResponse,
  ExperimentStatus,
} from "../../types/experiment";

import type {
  ExperimentPhase,
  ExperimentPhaseStatus,
} from "../../types/experimentPhase";

import "./ExperimentDetail.css";
import "./ExperimentPhaseSection.css";
import "./PlanningWizard.css";

type Role =
  | "Admin"
  | "Manager"
  | "Researcher"
  | "Technician" | "Student" | "Seasonal";

const priorityLabels: Record<
  number,
  string
> = {
  0: "Low",
  1: "Medium",
  2: "High",
  3: "Urgent",
};



function formatDate(
  value?: string | null
): string {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return date.toLocaleDateString(
    "vi-VN"
  );
}

function formatDateTime(
  value?: string | null
): string {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return date.toLocaleString(
    "vi-VN"
  );
}

function getErrorMessage(
  error: unknown
): string {
  if (
    axios.isAxiosError(
      error
    )
  ) {
    const responseData =
      error.response?.data as
      | {
        message?: string;
        error?: string;
        title?: string;
        errors?: Record<
          string,
          string[]
        >;
      }
      | undefined;

    if (
      responseData?.errors
    ) {
      return Object.values(
        responseData.errors
      )
        .flat()
        .join(" ");
    }

    if (
      error.response?.status ===
      401
    ) {
      return "Your login session is invalid or expired. Please sign in again.";
    }

    if (
      error.response?.status ===
      403
    ) {
      return "You do not have permission to perform this action.";
    }

    return (
      responseData?.message ||
      responseData?.error ||
      responseData?.title ||
      error.message ||
      "Unable to complete the request."
    );
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return "Unable to complete the request.";
}

function formatToUtcIso(dateStr?: string | null): string {
  if (!dateStr) return new Date().toISOString();
  if (dateStr.includes("T")) return dateStr;
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}T00:00:00.000Z`;
    }
  }
  return `${dateStr}T00:00:00.000Z`;
}

function getExperimentStatusLabel(
  status?: ExperimentStatus | string | null
): string {
  switch (status) {
    case "Draft":
      return "Draft";

    case "Submitted":
      return "Submitted";

    case "Planning":
      return "Planning";

    case "Ready":
      return "Ready";

    case "Running":
      return "Running";

    case "Completed":
      return "Completed";

    case "Cancelled":
      return "Cancelled";

    default:
      return status || "-";
  }
}

function getExperimentStatusClassName(
  status?: ExperimentStatus | string | null
): string {
  switch (status) {
    case "Submitted":
      return "experiment-status experiment-status-submitted";

    case "Planning":
      return "experiment-status experiment-status-planning";

    case "Ready":
      return "experiment-status experiment-status-ready";

    case "Running":
      return "experiment-status experiment-status-running";

    case "Completed":
      return "experiment-status experiment-status-completed";

    case "Cancelled":
      return "experiment-status experiment-status-cancelled";

    case "Draft":
    default:
      return "experiment-status experiment-status-draft";
  }
}

function getStatusLabel(
  status?: ExperimentPhaseStatus | string | null
): string {
  switch (status) {
    case "InProgress":
      return "In Progress";

    case "Completed":
      return "Completed";

    case "Cancelled":
      return "Cancelled";

    case "Planned":
      return "Planned";

    default:
      return status || "-";
  }
}

function getStatusClassName(
  status?: ExperimentPhaseStatus | string | null
): string {
  switch (status) {
    case "InProgress":
      return "experiment-phase-status experiment-phase-status-progress";

    case "Completed":
      return "experiment-phase-status experiment-phase-status-completed";

    case "Cancelled":
      return "experiment-phase-status experiment-phase-status-cancelled";

    case "Planned":
    default:
      return "experiment-phase-status experiment-phase-status-planned";
  }
}

function normalizePhaseList(
  response: unknown
): ExperimentPhase[] {
  if (
    Array.isArray(response)
  ) {
    return response as ExperimentPhase[];
  }

  if (
    typeof response ===
    "object" &&
    response !== null
  ) {
    const objectResponse =
      response as {
        items?: unknown;
        data?: unknown;
      };

    if (
      Array.isArray(
        objectResponse.items
      )
    ) {
      return objectResponse.items as ExperimentPhase[];
    }

    if (
      Array.isArray(
        objectResponse.data
      )
    ) {
      return objectResponse.data as ExperimentPhase[];
    }

    if (
      typeof objectResponse.data ===
      "object" &&
      objectResponse.data !== null
    ) {
      const nestedData =
        objectResponse.data as {
          items?: unknown;
        };

      if (
        Array.isArray(
          nestedData.items
        )
      ) {
        return nestedData.items as ExperimentPhase[];
      }
    }
  }

  return [];
}

function canSubmitExperimentStatus(
  status?: string | null
): boolean {
  if (!status) {
    return true;
  }

  return (
    status === "Draft" ||
    status === "Created"
  );
}

export default function ExperimentDetail() {
  const {
    id,
  } = useParams<{
    id: string;
  }>();

  const navigate =
    useNavigate();

  const experimentId =
    Number(id);

  const storedRole = localStorage.getItem("role");

  const role: Role =
    storedRole === "Admin" ||
      storedRole === "Manager" ||
      storedRole === "Researcher" ||
      storedRole === "Technician" ||
      (storedRole === "Student" || storedRole === "Seasonal")
      ? storedRole
      : "Seasonal";

  const canManageExperiment =
    role === "Admin" || role === "Manager" || role === "Researcher";

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    experiment,
    setExperiment,
  ] = useState<ExperimentResponse | null>(
    null
  );

  const { sendLocalNotification, fetchUnreadCount } = useNotification();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionProcessing, setActionProcessing] = useState(false);

  const isManagerOrAdmin = role === "Admin" || role === "Manager";
  const isResearcher = role === "Researcher";
  const isSubmittedOrPending =
    experiment?.status === "Submitted" ||
    experiment?.status === "Pending";
  const canApproveReject = isManagerOrAdmin && isSubmittedOrPending;

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    phases,
    setPhases,
  ] = useState<
    ExperimentPhase[]
  >([]);

  const [
    loadingPhases,
    setLoadingPhases,
  ] = useState(true);

  const [
    phaseError,
    setPhaseError,
  ] = useState("");

  const [
    deletingPhaseId,
    setDeletingPhaseId,
  ] = useState<
    number | null
  >(null);

  // Requirements & AI Planning States
  const [equipReqs, setEquipReqs] = useState<ExperimentEquipmentRequirement[]>([]);
  const [humanReqs, setHumanReqs] = useState<ExperimentHumanRequirement[]>([]);
  const [landReqs, setLandReqs] = useState<ExperimentLandRequirement[]>([]);

  const [showMethodSelector, setShowMethodSelector] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestionPlan[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const loadExperiment =
    useCallback(async () => {
      if (
        !id ||
        !Number.isInteger(
          experimentId
        ) ||
        experimentId <= 0
      ) {
        setError(
          "Invalid experiment ID."
        );

        setLoading(false);

        return;
      }

      try {
        setLoading(true);
        setError("");

        const data =
          await getExperimentById(
            experimentId
          );

        setExperiment(data);
      } catch (loadError) {
        console.error(
          "Load experiment failed:",
          loadError
        );

        setExperiment(null);

        setError(
          getErrorMessage(
            loadError
          )
        );
      } finally {
        setLoading(false);
      }
    }, [
      id,
      experimentId,
    ]);

  const loadExperimentPhases =
    useCallback(async () => {
      if (
        !Number.isInteger(
          experimentId
        ) ||
        experimentId <= 0
      ) {
        setLoadingPhases(false);

        return;
      }

      try {
        setLoadingPhases(true);
        setPhaseError("");

        const response =
          await getExperimentPhases({
            experimentId,
            page: 1,
            size: 100,
          });

        const normalizedPhases =
          normalizePhaseList(
            response
          )
            .filter(
              (phase) =>
                Number(
                  phase.experimentId
                ) ===
                experimentId
            )
            .sort(
              (
                firstPhase,
                secondPhase
              ) =>
                Number(
                  firstPhase.phaseOrder
                ) -
                Number(
                  secondPhase.phaseOrder
                )
            );

        setPhases(
          normalizedPhases
        );
      } catch (loadError) {
        console.error(
          "Load experiment phases failed:",
          loadError
        );

        setPhases([]);

        setPhaseError(
          getErrorMessage(
            loadError
          )
        );
      } finally {
        setLoadingPhases(false);
      }
    }, [experimentId]);

  const loadRequirements = useCallback(async () => {
    if (!Number.isInteger(experimentId) || experimentId <= 0) return;
    try {
      const [eList, hList, lList] = await Promise.all([
        getExperimentEquipmentRequirements({ experimentId, size: 100 }),
        getExperimentHumanRequirements({ experimentId, size: 100 }),
        getExperimentLandRequirements({ experimentId, size: 100 }),
      ]);
      setEquipReqs(eList);
      setHumanReqs(hList);
      setLandReqs(lList);
    } catch (reqErr) {
      console.warn("Failed to load attached requirements:", reqErr);
    }
  }, [experimentId]);

  useEffect(() => {
    void loadExperiment();
    void loadExperimentPhases();
    void loadRequirements();
  }, [
    loadExperiment,
    loadExperimentPhases,
    loadRequirements,
  ]);

  const handleFetchAISuggestions = () => {
    if (!experiment) return;
    setShowMethodSelector(false);
    navigate(`/experiments/${experiment.experimentId}/ai-suggestions`);
  };

  const handleApplySelectedAISuggestion = async (selectedPlan: AISuggestionPlan) => {
    if (!experiment) return;
    try {
      setSubmitting(true);
      setError("");

      // 1. Delete existing phases if any and recreate phases from selected AI plan
      for (const p of phases) {
        if (p.experimentPhaseId) {
          try {
            await deleteExperimentPhase(p.experimentPhaseId);
          } catch (e) {
            // ignore cleanup errors
          }
        }
      }

      for (const p of selectedPlan.experimentPhases) {
        try {
          await createExperimentPhase({
            experimentId: experiment.experimentId,
            phaseName: p.phaseName,
            phaseDescription: p.phaseDescription || null,
            phaseOrder: p.phaseOrder,
            expectedStartDate: formatToUtcIso(p.expectedStartDate),
            expectedEndDate: formatToUtcIso(p.expectedEndDate),
            status: "Planned",
          });
        } catch (phaseErr) {
          console.warn("AI Plan phase creation notice:", phaseErr);
        }
      }

      // 2. Create attached Equipment Requirements from selected AI plan
      for (const e of selectedPlan.equipmentRequirements) {
        try {
          await createExperimentEquipmentRequirement({
            experimentId: experiment.experimentId,
            equipmentTypeId: e.equipmentTypeId,
            quantity: e.quantity,
            allowSubstitute: e.allowSubstitute,
            minAcceptableEfficiency: e.minAcceptableEfficiency,
            note: e.note || undefined,
          });
        } catch (equipErr) {
          console.warn("AI Plan equipment requirement creation notice:", equipErr);
        }
      }

      // 3. Create attached Human Requirements from selected AI plan
      for (const h of selectedPlan.humanRequirements) {
        try {
          await createExperimentHumanRequirement({
            experimentId: experiment.experimentId,
            roleId: h.roleId,
            quantity: h.quantity,
            requiredSkillId: h.requiredSkillId,
            workingHoursPerDay: h.workingHoursPerDay,
            note: h.note || null,
          });
        } catch (humanErr) {
          console.warn("AI Plan human requirement creation notice:", humanErr);
        }
      }

      // 4. Create attached Land Requirements from selected AI plan
      for (const l of selectedPlan.landRequirements) {
        try {
          await createExperimentLandRequirement({
            experimentId: experiment.experimentId,
            requiredArea: l.requiredArea,
            requiredSoilType: l.requiredSoilType || null,
            note: l.note || null,
          });
        } catch (landErr) {
          console.warn("AI Plan land requirement creation notice:", landErr);
        }
      }

      // 5. Submit experiment to Manager
      const updated = await submitExperiment(experiment.experimentId);

      // 6. Automatically generate a Pending Allocation Plan from this AI Suggestion
      try {
        await createAllocationPlan({
          experimentId: experiment.experimentId,
          fitnessScore: selectedPlan.totalResourceScore || 85,
          approveStatus: "Pending",
        });
      } catch (allocErr) {
        console.warn("Auto allocation plan creation failed:", allocErr);
      }

      setExperiment(updated);
      sendLocalNotification({
        title: "AI Plan Applied Successfully",
        message: `AI Plan "${selectedPlan.title}" applied and experiment submitted successfully for Manager Review!`,
        notificationType: "Success",
        referenceType: "Experiment",
        referenceId: experiment.experimentId,
      });
      void fetchUnreadCount();
      setShowAISuggestions(false);
      await loadExperiment();
      await loadExperimentPhases();
      await loadRequirements();
    } catch (applyErr) {
      console.error("Apply AI Suggestion failed:", applyErr);
      setError(getErrorMessage(applyErr));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectManualPlanning = async () => {
    if (!experiment || submitting) return;
    try {
      setSubmitting(true);
      setError("");
      setShowMethodSelector(false);

      if (phases.length === 0) {
        try {
          const baseStart = experiment.expectStartDate || new Date().toISOString();
          const baseEnd = experiment.expectEndDate || new Date().toISOString();
          await createExperimentPhase({
            experimentId: experiment.experimentId,
            phaseName: "Initial Execution Phase",
            phaseDescription: "Manual plan baseline execution phase",
            phaseOrder: 1,
            expectedStartDate: baseStart,
            expectedEndDate: baseEnd,
            status: "Planned",
          });
        } catch (pErr) {
          console.warn("Manual phase creation notice:", pErr);
        }
      }

      const updated = await submitExperiment(experiment.experimentId);

      try {
        await createAllocationPlan({
          experimentId: experiment.experimentId,
          fitnessScore: 80,
          approveStatus: "Pending",
        });
      } catch (allocErr) {
        console.warn("Auto allocation plan creation notice:", allocErr);
      }

      setExperiment(updated);
      sendLocalNotification({
        title: "Manual Experiment Plan Finalized",
        message: `Manual Experiment Plan finalized and submitted successfully for Manager Review!`,
        notificationType: "Success",
        referenceType: "Experiment",
        referenceId: experiment.experimentId,
      });
      void fetchUnreadCount();
      await loadExperiment();
      await loadExperimentPhases();
      await loadRequirements();
    } catch (err) {
      console.error("Manual planning submission failed:", err);
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitExperiment =
    async () => {
      if (
        !experiment ||
        !canManageExperiment ||
        submitting
      ) {
        return;
      }

      if (
        !canSubmitExperimentStatus(
          experiment.status
        )
      ) {
        setError(
          `Experiment cannot be submitted while its status is "${experiment.status}".`
        );

        return;
      }

      if (
        phases.length === 0
      ) {
        setError(
          "Please create at least one experiment phase before submitting the experiment."
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Submit experiment "${experiment.experimentName}" for planning?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setSubmitting(true);
        setError("");

        const updatedExperiment =
          await submitExperiment(
            experiment.experimentId
          );

        setExperiment(
          updatedExperiment
        );

        sendLocalNotification({
          title: "Experiment Plan Submitted",
          message: "Experiment submitted successfully for Manager Review!",
          notificationType: "Success",
          referenceType: "Experiment",
          referenceId: experiment.experimentId,
        });
        void fetchUnreadCount();

        await loadExperiment();
      } catch (submitError) {
        console.error(
          "Submit experiment failed:",
          submitError
        );

        setError(
          getErrorMessage(
            submitError
          )
        );
      } finally {
        setSubmitting(false);
      }
    };

  const handleApproveExperiment = async () => {
    if (!experiment || actionProcessing) return;
    const confirmed = window.confirm(
      `Approve experiment plan "${experiment.experimentName}"?`
    );
    if (!confirmed) return;

    try {
      setActionProcessing(true);
      setError("");

      // 1. Update experiment status to Running
      let updated = experiment;
      try {
        updated = await updateExperiment(experiment.experimentId, {
          experimentName: experiment.experimentName,
          description: experiment.description || "",
          researcherId: experiment.researcherId,
          expectStartDate: experiment.expectStartDate || new Date().toISOString(),
          expectEndDate: experiment.expectEndDate || new Date().toISOString(),
          deadline: experiment.deadline || experiment.expectEndDate || new Date().toISOString(),
          priority: experiment.priority ?? 1,
          status: "Running",
        });
      } catch (uErr) {
        console.warn("Direct update status to Running:", uErr);
      }

      // 2. Also approve attached allocation plans if any
      try {
        const allocs = await getAllocationPlans({ experimentId: experiment.experimentId });
        for (const p of allocs) {
          if (p.approveStatus === "Pending" || p.approveStatus === "Draft") {
            await approveAllocationPlan(p.allocationPlanId);
          }
        }
      } catch (aErr) {
        console.warn("Approve attached allocation plans notice:", aErr);
      }

      setExperiment({ ...updated, status: "Running" });
      sendLocalNotification({
        title: "Experiment Plan Approved",
        message: `Experiment plan "${experiment.experimentName}" has been APPROVED and is now Running!`,
        notificationType: "Success",
        referenceType: "Experiment",
        referenceId: experiment.experimentId,
      });
      void fetchUnreadCount();
      await loadExperiment();
    } catch (appErr) {
      console.error("Approve experiment failed:", appErr);
      setError(getErrorMessage(appErr));
    } finally {
      setActionProcessing(false);
    }
  };

  const handleRejectExperiment = async () => {
    if (!experiment || actionProcessing) return;
    const reasonText = rejectReason.trim();
    if (!reasonText) {
      setError("Please enter a rejection reason.");
      return;
    }

    try {
      setActionProcessing(true);
      setError("");

      const updatedDescription = experiment.description
        ? `${experiment.description}\n\n[Manager Rejection Reason: ${reasonText}]`
        : `[Manager Rejection Reason: ${reasonText}]`;

      // 1. Update experiment status to Cancelled
      let updated = experiment;
      try {
        updated = await updateExperiment(experiment.experimentId, {
          experimentName: experiment.experimentName,
          description: updatedDescription,
          researcherId: experiment.researcherId,
          expectStartDate: experiment.expectStartDate || new Date().toISOString(),
          expectEndDate: experiment.expectEndDate || new Date().toISOString(),
          deadline: experiment.deadline || experiment.expectEndDate || new Date().toISOString(),
          priority: experiment.priority ?? 1,
          status: "Cancelled",
        });
      } catch (uErr) {
        console.warn("Direct update status to Cancelled:", uErr);
      }

      // 2. Also reject attached allocation plans if any
      try {
        const allocs = await getAllocationPlans({ experimentId: experiment.experimentId });
        for (const p of allocs) {
          if (p.approveStatus === "Pending" || p.approveStatus === "Draft") {
            await rejectAllocationPlan(p.allocationPlanId);
          }
        }
      } catch (aErr) {
        console.warn("Reject attached allocation plans notice:", aErr);
      }

      setExperiment({
        ...updated,
        status: "Cancelled",
        description: updatedDescription,
      });
      setShowRejectModal(false);
      setRejectReason("");
      sendLocalNotification({
        title: "Experiment Plan Rejected",
        message: `Experiment plan "${experiment.experimentName}" has been REJECTED (status changed to Cancelled).`,
        notificationType: "Warning",
        referenceType: "Experiment",
        referenceId: experiment.experimentId,
      });
      void fetchUnreadCount();
      await loadExperiment();
    } catch (rejErr) {
      console.error("Reject experiment failed:", rejErr);
      setError(getErrorMessage(rejErr));
    } finally {
      setActionProcessing(false);
    }
  };

  const handleDeletePhase =
    async (
      phase: ExperimentPhase
    ) => {
      if (
        !canManageExperiment
      ) {
        return;
      }

      if (
        !canSubmitExperimentStatus(
          experiment?.status
        )
      ) {
        setPhaseError(
          "Experiment phases can only be deleted while the experiment is in Draft status."
        );

        return;
      }

      const phaseId =
        phase.experimentPhaseId;

      if (
        !phaseId ||
        phaseId <= 0
      ) {
        setPhaseError(
          "Invalid experiment phase ID."
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Are you sure you want to delete phase "${phase.phaseName}"?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setDeletingPhaseId(
          phaseId
        );

        setPhaseError("");

        await deleteExperimentPhase(
          phaseId
        );

        setPhases(
          (currentPhases) =>
            currentPhases.filter(
              (currentPhase) =>
                currentPhase.experimentPhaseId !==
                phaseId
            )
        );
      } catch (deleteError) {
        console.error(
          "Delete experiment phase failed:",
          deleteError
        );

        setPhaseError(
          getErrorMessage(
            deleteError
          )
        );
      } finally {
        setDeletingPhaseId(
          null
        );
      }
    };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="experiment-detail-page">
          <p>
            Loading experiment...
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (
    error &&
    !experiment
  ) {
    return (
      <DashboardLayout>
        <div className="experiment-detail-page">
          <div className="experiment-detail-header">
            <div>
              <p className="experiment-detail-breadcrumb">
                Dashboard / Experiments / Detail
              </p>

              <h1>
                Experiment Detail
              </h1>
            </div>

            <button
              type="button"
              className="experiment-detail-back-btn"
              onClick={() =>
                navigate(
                  "/experiments"
                )
              }
            >
              <ArrowLeft size={15} />
              Back
            </button>
          </div>

          <p className="experiment-detail-error">
            {error ||
              "Experiment not found."}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (!experiment) {
    return null;
  }

  const priority =
    experiment.priority ===
      null ||
      experiment.priority ===
      undefined
      ? "-"
      : priorityLabels[
      experiment.priority
      ] ??
      String(
        experiment.priority
      );

  const experimentIsEditable =
    canSubmitExperimentStatus(
      experiment.status
    );

  const canSubmit =
    canManageExperiment &&
    experimentIsEditable;

  return (
    <DashboardLayout>
      <div className="experiment-detail-page">
        <div className="experiment-detail-header">
          <div>
            <p className="experiment-detail-breadcrumb">
              Dashboard / Experiments / #
              {
                experiment.experimentId
              }
            </p>

            <h1>
              {
                experiment.experimentName
              }
            </h1>
          </div>

          <div className="experiment-detail-header-actions">
            <button
              type="button"
              className="experiment-detail-back-btn"
              onClick={() =>
                navigate(
                  "/experiments"
                )
              }
            >
              <ArrowLeft size={15} />
              Back
            </button>

            {/* Manager / Admin Approve & Reject Action Buttons */}
            {canApproveReject && (
              <>
                <button
                  type="button"
                  className="experiment-approve-btn"
                  disabled={actionProcessing}
                  onClick={handleApproveExperiment}
                  title="Approve this experiment plan"
                >
                  <CheckCircle2 size={15} />
                  {actionProcessing ? "Processing..." : "Approve Plan"}
                </button>

                <button
                  type="button"
                  className="experiment-reject-btn"
                  disabled={actionProcessing}
                  onClick={() => {
                    setError("");
                    setShowRejectModal(true);
                  }}
                  title="Reject this experiment plan"
                >
                  <XCircle size={15} />
                  Reject Plan
                </button>
              </>
            )}

            {canManageExperiment && experimentIsEditable && (
              <button
                type="button"
                className="experiment-detail-edit-btn"
                onClick={() =>
                  navigate(`/experiments/${experiment.experimentId}/edit`)
                }
              >
                <Pencil size={14} />
                Edit Experiment
              </button>
            )}
          </div>
        </div>

        {/* Status Banners for Reviewers & Researchers */}
        {(experiment.status === "Rejected" || experiment.status === "Cancelled") && (
          <div className="experiment-status-banner rejected">
            <AlertTriangle className="experiment-banner-icon" />
            <div>
              <strong>Experiment Plan Cancelled / Rejected (by Manager)</strong>
              <p style={{ margin: "4px 0 0" }}>
                {experiment.description && experiment.description.includes("Manager Rejection Reason:")
                  ? experiment.description.split("[Manager Rejection Reason:")[1]?.replace("]", "").trim()
                  : "The experiment plan has been rejected or cancelled. Please review and submit a revised plan."}
              </p>
            </div>
          </div>
        )}

        {(experiment.status === "Approved" || experiment.status === "Running") && (
          <div className="experiment-status-banner approved">
            <CheckCircle2 className="experiment-banner-icon" />
            <div>
              <strong>Experiment Plan Approved & Running</strong>
              <p style={{ margin: "4px 0 0" }}>
                The experiment plan was successfully approved by the Manager. All phases and allocated resources are ready for execution.
              </p>
            </div>
          </div>
        )}

        {(experiment.status === "Submitted" || experiment.status === "Pending") && (
          <div className="experiment-status-banner pending">
            <Clock3 className="experiment-banner-icon" />
            <div>
              <strong>Awaiting Manager Review (Under Review)</strong>
              <p style={{ margin: "4px 0 0" }}>
                The experiment plan has been submitted and is awaiting Manager review and resource allocation approvals.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="experiment-detail-error">
            {error}
          </div>
        )}

        <div className="experiment-detail-grid">
          <div className="experiment-detail-card">
            <h3>General Information</h3>

            <div className="experiment-detail-item">
              <span className="experiment-detail-label">ID</span>
              <span className="experiment-detail-value">
                #{experiment.experimentId}
              </span>
            </div>

            <div className="experiment-detail-item">
              <span className="experiment-detail-label">Status</span>
              <span className="experiment-detail-value">
                <span
                  className={getExperimentStatusClassName(experiment.status)}
                >
                  {getExperimentStatusLabel(experiment.status)}
                </span>
              </span>
            </div>

            <div className="experiment-detail-item">
              <span className="experiment-detail-label">Priority</span>
              <span className="experiment-detail-value">{priority}</span>
            </div>

            <div className="experiment-detail-item">
              <span className="experiment-detail-label">Researcher</span>
              <span className="experiment-detail-value">
                {experiment.researcherName ||
                  experiment.createdByName ||
                  "-"}
              </span>
            </div>
          </div>

          <div className="experiment-detail-card">
            <h3>
              Schedule
            </h3>

            <div className="experiment-detail-item">
              <span className="experiment-detail-label">Expected Start Date</span>
              <span className="experiment-detail-value">
                {formatDate(experiment.expectStartDate)}
              </span>
            </div>

            <div className="experiment-detail-item">
              <span className="experiment-detail-label">Expected End Date</span>
              <span className="experiment-detail-value">
                {formatDate(experiment.expectEndDate)}
              </span>
            </div>

            <div className="experiment-detail-item">
              <span className="experiment-detail-label">Deadline</span>
              <span className="experiment-detail-value">
                {formatDate(experiment.deadline)}
              </span>
            </div>
          </div>

          <div className="experiment-detail-card">
            <h3>
              Audit Information
            </h3>

            <div className="experiment-detail-item">
              <span className="experiment-detail-label">Created By</span>
              <span className="experiment-detail-value">
                {experiment.createdByName || "-"}
              </span>
            </div>

            <div className="experiment-detail-item">
              <span className="experiment-detail-label">Created At</span>
              <span className="experiment-detail-value">
                {formatDateTime(experiment.createdAt)}
              </span>
            </div>

            <div className="experiment-detail-item">
              <span className="experiment-detail-label">Updated At</span>
              <span className="experiment-detail-value">
                {formatDateTime(experiment.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="experiment-detail-card experiment-detail-description-card">
          <h3>
            Description
          </h3>

          <p>
            {experiment.description ||
              "No description provided."}
          </p>
        </div>

        {/* =====================================================
            1. EXECUTION PHASES SECTION
        ===================================================== */}
        <div className="experiment-phase-section" style={{ marginTop: "24px" }}>
          <div className="experiment-phase-section-header">
            <div className="experiment-phase-section-title">
              <div className="experiment-phase-section-icon">
                <Layers3 size={20} />
              </div>
              <div>
                <h2>Execution Phases ({phases.length})</h2>
                <p>Operational execution phases for this experiment</p>
              </div>
            </div>
            {canManageExperiment && experimentIsEditable && (
              <button
                type="button"
                className="experiment-phase-create-button"
                onClick={() =>
                  navigate(
                    `/experiment-phases/create?experimentId=${experiment.experimentId}`
                  )
                }
              >
                <Plus size={15} /> Add Phase
              </button>
            )}
          </div>

          {loadingPhases ? (
            <div className="experiment-phase-state">Loading phases...</div>
          ) : phaseError ? (
            <div className="experiment-phase-error">{phaseError}</div>
          ) : phases.length === 0 ? (
            <div className="experiment-phase-empty">
              <Layers3 size={36} />
              <h3>No Phases Defined</h3>
              <p>This experiment plan currently has no execution phases defined.</p>
            </div>
          ) : (
            <div className="experiment-phase-table-wrapper">
              <table className="experiment-phase-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Phase Name & Description</th>
                    <th>Timeline</th>
                    <th>Status</th>
                    {canManageExperiment && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {phases.map((phase) => (
                    <tr key={phase.experimentPhaseId}>
                      <td>
                        <span className="experiment-phase-order">
                          #{phase.phaseOrder}
                        </span>
                      </td>
                      <td>
                        <div className="experiment-phase-name-cell">
                          <strong>{phase.phaseName}</strong>
                          {phase.phaseDescription && (
                            <span>{phase.phaseDescription}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="experiment-phase-timeline">
                          <span>{formatDate(phase.expectedStartDate)}</span>
                          <span>→</span>
                          <span>{formatDate(phase.expectedEndDate)}</span>
                        </div>
                      </td>
                      <td>
                        <span className={getStatusClassName(phase.status)}>
                          {getStatusLabel(phase.status)}
                        </span>
                      </td>
                      {canManageExperiment && (
                        <td>
                          <div className="experiment-phase-actions">
                            <button
                              type="button"
                              className="experiment-phase-action-button"
                              onClick={() =>
                                navigate(
                                  `/experiment-phases/${phase.experimentPhaseId}`
                                )
                              }
                              title="View phase detail"
                            >
                              <Eye size={14} />
                            </button>
                            {experimentIsEditable && (
                              <>
                                <button
                                  type="button"
                                  className="experiment-phase-action-button"
                                  onClick={() =>
                                    navigate(
                                      `/experiment-phases/${phase.experimentPhaseId}/edit`
                                    )
                                  }
                                  title="Edit phase"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="experiment-phase-action-button experiment-phase-delete-button"
                                  onClick={() => void handleDeletePhase(phase)}
                                  disabled={
                                    deletingPhaseId === phase.experimentPhaseId
                                  }
                                  title="Delete phase"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* =====================================================
            2. EQUIPMENT REQUIREMENTS SECTION
        ===================================================== */}
        <div className="experiment-phase-section" style={{ marginTop: "24px" }}>
          <div className="experiment-phase-section-header">
            <div className="experiment-phase-section-title">
              <div
                className="experiment-phase-section-icon"
                style={{ background: "rgba(37, 99, 235, 0.1)", color: "#2563eb" }}
              >
                <Wrench size={20} />
              </div>
              <div>
                <h2>Equipment Requirements ({equipReqs.length})</h2>
                <p>Required machinery, tools, and technical equipment</p>
              </div>
            </div>
          </div>

          {equipReqs.length === 0 ? (
            <div className="experiment-phase-empty">
              <Wrench size={36} />
              <h3>No Equipment Requirements Defined</h3>
              <p>No equipment requirements specified for this experiment.</p>
            </div>
          ) : (
            <div className="experiment-phase-table-wrapper">
              <table className="experiment-phase-table">
                <thead>
                  <tr>
                    <th>Equipment Type</th>
                    <th>Required Quantity</th>
                    <th>Allow Substitute</th>
                    <th>Min Efficiency</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {equipReqs.map((req) => (
                    <tr key={req.expEquipmentReqId}>
                      <td>
                        <strong style={{ color: "#1e293b" }}>
                          {req.equipmentTypeName || `Type #${req.equipmentTypeId}`}
                        </strong>
                      </td>
                      <td>
                        <span className="font-semibold">{req.quantity} units</span>
                      </td>
                      <td>
                        {req.allowSubstitute ? (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700">
                            Yes
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600">
                            No
                          </span>
                        )}
                      </td>
                      <td>{req.minAcceptableEfficiency ?? 80}%</td>
                      <td style={{ color: "#64748b" }}>{req.note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* =====================================================
            3. HUMAN RESOURCE REQUIREMENTS SECTION
        ===================================================== */}
        <div className="experiment-phase-section" style={{ marginTop: "24px" }}>
          <div className="experiment-phase-section-header">
            <div className="experiment-phase-section-title">
              <div
                className="experiment-phase-section-icon"
                style={{ background: "rgba(147, 51, 234, 0.1)", color: "#9333ea" }}
              >
                <Users size={20} />
              </div>
              <div>
                <h2>Human Resource Requirements ({humanReqs.length})</h2>
                <p>Personnel roles, required skills, and working hours</p>
              </div>
            </div>
          </div>

          {humanReqs.length === 0 ? (
            <div className="experiment-phase-empty">
              <Users size={36} />
              <h3>No Human Requirements Defined</h3>
              <p>No human resource requirements specified for this experiment.</p>
            </div>
          ) : (
            <div className="experiment-phase-table-wrapper">
              <table className="experiment-phase-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Required Quantity</th>
                    <th>Required Skill</th>
                    <th>Working Hours/Day</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {humanReqs.map((req) => (
                    <tr key={req.expHumanReqId}>
                      <td>
                        <strong style={{ color: "#1e293b" }}>
                          {req.roleName || `Role #${req.roleId}`}
                        </strong>
                      </td>
                      <td>
                        <span className="font-semibold">{req.quantity} person(s)</span>
                      </td>
                      <td>
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                          {req.requiredSkillName ||
                            (req.requiredSkillId
                              ? `Skill #${req.requiredSkillId}`
                              : "Any Skill")}
                        </span>
                      </td>
                      <td>
                        {req.workingHoursPerDay
                          ? `${req.workingHoursPerDay} hrs/day`
                          : "-"}
                      </td>
                      <td style={{ color: "#64748b" }}>{req.note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* =====================================================
            4. LAND & AREA REQUIREMENTS SECTION
        ===================================================== */}
        <div className="experiment-phase-section" style={{ marginTop: "24px" }}>
          <div className="experiment-phase-section-header">
            <div className="experiment-phase-section-title">
              <div
                className="experiment-phase-section-icon"
                style={{ background: "rgba(234, 88, 12, 0.1)", color: "#ea580c" }}
              >
                <MapPin size={20} />
              </div>
              <div>
                <h2>Land & Area Requirements ({landReqs.length})</h2>
                <p>Land area size, soil type specifications, and field notes</p>
              </div>
            </div>
          </div>

          {landReqs.length === 0 ? (
            <div className="experiment-phase-empty">
              <MapPin size={36} />
              <h3>No Land Requirements Defined</h3>
              <p>No land or soil requirements specified for this experiment.</p>
            </div>
          ) : (
            <div className="experiment-phase-table-wrapper">
              <table className="experiment-phase-table">
                <thead>
                  <tr>
                    <th>Required Area (m²)</th>
                    <th>Required Soil Type</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {landReqs.map((req) => (
                    <tr key={req.expLandReqId}>
                      <td>
                        <strong
                          style={{ color: "#15803d", fontSize: "14px" }}
                        >
                          {req.requiredArea?.toLocaleString()} m²
                        </strong>
                      </td>
                      <td>
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                          {req.requiredSoilType || "Any Soil Type"}
                        </span>
                      </td>
                      <td style={{ color: "#64748b" }}>{req.note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Submit / Resource Allocation Action Card */}
        {isResearcher && (
          <div
            className="experiment-detail-card"
            style={{ marginTop: "28px", marginBottom: "24px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: "0 0 4px",
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#0f172a",
                    border: "none",
                    padding: 0,
                  }}
                >
                  {experiment.status === "Draft" || experiment.status === "Created"
                    ? "Submit Experiment Plan"
                    : "Resource Allocation Hub"}
                </h3>

                <p
                  style={{
                    margin: 0,
                    fontSize: "13.5px",
                    color: "#64748b",
                  }}
                >
                  {experiment.status === "Draft" || experiment.status === "Created"
                    ? "Submit this experiment plan so the Manager can see and review it."
                    : "The experiment plan has been submitted. Continue allocating equipment, personnel, and land resources using Manual Allocation or AI Optimization."}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                {(experiment.status === "Draft" || experiment.status === "Created") && (
                  <button
                    type="button"
                    onClick={() => void handleSubmitExperiment()}
                    disabled={submitting}
                    className="btn-primary-green"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                )}

                {experiment.status !== "Draft" &&
                  experiment.status !== "Created" &&
                  experiment.status !== "Cancelled" &&
                  experiment.status !== "Rejected" && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/allocation/create?experimentId=${experiment.experimentId}`
                          )
                        }
                        className="btn-primary-green"
                        style={{ whiteSpace: "nowrap" }}
                      >
                        Start Resource Allocation
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/experiments/${experiment.experimentId}/ai-suggestions`
                          )
                        }
                        className="btn-secondary-white"
                        style={{ whiteSpace: "nowrap" }}
                      >
                        AI Optimization
                      </button>
                    </>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* Planning Method Selector Modal */}
        <PlanningMethodSelector
          isOpen={showMethodSelector}
          onClose={() => setShowMethodSelector(false)}
          onSelectManual={() => void handleSelectManualPlanning()}
          onSelectAI={() => void handleFetchAISuggestions()}
        />

        {/* AI Suggestion List Modal */}
        {showAISuggestions && (
          <AISuggestionList
            suggestions={aiSuggestions}
            isLoading={aiLoading}
            error={aiError}
            onRetry={() => void handleFetchAISuggestions()}
            onSwitchToManual={() => {
              setShowAISuggestions(false);
              void handleSelectManualPlanning();
            }}
            onConfirmSelection={handleApplySelectedAISuggestion}
            onClose={() => setShowAISuggestions(false)}
          />
        )}

        {/* Reject Modal with Mandatory Reason */}
        {showRejectModal && (
          <div className="reject-modal-overlay">
            <div className="reject-modal-card">
              <div className="reject-modal-header">
                <div className="reject-modal-title">
                  <AlertTriangle size={18} />
                  <span>Reject Experiment Plan</span>
                </div>
                <button
                  type="button"
                  className="reject-modal-close-btn"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason("");
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="reject-modal-body">
                <p className="reject-modal-hint">
                  Please enter the reason for rejecting experiment plan{" "}
                  <strong>"{experiment.experimentName}"</strong> (EXP-{experiment.experimentId}).
                  This note will be notified to the Researcher for adjustments.
                </p>

                <label className="reject-modal-label">
                  Rejection Reason <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  className="reject-modal-textarea"
                  placeholder="Enter detailed rejection reason (e.g., equipment shortage, schedule conflict, land unavailability)..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="reject-modal-footer">
                <button
                  type="button"
                  className="reject-modal-cancel-btn"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason("");
                  }}
                  disabled={actionProcessing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="reject-modal-submit-btn"
                  onClick={handleRejectExperiment}
                  disabled={actionProcessing || !rejectReason.trim()}
                >
                  {actionProcessing ? "Processing..." : "Confirm Rejection (Reject)"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}