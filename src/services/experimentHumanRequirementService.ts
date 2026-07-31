import api from "./api";

import type {
  ExperimentHumanRequirement,
  ExperimentHumanRequirementPagedResponse,
  ExperimentHumanRequirementQuery,
  ExperimentHumanRequirementRequest,
} from "../types/experimentHumanRequirement";

interface ApiEnvelope<T> {
  data?: T;
  items?: T extends Array<infer U> ? U[] : never;
  message?: string;
  success?: boolean;
}

function normalizeListResponse(
  value: unknown
): ExperimentHumanRequirement[] {
  if (Array.isArray(value)) {
    return value as ExperimentHumanRequirement[];
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    const response = value as {
      data?: unknown;
      items?: unknown;
    };

    if (Array.isArray(response.items)) {
      return response.items as ExperimentHumanRequirement[];
    }

    if (Array.isArray(response.data)) {
      return response.data as ExperimentHumanRequirement[];
    }

    if (
      typeof response.data === "object" &&
      response.data !== null
    ) {
      const nestedData = response.data as {
        items?: unknown;
        data?: unknown;
      };

      if (Array.isArray(nestedData.items)) {
        return nestedData.items as ExperimentHumanRequirement[];
      }

      if (Array.isArray(nestedData.data)) {
        return nestedData.data as ExperimentHumanRequirement[];
      }
    }
  }

  return [];
}

function normalizeSingleResponse(
  value: unknown
): ExperimentHumanRequirement {
  if (
    typeof value === "object" &&
    value !== null
  ) {
    const response = value as {
      data?: unknown;
      expHumanReqId?: number;
    };

    if (
      typeof response.expHumanReqId ===
      "number"
    ) {
      return response as ExperimentHumanRequirement;
    }

    if (
      typeof response.data === "object" &&
      response.data !== null
    ) {
      return response.data as ExperimentHumanRequirement;
    }
  }

  throw new Error(
    "Invalid human requirement response."
  );
}

export async function getExperimentHumanRequirements(
  query: ExperimentHumanRequirementQuery = {}
): Promise<ExperimentHumanRequirement[]> {
  const response = await api.get<
    | ExperimentHumanRequirement[]
    | ExperimentHumanRequirementPagedResponse
    | ApiEnvelope<
        ExperimentHumanRequirement[]
      >
  >(
    "/ExperimentHumanRequirements",
    {
      params: {
        Keyword:
          query.keyword || undefined,

        ExperimentId:
          query.experimentId ||
          undefined,

        RoleId:
          query.roleId || undefined,

        RequiredSkillId:
          query.requiredSkillId ||
          undefined,

        Page: query.page ?? 1,
        Size: query.size ?? 100,
      },
    }
  );

  return normalizeListResponse(
    response.data
  );
}

export async function getExperimentHumanRequirementById(
  id: number
): Promise<ExperimentHumanRequirement> {
  const response = await api.get(
    `/ExperimentHumanRequirements/${id}`
  );

  return normalizeSingleResponse(
    response.data
  );
}

export async function createExperimentHumanRequirement(
  payload: ExperimentHumanRequirementRequest
): Promise<ExperimentHumanRequirement> {
  const response = await api.post(
    "/ExperimentHumanRequirements",
    payload
  );

  return normalizeSingleResponse(
    response.data
  );
}

export async function updateExperimentHumanRequirement(
  id: number,
  payload: ExperimentHumanRequirementRequest
): Promise<ExperimentHumanRequirement> {
  const response = await api.put(
    `/ExperimentHumanRequirements/${id}`,
    payload
  );

  return normalizeSingleResponse(
    response.data
  );
}

export async function deleteExperimentHumanRequirement(
  id: number
): Promise<void> {
  await api.delete(
    `/ExperimentHumanRequirements/${id}`
  );
}