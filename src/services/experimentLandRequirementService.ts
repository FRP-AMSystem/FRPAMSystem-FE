import api from "./api";

import type {
  ExperimentLandRequirement,
  ExperimentLandRequirementQuery,
  ExperimentLandRequirementRequest,
} from "../types/experimentLandRequirement";

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

function normalizeRequirement(
  value: unknown
): ExperimentLandRequirement {
  const item = isRecord(value)
    ? value
    : {};

  return {
    ...(item as unknown as ExperimentLandRequirement),

    expLandReqId: Number(
      item.expLandReqId ??
        item.expLandRequirementId ??
        item.id ??
        0
    ),

    experimentId: Number(
      item.experimentId ?? 0
    ),

    experimentName:
      typeof item.experimentName === "string"
        ? item.experimentName
        : undefined,

    requiredArea: Number(
      item.requiredArea ?? 0
    ),

    requiredSoilType:
      typeof item.requiredSoilType === "string"
        ? item.requiredSoilType
        : null,

    note:
      typeof item.note === "string"
        ? item.note
        : null,

    createdAt:
      typeof item.createdAt === "string"
        ? item.createdAt
        : undefined,

    updatedAt:
      typeof item.updatedAt === "string"
        ? item.updatedAt
        : null,
  };
}

export async function getExperimentLandRequirements(
  query: ExperimentLandRequirementQuery = {}
): Promise<
  ExperimentLandRequirement[]
> {
  const response =
    await api.get(
      "/ExperimentLandRequirements",
      {
        params: cleanParams({
          Keyword: query.keyword,
          ExperimentId:
            query.experimentId,
          RequiredSoilType:
            query.requiredSoilType,
          Page: query.page,
          Size: query.size,
        }),
      }
    );

  return normalizeList<unknown>(
    response.data
  ).map(
    normalizeRequirement
  );
}

export async function getExperimentLandRequirementById(
  id: number
): Promise<ExperimentLandRequirement> {
  validateId(
    id,
    "Experiment land requirement ID"
  );

  const response =
    await api.get(
      `/ExperimentLandRequirements/${id}`
    );

  return normalizeRequirement(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function createExperimentLandRequirement(
  payload: ExperimentLandRequirementRequest
): Promise<ExperimentLandRequirement> {
  const response =
    await api.post(
      "/ExperimentLandRequirements",
      payload
    );

  return normalizeRequirement(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function updateExperimentLandRequirement(
  id: number,
  payload: ExperimentLandRequirementRequest
): Promise<ExperimentLandRequirement> {
  validateId(
    id,
    "Experiment land requirement ID"
  );

  const response =
    await api.put(
      `/ExperimentLandRequirements/${id}`,
      payload
    );

  return normalizeRequirement(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function deleteExperimentLandRequirement(
  id: number
): Promise<void> {
  validateId(
    id,
    "Experiment land requirement ID"
  );

  await api.delete(
    `/ExperimentLandRequirements/${id}`
  );
}