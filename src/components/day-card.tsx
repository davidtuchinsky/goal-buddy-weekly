import { useState } from "react";
import {
  Briefcase,
  Check,
  ChevronDown,
  Copy,
  CornerUpRight,
  Heart,
  Plus,
  Repeat,
  Sparkles,
  X,
} from "lucide-react";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  ENERGY_SLOTS,
  energyKey,
  objectiveColor,
  type EnergyRitual,
  type EnergySlot,
  type LibraryTask,
  type Objective,
  type ObjectiveKind,
  type TaskInstance,
  type TaskZone,
} from "@/lib/types";
import { DAYS, type DayName, formatDayLabel } from "@/lib/week";
import { cn } from "@/lib/utils";

type Props = {
  dayName: DayName;
  date: Date;
  isToday: boolean;
  instances: TaskInstance[];
  objectives: Objective[];
  library: LibraryTask[];
  rituals: EnergyRitual[];
  energyDone: Record<string, boolean>;
  onToggle: (instance: TaskInstance) => void;
  onRemove: (instance: TaskInstance) => void;
  onUpdateText: (instance: TaskInstance, text: string) => void;
  onAddAdHoc: (
    text: string,
    objectiveId: string | undefined,
    kind: ObjectiveKind,
    zone: TaskZone,
  ) => void;
  onAddFromLibrary: (lib: LibraryTask, zone: TaskZone) => void;
  onCopyUnfinishedToNext: () => void;
  onCopyInstanceToDay: (instance: TaskInstance, targetDay: DayName) => void;
  onToggleRitual: (ritualId: string) => void;
};

const ZONES: TaskZone[] = [1, 2, 3];

export function DayCard({
  dayName,
  date,
  isToday,
  instances,
  objectives,
  library,
  rituals,
  energyDone,
  onToggle,
  onRemove,
  onUpdateText,
  onAddAdHoc,
  onAddFromLibrary,
  onCopyUnfinishedToNext,
  onCopyInstanceToDay,
  onToggleRitual,
}: Props) {
  const done = instances.filter((t) => t.done).length;

  const objectiveById = (id?: string) =>
    id ? objectives.find((o) => o.id === id) : undefined;

  // Bucket tasks by zone. Zone 0 is deprecated — fold any legacy zone-0 tasks into zone 1.
  const byZone: Record<TaskZone, TaskInstance[]> = { 0: [], 1: [], 2: [], 3: [] };
  for (const t of instances) {
    let z = (t.zone ?? 1) as TaskZone;
    if (z === 0) z = 1;
    byZone[z].push(t);
  }

  // Determine which ritual blocks exist
  const ritualsBySlot: Record<EnergySlot, EnergyRitual[]> = {
    before: [],
    mid: [],
    after: [],
  };
  for (const r of rituals) ritualsBySlot[r.slot].push(r);

  // Ritual block rendered BEFORE each zone: zone 1 → before, zone 2 → mid, zone 3 → after
  const ritualBeforeZone: Record<TaskZone, EnergySlot | null> = {
    0: null,
    1: ritualsBySlot.before.length ? "before" : null,
    2: ritualsBySlot.mid.length ? "mid" : null,
    3: ritualsBySlot.after.length ? "after" : null,
  };

  const copyableCount = instances.filter(
    (t) => !t.done && !t.libraryId,
  ).length;

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border bg-card p-5 transition-colors",
        isToday ? "border-primary/50 shadow-sm" : "border-rule",
      )}
    >
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="font-display text-xl font-medium text-ink">
            {dayName}
          </h2>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">
            {formatDayLabel(date)}
            {isToday && <span className="ml-2 text-primary">• Today</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCopyUnfinishedToNext}
            disabled={copyableCount === 0}
            className="inline-flex h-7 items-center gap-1 rounded-full border border-rule px-2 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-rule disabled:hover:text-muted-foreground"
            title={`Copy ${copyableCount} unfinished task(s) to next day`}
          >
            <Copy className="h-3 w-3" />
            {copyableCount > 0 ? copyableCount : ""}
          </button>
          <span className="font-display text-sm tabular-nums text-muted-foreground">
            {done}/{instances.length}
          </span>
        </div>
      </div>

      <SortableContext
        items={instances.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 space-y-3">
          {ZONES.map((zone) => {
            const zoneTasks = byZone[zone];
            const ritualSlot = ritualBeforeZone[zone];
            return (
              <div key={zone} className="space-y-2">
                {ritualSlot && (
                  <RitualBlock
                    slot={ritualSlot}
                    rituals={ritualsBySlot[ritualSlot]}
                    day={dayName}
                    energyDone={energyDone}
                    onToggleRitual={onToggleRitual}
                  />
                )}

                <ZoneDropArea
                  day={dayName}
                  zone={zone}
                  isEmpty={zoneTasks.length === 0}
                >
                  <ul className="space-y-1.5">
                    {zoneTasks.map((t) => {
                      const obj = objectiveById(t.objectiveId);
                      const color = obj ? objectiveColor(obj) : undefined;
                      return (
                        <SortableTask
                          key={t.id}
                          task={t}
                          color={color}
                          onToggle={() => onToggle(t)}
                          onRemove={() => onRemove(t)}
                          onUpdateText={(text) => onUpdateText(t, text)}
                        />
                      );
                    })}
                  </ul>
                </ZoneDropArea>

                <QuickAdd
                  objectives={objectives}
                  library={library}
                  onAdd={(text, objectiveId, kind) =>
                    onAddAdHoc(text, objectiveId, kind, zone)
                  }
                  onPickLibrary={(lib) => onAddFromLibrary(lib, zone)}
                />
              </div>
            );
          })}
        </div>
      </SortableContext>
    </div>
  );
}

