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
  const response =
    await api.post(
      "/Experiments",
      payload
    );

  return unwrapResponse<ExperimentResponse>(
    response.data
  );
}

export async function updateExperiment(
  id: number,
  payload: ExperimentUpdateRequest
): Promise<ExperimentResponse> {
  validateExperimentId(id);

  const response =
    await api.put(
      `/Experiments/${id}`,
      payload
    );

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