import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  ArrowLeft,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getAllocationPlans,
} from "../../services/allocationPlanService";

import {
  getExperimentPhases,
} from "../../services/experimentPhaseService";

import {
  getHumanResourceProfiles,
} from "../../services/humanResourceProfileService";

import {
  createSchedule,
} from "../../services/scheduleService";

import type {
  AllocationPlan,
} from "../../types/allocationPlan";

import type {
  ExperimentPhase,
} from "../../types/experimentPhase";

import type {
  HumanResourceProfile,
} from "../../types/humanResourceProfile";

import "../ExperimentEquipmentRequirement/RequirementForm.css";

interface ScheduleFormState {
  allocationPlanId: string;
  phaseId: string;
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  assignedHumanResourceId: string;
  notes: string;
  priority: string;
}

const priorityLabels: Record<
  number,
  string
> = {
  0: "Low",
  1: "Medium",
  2: "High",
  3: "Urgent",
};

function getErrorMessage(
  error: unknown
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
            title?: string;
            error?: string;
            errors?: Record<
              string,
              string[]
            >;
          };
        };
      }
    ).response;

    if (response?.data?.message) {
      return response.data.message;
    }

    if (response?.data?.error) {
      return response.data.error;
    }

    if (response?.data?.errors) {
      return Object.values(
        response.data.errors
      )
        .flat()
        .join(" ");
    }

    if (response?.data?.title) {
      return response.data.title;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Cannot create schedule.";
}

function isPositiveInteger(
  value: number
): boolean {
  return (
    Number.isInteger(value) &&
    value > 0
  );
}

function getAllocationLabel(
  plan: AllocationPlan
): string {
  return (
    plan.experimentName ||
    `Experiment #${plan.experimentId}`
  );
}

function getPhaseLabel(
  phase: ExperimentPhase
): string {
  return (
    phase.phaseName ||
    `Phase ${phase.phaseOrder}`
  );
}

function getHumanResourceLabel(
  resource: HumanResourceProfile
): string {
  const name =
    resource.fullName ||
    resource.username ||
    resource.email ||
    `Human Resource #${resource.humanResourceId}`;

  return resource.roleName
    ? `${name} - ${resource.roleName}`
    : name;
}

function combineDateAndTime(
  date: string,
  time: string
): string {
  if (!date || !time) {
    return "";
  }

  const value =
    new Date(
      `${date}T${time}:00`
    );

  if (
    Number.isNaN(
      value.getTime()
    )
  ) {
    return "";
  }

  return value.toISOString();
}

function getCurrentUserId():
  | number
  | null {
  const value =
    Number(
      localStorage.getItem(
        "userId"
      )
    );

  return isPositiveInteger(
    value
  )
    ? value
    : null;
}

