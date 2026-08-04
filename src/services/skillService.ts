import api from "./api";

import type {
  Skill,
  SkillQuery,
  SkillRequest,
} from "../types/skill";

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null
  );
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

function normalizeList(
  payload: unknown
): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if ("data" in payload) {
    return normalizeList(
      payload.data
    );
  }

  if ("result" in payload) {
    return normalizeList(
      payload.result
    );
  }

  return [];
}

function normalizeNullableString(
  value: unknown
): string | null {
  return typeof value === "string"
    ? value
    : null;
}

function normalizeSkill(
  value: unknown
): Skill {
  const item =
    isRecord(value)
      ? value
      : {};

  return {
    skillId: Number(
      item.skillId ??
      item.id ??
      0
    ),

    skillName:
      typeof item.skillName ===
        "string"
        ? item.skillName
        : typeof item.name ===
          "string"
          ? item.name
          : "",

    description:
      normalizeNullableString(
        item.description
      ),

    createdAt:
      normalizeNullableString(
        item.createdAt
      ),

    updatedAt:
      normalizeNullableString(
        item.updatedAt
      ),
  };
}

function validateId(
  id: number
): void {
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Skill ID is invalid."
    );
  }
}

export async function getSkills(
  query: SkillQuery = {}
): Promise<Skill[]> {
  const response =
    await api.get(
      "/Skills",
      {
        params: cleanParams({
          Keyword:
            query.keyword,

          Page:
            query.page ?? 1,

          Size:
            query.size ?? 200,
        }),
      }
    );

  return normalizeList(
    response.data
  ).map(
    normalizeSkill
  );
}

export async function getSkillById(
  id: number
): Promise<Skill> {
  validateId(id);

  const response =
    await api.get(
      `/Skills/${id}`
    );

  return normalizeSkill(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function createSkill(
  payload: SkillRequest
): Promise<Skill> {
  const response =
    await api.post(
      "/Skills",
      payload
    );

  return normalizeSkill(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function updateSkill(
  id: number,
  payload: SkillRequest
): Promise<Skill> {
  validateId(id);

  const response =
    await api.put(
      `/Skills/${id}`,
      payload
    );

  return normalizeSkill(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function deleteSkill(
  id: number
): Promise<void> {
  validateId(id);

  await api.delete(
    `/Skills/${id}`
  );
}