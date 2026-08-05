import {
  getSchedules,
} from "./scheduleService";

import type {
  Schedule,
  ScheduleQuery,
} from "../types/schedule";

import type {
  ScheduleConflict,
  ScheduleConflictQuery,
  ScheduleConflictSeverity,
  ScheduleConflictType,
} from "../types/scheduleConflict";

function isValidDate(
  value?: string | null
): boolean {
  if (!value) {
    return false;
  }

  return !Number.isNaN(
    new Date(value).getTime()
  );
}

function getTimestamp(
  value: string
): number {
  return new Date(value).getTime();
}

function schedulesOverlap(
  firstSchedule: Schedule,
  secondSchedule: Schedule
): boolean {
  if (
    !isValidDate(
      firstSchedule.startDate
    ) ||
    !isValidDate(
      firstSchedule.endDate
    ) ||
    !isValidDate(
      secondSchedule.startDate
    ) ||
    !isValidDate(
      secondSchedule.endDate
    )
  ) {
    return false;
  }

  const firstStart =
    getTimestamp(
      firstSchedule.startDate
    );

  const firstEnd =
    getTimestamp(
      firstSchedule.endDate
    );

  const secondStart =
    getTimestamp(
      secondSchedule.startDate
    );

  const secondEnd =
    getTimestamp(
      secondSchedule.endDate
    );

  return (
    firstStart <
      secondEnd &&
    secondStart <
      firstEnd
  );
}

function getOverlapPeriod(
  firstSchedule: Schedule,
  secondSchedule: Schedule
): {
  overlapStart: string;
  overlapEnd: string;
} {
  const firstStart =
    getTimestamp(
      firstSchedule.startDate
    );

  const firstEnd =
    getTimestamp(
      firstSchedule.endDate
    );

  const secondStart =
    getTimestamp(
      secondSchedule.startDate
    );

  const secondEnd =
    getTimestamp(
      secondSchedule.endDate
    );

  return {
    overlapStart:
      new Date(
        Math.max(
          firstStart,
          secondStart
        )
      ).toISOString(),

    overlapEnd:
      new Date(
        Math.min(
          firstEnd,
          secondEnd
        )
      ).toISOString(),
  };
}

function getDurationHours(
  startDate: string,
  endDate: string
): number {
  const start =
    getTimestamp(startDate);

  const end =
    getTimestamp(endDate);

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    end <= start
  ) {
    return 0;
  }

  return (
    end - start
  ) / 3_600_000;
}

function getSeverity(
  overlapStart: string,
  overlapEnd: string
): ScheduleConflictSeverity {
  const durationHours =
    getDurationHours(
      overlapStart,
      overlapEnd
    );

  if (
    durationHours >= 4
  ) {
    return "High";
  }

  if (
    durationHours >= 1
  ) {
    return "Medium";
  }

  return "Low";
}

function createConflictId(
  conflictType: ScheduleConflictType,
  firstScheduleId: number,
  secondScheduleId: number
): string {
  const firstId =
    Math.min(
      firstScheduleId,
      secondScheduleId
    );

  const secondId =
    Math.max(
      firstScheduleId,
      secondScheduleId
    );

  return `${conflictType}-${firstId}-${secondId}`;
}

function getScheduleTitle(
  schedule: Schedule
): string {
  return (
    schedule.title?.trim() ||
    `Schedule #${schedule.scheduleId}`
  );
}

function isActiveSchedule(
  schedule: Schedule
): boolean {
  return (
    schedule.status !==
      "Cancelled"
  );
}

function createHumanResourceConflict(
  firstSchedule: Schedule,
  secondSchedule: Schedule
): ScheduleConflict | null {
  const firstHumanId =
    firstSchedule.assignedHumanResourceId;

  const secondHumanId =
    secondSchedule.assignedHumanResourceId;

  if (
    !firstHumanId ||
    !secondHumanId ||
    firstHumanId !==
      secondHumanId
  ) {
    return null;
  }

  if (
    !schedulesOverlap(
      firstSchedule,
      secondSchedule
    )
  ) {
    return null;
  }

  const {
    overlapStart,
    overlapEnd,
  } = getOverlapPeriod(
    firstSchedule,
    secondSchedule
  );

  const resourceName =
    firstSchedule.assignedHumanResourceName ||
    secondSchedule.assignedHumanResourceName ||
    `Human Resource #${firstHumanId}`;

  return {
    conflictId:
      createConflictId(
        "HumanResourceOverlap",
        firstSchedule.scheduleId,
        secondSchedule.scheduleId
      ),

    conflictType:
      "HumanResourceOverlap",

    severity:
      getSeverity(
        overlapStart,
        overlapEnd
      ),

    title:
      `Human resource schedule conflict`,

    description:
      `${resourceName} is assigned to both "${getScheduleTitle(
        firstSchedule
      )}" and "${getScheduleTitle(
        secondSchedule
      )}" during the same period.`,

    resourceId:
      firstHumanId,

    resourceName,

    firstSchedule,
    secondSchedule,

    overlapStart,
    overlapEnd,
  };
}

