import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Radio, Trash2 } from "lucide-react";
import type { RadarItem } from "@/lib/types";
import { uid } from "@/lib/types";

type Props = {
  radar: RadarItem[];
  setRadar: (next: RadarItem[] | ((prev: RadarItem[]) => RadarItem[])) => void;
};

export function RadarPanel({ radar, setRadar }: Props) {
  const [open, setOpen] = useState(true);
  const [text, setText] = useState("");

  const add = () => {
    const t = text.trim();
    if (!t) return;
    setRadar([...radar, { id: uid(), text: t, createdAt: Date.now() }]);
    setText("");
  };

  return (
    <div className="rounded-lg border border-rule bg-card p-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="mb-4 flex w-full items-center gap-3 text-left"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Radio className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Top of mind
          </p>
          <h2 className="font-display text-xl font-medium text-ink">Radar</h2>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <>
          <ul className="space-y-1.5">
            {radar.length === 0 && (
              <li className="text-sm italic text-muted-foreground/70">
                No action needed — just keep these in view.
              </li>
            )}
            {radar.map((r) => (
              <li
                key={r.id}
                className="group flex items-start gap-2 rounded-md px-2 py-1 hover:bg-accent/40"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                <span className="flex-1 text-sm leading-snug text-ink">
                  {r.text}
                </span>
                <button
                  onClick={() => setRadar(radar.filter((x) => x.id !== r.id))}
                  className="mt-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  aria-label="Remove"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
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
              placeholder="Add to radar…"
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted-foreground/70 focus:outline-none"
            />
          </form>
        </>
      )}
    </div>
  );
}