export default function CreateSchedule() {
  const navigate = useNavigate();
  const [searchParams] =
    useSearchParams();

  const experimentIdFromUrl =
    searchParams.get(
      "experimentId"
    ) ?? "";

  const allocationPlanIdFromUrl =
    searchParams.get(
      "allocationPlanId"
    ) ?? "";

  const phaseIdFromUrl =
    searchParams.get(
      "phaseId"
    ) ?? "";

  const [
    allocationPlans,
    setAllocationPlans,
  ] = useState<
    AllocationPlan[]
  >([]);

  const [
    phases,
    setPhases,
  ] = useState<
    ExperimentPhase[]
  >([]);

  const [
    humanResources,
    setHumanResources,
  ] = useState<
    HumanResourceProfile[]
  >([]);

  const [
    form,
    setForm,
  ] = useState<ScheduleFormState>({
    allocationPlanId:
      allocationPlanIdFromUrl,
    phaseId:
      phaseIdFromUrl,
    title: "",
    description: "",
    startDate: "",
    startTime: "08:00",
    endDate: "",
    endTime: "17:00",
    assignedHumanResourceId: "",
    notes: "",
    priority: "1",
  });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const selectedAllocation =
    useMemo(() => {
      return allocationPlans.find(
        (plan) =>
          plan.allocationPlanId ===
          Number(
            form.allocationPlanId
          )
      );
    }, [
      allocationPlans,
      form.allocationPlanId,
    ]);

  const selectedExperimentId =
    useMemo(() => {
      const contextId =
        Number(
          experimentIdFromUrl
        );

      if (
        isPositiveInteger(
          contextId
        )
      ) {
        return contextId;
      }

      const allocationExperimentId =
        Number(
          selectedAllocation?.experimentId
        );

      return isPositiveInteger(
        allocationExperimentId
      )
        ? allocationExperimentId
        : undefined;
    }, [
      experimentIdFromUrl,
      selectedAllocation,
    ]);

  const availablePhases =
    useMemo(() => {
      if (
        selectedExperimentId ===
        undefined
      ) {
        return phases;
      }

      return phases.filter(
        (phase) =>
          phase.experimentId ===
          selectedExperimentId
      );
    }, [
      phases,
      selectedExperimentId,
    ]);

  const selectedPhase =
    useMemo(() => {
      return availablePhases.find(
        (phase) =>
          phase.experimentPhaseId ===
          Number(form.phaseId)
      );
    }, [
      availablePhases,
      form.phaseId,
    ]);

  const selectedHumanResource =
    useMemo(() => {
      return humanResources.find(
        (resource) =>
          resource.humanResourceId ===
          Number(
            form.assignedHumanResourceId
          )
      );
    }, [
      humanResources,
      form.assignedHumanResourceId,
    ]);

  useEffect(() => {
    let active = true;

    async function loadFormData() {
      try {
        setLoading(true);
        setError("");

        const experimentId =
          Number(
            experimentIdFromUrl
          );

        const allocationQuery =
          isPositiveInteger(
            experimentId
          )
            ? {
                experimentId,
                approveStatus:
                  "Approved" as const,
                page: 1,
                size: 100,
              }
            : {
                approveStatus:
                  "Approved" as const,
                page: 1,
                size: 100,
              };

        const [
          allocationData,
          phaseData,
          humanData,
        ] = await Promise.all([
          getAllocationPlans(
            allocationQuery
          ),
          getExperimentPhases({
            experimentId:
              isPositiveInteger(
                experimentId
              )
                ? experimentId
                : undefined,
            page: 1,
            size: 100,
          }),
          getHumanResourceProfiles({
            status: "Available",
            page: 1,
            size: 100,
          }),
        ]);

        if (!active) {
          return;
        }

        const approvedAllocations =
          (
            Array.isArray(
              allocationData
            )
              ? allocationData
              : []
          ).filter(
            (plan) =>
              plan.approveStatus ===
              "Approved"
          );

        setAllocationPlans(
          approvedAllocations
        );

        setPhases(
          Array.isArray(phaseData)
            ? phaseData
            : []
        );

        setHumanResources(
          Array.isArray(humanData)
            ? humanData
            : []
        );

        setForm(
          (current) => {
            let nextAllocationId =
              current.allocationPlanId;

            if (
              allocationPlanIdFromUrl
            ) {
              nextAllocationId =
                allocationPlanIdFromUrl;
            } else if (
              !nextAllocationId &&
              approvedAllocations.length ===
                1
            ) {
              nextAllocationId =
                String(
                  approvedAllocations[0]
                    .allocationPlanId
                );
            }

            return {
              ...current,
              allocationPlanId:
                nextAllocationId,
              phaseId:
                phaseIdFromUrl ||
                current.phaseId,
            };
          }
        );
      } catch (loadError) {
        console.error(
          "Load create schedule form failed:",
          loadError
        );

        if (active) {
          setError(
            getErrorMessage(
              loadError
            )
          );
          setAllocationPlans([]);
          setPhases([]);
          setHumanResources([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadFormData();

    return () => {
      active = false;
    };
  }, [
    experimentIdFromUrl,
    allocationPlanIdFromUrl,
    phaseIdFromUrl,
  ]);

  useEffect(() => {
    if (!form.phaseId) {
      return;
    }

    const phaseStillAvailable =
      availablePhases.some(
        (phase) =>
          phase.experimentPhaseId ===
          Number(
            form.phaseId
          )
      );

    if (!phaseStillAvailable) {
      setForm(
        (current) => ({
          ...current,
          phaseId: "",
        })
      );
    }
  }, [
    availablePhases,
    form.phaseId,
  ]);

  const handleChange = (
    event: ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    >
  ) => {
    const {
      name,
      value,
    } = event.target;

    setError("");

    if (
      name ===
      "allocationPlanId"
    ) {
      setForm(
        (current) => ({
          ...current,
          allocationPlanId:
            value,
          phaseId: "",
        })
      );
      return;
    }

    if (
      name === "startDate"
    ) {
      setForm(
        (current) => ({
          ...current,
          startDate: value,
          endDate:
            current.endDate &&
            current.endDate < value
              ? ""
              : current.endDate,
        })
      );
      return;
    }

    setForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  };

  const goBack = () => {
    if (
      selectedExperimentId !==
      undefined
    ) {
      navigate(
        `/schedules?experimentId=${selectedExperimentId}`
      );
      return;
    }

    navigate("/schedules");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    const allocationPlanId =
      Number(
        form.allocationPlanId
      );

    const phaseId =
      form.phaseId
        ? Number(form.phaseId)
        : null;

    const assignedHumanResourceId =
      form.assignedHumanResourceId
        ? Number(
            form.assignedHumanResourceId
          )
        : null;

    const priority =
      Number(form.priority);

    const title =
      form.title.trim();

    const description =
      form.description.trim();

    const notes =
      form.notes.trim();

    if (
      !isPositiveInteger(
        allocationPlanId
      )
    ) {
      setError(
        "Please select an approved allocation plan."
      );
      return;
    }

    if (
      !selectedAllocation ||
      selectedAllocation.approveStatus !==
        "Approved"
    ) {
      setError(
        "A schedule can only be created from an approved allocation plan."
      );
      return;
    }

    if (
      phaseId !== null &&
      !isPositiveInteger(
        phaseId
      )
    ) {
      setError(
        "Please select a valid experiment phase."
      );
      return;
    }

    if (
      assignedHumanResourceId !==
        null &&
      !isPositiveInteger(
        assignedHumanResourceId
      )
    ) {
      setError(
        "Please select a valid human resource."
      );
      return;
    }

    if (!title) {
      setError(
        "Please enter the schedule title."
      );
      return;
    }

    if (
      !form.startDate ||
      !form.startTime
    ) {
      setError(
        "Please select the schedule start date and time."
      );
      return;
    }

    if (
      !form.endDate ||
      !form.endTime
    ) {
      setError(
        "Please select the schedule end date and time."
      );
      return;
    }

    const startDate =
      combineDateAndTime(
        form.startDate,
        form.startTime
      );

    const endDate =
      combineDateAndTime(
        form.endDate,
        form.endTime
      );

    if (
      !startDate ||
      !endDate
    ) {
      setError(
        "The schedule date or time is invalid."
      );
      return;
    }

    if (
      new Date(endDate).getTime() <=
      new Date(startDate).getTime()
    ) {
      setError(
        "The schedule end time must be after the start time."
      );
      return;
    }

    if (
      !Number.isInteger(priority) ||
      priority < 0 ||
      priority > 3
    ) {
      setError(
        "Please select a valid priority."
      );
      return;
    }

    if (
      selectedPhase &&
      selectedPhase.experimentId !==
        selectedAllocation.experimentId
    ) {
      setError(
        "The selected phase does not belong to the allocation experiment."
      );
      return;
    }

    try {
      setSaving(true);

      const createdSchedule =
        await createSchedule({
          allocationPlanId,
          phaseId,
          title,
          description:
            description ||
            null,
          startDate,
          endDate,

          // Initial status is controlled by the system.
          status: "Planned",

          createdBy:
            getCurrentUserId(),

          assignedHumanResourceId,
          notes:
            notes ||
            null,
          priority,
        });

      if (
        createdSchedule.scheduleId
      ) {
        navigate(
          `/schedules/${createdSchedule.scheduleId}`,
          {
            replace: true,
          }
        );
        return;
      }

      goBack();
    } catch (submitError) {
      console.error(
        "Create schedule failed:",
        submitError
      );

      setError(
        getErrorMessage(
          submitError
        )
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="requirement-form-page">
          <div className="requirement-form-loading">
            Loading schedule form...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="requirement-form-page">
        <div className="requirement-form-header">
          <div>
            <p className="requirement-breadcrumb">
              {selectedExperimentId
                ? `Dashboard / Experiments / #${selectedExperimentId} / Schedules / Create`
                : "Dashboard / Schedules / Create"}
            </p>

            <h1>
              Create Schedule
            </h1>

            <p>
              Create a work schedule from an approved allocation plan.
            </p>
          </div>

          <button
            type="button"
            className="requirement-back-button"
            onClick={goBack}
          >
            <ArrowLeft size={18} />
            Back
          </button>
        </div>

        {error && (
          <div className="requirement-form-error">
            {error}
          </div>
        )}

        <form
          className="requirement-form-layout"
          onSubmit={handleSubmit}
        >
          <section className="requirement-form-card">
            <h2>
              Schedule Information
            </h2>

            <label htmlFor="allocationPlanId">
              Approved Allocation Plan
            </label>

            <select
              id="allocationPlanId"
              name="allocationPlanId"
              value={
                form.allocationPlanId
              }
              onChange={
                handleChange
              }
              disabled={
                saving ||
                Boolean(
                  allocationPlanIdFromUrl
                )
              }
              required
            >
              <option value="">
                Select approved allocation
              </option>

              {allocationPlans.map(
                (plan) => (
                  <option
                    key={
                      plan.allocationPlanId
                    }
                    value={
                      plan.allocationPlanId
                    }
                  >
                    {getAllocationLabel(
                      plan
                    )}
                  </option>
                )
              )}
            </select>

            {allocationPlans.length ===
              0 && (
              <div className="form-note">
                No approved allocation plan is available. The Manager must approve an allocation before a schedule can be created.
              </div>
            )}

            <label htmlFor="phaseId">
              Experiment Phase
            </label>

            <select
              id="phaseId"
              name="phaseId"
              value={form.phaseId}
              onChange={
                handleChange
              }
              disabled={
                saving ||
                !form.allocationPlanId ||
                Boolean(
                  phaseIdFromUrl
                )
              }
            >
              <option value="">
                No specific phase
              </option>

              {availablePhases.map(
                (phase) => (
                  <option
                    key={
                      phase.experimentPhaseId
                    }
                    value={
                      phase.experimentPhaseId
                    }
                  >
                    {getPhaseLabel(
                      phase
                    )}
                  </option>
                )
              )}
            </select>

            <label htmlFor="title">
              Schedule Title
            </label>

            <input
              id="title"
              type="text"
              name="title"
              value={form.title}
              onChange={
                handleChange
              }
              disabled={saving}
              placeholder="Example: Field preparation"
              required
            />

            <label htmlFor="description">
              Description
            </label>

            <textarea
              id="description"
              name="description"
              rows={4}
              value={
                form.description
              }
              onChange={
                handleChange
              }
              disabled={saving}
              placeholder="Describe the scheduled work..."
            />

            <label htmlFor="assignedHumanResourceId">
              Assigned Human Resource
            </label>

            <select
              id="assignedHumanResourceId"
              name="assignedHumanResourceId"
              value={
                form.assignedHumanResourceId
              }
              onChange={
                handleChange
              }
              disabled={saving}
            >
              <option value="">
                Not assigned
              </option>

              {humanResources.map(
                (resource) => (
                  <option
                    key={
                      resource.humanResourceId
                    }
                    value={
                      resource.humanResourceId
                    }
                  >
                    {getHumanResourceLabel(
                      resource
                    )}
                  </option>
                )
              )}
            </select>

            <label htmlFor="priority">
              Priority
            </label>

            <select
              id="priority"
              name="priority"
              value={form.priority}
              onChange={
                handleChange
              }
              disabled={saving}
              required
            >
              <option value="0">
                Low
              </option>
              <option value="1">
                Medium
              </option>
              <option value="2">
                High
              </option>
              <option value="3">
                Urgent
              </option>
            </select>
          </section>

          <section className="requirement-form-card">
            <h2>
              Schedule Period
            </h2>

            <label htmlFor="startDate">
              Start Date
            </label>

            <input
              id="startDate"
              type="date"
              name="startDate"
              value={
                form.startDate
              }
              onChange={
                handleChange
              }
              disabled={saving}
              required
            />

            <label htmlFor="startTime">
              Start Time
            </label>

            <input
              id="startTime"
              type="time"
              name="startTime"
              value={
                form.startTime
              }
              onChange={
                handleChange
              }
              disabled={saving}
              required
            />

            <label htmlFor="endDate">
              End Date
            </label>

            <input
              id="endDate"
              type="date"
              name="endDate"
              min={
                form.startDate ||
                undefined
              }
              value={
                form.endDate
              }
              onChange={
                handleChange
              }
              disabled={saving}
              required
            />

            <label htmlFor="endTime">
              End Time
            </label>

            <input
              id="endTime"
              type="time"
              name="endTime"
              value={
                form.endTime
              }
              onChange={
                handleChange
              }
              disabled={saving}
              required
            />

            <label htmlFor="notes">
              Notes
            </label>

            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={form.notes}
              onChange={
                handleChange
              }
              disabled={saving}
              placeholder="Enter additional instructions or notes..."
            />

            <div className="requirement-preview">
              <div>
                <span>Allocation</span>
                <strong>
                  {selectedAllocation
                    ? getAllocationLabel(
                        selectedAllocation
                      )
                    : "Not selected"}
                </strong>
              </div>

              <div>
                <span>Phase</span>
                <strong>
                  {selectedPhase
                    ? getPhaseLabel(
                        selectedPhase
                      )
                    : "No specific phase"}
                </strong>
              </div>

              <div>
                <span>
                  Assigned Human
                </span>
                <strong>
                  {selectedHumanResource
                    ? getHumanResourceLabel(
                        selectedHumanResource
                      )
                    : "Not assigned"}
                </strong>
              </div>

              <div>
                <span>Start</span>
                <strong>
                  {form.startDate &&
                  form.startTime
                    ? `${form.startDate} ${form.startTime}`
                    : "-"}
                </strong>
              </div>

              <div>
                <span>End</span>
                <strong>
                  {form.endDate &&
                  form.endTime
                    ? `${form.endDate} ${form.endTime}`
                    : "-"}
                </strong>
              </div>

              <div>
                <span>Priority</span>
                <strong>
                  {priorityLabels[
                    Number(
                      form.priority
                    )
                  ] || "-"}
                </strong>
              </div>
            </div>

            <div className="requirement-form-actions">
              <button
                type="button"
                className="requirement-cancel-button"
                onClick={goBack}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="requirement-save-button"
                disabled={
                  saving ||
                  !form.allocationPlanId ||
                  !form.title.trim() ||
                  !form.startDate ||
                  !form.startTime ||
                  !form.endDate ||
                  !form.endTime
                }
              >
                {saving
                  ? "Creating..."
                  : "Create Schedule"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </DashboardLayout>
  );
}
