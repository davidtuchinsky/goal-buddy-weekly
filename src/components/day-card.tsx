import { useState } from "react";
import { Check, ChevronDown, Plus, Repeat, X } from "lucide-react";
import {
  objectiveColor,
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
  onToggle: (instance: TaskInstance) => void;
  onRemove: (instance: TaskInstance) => void;
  onAddAdHoc: (text: string, objectiveId?: string) => void;
  onAddFromLibrary: (lib: LibraryTask) => void;
};

export function DayCard({
  dayName,
  date,
  isToday,
  instances,
  objectives,
  library,
  onToggle,
  onRemove,
  onAddAdHoc,
  onAddFromLibrary,
}: Props) {
  const [text, setText] = useState("");
  const [pickObjective, setPickObjective] = useState<string | undefined>();
  const [showLibrary, setShowLibrary] = useState(false);
  const done = instances.filter((t) => t.done).length;

  const objectiveById = (id?: string) =>
    id ? objectives.find((o) => o.id === id) : undefined;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAddAdHoc(text, pickObjective);
    setText("");
    setPickObjective(undefined);
  };

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
        <span className="font-display text-sm tabular-nums text-muted-foreground">
          {done}/{instances.length}
        </span>
      </div>

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
            <li
              key={t.id}
              className="group flex items-start gap-2 rounded-md py-1 pl-2 pr-1 hover:bg-accent/40"
              style={
                color
                  ? {
                      borderLeftWidth: 3,
                      borderLeftStyle: "solid",
                      borderLeftColor: color,
                      paddingLeft: 6,
                    }
                  : undefined
              }
            >
              <button
                onClick={() => onToggle(t)}
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
                  t.done
                    ? "border-transparent text-paper"
                    : "border-rule hover:border-ink",
                )}
                style={
                  t.done
                    ? { backgroundColor: color ?? "var(--ink)" }
                    : undefined
                }
                aria-label={t.done ? "Mark incomplete" : "Mark complete"}
              >
                {t.done && <Check className="h-3 w-3" strokeWidth={3} />}
              </button>
              <span
                className={cn(
                  "flex-1 text-sm leading-snug text-ink",
                  t.done && "text-muted-foreground line-through",
                )}
              >
                {t.text}
                {t.libraryId && (
                  <Repeat className="ml-1.5 inline h-3 w-3 align-text-top text-muted-foreground" />
                )}
              </span>
              <button
                onClick={() => onRemove(t)}
                className="mt-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                aria-label="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
      </ul>

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
