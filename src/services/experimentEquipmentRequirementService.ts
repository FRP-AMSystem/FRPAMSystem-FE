import api from "./api";

import type {
  ExperimentEquipmentRequirement,
  ExperimentEquipmentRequirementQuery,
} from "../types/experimentEquipmentRequirement";

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  result?: T;
};

type PaginatedResponse<T> = {
  size: number;
  page: number;
  total: number;
  totalPages: number;
  items: T[];
};

export interface ExperimentEquipmentRequirementPayload {
  experimentId: number;
  equipmentTypeId: number;
  quantity: number;
  allowSubstitute: boolean;
  minAcceptableEfficiency: number;
  note?: string;
}

function unwrapResponse<T>(responseData: T | ApiResponse<T>): T {
  if (
    responseData &&
    typeof responseData === "object" &&
    "data" in responseData
  ) {
    const data = (responseData as ApiResponse<T>).data;

    if (data !== undefined) {
      return data;
    }
  }

  if (
    responseData &&
    typeof responseData === "object" &&
    "result" in responseData
  ) {
    const result = (responseData as ApiResponse<T>).result;

    if (result !== undefined) {
      return result;
    }
  }

  return responseData as T;
}

export async function getExperimentEquipmentRequirements(
  query?: ExperimentEquipmentRequirementQuery
): Promise<ExperimentEquipmentRequirement[]> {
  const response = await api.get(
    "/ExperimentEquipmentRequirements",
    {
      params: {
        Keyword: query?.keyword || undefined,
        ExperimentId: query?.experimentId || undefined,
        EquipmentTypeId: query?.equipmentTypeId || undefined,
        AllowSubstitute: query?.allowSubstitute,
        Page: query?.page ?? 1,
        Size: query?.size ?? 50,
      },
    }
  );

  const paginatedData = unwrapResponse<
    PaginatedResponse<ExperimentEquipmentRequirement>
  >(response.data);

  return Array.isArray(paginatedData?.items)
    ? paginatedData.items
    : [];
}

export async function getExperimentEquipmentRequirementById(
  id: number
): Promise<ExperimentEquipmentRequirement> {
  const response = await api.get(
    `/ExperimentEquipmentRequirements/${id}`
  );

  return unwrapResponse<ExperimentEquipmentRequirement>(
    response.data
  );
}

export async function createExperimentEquipmentRequirement(
  payload: ExperimentEquipmentRequirementPayload
): Promise<ExperimentEquipmentRequirement> {
  const cleanBody: Record<string, unknown> = {
    experimentId: payload.experimentId,
    equipmentTypeId: payload.equipmentTypeId,
    quantity: payload.quantity,
  };

  if (typeof payload.allowSubstitute === "boolean") {
    cleanBody.allowSubstitute = payload.allowSubstitute;
  }

  if (payload.note && payload.note.trim()) {
    cleanBody.note = payload.note.trim();
  }

  const response = await api.post(
    "/ExperimentEquipmentRequirements",
    cleanBody
  );

  return unwrapResponse<ExperimentEquipmentRequirement>(
    response.data
  );
}

export async function updateExperimentEquipmentRequirement(
  id: number,
  payload: ExperimentEquipmentRequirementPayload
): Promise<ExperimentEquipmentRequirement> {
  const cleanBody: Record<string, unknown> = {
    experimentId: payload.experimentId,
    equipmentTypeId: payload.equipmentTypeId,
    quantity: payload.quantity,
  };

  if (typeof payload.allowSubstitute === "boolean") {
    cleanBody.allowSubstitute = payload.allowSubstitute;
  }

  if (payload.note && payload.note.trim()) {
    cleanBody.note = payload.note.trim();
  }

  const response = await api.put(
    `/ExperimentEquipmentRequirements/${id}`,
    cleanBody
  );

  return unwrapResponse<ExperimentEquipmentRequirement>(
    response.data
  );
}

export async function deleteExperimentEquipmentRequirement(
  id: number
): Promise<unknown> {
  const response = await api.delete(
    `/ExperimentEquipmentRequirements/${id}`
  );

  return unwrapResponse<unknown>(response.data);
}