import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  CopyPlus,
  Heart,
  Plus,
  Target,
  Trash2,
  X,
} from "lucide-react";
import {
  OBJECTIVE_PALETTE,
  objectiveColor,
  uid,
  type Objective,
  type ObjectiveKind,
  type SubBullet,
} from "@/lib/types";
import { DAYS, type DayName } from "@/lib/week";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Props = {
  objectives: Objective[];
  setObjectives: (
    next: Objective[] | ((prev: Objective[]) => Objective[]),
  ) => void;
  /** Previous week's objectives (read-only) used for copy-forward UI. */
  previousWeekObjectives?: Objective[];
  /** Convert a sub-bullet into an ad-hoc task on the picked day, tied to the objective. */
  onSubToTask: (
    objectiveId: string,
    subText: string,
    day: DayName,
  ) => void;
  /** Which kind of objectives this panel manages. Defaults to "work". */
  kind?: ObjectiveKind;
};

export function ObjectivesPanel({
  objectives,
  setObjectives,
  previousWeekObjectives = [],
  onSubToTask,
  kind = "work",
}: Props) {
  const [text, setText] = useState("");
  const [copyOpen, setCopyOpen] = useState(false);

  const filtered = objectives.filter(
    (o) => (o.kind ?? "work") === kind,
  );

  const previousFiltered = previousWeekObjectives.filter(
    (o) => (o.kind ?? "work") === kind,
  );

  const isPersonal = kind === "personal";

  /** Clone a previous-week objective into this week (fresh ids, sub-bullets reset to undone). */
  const cloneObjective = (src: Objective): Objective => ({
    id: uid(),
    text: src.text,
    colorIndex: src.colorIndex,
    colorOverride: src.colorOverride,
    kind: src.kind ?? kind,
    subBullets: src.subBullets.map((sb) => ({
      id: uid(),
      text: sb.text,
      done: false,
    })),
    createdAt: Date.now(),
  });

  const copyOne = (src: Objective) => {
    setObjectives([...objectives, cloneObjective(src)]);
  };

  const copyAll = () => {
    setObjectives([
      ...objectives,
      ...previousFiltered.map(cloneObjective),
    ]);
    setCopyOpen(false);
  };

  const add = () => {
    const t = text.trim();
    if (!t) return;
    const used = new Set(filtered.map((o) => o.colorIndex));
    let colorIndex = 0;
    for (let i = 0; i < OBJECTIVE_PALETTE.length; i++) {
      if (!used.has(i)) {
        colorIndex = i;
        break;
      }
    }
    setObjectives([
      ...objectives,
      {
        id: uid(),
        text: t,
        colorIndex,
        subBullets: [],
        kind,
        createdAt: Date.now(),
      },
    ]);
    setText("");
  };

  return (
    <div className="rounded-lg border border-rule bg-card p-6">
      <div className="mb-5 flex items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full",
            isPersonal
              ? "bg-chart-2/15 text-chart-2"
              : "bg-primary/10 text-primary",
          )}
        >
          {isPersonal ? (
            <Heart className="h-4 w-4" />
          ) : (
            <Target className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {isPersonal ? "Outside work" : "North star"}
          </p>
          <h2 className="font-display text-xl font-medium text-ink">
            {isPersonal ? "Personal goals" : "Big rocks"}
          </h2>
        </div>
        {previousFiltered.length > 0 && (
          <Popover open={copyOpen} onOpenChange={setCopyOpen}>
            <PopoverTrigger asChild>
              <button
                className="inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-ink hover:text-ink"
                title="Copy from last week"
              >
                <Copy className="h-3 w-3" />
                Last week
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  From last week
                </p>
                <button
                  onClick={copyAll}
                  className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-paper hover:opacity-90"
                >
                  <CopyPlus className="h-3 w-3" /> Copy all
                </button>
              </div>
              <ul className="max-h-72 space-y-1.5 overflow-auto">
                {previousFiltered.map((o) => {
                  const color = objectiveColor(o);
                  const subCount = o.subBullets.length;
                  return (
                    <li
                      key={o.id}
                      className="flex items-start gap-2 rounded-md border border-rule/60 bg-paper/40 p-2"
                      style={{ borderLeftWidth: 3, borderLeftColor: color }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm leading-snug text-ink">
                          {o.text}
                        </p>
                        {subCount > 0 && (
                          <p className="text-[11px] text-muted-foreground">
                            {subCount} sub-bullet{subCount === 1 ? "" : "s"}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => copyOne(o)}
                        className="shrink-0 rounded-full border border-rule px-2 py-0.5 text-[11px] text-ink hover:border-ink hover:bg-accent"
                        title="Copy this big rock (with sub-bullets)"
                      >
                        Copy
                      </button>
                    </li>
                  );
                })}
              </ul>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <p className="mb-4 text-xs italic text-muted-foreground">
        {isPersonal
          ? "Hobbies, health, relationships — what matters off-hours."
          : "Aim for 2–4 big rocks this week."}
      </p>

      <ul className="space-y-3">
        {filtered.length === 0 && (
          <li className="py-2 text-sm italic text-muted-foreground/70">
            {isPersonal
              ? "What do you want to nurture this week?"
              : "What do you want this week to add up to?"}
          </li>
        )}
        {filtered.map((o) => (
          <ObjectiveRow
            key={o.id}
            objective={o}
            onChange={(next) =>
              setObjectives(
                objectives.map((x) => (x.id === o.id ? next : x)),
              )
            }
            onRemove={() =>
              setObjectives(objectives.filter((x) => x.id !== o.id))
            }
            onSubToTask={(subText, day) => onSubToTask(o.id, subText, day)}
          />
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="mt-4 flex items-center gap-2 border-t border-rule pt-4"
      >
        <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            isPersonal ? "Add a personal goal…" : "Add a big rock…"
          }
          className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted-foreground/70 focus:outline-none"
        />
      </form>
    </div>
  );
}

function ObjectiveRow({
  objective,
  onChange,
  onRemove,
  onSubToTask,
}: {
  objective: Objective;
  onChange: (next: Objective) => void;
  onRemove: () => void;
  onSubToTask: (subText: string, day: DayName) => void;
}) {
  const [open, setOpen] = useState(true);
  const [showColors, setShowColors] = useState(false);
  const [subText, setSubText] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(objective.text);
  const [pickFor, setPickFor] = useState<string | null>(null);
  const color = objectiveColor(objective);

  const addSub = () => {
    const t = subText.trim();
    if (!t) return;
    onChange({
      ...objective,
      subBullets: [
        ...objective.subBullets,
        { id: uid(), text: t, done: false },
      ],
    });
    setSubText("");
  };

  const updateSub = (sb: SubBullet) =>
    onChange({
      ...objective,
      subBullets: objective.subBullets.map((x) => (x.id === sb.id ? sb : x)),
    });

  return (
    <li
      className="rounded-md border border-rule/60 bg-paper/40 p-3"
      style={{ borderLeftWidth: 3, borderLeftColor: color }}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-1 text-muted-foreground hover:text-ink"
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={() => setShowColors((v) => !v)}
          className="mt-1 h-4 w-4 shrink-0 rounded-full ring-2 ring-offset-1 ring-offset-card transition-transform hover:scale-110"
          style={{ backgroundColor: color, boxShadow: `0 0 0 1px ${color}` }}
          aria-label="Change color"
        />
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => {
              const t = titleDraft.trim();
              if (t) onChange({ ...objective, text: t });
              else setTitleDraft(objective.text);
              setEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setTitleDraft(objective.text);
                setEditingTitle(false);
              }
            }}
            className="font-display flex-1 border-b border-ink bg-transparent text-base font-medium leading-snug text-ink focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className="font-display flex-1 text-left text-base font-medium leading-snug text-ink hover:underline"
          >
            {objective.text}
          </button>
        )}
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Delete objective"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {showColors && (
        <div className="mt-2 ml-6 flex flex-wrap gap-1.5">
          {OBJECTIVE_PALETTE.map((c, i) => (
            <button
              key={c.name}
              onClick={() => {
                onChange({
                  ...objective,
                  colorIndex: i,
                  colorOverride: undefined,
                });
                setShowColors(false);
              }}
              className={cn(
                "h-5 w-5 rounded-full transition-transform hover:scale-110",
                objective.colorIndex === i &&
                  !objective.colorOverride &&
                  "ring-2 ring-offset-1 ring-offset-card ring-ink",
              )}
              style={{ backgroundColor: c.value }}
              title={c.name}
              aria-label={c.name}
            />
          ))}
        </div>
      )}

      {open && (
        <div className="mt-2 ml-6 space-y-1">
          {objective.subBullets.map((sb) => (
            <div key={sb.id}>
              <div className="group flex items-start gap-2">
                <button
                  onClick={() => updateSub({ ...sb, done: !sb.done })}
                  className={cn(
                    "mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border transition-colors",
                    sb.done
                      ? "border-transparent text-paper"
                      : "border-rule hover:border-ink",
                  )}
                  style={sb.done ? { backgroundColor: color } : undefined}
                >
                  {sb.done && (
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  )}
                </button>
                <input
                  value={sb.text}
                  onChange={(e) => updateSub({ ...sb, text: e.target.value })}
                  className={cn(
                    "flex-1 bg-transparent text-sm leading-snug text-ink focus:outline-none focus:underline",
                    sb.done && "text-muted-foreground line-through",
                  )}
                />
                <button
                  onClick={() =>
                    setPickFor(pickFor === sb.id ? null : sb.id)
                  }
                  className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-ink group-hover:opacity-100"
                  title="Add as task this week"
                >
                  <ArrowUpRight className="h-3 w-3" />
                </button>
                <button
                  onClick={() =>
                    onChange({
                      ...objective,
                      subBullets: objective.subBullets.filter(
                        (x) => x.id !== sb.id,
                      ),
                    })
                  }
                  className="mt-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              {pickFor === sb.id && (
                <div className="ml-6 mt-1 flex flex-wrap gap-1">
                  {DAYS.map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        onSubToTask(sb.text, d);
                        setPickFor(null);
                      }}
                      className="rounded-full border border-rule px-2 py-0.5 text-[10px] uppercase tracking-wider text-ink hover:border-ink hover:bg-accent"
                    >
                      {d.slice(0, 3)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addSub();
            }}
            className="flex items-center gap-2 pt-1"
          >
            <Plus className="h-3 w-3 shrink-0 text-muted-foreground" />
            <input
              value={subText}
              onChange={(e) => setSubText(e.target.value)}
              placeholder="Add a sub-bullet…"
              className="flex-1 bg-transparent text-xs text-ink placeholder:text-muted-foreground/70 focus:outline-none"
            />
          </form>
        </div>
      )}
    </li>
  );
}
