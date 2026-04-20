import { useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  GripVertical,
  Plus,
  Repeat,
  Sparkles,
  X,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ENERGY_SLOTS,
  energyKey,
  objectiveColor,
  type EnergyRitual,
  type EnergySlot,
  type LibraryTask,
  type Objective,
  type TaskInstance,
} from "@/lib/types";
import { type DayName, formatDayLabel } from "@/lib/week";
import { cn } from "@/lib/utils";

type Props = {
  dayName: DayName;
  date: Date;
  isToday: boolean;
  instances: TaskInstance[];
  objectives: Objective[];
  library: LibraryTask[];
  rituals: EnergyRitual[];
  /** Map of `${ritualId}:${day}` → done */
  energyDone: Record<string, boolean>;
  onToggle: (instance: TaskInstance) => void;
  onRemove: (instance: TaskInstance) => void;
  onAddAdHoc: (text: string, objectiveId?: string) => void;
  onAddFromLibrary: (lib: LibraryTask) => void;
  onReorderWithinDay: (orderedIds: string[]) => void;
  onCopyUnfinishedToNext: () => void;
  onToggleRitual: (ritualId: string) => void;
};

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
  onAddAdHoc,
  onAddFromLibrary,
  onReorderWithinDay,
  onCopyUnfinishedToNext,
  onToggleRitual,
}: Props) {
  const [text, setText] = useState("");
  const [pickObjective, setPickObjective] = useState<string | undefined>();
  const [showLibrary, setShowLibrary] = useState(false);
  const done = instances.filter((t) => t.done).length;

  const objectiveById = (id?: string) =>
    id ? objectives.find((o) => o.id === id) : undefined;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAddAdHoc(text, pickObjective);
    setText("");
    setPickObjective(undefined);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = instances.map((t) => t.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorderWithinDay(arrayMove(ids, oldIndex, newIndex));
  };

  // Count unfinished, non-recurring (ad-hoc) tasks for the copy button
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

      {/* Energy ritual sub-sections */}
      {rituals.length > 0 && (
        <div className="mb-3 space-y-2 rounded-md border border-rule/50 bg-paper/30 p-2">
          {ENERGY_SLOTS.map((slot) => {
            const slotRituals = rituals.filter((r) => r.slot === slot.id);
            if (slotRituals.length === 0) return null;
            return (
              <RitualSlot
                key={slot.id}
                slot={slot.id}
                label={slot.short}
                rituals={slotRituals}
                day={dayName}
                energyDone={energyDone}
                onToggleRitual={onToggleRitual}
              />
            );
          })}
        </div>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext
          items={instances.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="flex-1 space-y-1">
            {instances.length === 0 && (
              <li className="py-2 text-sm italic text-muted-foreground/70">
                Nothing planned.
              </li>
            )}
            {instances.map((t) => {
              const obj = objectiveById(t.objectiveId);
              const color = obj ? objectiveColor(obj) : undefined;
              return (
                <SortableTask
                  key={t.id}
                  task={t}
                  color={color}
                  onToggle={() => onToggle(t)}
                  onRemove={() => onRemove(t)}
                />
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>

      {/* Library picker */}
      {showLibrary && (
        <div className="mt-3 max-h-40 overflow-y-auto rounded-md border border-rule bg-paper/60 p-2">
          {library.length === 0 ? (
            <p className="px-1 py-1 text-xs italic text-muted-foreground">
              Library is empty.
            </p>
          ) : (
            library.map((lib) => {
              const obj = objectiveById(lib.objectiveId);
              const color = obj ? objectiveColor(obj) : undefined;
              return (
                <button
                  key={lib.id}
                  onClick={() => {
                    onAddFromLibrary(lib);
                    setShowLibrary(false);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-ink hover:bg-accent"
                >
                  {color && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
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

      {/* Quick add */}
      <form
        onSubmit={submit}
        className="mt-3 space-y-2 border-t border-rule pt-3"
      >
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Quick task…"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted-foreground/70 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowLibrary((v) => !v)}
            className="text-xs text-muted-foreground hover:text-ink"
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                showLibrary && "rotate-180",
              )}
            />
          </button>
        </div>
        {text.trim() && objectives.length > 0 && (
          <div className="ml-6 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setPickObjective(undefined)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider",
                !pickObjective
                  ? "border-ink text-ink"
                  : "border-rule text-muted-foreground",
              )}
            >
              None
            </button>
            {objectives.map((o) => {
              const c = objectiveColor(o);
              const active = pickObjective === o.id;
              return (
                <button
                  type="button"
                  key={o.id}
                  onClick={() => setPickObjective(o.id)}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider",
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
      </form>
    </div>
  );
}

function SortableTask({
  task,
  color,
  onToggle,
  onRemove,
}: {
  task: TaskInstance;
  color?: string;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    ...(color
      ? {
          borderLeftWidth: 3,
          borderLeftStyle: "solid",
          borderLeftColor: color,
          paddingLeft: 6,
        }
      : {}),
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group flex items-start gap-1 rounded-md py-1 pl-1 pr-1 hover:bg-accent/40"
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab text-muted-foreground/40 opacity-0 transition-opacity hover:text-ink active:cursor-grabbing group-hover:opacity-100"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onToggle}
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
          task.done
            ? "border-transparent text-paper"
            : "border-rule hover:border-ink",
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
      <span
        className={cn(
          "flex-1 text-sm leading-snug text-ink",
          task.done && "text-muted-foreground line-through",
        )}
      >
        {task.text}
        {task.libraryId && (
          <Repeat className="ml-1.5 inline h-3 w-3 align-text-top text-muted-foreground" />
        )}
      </span>
      <button
        onClick={onRemove}
        className="mt-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        aria-label="Remove"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

function RitualSlot({
  slot,
  label,
  rituals,
  day,
  energyDone,
  onToggleRitual,
}: {
  slot: EnergySlot;
  label: string;
  rituals: EnergyRitual[];
  day: DayName;
  energyDone: Record<string, boolean>;
  onToggleRitual: (ritualId: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <Sparkles className="h-2.5 w-2.5" />
        {label}
      </p>
      <ul className="space-y-0.5">
        {rituals.map((r) => {
          const done = !!energyDone[energyKey(r.id, day)];
          return (
            <li key={`${slot}:${r.id}`} className="flex items-center gap-2">
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
