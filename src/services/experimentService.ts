import api from "./api";

import type {
  ExperimentCreateRequest,
  ExperimentQuery,
  ExperimentResponse,
  ExperimentUpdateRequest,
} from "../types/experiment";

function unwrapResponse<T>(response: any): T {
  return response?.data?.data ?? response?.data ?? response;
}

export async function getExperiments(
  query?: ExperimentQuery
): Promise<ExperimentResponse[]> {
  const response = await api.get("/Experiments", {
    params: {
      Keyword: query?.keyword,
      Status: query?.status,
      Priority: query?.priority,
      Page: query?.page,
      Size: query?.size,
    },
  });

  const data = unwrapResponse<any>(response);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

export async function getExperimentById(
  id: number
): Promise<ExperimentResponse> {
  const response = await api.get(`/Experiments/${id}`);
  return unwrapResponse<ExperimentResponse>(response);
}

export async function createExperiment(
  payload: ExperimentCreateRequest
): Promise<ExperimentResponse> {
  const response = await api.post("/Experiments", payload);
  return unwrapResponse<ExperimentResponse>(response);
}

export async function updateExperiment(
  id: number,
  payload: ExperimentUpdateRequest
): Promise<ExperimentResponse> {
  const response = await api.put(`/Experiments/${id}`, payload);
  return unwrapResponse<ExperimentResponse>(response);
}

export async function deleteExperiment(id: number): Promise<void> {
  await api.delete(`/Experiments/${id}`);
}