import { useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Inbox,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import type { BacklogItem, BacklogSubBullet } from "@/lib/types";
import { uid } from "@/lib/types";
import { DAYS, type DayName } from "@/lib/week";
import { cn } from "@/lib/utils";

type Props = {
  backlog: BacklogItem[];
  setBacklog: (
    next: BacklogItem[] | ((prev: BacklogItem[]) => BacklogItem[]),
  ) => void;
  /** Promote a backlog item to a Big Rock objective for the week. */
  onPromoteToBigRock: (item: BacklogItem) => void;
  /** Promote a sub-bullet to an ad-hoc task on a chosen day. */
  onPromoteSubToTask: (text: string, day: DayName) => void;
  /** Promote a top-level bullet to an ad-hoc task on a chosen day. */
  onPromoteToTask: (text: string, day: DayName) => void;
};

export function BacklogPanel({
  backlog,
  setBacklog,
  onPromoteToBigRock,
  onPromoteSubToTask,
  onPromoteToTask,
}: Props) {
  const [open, setOpen] = useState(true);
  const [text, setText] = useState("");

  const add = () => {
    const t = text.trim();
    if (!t) return;
    setBacklog([
      ...backlog,
      { id: uid(), text: t, subBullets: [], createdAt: Date.now() },
    ]);
    setText("");
  };

  return (
    <div className="rounded-lg border border-rule bg-card p-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="mb-4 flex w-full items-center gap-3 text-left"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Inbox className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Future
          </p>
          <h2 className="font-display text-xl font-medium text-ink">
            Backlog
          </h2>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <>
          <ul className="space-y-3">
            {backlog.length === 0 && (
              <li className="text-sm italic text-muted-foreground/70">
                Stash projects and ideas here for later.
              </li>
            )}
            {backlog.map((item) => (
              <BacklogRow
                key={item.id}
                item={item}
                onChange={(next) =>
                  setBacklog(
                    backlog.map((x) => (x.id === item.id ? next : x)),
                  )
                }
                onRemove={() =>
                  setBacklog(backlog.filter((x) => x.id !== item.id))
                }
                onPromoteToBigRock={() => onPromoteToBigRock(item)}
                onPromoteToTask={onPromoteToTask}
                onPromoteSubToTask={onPromoteSubToTask}
              />
            ))}
          </ul>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
            className="mt-3 flex items-center gap-2 border-t border-rule pt-3"
          >
            <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="New backlog bullet…"
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted-foreground/70 focus:outline-none"
            />
          </form>
        </>
      )}
    </div>
  );
}

function BacklogRow({
  item,
  onChange,
  onRemove,
  onPromoteToBigRock,
  onPromoteToTask,
  onPromoteSubToTask,
}: {
  item: BacklogItem;
  onChange: (next: BacklogItem) => void;
  onRemove: () => void;
  onPromoteToBigRock: () => void;
  onPromoteToTask: (text: string, day: DayName) => void;
  onPromoteSubToTask: (text: string, day: DayName) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [subText, setSubText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [pickFor, setPickFor] = useState<string | null>(null); // sub id or "self"

  const addSub = () => {
    const t = subText.trim();
    if (!t) return;
    onChange({
      ...item,
      subBullets: [...item.subBullets, { id: uid(), text: t }],
    });
    setSubText("");
  };

  const updateSub = (sb: BacklogSubBullet) =>
    onChange({
      ...item,
      subBullets: item.subBullets.map((x) => (x.id === sb.id ? sb : x)),
    });

  const removeSub = (id: string) =>
    onChange({
      ...item,
      subBullets: item.subBullets.filter((x) => x.id !== id),
    });

  return (
    <li className="rounded-md border border-rule/60 bg-paper/40 p-3">
      <div className="flex items-start gap-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-muted-foreground hover:text-ink"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        {editing ? (
          <input
            autoFocus
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={() => {
              const t = editText.trim();
              if (t) onChange({ ...item, text: t });
              else setEditText(item.text);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setEditText(item.text);
                setEditing(false);
              }
            }}
            className="flex-1 border-b border-ink bg-transparent text-sm text-ink focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="font-display flex-1 text-left text-sm font-medium leading-snug text-ink hover:underline"
          >
            {item.text}
          </button>
        )}
        <button
          onClick={onPromoteToBigRock}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-ink"
          title="Promote to Big Rock"
        >
          <Target className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setPickFor(pickFor === "self" ? null : "self")}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-ink"
          title="Send to a day this week"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onRemove}
          className="rounded-md p-1 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {pickFor === "self" && (
        <DayPicker
          onPick={(d) => {
            onPromoteToTask(item.text, d);
            setPickFor(null);
          }}
        />
      )}

      {expanded && (
        <div className="mt-2 ml-6 space-y-1">
          {item.subBullets.map((sb) => (
            <div key={sb.id}>
              <div className="group flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <input
                  value={sb.text}
                  onChange={(e) => updateSub({ ...sb, text: e.target.value })}
                  className="flex-1 bg-transparent text-sm leading-snug text-ink focus:outline-none focus:underline"
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
                  onClick={() => removeSub(sb.id)}
                  className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              {pickFor === sb.id && (
                <DayPicker
                  onPick={(d) => {
                    onPromoteSubToTask(sb.text, d);
                    setPickFor(null);
                  }}
                />
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
              placeholder="Sub-bullet…"
              className="flex-1 bg-transparent text-xs text-ink placeholder:text-muted-foreground/70 focus:outline-none"
            />
          </form>
        </div>
      )}
    </li>
  );
}

function DayPicker({ onPick }: { onPick: (d: DayName) => void }) {
  return (
    <div className="ml-6 mt-2 flex flex-wrap gap-1">
      {DAYS.map((d) => (
        <button
          key={d}
          onClick={() => onPick(d)}
          className={cn(
            "rounded-full border border-rule px-2 py-0.5 text-[10px] uppercase tracking-wider text-ink hover:border-ink hover:bg-accent",
          )}
        >
          {d.slice(0, 3)}
        </button>
      ))}
    </div>
  );
}
