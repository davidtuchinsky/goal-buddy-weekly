import { useEffect, useRef, useState } from "react";
import { Undo2 } from "lucide-react";
import type { UndoSnapshot } from "@/lib/undo";

type Props = {
  history: UndoSnapshot<Record<string, unknown>>[];
  onUndoLast: () => void;
  onUndoTo: (id: string) => void;
};

function formatAgo(at: number): string {
  const s = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function UndoButton({ history, onUndoLast, onUndoTo }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const empty = history.length === 0;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <div className="inline-flex h-10 items-stretch overflow-hidden rounded-full border border-rule">
        <button
          onClick={onUndoLast}
          disabled={empty}
          className="inline-flex items-center gap-2 px-4 text-sm font-medium text-ink transition-colors hover:bg-accent disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
          title="Undo last action (⌘Z / Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" /> Undo
          {!empty && (
            <span className="font-display text-xs text-muted-foreground">
              {history.length}
            </span>
          )}
        </button>
        <button
          onClick={() => !empty && setOpen((o) => !o)}
          disabled={empty}
          className="border-l border-rule px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-ink disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
          aria-label="Show undo history"
        >
          ▾
        </button>
      </div>

      {open && !empty && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-lg border border-rule bg-background shadow-lg">
          <div className="px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Recent actions
          </div>
          <ul className="max-h-72 overflow-auto pb-1">
            {history.map((h, i) => (
              <li key={h.id}>
                <button
                  onClick={() => {
                    onUndoTo(h.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-accent"
                >
                  <span className="flex-1 truncate">
                    <span className="mr-2 text-muted-foreground">
                      {i === 0 ? "Last" : `−${i + 1}`}
                    </span>
                    {h.label}
                  </span>
                  <span className="font-display whitespace-nowrap text-xs text-muted-foreground">
                    {formatAgo(h.at)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
