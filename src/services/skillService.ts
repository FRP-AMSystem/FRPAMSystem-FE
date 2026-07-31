import api from "./api";

import type {
  SkillQuery,
  SkillResponse,
} from "../types/skill";

function normalizeSkillList(
  value: unknown
): SkillResponse[] {
  if (Array.isArray(value)) {
    return value as SkillResponse[];
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
      return response.items as SkillResponse[];
    }

    if (Array.isArray(response.data)) {
      return response.data as SkillResponse[];
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
        return nestedData.items as SkillResponse[];
      }

      if (Array.isArray(nestedData.data)) {
        return nestedData.data as SkillResponse[];
      }
    }
  }

  return [];
}

export async function getSkills(
  query: SkillQuery = {}
): Promise<SkillResponse[]> {
  const response = await api.get(
    "/Skills",
    {
      params: {
        Keyword:
          query.keyword || undefined,
        Page: query.page ?? 1,
        Size: query.size ?? 100,
      },
    }
  );

  return normalizeSkillList(
    response.data
  );
}