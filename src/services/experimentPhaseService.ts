import api from "./api";

import type {
  ExperimentPhase,
  ExperimentPhaseQuery,
  ExperimentPhaseRequest,
  ExperimentPhaseStatus,
} from "../types/experimentPhase";

interface ApiEnvelope<T> {
  data?: T;
  message?: string;
}

interface PaginatedResponse<T> {
  items?: T[];
  data?: T[];
  results?: T[];
  totalItems?: number;
  page?: number;
  size?: number;
}

function getNumber(
  value: unknown,
  fallback = 0
): number {
  const parsedValue =
    Number(value);

  return Number.isFinite(
    parsedValue
  )
    ? parsedValue
    : fallback;
}

function getString(
  value: unknown,
  fallback = ""
): string {
  if (
    typeof value === "string"
  ) {
    return value;
  }

  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  return String(value);
}

function normalizeStatus(
  value: unknown
): ExperimentPhaseStatus {
  const status =
    getString(value);

  if (
    status === "InProgress" ||
    status === "Completed" ||
    status === "Cancelled"
  ) {
    return status;
  }

  return "Planned";
}

function normalizeExperimentPhase(
  value: unknown
): ExperimentPhase {
  const item =
    value as Record<
      string,
      unknown
    >;

  return {
    experimentPhaseId:
      getNumber(
        item.experimentPhaseId ??
          item.phaseId
      ),

    experimentId:
      getNumber(
        item.experimentId
      ),

    experimentName:
      getString(
        item.experimentName
      ),

    phaseName:
      getString(
        item.phaseName
      ),

    phaseDescription:
      item.phaseDescription ===
        null ||
      item.phaseDescription ===
        undefined
        ? null
        : getString(
            item.phaseDescription
          ),

    phaseOrder:
      getNumber(
        item.phaseOrder
      ),

    expectedStartDate:
      getString(
        item.expectedStartDate
      ),

    expectedEndDate:
      getString(
        item.expectedEndDate
      ),

    status:
      normalizeStatus(
        item.status
      ),

    createdAt:
      item.createdAt ===
        null ||
      item.createdAt ===
        undefined
        ? null
        : getString(
            item.createdAt
          ),

    updatedAt:
      item.updatedAt ===
        null ||
      item.updatedAt ===
        undefined
        ? null
        : getString(
            item.updatedAt
          ),
  };
}

function extractSingleData(
  responseData: unknown
): unknown {
  if (
    typeof responseData !==
      "object" ||
    responseData === null
  ) {
    return responseData;
  }

  const envelope =
    responseData as ApiEnvelope<unknown>;

  return (
    envelope.data ??
    responseData
  );
}

function extractArrayData(
  responseData: unknown
): unknown[] {
  if (
    Array.isArray(
      responseData
    )
  ) {
    return responseData;
  }

  if (
    typeof responseData !==
      "object" ||
    responseData === null
  ) {
    return [];
  }

  const envelope =
    responseData as ApiEnvelope<
      unknown
    >;

  const envelopeData =
    envelope.data;

  if (
    Array.isArray(
      envelopeData
    )
  ) {
    return envelopeData;
  }

  const page =
    (
      envelopeData ??
      responseData
    ) as PaginatedResponse<unknown>;

  if (
    Array.isArray(
      page.items
    )
  ) {
    return page.items;
  }

  if (
    Array.isArray(
      page.data
    )
  ) {
    return page.data;
  }

  if (
    Array.isArray(
      page.results
    )
  ) {
    return page.results;
  }

  return [];
}

export async function getExperimentPhases(
  query: ExperimentPhaseQuery = {}
): Promise<ExperimentPhase[]> {
  const response =
    await api.get(
      "/ExperimentPhases",
      {
        params: {
          Keyword:
            query.keyword,

          ExperimentId:
            query.experimentId,

          Status:
            query.status,

          ExpectedStartDateFrom:
            query.expectedStartDateFrom,

          ExpectedStartDateTo:
            query.expectedStartDateTo,

          Page:
            query.page,

          Size:
            query.size,
        },
      }
    );

  return extractArrayData(
    response.data
  ).map(
    normalizeExperimentPhase
  );
}

export async function getExperimentPhaseById(
  id: number
): Promise<ExperimentPhase> {
  const response =
    await api.get(
      `/ExperimentPhases/${id}`
    );

  return normalizeExperimentPhase(
    extractSingleData(
      response.data
    )
  );
}

export async function createExperimentPhase(
  payload: ExperimentPhaseRequest
): Promise<ExperimentPhase> {
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
    experimentId: Number(payload.experimentId),
    phaseName: String(payload.phaseName || "").trim(),
    phaseDescription: payload.phaseDescription ? String(payload.phaseDescription).trim() : "",
    phaseOrder: Number(payload.phaseOrder) || 1,
    expectedStartDate: sanitizeDate(payload.expectedStartDate),
    expectedEndDate: sanitizeDate(payload.expectedEndDate),
    status: payload.status || "Planned",
  };

  const response = await api.post("/ExperimentPhases", sanitizedPayload);

  return normalizeExperimentPhase(
    extractSingleData(
      response.data
    )
  );
}

export async function updateExperimentPhase(
  id: number,
  payload: ExperimentPhaseRequest
): Promise<ExperimentPhase> {
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
    experimentId: Number(payload.experimentId),
    phaseName: String(payload.phaseName || "").trim(),
    phaseDescription: payload.phaseDescription ? String(payload.phaseDescription).trim() : "",
    phaseOrder: Number(payload.phaseOrder) || 1,
    expectedStartDate: sanitizeDate(payload.expectedStartDate),
    expectedEndDate: sanitizeDate(payload.expectedEndDate),
    status: payload.status || "Planned",
  };

  const response = await api.put(`/ExperimentPhases/${id}`, sanitizedPayload);

  return normalizeExperimentPhase(
    extractSingleData(
      response.data
    )
  );
}

export async function deleteExperimentPhase(
  id: number
): Promise<void> {
  await api.delete(
    `/ExperimentPhases/${id}`
  );
}