function createAllocationConflict(
  firstSchedule: Schedule,
  secondSchedule: Schedule
): ScheduleConflict | null {
  if (
    firstSchedule.allocationPlanId <=
      0 ||
    firstSchedule.allocationPlanId !==
      secondSchedule.allocationPlanId
  ) {
    return null;
  }

  if (
    firstSchedule.phaseId &&
    secondSchedule.phaseId &&
    firstSchedule.phaseId ===
      secondSchedule.phaseId
  ) {
    return null;
  }

  if (
    !schedulesOverlap(
      firstSchedule,
      secondSchedule
    )
  ) {
    return null;
  }

  const {
    overlapStart,
    overlapEnd,
  } = getOverlapPeriod(
    firstSchedule,
    secondSchedule
  );

  const allocationName =
    firstSchedule.allocationPlanName ||
    secondSchedule.allocationPlanName ||
    `Allocation #${firstSchedule.allocationPlanId}`;

  return {
    conflictId:
      createConflictId(
        "AllocationOverlap",
        firstSchedule.scheduleId,
        secondSchedule.scheduleId
      ),

    conflictType:
      "AllocationOverlap",

    severity:
      getSeverity(
        overlapStart,
        overlapEnd
      ),

    title:
      "Allocation schedule overlap",

    description:
      `${allocationName} contains overlapping schedules "${getScheduleTitle(
        firstSchedule
      )}" and "${getScheduleTitle(
        secondSchedule
      )}".`,

    resourceId:
      firstSchedule.allocationPlanId,

    resourceName:
      allocationName,

    firstSchedule,
    secondSchedule,

    overlapStart,
    overlapEnd,
  };
}

function detectConflicts(
  schedules: Schedule[]
): ScheduleConflict[] {
  const activeSchedules =
    schedules.filter(
      isActiveSchedule
    );

  const conflicts:
    ScheduleConflict[] = [];

  const conflictIds =
    new Set<string>();

  for (
    let firstIndex = 0;
    firstIndex <
    activeSchedules.length;
    firstIndex += 1
  ) {
    for (
      let secondIndex =
        firstIndex + 1;
      secondIndex <
      activeSchedules.length;
      secondIndex += 1
    ) {
      const firstSchedule =
        activeSchedules[
          firstIndex
        ];

      const secondSchedule =
        activeSchedules[
          secondIndex
        ];

      const humanConflict =
        createHumanResourceConflict(
          firstSchedule,
          secondSchedule
        );

      if (
        humanConflict &&
        !conflictIds.has(
          humanConflict.conflictId
        )
      ) {
        conflictIds.add(
          humanConflict.conflictId
        );

        conflicts.push(
          humanConflict
        );
      }

      const allocationConflict =
        createAllocationConflict(
          firstSchedule,
          secondSchedule
        );

      if (
        allocationConflict &&
        !conflictIds.has(
          allocationConflict.conflictId
        )
      ) {
        conflictIds.add(
          allocationConflict.conflictId
        );

        conflicts.push(
          allocationConflict
        );
      }
    }
  }

  return conflicts.sort(
    (
      firstConflict,
      secondConflict
    ) =>
      getTimestamp(
        firstConflict.overlapStart
      ) -
      getTimestamp(
        secondConflict.overlapStart
      )
  );
}

function matchesQuery(
  conflict: ScheduleConflict,
  query: ScheduleConflictQuery
): boolean {
  if (
    query.conflictType &&
    conflict.conflictType !==
      query.conflictType
  ) {
    return false;
  }

  if (
    query.severity &&
    conflict.severity !==
      query.severity
  ) {
    return false;
  }

  if (
    query.startDateFrom
  ) {
    const filterStart =
      new Date(
        `${query.startDateFrom}T00:00:00`
      ).getTime();

    if (
      getTimestamp(
        conflict.overlapEnd
      ) < filterStart
    ) {
      return false;
    }
  }

  if (
    query.startDateTo
  ) {
    const filterEnd =
      new Date(
        `${query.startDateTo}T23:59:59`
      ).getTime();

    if (
      getTimestamp(
        conflict.overlapStart
      ) > filterEnd
    ) {
      return false;
    }
  }

  const keyword =
    query.keyword
      ?.trim()
      .toLowerCase();

  if (!keyword) {
    return true;
  }

  const searchableText = [
    conflict.title,
    conflict.description,
    conflict.resourceName,
    conflict.firstSchedule.title,
    conflict.secondSchedule.title,
    conflict.firstSchedule.phaseName,
    conflict.secondSchedule.phaseName,
    conflict.firstSchedule.allocationPlanName,
    conflict.secondSchedule.allocationPlanName,
  ]
    .filter(
      (
        value
      ): value is string =>
        typeof value ===
        "string"
    )
    .join(" ")
    .toLowerCase();

  return searchableText.includes(
    keyword
  );
}

export async function getScheduleConflicts(
  query: ScheduleConflictQuery = {}
): Promise<ScheduleConflict[]> {
  const scheduleQuery:
    ScheduleQuery = {
      startDateFrom:
        query.startDateFrom,

      startDateTo:
        query.startDateTo,

      page: 1,
      size: 500,
    };

  const schedules =
    await getSchedules(
      scheduleQuery
    );

  return detectConflicts(
    schedules
  ).filter(
    (conflict) =>
      matchesQuery(
        conflict,
        query
      )
  );
}