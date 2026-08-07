import {
  getAllocationPlans,
} from "./allocationPlanService";

import {
  getExperiments,
} from "./experimentService";

import type {
  AllocationPlan,
} from "../types/allocationPlan";

import type {
  ExperimentResponse,
} from "../types/experiment";

import type {
  Role,
} from "../config/rolePermissions";

export interface PlanningDashboardContext {
  allocationPlans: AllocationPlan[];

  /**
   * All experiments loaded for the current dashboard context.
   * For Researcher this contains the experiments assigned to that Researcher.
   * Other operational roles currently do not need this list.
   */
  experiments: ExperimentResponse[];
}

export interface PlanningDashboardContextOptions {
  role: Role;
  userId: number | null;
}

export async function getPlanningDashboardContext(
  options: PlanningDashboardContextOptions
): Promise<PlanningDashboardContext> {
  const {
    role,
    userId,
  } = options;

  if (role === "Admin") {
    return {
      allocationPlans: [],
      experiments: [],
    };
  }

  if (role !== "Researcher") {
    const allocationPlans =
      await getAllocationPlans({
        page: 1,
        size: 500,
      });

    return {
      allocationPlans,
      experiments: [],
    };
  }

  if (
    userId === null ||
    !Number.isInteger(userId) ||
    userId <= 0
  ) {
    throw new Error(
      "Cannot determine the current Researcher account. Please sign in again."
    );
  }

  const [
    experiments,
    allocationPlans,
  ] = await Promise.all([
    getExperiments({
      page: 1,
      size: 500,
    }),

    getAllocationPlans({
      page: 1,
      size: 500,
    }),
  ]);

  const researcherExperiments =
    experiments.filter(
      (experiment) =>
        experiment.researcherId ===
        userId
    );

  const researcherExperimentIds =
    new Set(
      researcherExperiments.map(
        (experiment) =>
          experiment.experimentId
      )
    );

  const researcherAllocationPlans =
    allocationPlans.filter(
      (plan) =>
        researcherExperimentIds.has(
          plan.experimentId
        )
    );

  return {
    allocationPlans:
      researcherAllocationPlans,

    experiments:
      researcherExperiments,
  };
}