/* ============================================================
 * Zone drop area (highlights when dragging over)
 * ============================================================ */
function ZoneDropArea({
  day,
  zone,
  isEmpty,
  children,
}: {
  day: DayName;
  zone: TaskZone;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `zone:${day}:${zone}`,
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-md transition-colors",
        isOver && "bg-primary/5 ring-1 ring-primary/30",
        isEmpty && "min-h-[8px]",
      )}
    >
      {children}
    </div>
  );
}

/* ============================================================
 * Sortable task — full-card drag, colored fill, inline edit
 * ============================================================ */
function SortableTask({
  task,
  color,
  onToggle,
  onRemove,
  onUpdateText,
}: {
  task: TaskInstance;
  color?: string;
  onToggle: () => void;
  onRemove: () => void;
  onUpdateText: (text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: editing });

  const isPersonal = task.kind === "personal";

  // Build colored bg/border. Personal tasks always use chart-2 (pink/rose) tint when no objective color.
  const personalAccent = "var(--chart-2)";
  const accent = color ?? (isPersonal ? personalAccent : "var(--rule)");
  const bgStyle: React.CSSProperties = color
    ? { backgroundColor: `color-mix(in oklab, ${color} 12%, var(--card))` }
    : isPersonal
      ? { backgroundColor: `color-mix(in oklab, ${personalAccent} 14%, var(--card))` }
      : { backgroundColor: "var(--paper)" };

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderColor: color
      ? `color-mix(in oklab, ${accent} 80%, var(--ink))`
      : isPersonal
        ? `color-mix(in oklab, ${personalAccent} 70%, var(--ink))`
        : undefined,
    borderLeftWidth: isPersonal ? 4 : undefined,
    borderStyle: isPersonal && !color ? "dashed" : undefined,
    ...bgStyle,
  };

  const commitEdit = () => {
    const t = draft.trim();
    if (t && t !== task.text) onUpdateText(t);
    else setDraft(task.text);
    setEditing(false);
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...(editing ? {} : attributes)}
      {...(editing ? {} : listeners)}
      className={cn(
        "group relative flex items-start gap-2 rounded-md border px-2.5 py-1.5",
        editing ? "cursor-text" : "cursor-grab active:cursor-grabbing",
        !color && !isPersonal && "border-rule",
      )}
    >
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onToggle}
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
          task.done
            ? "border-transparent text-paper"
            : "border-ink/40 hover:border-ink",
        )}
        style={
          task.done
            ? { backgroundColor: color ?? "var(--ink)" }
            : undefined
        }
        aria-label={task.done ? "Mark incomplete" : "Mark complete"}
      >
        {task.done && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setDraft(task.text);
              setEditing(false);
            }
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex-1 border-b border-ink/50 bg-transparent text-sm leading-snug text-ink focus:outline-none"
        />
      ) : (
        <span
          onPointerDown={(e) => {
            // Allow dbl-click to edit without starting drag.
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setDraft(task.text);
            setEditing(true);
          }}
          className={cn(
            "flex-1 select-none text-sm leading-snug text-ink",
            task.done && "text-muted-foreground line-through",
          )}
          title="Double-click to edit"
        >
          {isPersonal && (
            <span className="mr-1.5 inline-flex items-center gap-0.5 rounded-sm bg-chart-2/20 px-1 py-px text-[9px] font-semibold uppercase tracking-wider text-chart-2 align-middle">
              <Heart className="h-2.5 w-2.5" /> Personal
            </span>
          )}
          {task.text}
          {task.libraryId && (
            <Repeat className="ml-1.5 inline h-3 w-3 align-text-top text-muted-foreground" />
          )}
        </span>
      )}

      {!editing && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onRemove}
          className="mt-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          aria-label="Remove"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </li>
  );
}

/* ============================================================
 * Inline quick-add (per zone): text + objective + kind + library
 * ============================================================ */
