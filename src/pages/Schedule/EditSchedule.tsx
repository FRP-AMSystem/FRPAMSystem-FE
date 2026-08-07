import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  CalendarDays,
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

import type {
  HumanResourceProfile,
} from "../../types/humanResourceProfile";

import {
  getScheduleById,
  updateSchedule,
} from "../../services/scheduleService";

import type {
  AllocationPlan,
} from "../../types/allocationPlan";

import type {
  ExperimentPhase,
} from "../../types/experimentPhase";

import type {
  ScheduleStatus,
} from "../../types/schedule";

import {
  getPermissions,
  getStoredRole,
} from "../../config/rolePermissions";

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

  status: ScheduleStatus;

  assignedHumanResourceId: string;

  notes: string;

  priority: string;
}

const priorityLabels: Record<number, string> = {
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
          status?: number;

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

    if (response?.status === 404) {
      return "Schedule was not found.";
    }

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

  return "Cannot update schedule.";
}

function getAllocationId(
  plan: AllocationPlan
): number {
  return Number(
    plan.allocationPlanId ?? 0
  );
}

function getAllocationLabel(
  plan: AllocationPlan
): string {
  const allocationId =
    getAllocationId(plan);

  const experimentName =
    plan.experimentName ||
    `Experiment #${plan.experimentId}`;

  return `Allocation #${allocationId} - ${experimentName}`;
}

function getPhaseLabel(
  phase: ExperimentPhase
): string {
  return `#${phase.experimentPhaseId} - Order ${phase.phaseOrder} - ${
    phase.phaseName ||
    "Unnamed phase"
  }`;
}

function getHumanResourceLabel(
  resource: HumanResourceProfile
): string {
  const name =
    resource.fullName ||
    resource.username ||
    resource.email ||
    `Human Resource #${resource.humanResourceId}`;

  const roleName =
    resource.roleName
      ? ` - ${resource.roleName}`
      : "";

  return `#${resource.humanResourceId} - ${name}${roleName}`;
}

function splitDateTime(
  value?: string | null
): {
  date: string;
  time: string;
} {
  if (!value) {
    return {
      date: "",
      time: "",
    };
  }

  const parsedDate =
    new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    const parts =
      value.split("T");

    return {
      date:
        parts[0] ?? "",

      time:
        parts[1]
          ?.slice(0, 5) ??
        "",
    };
  }

  const year =
    parsedDate.getFullYear();

  const month =
    String(
      parsedDate.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      parsedDate.getDate()
    ).padStart(2, "0");

  const hours =
    String(
      parsedDate.getHours()
    ).padStart(2, "0");

  const minutes =
    String(
      parsedDate.getMinutes()
    ).padStart(2, "0");

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
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
  const storedUserId =
    localStorage.getItem(
      "userId"
    );

  if (!storedUserId) {
    return null;
  }

  const userId =
    Number(storedUserId);

  if (
    !Number.isInteger(
      userId
    ) ||
    userId <= 0
  ) {
    return null;
  }

  return userId;
}

function getStatusLabel(
  status: ScheduleStatus
): string {
  if (status === "InProgress") {
    return "In Progress";
  }

  return status;
}

