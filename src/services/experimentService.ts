import api from "./api";
import type { ApiResponse } from "../types/allocation";
import type { ExperimentResponse } from "../types/experiment";

type PagedResult<T> = {
  items?: T[];
  data?: T[];
  totalItems?: number;
  totalCount?: number;
};

export async function getExperiments() {
  const response = await api.get<ApiResponse<ExperimentResponse[] | PagedResult<ExperimentResponse>>>(
    "/Experiments"
  );

  const result = response.data.data;

  if (Array.isArray(result)) {
    return result;
  }

  return result.items ?? result.data ?? [];
}