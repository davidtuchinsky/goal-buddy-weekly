import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Library } from "lucide-react";
import {
  DAYS,
  addDays,
  formatWeekRange,
  isSameDay,
  startOfWeek,
  weekKey,
  type DayName,
} from "@/lib/week";
import { useGlobalState, useWeekState } from "@/lib/hooks";
import {
  recurringKey,
  uid,
  type LibraryTask,
  type TaskInstance,
} from "@/lib/types";
import { ObjectivesPanel } from "@/components/objectives-panel";
import { LibraryDrawer } from "@/components/library-drawer";
import { DayCard } from "@/components/day-card";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [cursor, setCursor] = useState<Date>(() => startOfWeek(new Date()));
  const [libraryOpen, setLibraryOpen] = useState(false);

  const { objectives, setObjectives, library, setLibrary } = useGlobalState();
  const { week, setWeek } = useWeekState(cursor);

  const today = useMemo(() => new Date(), []);
  const isCurrentWeek = useMemo(
    () => weekKey(startOfWeek(today)) === weekKey(cursor),
    [today, cursor],
  );

  /** Build instances for a given day (recurring + ad-hoc). */
  const instancesFor = (day: DayName): TaskInstance[] => {
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
    const adHoc = week.adHoc.filter((t) => t.day === day);
    return [...recurring, ...adHoc];
  };

  const allInstances = useMemo(
    () => DAYS.flatMap(instancesFor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [library, week],
  );
  const totalTasks = allInstances.length;
  const doneTasks = allInstances.filter((t) => t.done).length;
  const progress = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const toggleInstance = (t: TaskInstance) => {
    if (t.libraryId) {
      const k = recurringKey(t.libraryId, t.day);
      setWeek({
        ...week,
        recurringDone: { ...week.recurringDone, [k]: !t.done },
      });
    } else {
      setWeek({
        ...week,
        adHoc: week.adHoc.map((x) =>
          x.id === t.id ? { ...x, done: !x.done } : x,
        ),
      });
    }
  };

  const removeInstance = (t: TaskInstance) => {
    if (t.libraryId) {
      const k = recurringKey(t.libraryId, t.day);
      setWeek({
        ...week,
        recurringSkipped: { ...week.recurringSkipped, [k]: true },
      });
    } else {
      setWeek({ ...week, adHoc: week.adHoc.filter((x) => x.id !== t.id) });
    }
  };

  const addAdHoc = (day: DayName, text: string, objectiveId?: string) => {
    setWeek({
      ...week,
      adHoc: [
        ...week.adHoc,
        {
          id: uid(),
          text: text.trim(),
          objectiveId,
          day,
          done: false,
        },
      ],
    });
  };

  const addFromLibrary = (day: DayName, lib: LibraryTask) => {
    setWeek({
      ...week,
      adHoc: [
        ...week.adHoc,
        {
          id: uid(),
          libraryId: lib.id,
          text: lib.text,
          objectiveId: lib.objectiveId,
          day,
          done: false,
        },
      ],
    });
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-8 md:px-10 md:py-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Weekly Planner
              </p>
              <h1 className="font-display mt-2 text-4xl font-medium leading-none tracking-tight text-ink md:text-6xl">
                Week of{" "}
                <span className="italic text-primary">
                  {formatWeekRange(cursor)}
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLibraryOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-rule px-4 text-sm font-medium text-ink transition-colors hover:bg-accent"
              >
                <Library className="h-4 w-4" /> Library
                {library.length > 0 && (
                  <span className="font-display text-xs text-muted-foreground">
                    {library.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setCursor(addDays(cursor, -7))}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rule text-ink transition-colors hover:bg-accent"
                aria-label="Previous week"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCursor(startOfWeek(new Date()))}
                disabled={isCurrentWeek}
                className="h-10 rounded-full border border-rule px-4 text-sm font-medium text-ink transition-colors hover:bg-accent disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
              >
                This week
              </button>
              <button
                onClick={() => setCursor(addDays(cursor, 7))}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rule text-ink transition-colors hover:bg-accent"
                aria-label="Next week"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl text-ink">
                {doneTasks}
              </span>
              <span>of {totalTasks} tasks done</span>
            </div>
            <div className="flex flex-1 items-center gap-3 md:max-w-md">
              <div className="h-[2px] flex-1 bg-rule">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="font-display text-sm tabular-nums text-ink">
                {progress}%
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <section>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {DAYS.map((dayName, i) => {
                const date = addDays(cursor, i);
                return (
                  <DayCard
                    key={dayName}
                    dayName={dayName}
                    date={date}
                    isToday={isSameDay(date, today)}
                    instances={instancesFor(dayName)}
                    objectives={objectives}
                    library={library}
                    onToggle={toggleInstance}
                    onRemove={removeInstance}
                    onAddAdHoc={(text, objectiveId) =>
                      addAdHoc(dayName, text, objectiveId)
                    }
                    onAddFromLibrary={(lib) => addFromLibrary(dayName, lib)}
                  />
                );
              })}
            </div>
          </section>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <ObjectivesPanel
              objectives={objectives}
              setObjectives={setObjectives}
            />
          </aside>
        </div>

        <footer className="mt-16 border-t border-rule pt-6 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Saved locally in your browser
        </footer>
      </main>

      <LibraryDrawer
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        library={library}
        setLibrary={setLibrary}
        objectives={objectives}
      />
    </div>
  );
}
