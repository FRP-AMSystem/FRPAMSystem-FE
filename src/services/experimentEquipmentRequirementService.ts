import api from "./api";
import type {
  ExperimentEquipmentRequirement,
  ExperimentEquipmentRequirementQuery,
} from "../types/experimentEquipmentRequirement";

type ApiResponse<T> = {
  data?: T;
  items?: T;
  result?: T;
};

function unwrapResponse<T>(responseData: T | ApiResponse<T>): T {
  if (
    responseData &&
    typeof responseData === "object" &&
    "data" in responseData
  ) {
    return (responseData as ApiResponse<T>).data as T;
  }

  if (
    responseData &&
    typeof responseData === "object" &&
    "items" in responseData
  ) {
    return (responseData as ApiResponse<T>).items as T;
  }

  if (
    responseData &&
    typeof responseData === "object" &&
    "result" in responseData
  ) {
    return (responseData as ApiResponse<T>).result as T;
  }

  return responseData as T;
}

export async function getExperimentEquipmentRequirements(
  query?: ExperimentEquipmentRequirementQuery
): Promise<ExperimentEquipmentRequirement[]> {
  const response = await api.get("/ExperimentEquipmentRequirements", {
    params: {
      Keyword: query?.keyword || undefined,
      ExperimentId: query?.experimentId || undefined,
      EquipmentTypeId: query?.equipmentTypeId || undefined,
      AllowSubstitute: query?.allowSubstitute,
      Page: query?.page || 1,
      Size: query?.size || 50,
    },
  });

  const data = unwrapResponse<ExperimentEquipmentRequirement[]>(response.data);

  return Array.isArray(data) ? data : [];
}

export async function getExperimentEquipmentRequirementById(
  id: number
): Promise<ExperimentEquipmentRequirement> {
  const response = await api.get(`/ExperimentEquipmentRequirements/${id}`);
  return unwrapResponse<ExperimentEquipmentRequirement>(response.data);
}

export async function createExperimentEquipmentRequirement(payload: {
  experimentId: number;
  equipmentTypeId: number;
  quantity: number;
  allowSubstitute: boolean;
  minAcceptableEfficiency: number;
  note?: string;
}) {
  const response = await api.post("/ExperimentEquipmentRequirements", payload);
  return unwrapResponse(response.data);
}

export async function updateExperimentEquipmentRequirement(
  id: number,
  payload: {
    experimentId: number;
    equipmentTypeId: number;
    quantity: number;
    allowSubstitute: boolean;
    minAcceptableEfficiency: number;
    note?: string;
  }
) {
  const response = await api.put(
    `/ExperimentEquipmentRequirements/${id}`,
    payload
  );

  return unwrapResponse(response.data);
}

export async function deleteExperimentEquipmentRequirement(id: number) {
  const response = await api.delete(`/ExperimentEquipmentRequirements/${id}`);
  return unwrapResponse(response.data);
}