export default function EditSchedule() {
  const navigate =
    useNavigate();

  const role =
    getStoredRole();

  const permission =
    getPermissions(role);

  const { id } =
    useParams<{
      id: string;
    }>();

  const scheduleId =
    Number(id);

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
    originalCreatedBy,
    setOriginalCreatedBy,
  ] = useState<
    number | null
  >(null);

  const [
    form,
    setForm,
  ] = useState<ScheduleFormState>({
    allocationPlanId: "",
    phaseId: "",

    title: "",
    description: "",

    startDate: "",
    startTime: "",

    endDate: "",
    endTime: "",

    status: "Planned",

    assignedHumanResourceId: "",

    notes: "",

    priority: "1",
  });

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const selectedAllocation =
    useMemo(() => {
      return allocationPlans.find(
        (plan) =>
          getAllocationId(plan) ===
          Number(
            form.allocationPlanId
          )
      );
    }, [
      allocationPlans,
      form.allocationPlanId,
    ]);

  const selectedPhase =
    useMemo(() => {
      return phases.find(
        (phase) =>
          phase.experimentPhaseId ===
          Number(
            form.phaseId
          )
      );
    }, [
      phases,
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

  const availablePhases =
    useMemo(() => {
      if (!selectedAllocation) {
        return phases;
      }

      const experimentId =
        Number(
          selectedAllocation.experimentId
        );

      if (
        !Number.isInteger(
          experimentId
        ) ||
        experimentId <= 0
      ) {
        return phases;
      }

      return phases.filter(
        (phase) =>
          phase.experimentId ===
          experimentId
      );
    }, [
      phases,
      selectedAllocation,
    ]);

  useEffect(() => {
    async function loadPageData() {
      if (
        !id ||
        !Number.isInteger(
          scheduleId
        ) ||
        scheduleId <= 0
      ) {
        setError(
          "Invalid schedule ID."
        );

        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [
          scheduleData,
          allocationData,
          phaseData,
          humanData,
        ] = await Promise.all([
          getScheduleById(
            scheduleId
          ),

          getAllocationPlans(),

          getExperimentPhases({
            page: 1,
            size: 100,
          }),

          getHumanResourceProfiles({
            page: 1,
            size: 100,
          }),
        ]);

        const start =
          splitDateTime(
            scheduleData.startDate
          );

        const end =
          splitDateTime(
            scheduleData.endDate
          );

        setAllocationPlans(
          Array.isArray(
            allocationData
          )
            ? allocationData
            : []
        );

        setPhases(
          Array.isArray(
            phaseData
          )
            ? phaseData
            : []
        );

        setHumanResources(
          Array.isArray(
            humanData
          )
            ? humanData
            : []
        );

        setOriginalCreatedBy(
          scheduleData.createdBy ??
          null
        );

        if (
          !permission.canEditSchedule ||
          scheduleData.status !== "Planned"
        ) {
          setError(
            "This schedule cannot be edited. Only a Researcher can edit a schedule while it is still Planned."
          );
        }

        setForm({
          allocationPlanId:
            String(
              scheduleData.allocationPlanId
            ),

          phaseId:
            scheduleData.phaseId
              ? String(
                  scheduleData.phaseId
                )
              : "",

          title:
            scheduleData.title ??
            "",

          description:
            scheduleData.description ??
            "",

          startDate:
            start.date,

          startTime:
            start.time,

          endDate:
            end.date,

          endTime:
            end.time,

          status:
            scheduleData.status ??
            "Planned",

          assignedHumanResourceId:
            scheduleData.assignedHumanResourceId
              ? String(
                  scheduleData.assignedHumanResourceId
                )
              : "",

          notes:
            scheduleData.notes ??
            "",

          priority:
            String(
              scheduleData.priority ??
              1
            ),
        });
      } catch (loadError) {
        console.error(
          "Load schedule edit form failed:",
          loadError
        );

        setError(
          getErrorMessage(
            loadError
          )
        );
      } finally {
        setLoading(false);
      }
    }

    void loadPageData();
  }, [
    id,
    scheduleId,
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
      name ===
      "startDate"
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

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    if (
      !Number.isInteger(
        scheduleId
      ) ||
      scheduleId <= 0
    ) {
      setError(
        "Invalid schedule ID."
      );

      return;
    }

    if (
      !permission.canEditSchedule ||
      form.status !== "Planned"
    ) {
      setError(
        "Only a Researcher can edit a schedule while it is still Planned."
      );
      return;
    }

    const allocationPlanId =
      Number(
        form.allocationPlanId
      );

    const phaseId =
      form.phaseId
        ? Number(
            form.phaseId
          )
        : null;

    const assignedHumanResourceId =
      form.assignedHumanResourceId
        ? Number(
            form.assignedHumanResourceId
          )
        : null;

    const priority =
      Number(
        form.priority
      );

    const title =
      form.title.trim();

    const description =
      form.description.trim();

    const notes =
      form.notes.trim();

    if (
      !Number.isInteger(
        allocationPlanId
      ) ||
      allocationPlanId <= 0
    ) {
      setError(
        "Please select a valid allocation plan."
      );

      return;
    }

    if (
      phaseId !== null &&
      (
        !Number.isInteger(
          phaseId
        ) ||
        phaseId <= 0
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
      (
        !Number.isInteger(
          assignedHumanResourceId
        ) ||
        assignedHumanResourceId <= 0
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
        "Please select the start date and time."
      );

      return;
    }

    if (
      !form.endDate ||
      !form.endTime
    ) {
      setError(
        "Please select the end date and time."
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
      !Number.isInteger(
        priority
      ) ||
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
      selectedAllocation &&
      selectedPhase.experimentId !==
        Number(
          selectedAllocation.experimentId
        )
    ) {
      setError(
        "The selected phase does not belong to the allocation experiment."
      );

      return;
    }

    try {
      setSaving(true);

      await updateSchedule(
        scheduleId,
        {
          allocationPlanId,

          phaseId,

          title,

          description:
            description ||
            null,

          startDate,

          endDate,

          status:
            form.status,

          createdBy:
            originalCreatedBy ??
            getCurrentUserId(),

          assignedHumanResourceId,

          notes:
            notes ||
            null,

          priority,
        }
      );

      navigate(
        `/schedules/${scheduleId}`,
        {
          replace: true,
        }
      );
    } catch (submitError) {
      console.error(
        "Update schedule failed:",
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
            Loading schedule...
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
              Dashboard / Schedules / Edit
            </p>

            <h1>
              Edit Schedule
            </h1>

            <p>
              Update schedule information while it is still Planned. Status changes are handled by the Technician workflow.
            </p>
          </div>

          <button
            type="button"
            className="requirement-back-button"
            onClick={() =>
              navigate(
                `/schedules/${scheduleId}`
              )
            }
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
          onSubmit={
            handleSubmit
          }
        >
          <section className="requirement-form-card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <CalendarDays size={21} />

              <h2>
                Schedule Information
              </h2>
            </div>

            <label htmlFor="allocationPlanId">
              Allocation Plan
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
              disabled={saving}
              required
            >
              <option value="">
                Select allocation plan
              </option>

              {allocationPlans.map(
                (plan) => {
                  const planId =
                    getAllocationId(
                      plan
                    );

                  return (
                    <option
                      key={planId}
                      value={planId}
                    >
                      {getAllocationLabel(
                        plan
                      )}
                    </option>
                  );
                }
              )}
            </select>

            <label htmlFor="phaseId">
              Experiment Phase
            </label>

            <select
              id="phaseId"
              name="phaseId"
              value={
                form.phaseId
              }
              onChange={
                handleChange
              }
              disabled={
                saving ||
                !form.allocationPlanId
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
              value={
                form.title
              }
              onChange={
                handleChange
              }
              disabled={saving}
              placeholder="Enter schedule title"
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
              value={
                form.priority
              }
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

            <div className="schedule-system-status">
              <span>Current Status</span>

              <strong>
                {getStatusLabel(
                  form.status
                )}
              </strong>

              <small>
                Schedule status is controlled by the workflow. Technician updates progress from the Schedule Detail page.
              </small>
            </div>
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
              value={
                form.notes
              }
              onChange={
                handleChange
              }
              disabled={saving}
              placeholder="Enter additional instructions..."
            />

            <div className="requirement-preview">
              <div>
                <span>
                  Schedule ID
                </span>

                <strong>
                  #{scheduleId}
                </strong>
              </div>

              <div>
                <span>
                  Allocation
                </span>

                <strong>
                  {selectedAllocation
                    ? getAllocationLabel(
                        selectedAllocation
                      )
                    : "Not selected"}
                </strong>
              </div>

              <div>
                <span>
                  Phase
                </span>

                <strong>
                  {selectedPhase
                    ? selectedPhase.phaseName
                    : "No specific phase"}
                </strong>
              </div>

              <div>
                <span>
                  Assigned Human
                </span>

                <strong>
                  {selectedHumanResource
                    ? selectedHumanResource.fullName ||
                      selectedHumanResource.username ||
                      `#${selectedHumanResource.humanResourceId}`
                    : "Not assigned"}
                </strong>
              </div>

              <div>
                <span>
                  Start
                </span>

                <strong>
                  {form.startDate &&
                  form.startTime
                    ? `${form.startDate} ${form.startTime}`
                    : "-"}
                </strong>
              </div>

              <div>
                <span>
                  End
                </span>

                <strong>
                  {form.endDate &&
                  form.endTime
                    ? `${form.endDate} ${form.endTime}`
                    : "-"}
                </strong>
              </div>

              <div>
                <span>
                  Priority
                </span>

                <strong>
                  {priorityLabels[
                    Number(
                      form.priority
                    )
                  ] || "-"}
                </strong>
              </div>

              <div>
                <span>
                  Status
                </span>

                <strong>
                  {getStatusLabel(
                    form.status
                  )}
                </strong>
              </div>
            </div>

            <div className="requirement-form-actions">
              <button
                type="button"
                className="requirement-cancel-button"
                disabled={saving}
                onClick={() =>
                  navigate(
                    `/schedules/${scheduleId}`
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="requirement-save-button"
                disabled={
                  saving ||
                  !permission.canEditSchedule ||
                  form.status !== "Planned" ||
                  !form.allocationPlanId ||
                  !form.title.trim() ||
                  !form.startDate ||
                  !form.startTime ||
                  !form.endDate ||
                  !form.endTime
                }
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </DashboardLayout>
  );
}