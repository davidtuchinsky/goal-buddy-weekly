import { useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "@/lib/storage";
import {
  EMPTY_WEEK,
  type BacklogItem,
  type EnergyRitual,
  type LibraryTask,
  type Objective,
  type RadarItem,
  type TaskInstance,
  type WeekState,
  recurringKey,
} from "@/lib/types";
import type { DayName } from "@/lib/week";
import { addDays, weekKey } from "@/lib/week";

/** Global (cross-week) state: library, energy rituals, backlog, radar. */
export function useGlobalState() {
  const [library, setLibrary] = useLocalStorage<LibraryTask[]>(
    "weekly:library",
    [],
  );
  const [rituals, setRituals] = useLocalStorage<EnergyRitual[]>(
    "weekly:rituals",
    [],
  );
  const [backlog, setBacklog] = useLocalStorage<BacklogItem[]>(
    "weekly:backlog",
    [],
  );
  const [radar, setRadar] = useLocalStorage<RadarItem[]>("weekly:radar", []);
  return {
    library,
    setLibrary,
    rituals,
    setRituals,
    backlog,
    setBacklog,
    radar,
    setRadar,
  };
}

/**
 * Per-week objectives (Big Rocks + Personal Goals).
 * Each week has its own list — they don't carry over automatically.
 * Migrates legacy global `weekly:objectives` into the *current* week on first run.
 */
export function useWeekObjectives(weekStart: Date) {
  const key = `weekly:objectives:${weekKey(weekStart)}`;
  const [objectives, setObjectives] = useLocalStorage<Objective[]>(key, []);

  // One-time migration: if the legacy global key has data and this week has none, move it in.
  useEffect(() => {
    try {
      const legacy = window.localStorage.getItem("weekly:objectives");
      if (!legacy) return;
      const parsed = JSON.parse(legacy) as Objective[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        window.localStorage.removeItem("weekly:objectives");
        return;
      }
      const existing = window.localStorage.getItem(key);
      const existingArr = existing ? (JSON.parse(existing) as Objective[]) : [];
      if (existingArr.length === 0) {
        window.localStorage.setItem(key, JSON.stringify(parsed));
        setObjectives(parsed);
      }
      window.localStorage.removeItem("weekly:objectives");
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { objectives, setObjectives };
}

/**
 * Append objectives to the *next* week's stored list (without re-rendering on
 * external changes). Used by the "copy forward" UI on the current week.
 */
export function useAppendToNextWeekObjectives(weekStart: Date) {
  const nextKey = `weekly:objectives:${weekKey(addDays(weekStart, 7))}`;
  return (toAppend: Objective[]) => {
    if (toAppend.length === 0) return;
    try {
      const raw = window.localStorage.getItem(nextKey);
      const existing = raw ? (JSON.parse(raw) as Objective[]) : [];
      window.localStorage.setItem(
        nextKey,
        JSON.stringify([...existing, ...toAppend]),
      );
    } catch {
      /* ignore */
    }
  };
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
 *  Sorted by `order`, falling back to insertion order.
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
        order: week.recurringOrder?.[k],
      });
    }
    const merged = [...recurring, ...adHoc];
    return merged.sort((a, b) => {
      const ao = a.order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.order ?? Number.MAX_SAFE_INTEGER;
      return ao - bo;
    });
  }, [day, library, week]);
}
