import api from "./api";

import type {
  HumanResourceSkill,
  HumanResourceSkillQuery,
  HumanResourceSkillRequest,
  SkillLevel,
} from "../types/humanResourceSkill";

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

function nullableString(
  value: unknown
): string | null {
  return typeof value === "string"
    ? value
    : null;
}

function nullableNumber(
  value: unknown
): number | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const result = Number(value);

  return Number.isFinite(result)
    ? result
    : null;
}

function normalizeSkillLevel(
  value: unknown
): SkillLevel {
  switch (value) {
    case "Beginner":
    case "Intermediate":
    case "Advanced":
    case "Expert":
      return value;

    default:
      return "Beginner";
  }
}

function normalizeHumanResourceSkill(
  value: unknown
): HumanResourceSkill {
  const item = isRecord(value)
    ? value
    : {};

  return {
    humanResourceSkillId: Number(
      item.humanResourceSkillId ??
        item.id ??
        0
    ),

    humanResourceId: Number(
      item.humanResourceId ??
        0
    ),

    userId: nullableNumber(
      item.userId
    ),

    fullName: nullableString(
      item.fullName
    ),

    username: nullableString(
      item.username
    ),

    email: nullableString(
      item.email
    ),

    roleName: nullableString(
      item.roleName
    ),

    skillId: Number(
      item.skillId ??
        0
    ),

    skillName: nullableString(
      item.skillName
    ),

    skillLevel: normalizeSkillLevel(
      item.skillLevel
    ),

    createdAt: nullableString(
      item.createdAt
    ),

    updatedAt: nullableString(
      item.updatedAt
    ),
  };
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

export async function getHumanResourceSkills(
  query: HumanResourceSkillQuery = {}
): Promise<HumanResourceSkill[]> {
  const response = await api.get(
    "/HumanResourceSkills",
    {
      params: cleanParams({
        Keyword: query.keyword,

        HumanResourceId:
          query.humanResourceId,

        UserId:
          query.userId,

        SkillId:
          query.skillId,

        SkillLevel:
          query.skillLevel,

        Page:
          query.page ?? 1,

        Size:
          query.size ?? 300,
      }),
    }
  );

  return normalizeList(
    response.data
  ).map(
    normalizeHumanResourceSkill
  );
}

export async function getHumanResourceSkillById(
  id: number
): Promise<HumanResourceSkill> {
  validateId(
    id,
    "Human resource skill ID"
  );

  const response = await api.get(
    `/HumanResourceSkills/${id}`
  );

  return normalizeHumanResourceSkill(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function createHumanResourceSkill(
  payload: HumanResourceSkillRequest
): Promise<HumanResourceSkill> {
  const response = await api.post(
    "/HumanResourceSkills",
    payload
  );

  return normalizeHumanResourceSkill(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function updateHumanResourceSkill(
  id: number,
  payload: HumanResourceSkillRequest
): Promise<HumanResourceSkill> {
  validateId(
    id,
    "Human resource skill ID"
  );

  const response = await api.put(
    `/HumanResourceSkills/${id}`,
    payload
  );

  return normalizeHumanResourceSkill(
    unwrapResponse<unknown>(
      response.data
    )
  );
}

export async function deleteHumanResourceSkill(
  id: number
): Promise<void> {
  validateId(
    id,
    "Human resource skill ID"
  );

  await api.delete(
    `/HumanResourceSkills/${id}`
  );
}