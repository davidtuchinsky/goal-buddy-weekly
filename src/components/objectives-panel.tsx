import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Plus, Target, Trash2, X } from "lucide-react";
import {
  OBJECTIVE_PALETTE,
  objectiveColor,
  uid,
  type Objective,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  objectives: Objective[];
  setObjectives: (next: Objective[] | ((prev: Objective[]) => Objective[])) => void;
};

export function ObjectivesPanel({ objectives, setObjectives }: Props) {
  const [text, setText] = useState("");

  const add = () => {
    const t = text.trim();
    if (!t) return;
    const used = new Set(objectives.map((o) => o.colorIndex));
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
        createdAt: Date.now(),
      },
    ]);
    setText("");
  };

  return (
    <div className="rounded-lg border border-rule bg-card p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Target className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            North star
          </p>
          <h2 className="font-display text-xl font-medium text-ink">
            Big rocks
          </h2>
        </div>
      </div>

      <p className="mb-4 text-xs italic text-muted-foreground">
        Aim for 2–4 big rocks this week.
      </p>

      <ul className="space-y-3">
        {objectives.length === 0 && (
          <li className="py-2 text-sm italic text-muted-foreground/70">
            What do you want this week to add up to?
          </li>
        )}
        {objectives.map((o) => (
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
          placeholder="Add a big rock…"
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
}: {
  objective: Objective;
  onChange: (next: Objective) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [showColors, setShowColors] = useState(false);
  const [subText, setSubText] = useState("");
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
        <h3 className="font-display flex-1 text-base font-medium leading-snug text-ink">
          {objective.text}
        </h3>
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
            <div key={sb.id} className="group flex items-start gap-2">
              <button
                onClick={() =>
                  onChange({
                    ...objective,
                    subBullets: objective.subBullets.map((x) =>
                      x.id === sb.id ? { ...x, done: !x.done } : x,
                    ),
                  })
                }
                className={cn(
                  "mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border transition-colors",
                  sb.done
                    ? "border-transparent text-paper"
                    : "border-rule hover:border-ink",
                )}
                style={sb.done ? { backgroundColor: color } : undefined}
              >
                {sb.done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              </button>
              <span
                className={cn(
                  "flex-1 text-sm leading-snug text-ink",
                  sb.done && "text-muted-foreground line-through",
                )}
              >
                {sb.text}
              </span>
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
