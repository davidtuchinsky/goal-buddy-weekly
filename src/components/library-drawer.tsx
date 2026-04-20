import { useState } from "react";
import {
  Briefcase,
  Check,
  Heart,
  Library,
  Pencil,
  Plus,
  Repeat,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  DAYS_SAT_FIRST,
  DAY_INITIAL,
  type DayName,
} from "@/lib/week";
import {
  objectiveColor,
  uid,
  type LibraryTask,
  type Objective,
  type ObjectiveKind,
  type Recurrence,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  library: LibraryTask[];
  setLibrary: (
    next: LibraryTask[] | ((prev: LibraryTask[]) => LibraryTask[]),
  ) => void;
  objectives: Objective[];
};

export function LibraryDrawer({
  open,
  onClose,
  library,
  setLibrary,
  objectives,
}: Props) {
  const [text, setText] = useState("");
  const [objectiveId, setObjectiveId] = useState<string | undefined>();
  const [recurringDays, setRecurringDays] = useState<DayName[]>([]);
  const [kind, setKind] = useState<ObjectiveKind>("work");

  const add = () => {
    const t = text.trim();
    if (!t) return;
    const recurrence: Recurrence =
      recurringDays.length > 0
        ? { kind: "weekly", days: recurringDays }
        : { kind: "none" };
    setLibrary([
      ...library,
      {
        id: uid(),
        text: t,
        objectiveId,
        recurrence,
        kind,
        createdAt: Date.now(),
      },
    ]);
    setText("");
    setRecurringDays([]);
    setObjectiveId(undefined);
  };

  const toggleDay = (d: DayName) =>
    setRecurringDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-rule bg-card shadow-xl transition-transform",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center justify-between border-b border-rule px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Library className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Reusable
              </p>
              <h2 className="font-display text-xl font-medium text-ink">
                Task library
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Add form */}
        <div className="space-y-3 border-b border-rule bg-paper/40 px-6 py-5">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="New task name…"
            className="w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted-foreground/70 focus:border-ink focus:outline-none"
          />

          <KindToggle value={kind} onChange={setKind} />

          <ObjectivePicker
            objectives={objectives.filter((o) => (o.kind ?? "work") === kind)}
            value={objectiveId}
            onChange={setObjectiveId}
          />

          <DayPickerSatFirst value={recurringDays} onToggle={toggleDay} />
          <p className="text-xs italic text-muted-foreground">
            {recurringDays.length === 0
              ? "One-off — add to a day from the library."
              : `Repeats every ${recurringDays.join(", ")}.`}
          </p>

          <button
            onClick={add}
            disabled={!text.trim()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> Add to library
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {library.length === 0 ? (
            <p className="text-sm italic text-muted-foreground/70">
              Your library is empty. Save tasks you'll reuse week to week.
            </p>
          ) : (
            <ul className="space-y-2">
              {library.map((lib) => (
                <LibraryRow
                  key={lib.id}
                  task={lib}
                  objectives={objectives}
                  onChange={(next) =>
                    setLibrary(
                      library.map((x) => (x.id === lib.id ? next : x)),
                    )
                  }
                  onRemove={() =>
                    setLibrary(library.filter((x) => x.id !== lib.id))
                  }
                />
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}

function LibraryRow({
  task,
  objectives,
  onChange,
  onRemove,
}: {
  task: LibraryTask;
  objectives: Objective[];
  onChange: (next: LibraryTask) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const obj = objectives.find((o) => o.id === task.objectiveId);
  const color = obj ? objectiveColor(obj) : undefined;

  const days =
    task.recurrence.kind === "weekly" ? task.recurrence.days : [];

  const toggleDay = (d: DayName) => {
    const next = days.includes(d)
      ? days.filter((x) => x !== d)
      : [...days, d];
    onChange({
      ...task,
      recurrence:
        next.length > 0 ? { kind: "weekly", days: next } : { kind: "none" },
    });
  };

  return (
    <li
      className="rounded-md border border-rule bg-paper/40 p-3"
      style={
        color ? { borderLeftWidth: 3, borderLeftColor: color } : undefined
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {editing ? (
            <input
              autoFocus
              value={task.text}
              onChange={(e) => onChange({ ...task, text: e.target.value })}
              className="w-full border-b border-ink bg-transparent text-sm font-medium text-ink focus:outline-none"
            />
          ) : (
            <p className="text-sm font-medium text-ink">{task.text}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {obj && (
              <span className="inline-flex items-center gap-1">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {obj.text}
              </span>
            )}
            {task.recurrence.kind === "weekly" ? (
              <span className="inline-flex items-center gap-1">
                <Repeat className="h-3 w-3" />
                {task.recurrence.days.map((d) => d.slice(0, 3)).join(", ")}
              </span>
            ) : (
              <span className="italic">One-off</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setEditing((v) => !v)}
          className={cn(
            "rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-ink",
            editing && "bg-accent text-ink",
          )}
          aria-label="Edit"
        >
          {editing ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Pencil className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {editing && (
        <div className="mt-3 space-y-3 border-t border-rule pt-3">
          <KindToggle
            value={task.kind ?? "work"}
            onChange={(k) => onChange({ ...task, kind: k, objectiveId: undefined })}
          />
          <ObjectivePicker
            objectives={objectives.filter(
              (o) => (o.kind ?? "work") === (task.kind ?? "work"),
            )}
            value={task.objectiveId}
            onChange={(id) => onChange({ ...task, objectiveId: id })}
          />
          <DayPickerSatFirst value={days} onToggle={toggleDay} />
        </div>
      )}
    </li>
  );
}

function KindToggle({
  value,
  onChange,
}: {
  value: ObjectiveKind;
  onChange: (v: ObjectiveKind) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        Type
      </label>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onChange("work")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
            value === "work"
              ? "border-ink bg-ink text-paper"
              : "border-rule text-muted-foreground hover:border-ink hover:text-ink",
          )}
        >
          <Briefcase className="h-3 w-3" />
          Work
        </button>
        <button
          type="button"
          onClick={() => onChange("personal")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
            value === "personal"
              ? "border-chart-2 bg-chart-2/15 text-chart-2"
              : "border-rule text-muted-foreground hover:border-ink hover:text-ink",
          )}
        >
          <Heart className="h-3 w-3" />
          Personal
        </button>
      </div>
    </div>
  );
}

function ObjectivePicker({
  objectives,
  value,
  onChange,
}: {
  objectives: Objective[];
  value?: string;
  onChange: (id: string | undefined) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        <Tag className="h-3 w-3" /> Big rock
      </label>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onChange(undefined)}
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs transition-colors",
            !value
              ? "border-ink bg-ink text-paper"
              : "border-rule text-muted-foreground hover:border-ink hover:text-ink",
          )}
        >
          None
        </button>
        {objectives.map((o) => {
          const c = objectiveColor(o);
          const active = value === o.id;
          return (
            <button
              key={o.id}
              onClick={() => onChange(o.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                active
                  ? "border-transparent text-paper"
                  : "border-rule text-ink hover:border-ink",
              )}
              style={
                active ? { backgroundColor: c } : { borderColor: c }
              }
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: c }}
              />
              {o.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayPickerSatFirst({
  value,
  onToggle,
}: {
  value: DayName[];
  onToggle: (d: DayName) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        <Repeat className="h-3 w-3" /> Repeat weekly on
      </label>
      <div className="flex flex-wrap gap-1">
        {DAYS_SAT_FIRST.map((d) => {
          const active = value.includes(d);
          return (
            <button
              key={d}
              onClick={() => onToggle(d)}
              className={cn(
                "h-7 w-9 rounded-md border text-xs transition-colors",
                active
                  ? "border-ink bg-ink text-paper"
                  : "border-rule text-muted-foreground hover:border-ink hover:text-ink",
              )}
              title={d}
            >
              {DAY_INITIAL[d]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
