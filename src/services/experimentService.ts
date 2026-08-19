import api from "./api";

import type {
  ExperimentCreateRequest,
  ExperimentQuery,
  ExperimentResponse,
  ExperimentUpdateRequest,
} from "../types/experiment";

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null
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

function validateExperimentId(
  id: number
): void {
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Experiment ID is invalid."
    );
  }
}

export async function getExperiments(
  query: ExperimentQuery = {}
): Promise<ExperimentResponse[]> {
  const response =
    await api.get(
      "/Experiments",
      {
        params: cleanParams({
          Keyword:
            query.keyword,

          ResearcherId:
            query.researcherId,

          Status:
            query.status,

          Priority:
            query.priority,

          Page:
            query.page ?? 1,

          Size:
            query.size ?? 200,
        }),
      }
    );

  return normalizeList<ExperimentResponse>(
    response.data
  );
}

export async function getExperimentById(
  id: number
): Promise<ExperimentResponse> {
  validateExperimentId(id);

  const response =
    await api.get(
      `/Experiments/${id}`
    );

  return unwrapResponse<ExperimentResponse>(
    response.data
  );
}

export async function createExperiment(
  payload: ExperimentCreateRequest
): Promise<ExperimentResponse> {
  const sanitizeDate = (d?: string | null): string => {
    if (!d) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}T00:00:00`;
    }
    const clean = d.slice(0, 10);
    return `${clean}T00:00:00`;
  };

  const sanitizedPayload = {
    experimentName: String(payload.experimentName || "").trim(),
    description: payload.description ? String(payload.description).trim() : null,
    researcherId: Number(payload.researcherId) || 1,
    expectStartDate: sanitizeDate(payload.expectStartDate),
    expectEndDate: sanitizeDate(payload.expectEndDate),
    deadline: sanitizeDate(payload.deadline || payload.expectEndDate),
    priority: Number.isInteger(Number(payload.priority)) ? Number(payload.priority) : 1,
    status: payload.status || "Draft",
  };

  const response = await api.post("/Experiments", sanitizedPayload);

  return unwrapResponse<ExperimentResponse>(
    response.data
  );
}

export async function updateExperiment(
  id: number,
  payload: ExperimentUpdateRequest
): Promise<ExperimentResponse> {
  validateExperimentId(id);

  let researcherId = payload.researcherId ? Number(payload.researcherId) : undefined;
  if (!researcherId || isNaN(researcherId) || researcherId <= 0) {
    try {
      const stored = localStorage.getItem("userId");
      if (stored && Number(stored) > 0) {
        researcherId = Number(stored);
      }
    } catch {
      // ignore
    }
  }

  const sanitizedPayload = {
    experimentName: String(payload.experimentName || "").trim(),
    description: payload.description ? String(payload.description).trim() : null,
    researcherId: researcherId,
    expectStartDate: payload.expectStartDate,
    expectEndDate: payload.expectEndDate,
    deadline: payload.deadline,
    actualStartDate: payload.actualStartDate || null,
    actualEndDate: payload.actualEndDate || null,
    priority: payload.priority !== undefined && payload.priority !== null ? Number(payload.priority) : 1,
    status: payload.status || "Draft",
    rejectReason: payload.rejectReason || null,
  };

  const response = await api.put(`/Experiments/${id}`, sanitizedPayload);

  return unwrapResponse<ExperimentResponse>(
    response.data
  );
}

export async function deleteExperiment(
  id: number
): Promise<void> {
  validateExperimentId(id);

  await api.delete(
    `/Experiments/${id}`
  );
}

export async function submitExperiment(
  id: number
): Promise<ExperimentResponse> {
  validateExperimentId(id);

  const response =
    await api.post(
      `/Experiments/${id}/submit`
    );

  return unwrapResponse<ExperimentResponse>(
    response.data
  );
}