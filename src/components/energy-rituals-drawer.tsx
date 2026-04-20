import { useState } from "react";
import { Plus, Sparkles, Trash2, X } from "lucide-react";
import { ENERGY_SLOTS, uid, type EnergyRitual, type EnergySlot } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  rituals: EnergyRitual[];
  setRituals: (
    next: EnergyRitual[] | ((prev: EnergyRitual[]) => EnergyRitual[]),
  ) => void;
};

export function EnergyRitualsDrawer({
  open,
  onClose,
  rituals,
  setRituals,
}: Props) {
  const [drafts, setDrafts] = useState<Record<EnergySlot, string>>({
    before: "",
    mid: "",
    after: "",
  });

  const add = (slot: EnergySlot) => {
    const t = drafts[slot].trim();
    if (!t) return;
    setRituals([
      ...rituals,
      { id: uid(), text: t, slot, createdAt: Date.now() },
    ]);
    setDrafts((d) => ({ ...d, [slot]: "" }));
  };

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
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Daily anchors
              </p>
              <h2 className="font-display text-xl font-medium text-ink">
                Energy rituals
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

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {ENERGY_SLOTS.map((slot) => {
            const items = rituals.filter((r) => r.slot === slot.id);
            return (
              <section key={slot.id}>
                <h3 className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {slot.label}
                </h3>
                <ul className="space-y-1">
                  {items.length === 0 && (
                    <li className="text-sm italic text-muted-foreground/70">
                      No rituals yet.
                    </li>
                  )}
                  {items.map((r) => (
                    <li
                      key={r.id}
                      className="group flex items-center gap-2 rounded-md border border-rule/60 bg-paper/40 px-3 py-2"
                    >
                      <span className="flex-1 text-sm text-ink">{r.text}</span>
                      <button
                        onClick={() =>
                          setRituals(rituals.filter((x) => x.id !== r.id))
                        }
                        className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    add(slot.id);
                  }}
                  className="mt-2 flex items-center gap-2"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <input
                    value={drafts[slot.id]}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [slot.id]: e.target.value }))
                    }
                    placeholder={`Add ${slot.short.toLowerCase()} ritual…`}
                    className="flex-1 rounded-md border border-rule bg-paper px-2 py-1.5 text-sm text-ink placeholder:text-muted-foreground/70 focus:border-ink focus:outline-none"
                  />
                </form>
              </section>
            );
          })}
        </div>
      </aside>
    </>
  );
}
