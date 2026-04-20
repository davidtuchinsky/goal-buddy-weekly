import { useMemo } from "react";
import { useLocalStorage } from "@/lib/storage";
import {
  EMPTY_WEEK,
  type LibraryTask,
  type Objective,
  type TaskInstance,
  type WeekState,
  recurringKey,
} from "@/lib/types";
import type { DayName } from "@/lib/week";
import { weekKey } from "@/lib/week";

/** Global (cross-week) state: objectives + library. */
export function useGlobalState() {
  const [objectives, setObjectives] = useLocalStorage<Objective[]>(
    "weekly:objectives",
    [],
  );
  const [library, setLibrary] = useLocalStorage<LibraryTask[]>(
    "weekly:library",
    [],
  );
  return { objectives, setObjectives, library, setLibrary };
}

/** Per-week state: ad-hoc tasks + completion overrides. */
export function useWeekState(weekStart: Date) {
  const key = `weekly:week:${weekKey(weekStart)}`;
  const [week, setWeek] = useLocalStorage<WeekState>(key, EMPTY_WEEK);
  return { week, setWeek };
}

/**
 * Computes the visible task instances for a given day by merging:
 *  - Ad-hoc tasks for that day
 *  - Generated recurring instances from the library
 */
export function useDayInstances(
  day: DayName,
  library: LibraryTask[],
  week: WeekState,
): TaskInstance[] {
  return useMemo(() => {
    const adHoc = week.adHoc.filter((t) => t.day === day);

    const recurring: TaskInstance[] = [];
    for (const lib of library) {
      if (lib.recurrence.kind !== "weekly") continue;
      if (!lib.recurrence.days.includes(day)) continue;
      const k = recurringKey(lib.id, day);
      if (week.recurringSkipped[k]) continue;
      recurring.push({
        id: `rec:${k}`,
        libraryId: lib.id,
        text: lib.text,
        objectiveId: lib.objectiveId,
        day,
        done: !!week.recurringDone[k],
      });
    }
    return [...recurring, ...adHoc];
  }, [day, library, week]);
}
