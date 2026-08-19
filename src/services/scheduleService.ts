import api from "./api";

import type {
  Schedule,
  ScheduleQuery,
  ScheduleRequest,
  ScheduleStatus,
} from "../types/schedule";

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null
  );
}

function validateId(
  id: number,
  fieldName: string
): void {
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      `${fieldName} is invalid.`
    );
  }
}

function cleanParams(
  params: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== ""
    )
  );
}

function unwrapResponse<T>(
  payload: unknown
): T {
  if (!isRecord(payload)) {
    return payload as T;
  }

  if (
    "data" in payload &&
    payload.data !== undefined
  ) {
    return unwrapResponse<T>(
      payload.data
    );
  }

  if (
    "result" in payload &&
    payload.result !== undefined
  ) {
    return unwrapResponse<T>(
      payload.result
    );
  }

  return payload as T;
}

function normalizeList<T>(
  payload: unknown
): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!isRecord(payload)) {
    return [];
  }

  if (
    Array.isArray(
      payload.items
    )
  ) {
    return payload.items as T[];
  }

  if ("data" in payload) {
    return normalizeList<T>(
      payload.data
    );
  }

  if ("result" in payload) {
    return normalizeList<T>(
      payload.result
    );
  }

  return [];
}

function normalizeStatus(
  value: unknown
): ScheduleStatus {
  if (
    value === "InProgress" ||
    value === "Completed" ||
    value === "Cancelled"
  ) {
    return value;
  }

  return "Planned";
}

function normalizeSchedule(
  value: unknown
): Schedule {
  const item =
    isRecord(value)
      ? value
      : {};

  return {
    ...(item as unknown as Schedule),

    scheduleId: Number(
      item.scheduleId ??
      item.id ??
      0
    ),

    allocationPlanId: Number(
      item.allocationPlanId ??
      0
    ),

    allocationPlanName:
      typeof item.allocationPlanName ===
        "string"
        ? item.allocationPlanName
        : null,

    phaseId:
      item.phaseId === null ||
        item.phaseId === undefined
        ? null
        : Number(item.phaseId),

    phaseName:
      typeof item.phaseName ===
        "string"
        ? item.phaseName
        : null,

    title:
      typeof item.title ===
        "string"
        ? item.title
        : null,

    description:
      typeof item.description ===
        "string"
        ? item.description
        : null,

    startDate:
      typeof item.startDate ===
        "string"
        ? item.startDate
        : "",

    endDate:
      typeof item.endDate ===
        "string"
        ? item.endDate
        : "",

    status:
      normalizeStatus(
        item.status
      ),

    createdBy:
      item.createdBy === null ||
        item.createdBy === undefined
        ? null
        : Number(item.createdBy),

    createdByName:
      typeof item.createdByName ===
        "string"
        ? item.createdByName
        : null,

    assignedHumanResourceId:
      item.assignedHumanResourceId ===
        null ||
        item.assignedHumanResourceId ===
        undefined
        ? null
        : Number(
          item.assignedHumanResourceId
        ),

    assignedHumanResourceName:
      typeof item.assignedHumanResourceName ===
        "string"
        ? item.assignedHumanResourceName
        : null,

    notes:
      typeof item.notes ===
        "string"
        ? item.notes
        : null,

    priority: Number(
      item.priority ?? 0
    ),

    createdAt:
      typeof item.createdAt ===
        "string"
        ? item.createdAt
        : null,

    updatedAt:
      typeof item.updatedAt ===
        "string"
        ? item.updatedAt
        : null,
  };
}

export async function getSchedules(
  query: ScheduleQuery = {}
): Promise<Schedule[]> {
  const response =
    await api.get(
      "/Schedules",
      {
        params: cleanParams({
          Keyword:
            query.keyword,

          AllocationPlanId:
            query.allocationPlanId,

          PhaseId:
            query.phaseId,

          AssignedHumanResourceId:
            query.assignedHumanResourceId,

          CreatedBy:
            query.createdBy,

          Status:
            query.status,

          StartDateFrom:
            query.startDateFrom,

          StartDateTo:
            query.startDateTo,

          Page:
            query.page,

          Size:
            query.size,
        }),
      }
    );

  return normalizeList<unknown>(
    response.data
  ).map(
    normalizeSchedule
  );
}

export async function getScheduleById(
  id: number
): Promise<Schedule> {
  validateId(
    id,
    "Schedule ID"
  );

  const response =
    await api.get(
      `/Schedules/${id}`
    );

  return normalizeSchedule(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function getMySchedules(
  query: ScheduleQuery = {}
): Promise<Schedule[]> {
  const response = await api.get("/Schedules/mine", {
    params: cleanParams({
      Keyword: query.keyword,
      AllocationPlanId: query.allocationPlanId,
      PhaseId: query.phaseId,
      AssignedHumanResourceId: query.assignedHumanResourceId,
      CreatedBy: query.createdBy,
      Status: query.status,
      StartDateFrom: query.startDateFrom,
      StartDateTo: query.startDateTo,
      Page: query.page,
      Size: query.size,
    }),
  });

  return normalizeList<unknown>(response.data).map(normalizeSchedule);
}

export async function getMyScheduleById(id: number): Promise<Schedule> {
  validateId(id, "Schedule ID");
  const response = await api.get(`/Schedules/mine/${id}`);
  return normalizeSchedule(unwrapResponse<unknown>(response.data));
}

export async function createSchedule(
  payload: ScheduleRequest
): Promise<Schedule> {
  const response =
    await api.post(
      "/Schedules",
      payload
    );

  return normalizeSchedule(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function updateSchedule(
  id: number,
  payload: ScheduleRequest
): Promise<Schedule> {
  validateId(
    id,
    "Schedule ID"
  );

  const response =
    await api.put(
      `/Schedules/${id}`,
      payload
    );

  return normalizeSchedule(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function deleteSchedule(
  id: number
): Promise<void> {
  validateId(
    id,
    "Schedule ID"
  );

  await api.delete(
    `/Schedules/${id}`
  );
}

export async function updateScheduleStatus(
  id: number,
  newStatus: ScheduleStatus,
  notes?: string
): Promise<Schedule> {
  validateId(id, "Schedule ID");
  try {
    const response = await api.patch(`/Schedules/${id}/status`, {
      status: newStatus,
      notes: notes || undefined,
    });
    return normalizeSchedule(unwrapResponse<unknown>(response.data));
  } catch {
    const current = await getScheduleById(id);
    const updated = await updateSchedule(id, {
      allocationPlanId: current.allocationPlanId,
      phaseId: current.phaseId || null,
      title: current.title || null,
      description: current.description || null,
      startDate: current.startDate,
      endDate: current.endDate,
      status: newStatus,
      createdBy: current.createdBy || null,
      assignedHumanResourceId: current.assignedHumanResourceId || null,
      notes: notes ? `${current.notes || ''}\n[Status Update]: ${notes}`.trim() : (current.notes || null),
      priority: current.priority,
    });
    return updated;
  }
}