function QuickAdd({
  objectives,
  library,
  onAdd,
  onPickLibrary,
}: {
  objectives: Objective[];
  library: LibraryTask[];
  onAdd: (
    text: string,
    objectiveId: string | undefined,
    kind: ObjectiveKind,
  ) => void;
  onPickLibrary: (lib: LibraryTask) => void;
}) {
  const [text, setText] = useState("");
  const [pickObjective, setPickObjective] = useState<string | undefined>();
  const [kind, setKind] = useState<ObjectiveKind>("work");
  const [showLibrary, setShowLibrary] = useState(false);

  // Filter objective chips by current kind
  const visibleObjectives = objectives.filter(
    (o) => (o.kind ?? "work") === kind,
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text, pickObjective, kind);
    setText("");
    setPickObjective(undefined);
  };

  return (
    <div className="space-y-1.5 rounded-md border border-dashed border-rule/60 bg-paper/30 p-2">
      <form onSubmit={submit} className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setKind((k) => (k === "work" ? "personal" : "work"));
            setPickObjective(undefined);
          }}
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors",
            kind === "personal"
              ? "border-chart-2 bg-chart-2/10 text-chart-2"
              : "border-rule text-muted-foreground hover:text-ink",
          )}
          title={kind === "personal" ? "Personal task" : "Work task"}
        >
          {kind === "personal" ? (
            <Heart className="h-3 w-3" />
          ) : (
            <Briefcase className="h-3 w-3" />
          )}
        </button>
        <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            kind === "personal" ? "Personal task…" : "Quick task…"
          }
          className="flex-1 bg-transparent text-xs text-ink placeholder:text-muted-foreground/70 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setShowLibrary((v) => !v)}
          className="text-xs text-muted-foreground hover:text-ink"
          title="From library"
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              showLibrary && "rotate-180",
            )}
          />
        </button>
      </form>

      {text.trim() && visibleObjectives.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-9">
          <button
            type="button"
            onClick={() => setPickObjective(undefined)}
            className={cn(
              "rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wider",
              !pickObjective
                ? "border-ink text-ink"
                : "border-rule text-muted-foreground",
            )}
          >
            None
          </button>
          {visibleObjectives.map((o) => {
            const c = objectiveColor(o);
            const active = pickObjective === o.id;
            return (
              <button
                type="button"
                key={o.id}
                onClick={() => setPickObjective(o.id)}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wider",
                  active
                    ? "border-transparent text-paper"
                    : "border-rule text-ink",
                )}
                style={
                  active ? { backgroundColor: c } : { borderColor: c }
                }
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: c }}
                />
                {o.text}
              </button>
            );
          })}
        </div>
      )}

      {showLibrary && (
        <div className="max-h-40 overflow-y-auto rounded-md border border-rule bg-paper/60 p-1">
          {library.length === 0 ? (
            <p className="px-1 py-1 text-[11px] italic text-muted-foreground">
              Library is empty.
            </p>
          ) : (
            library.map((lib) => {
              const obj = lib.objectiveId
                ? objectives.find((o) => o.id === lib.objectiveId)
                : undefined;
              const color = obj ? objectiveColor(obj) : undefined;
              return (
                <button
                  key={lib.id}
                  onClick={() => {
                    onPickLibrary(lib);
                    setShowLibrary(false);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs text-ink hover:bg-accent"
                >
                  {color && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  )}
                  {lib.kind === "personal" && (
                    <Heart className="h-3 w-3 shrink-0 text-chart-2" />
                  )}
                  <span className="flex-1 truncate">{lib.text}</span>
                  {lib.recurrence.kind === "weekly" && (
                    <Repeat className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * Ritual block (Before / Mid / After)
 * ============================================================ */
function RitualBlock({
  slot,
  rituals,
  day,
  energyDone,
  onToggleRitual,
}: {
  slot: EnergySlot;
  rituals: EnergyRitual[];
  day: DayName;
  energyDone: Record<string, boolean>;
  onToggleRitual: (ritualId: string) => void;
}) {
  const slotMeta = ENERGY_SLOTS.find((s) => s.id === slot)!;
  return (
    <div className="rounded-md border border-primary/20 bg-primary/5 p-2">
      <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-primary/80">
        <Sparkles className="h-2.5 w-2.5" />
        {slotMeta.short}
      </p>
      <ul className="space-y-0.5">
        {rituals.map((r) => {
          const done = !!energyDone[energyKey(r.id, day)];
          return (
            <li key={r.id} className="flex items-center gap-2">
              <button
                onClick={() => onToggleRitual(r.id)}
                className={cn(
                  "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border transition-colors",
                  done
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-rule hover:border-ink",
                )}
              >
                {done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              </button>
              <span
                className={cn(
                  "text-xs text-ink",
                  done && "text-muted-foreground line-through",
                )}
              >
                {r.text}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
