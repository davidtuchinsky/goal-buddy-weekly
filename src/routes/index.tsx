import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Library,
  Sparkles,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  DAYS,
  addDays,
  formatWeekRange,
  isSameDay,
  nextDay,
  startOfWeek,
  weekKey,
  type DayName,
} from "@/lib/week";
import { useGlobalState, useWeekState } from "@/lib/hooks";
import {
  energyKey,
  recurringKey,
  uid,
  type BacklogItem,
  type LibraryTask,
  type ObjectiveKind,
  type TaskInstance,
  type TaskZone,
  type WeekState,
} from "@/lib/types";
import { ObjectivesPanel } from "@/components/objectives-panel";
import { LibraryDrawer } from "@/components/library-drawer";
import { DayCard } from "@/components/day-card";
import { EnergyRitualsDrawer } from "@/components/energy-rituals-drawer";
import { BacklogPanel } from "@/components/backlog-panel";
import { RadarPanel } from "@/components/radar-panel";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [cursor, setCursor] = useState<Date>(() => startOfWeek(new Date()));
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [ritualsOpen, setRitualsOpen] = useState(false);

  const {
    objectives,
    setObjectives,
    library,
    setLibrary,
    rituals,
    setRituals,
    backlog,
    setBacklog,
    radar,
    setRadar,
  } = useGlobalState();
  const { week, setWeek } = useWeekState(cursor);

  const today = useMemo(() => new Date(), []);
  const isCurrentWeek = useMemo(
    () => weekKey(startOfWeek(today)) === weekKey(cursor),
    [today, cursor],
  );

  const energyDone = week.energyDone ?? {};

  /** Build instances for a given day (recurring + ad-hoc), sorted by order. */
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
        kind: lib.kind ?? "work",
        day,
        done: !!week.recurringDone[k],
        order: week.recurringOrder?.[k],
        zone: (week.recurringZone?.[k] ?? 0) as TaskZone,
      });
    }
    const adHoc = week.adHoc.filter((t) => t.day === day);
    return [...recurring, ...adHoc].sort((a, b) => {
      const ao = a.order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.order ?? Number.MAX_SAFE_INTEGER;
      return ao - bo;
    });
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
    if (t.libraryId && t.id.startsWith("rec:")) {
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
    if (t.libraryId && t.id.startsWith("rec:")) {
      const k = recurringKey(t.libraryId, t.day);
      setWeek({
        ...week,
        recurringSkipped: { ...week.recurringSkipped, [k]: true },
      });
    } else {
      setWeek({ ...week, adHoc: week.adHoc.filter((x) => x.id !== t.id) });
    }
  };

  const addAdHoc = (
    day: DayName,
    text: string,
    objectiveId?: string,
    kind: ObjectiveKind = "work",
    zone: TaskZone = 0,
  ) => {
    setWeek({
      ...week,
      adHoc: [
        ...week.adHoc,
        {
          id: uid(),
          text: text.trim(),
          objectiveId,
          kind,
          day,
          done: false,
          order: nextOrder(day),
          zone,
        },
      ],
    });
  };

  const addFromLibrary = (
    day: DayName,
    lib: LibraryTask,
    zone: TaskZone = 0,
  ) => {
    setWeek({
      ...week,
      adHoc: [
        ...week.adHoc,
        {
          id: uid(),
          libraryId: lib.id,
          text: lib.text,
          objectiveId: lib.objectiveId,
          kind: lib.kind ?? "work",
          day,
          done: false,
          order: nextOrder(day),
          zone,
        },
      ],
    });
  };

  const updateInstanceText = (t: TaskInstance, text: string) => {
    if (t.libraryId && t.id.startsWith("rec:")) {
      // Editing a recurring instance: convert it into an ad-hoc copy and skip the recurring source for this week.
      const k = recurringKey(t.libraryId, t.day);
      setWeek({
        ...week,
        recurringSkipped: { ...week.recurringSkipped, [k]: true },
        adHoc: [
          ...week.adHoc,
          {
            id: uid(),
            text,
            objectiveId: t.objectiveId,
            kind: t.kind ?? "work",
            day: t.day,
            done: t.done,
            order: t.order ?? nextOrder(t.day),
            zone: t.zone ?? 0,
          },
        ],
      });
    } else {
      setWeek({
        ...week,
        adHoc: week.adHoc.map((x) =>
          x.id === t.id ? { ...x, text } : x,
        ),
      });
    }
  };

  const nextOrder = (day: DayName): number => {
    const list = instancesFor(day);
    const maxOrder = list.reduce((m, t) => {
      const o = t.order ?? -1;
      return o > m ? o : m;
    }, -1);
    return maxOrder + 1;
  };

  /** Apply an explicit ordering (list of instance ids) to a day. */
  const applyOrderForDay = (day: DayName, orderedIds: string[]) => {
    const next: WeekState = {
      ...week,
      adHoc: [...week.adHoc],
      recurringOrder: { ...(week.recurringOrder ?? {}) },
    };
    orderedIds.forEach((id, idx) => {
      if (id.startsWith("rec:")) {
        const k = id.slice(4); // libraryId:day
        next.recurringOrder![k] = idx;
      } else {
        next.adHoc = next.adHoc.map((t) =>
          t.id === id ? { ...t, order: idx, day } : t,
        );
      }
    });
    setWeek(next);
  };

  /** Move an instance to a (day, zone). */
  const moveInstanceTo = (
    instanceId: string,
    targetDay: DayName,
    targetZone: TaskZone,
  ) => {
    if (instanceId.startsWith("rec:")) {
      const k = instanceId.slice(4);
      const [libId, sourceDay] = k.split(":") as [string, DayName];
      const lib = library.find((l) => l.id === libId);
      if (!lib) return;
      // Same day: just update zone override
      if (sourceDay === targetDay) {
        setWeek({
          ...week,
          recurringZone: { ...(week.recurringZone ?? {}), [k]: targetZone },
        });
        return;
      }
      const wasDone = !!week.recurringDone[k];
      setWeek({
        ...week,
        recurringSkipped: { ...week.recurringSkipped, [k]: true },
        adHoc: [
          ...week.adHoc,
          {
            id: uid(),
            libraryId: lib.id,
            text: lib.text,
            objectiveId: lib.objectiveId,
            kind: lib.kind ?? "work",
            day: targetDay,
            done: wasDone,
            order: nextOrder(targetDay),
            zone: targetZone,
          },
        ],
      });
    } else {
      setWeek({
        ...week,
        adHoc: week.adHoc.map((t) =>
          t.id === instanceId
            ? {
                ...t,
                day: targetDay,
                order: nextOrder(targetDay),
                zone: targetZone,
              }
            : t,
        ),
      });
    }
  };

  /** Copy unfinished ad-hoc (non-recurring) tasks for `day` to next day. */
  const copyUnfinishedToNext = (day: DayName) => {
    const target = nextDay(day);
    const baseOrder = nextOrder(target);
    const toCopy = week.adHoc.filter(
      (t) => t.day === day && !t.done && !t.libraryId,
    );
    if (toCopy.length === 0) return;
    setWeek({
      ...week,
      adHoc: [
        ...week.adHoc,
        ...toCopy.map((t, i) => ({
          ...t,
          id: uid(),
          day: target,
          done: false,
          order: baseOrder + i,
        })),
      ],
    });
  };

  const toggleRitual = (day: DayName, ritualId: string) => {
    const k = energyKey(ritualId, day);
    const current = !!energyDone[k];
    setWeek({
      ...week,
      energyDone: { ...energyDone, [k]: !current },
    });
  };

  /** Backlog → Big Rock (creates a work objective with sub-bullets). */
  const promoteBacklogToBigRock = (item: BacklogItem) => {
    const used = new Set(
      objectives.filter((o) => (o.kind ?? "work") === "work").map((o) => o.colorIndex),
    );
    let colorIndex = 0;
    for (let i = 0; i < 8; i++) {
      if (!used.has(i)) {
        colorIndex = i;
        break;
      }
    }
    setObjectives([
      ...objectives,
      {
        id: uid(),
        text: item.text,
        colorIndex,
        kind: "work",
        subBullets: item.subBullets.map((sb) => ({
          id: uid(),
          text: sb.text,
          done: false,
        })),
        createdAt: Date.now(),
      },
    ]);
  };

  /** Sub-bullet of a Big Rock → ad-hoc task on a chosen day, color-tied. */
  const subToTask = (
    objectiveId: string,
    subText: string,
    day: DayName,
  ) => {
    const obj = objectives.find((o) => o.id === objectiveId);
    addAdHoc(day, subText, objectiveId, obj?.kind ?? "work");
  };

  /* ------------- Cross-day drag context ------------- */
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleCrossDayDrag = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const activeDay = findInstanceDay(activeId);
    if (!activeDay) return;
    const activeZone = findInstanceZone(activeId);

    // Drop onto a zone droppable → place at end of that zone.
    if (overId.startsWith("zone:")) {
      const [, day, zoneStr] = overId.split(":");
      const targetDay = day as DayName;
      const targetZone = Number(zoneStr) as TaskZone;
      if (targetDay === activeDay && targetZone === activeZone) return;
      moveInstanceTo(activeId, targetDay, targetZone);
      return;
    }

    // Drop onto a day-shell droppable → move to that day (zone 0).
    if (overId.startsWith("day:")) {
      const targetDay = overId.slice(4) as DayName;
      if (targetDay === activeDay) return;
      moveInstanceTo(activeId, targetDay, 0);
      return;
    }

    // Otherwise we're hovering another task instance.
    const overDay = findInstanceDay(overId);
    if (!overDay) return;
    const overZone = findInstanceZone(overId) ?? 0;

    if (overDay === activeDay && overZone === activeZone) {
      // Within-zone reorder
      const ids = instancesFor(activeDay)
        .filter((t) => (t.zone ?? 0) === overZone)
        .map((t) => t.id);
      const oldIndex = ids.indexOf(activeId);
      const newIndex = ids.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0) return;
      const next = [...ids];
      next.splice(oldIndex, 1);
      next.splice(newIndex, 0, activeId);
      // Reapply ordering across the whole day, preserving order of other zones
      const fullOrder: string[] = [];
      for (const z of [0, 1, 2, 3] as TaskZone[]) {
        if (z === overZone) {
          fullOrder.push(...next);
        } else {
          fullOrder.push(
            ...instancesFor(activeDay)
              .filter((t) => (t.zone ?? 0) === z)
              .map((t) => t.id),
          );
        }
      }
      applyOrderForDay(activeDay, fullOrder);
    } else {
      moveInstanceTo(activeId, overDay, overZone);
    }
  };

  const findInstanceDay = (id: string): DayName | undefined => {
    if (id.startsWith("rec:")) {
      const k = id.slice(4);
      const parts = k.split(":");
      return parts[1] as DayName;
    }
    return week.adHoc.find((t) => t.id === id)?.day;
  };

  const findInstanceZone = (id: string): TaskZone | undefined => {
    if (id.startsWith("rec:")) {
      const k = id.slice(4);
      return ((week.recurringZone?.[k] ?? 0) as TaskZone);
    }
    return (week.adHoc.find((t) => t.id === id)?.zone ?? 0) as TaskZone;
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
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setRitualsOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-rule px-4 text-sm font-medium text-ink transition-colors hover:bg-accent"
              >
                <Sparkles className="h-4 w-4" /> Rituals
                {rituals.length > 0 && (
                  <span className="font-display text-xs text-muted-foreground">
                    {rituals.length}
                  </span>
                )}
              </button>
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
        <DndContext sensors={dndSensors} onDragEnd={handleCrossDayDrag}>
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <section>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {DAYS.map((dayName, i) => {
                  const date = addDays(cursor, i);
                  return (
                    <DayDroppable key={dayName} dayName={dayName}>
                      <DayCard
                        dayName={dayName}
                        date={date}
                        isToday={isSameDay(date, today)}
                        instances={instancesFor(dayName)}
                        objectives={objectives}
                        library={library}
                        rituals={rituals}
                        energyDone={energyDone}
                        onToggle={toggleInstance}
                        onRemove={removeInstance}
                        onAddAdHoc={(text, objectiveId) =>
                          addAdHoc(dayName, text, objectiveId)
                        }
                        onAddFromLibrary={(lib) =>
                          addFromLibrary(dayName, lib)
                        }
                        onCopyUnfinishedToNext={() =>
                          copyUnfinishedToNext(dayName)
                        }
                        onToggleRitual={(rid) => toggleRitual(dayName, rid)}
                      />
                    </DayDroppable>
                  );
                })}
              </div>
            </section>

            <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
              <ObjectivesPanel
                objectives={objectives}
                setObjectives={setObjectives}
                onSubToTask={subToTask}
              />
              <BacklogPanel
                backlog={backlog}
                setBacklog={setBacklog}
                onPromoteToBigRock={promoteBacklogToBigRock}
                onPromoteToTask={(text, day) => addAdHoc(day, text)}
                onPromoteSubToTask={(text, day) => addAdHoc(day, text)}
              />
              <RadarPanel radar={radar} setRadar={setRadar} />
            </aside>
          </div>
        </DndContext>

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
      <EnergyRitualsDrawer
        open={ritualsOpen}
        onClose={() => setRitualsOpen(false)}
        rituals={rituals}
        setRituals={setRituals}
      />
    </div>
  );
}

/** Wraps a day card so it accepts dropped tasks from other days. */
function DayDroppable({
  dayName,
  children,
}: {
  dayName: DayName;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${dayName}` });
  return (
    <div
      ref={setNodeRef}
      className={isOver ? "rounded-lg ring-2 ring-primary/50" : ""}
    >
      {children}
    </div>
  );
}
