import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useLocalStorage } from "@/lib/storage";
import { supabase, APP_STATE_TABLE } from "@/lib/supabase";
import { ImagePlus, Type, Quote, Heading1, Heading2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Block =
  | { id: string; type: "heading1"; text: string }
  | { id: string; type: "heading2"; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "quote"; text: string }
  | { id: string; type: "image"; src: string; caption?: string };

const STORAGE_KEY = "weekly:winning-day";

const uid = () => Math.random().toString(36).slice(2, 10);

function loadBlocks(): Block[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Block[];
  } catch {
    /* ignore */
  }
  return [
    { id: uid(), type: "heading1", text: "My Winning Day" },
    {
      id: uid(),
      type: "paragraph",
      text: "Review this every morning. Add your limiting beliefs, your goals, the people you're doing this for, and anything that motivates you.",
    },
  ];
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WinningDayDialog({ open, onOpenChange }: Props) {
  const [blocks, setBlocks] = useState<Block[]>(loadBlocks);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from(APP_STATE_TABLE)
        .select("value")
        .eq("key", STORAGE_KEY)
        .maybeSingle();
      if (data?.value && Array.isArray(data.value)) {
        setBlocks(data.value as Block[]);
      }
    })();
  }, [open]);

  const persist = useCallback((next: Block[]) => {
    setBlocks(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase
        .from(APP_STATE_TABLE)
        .upsert({ key: STORAGE_KEY, value: next }, { onConflict: "key" });
    }, 800);
  }, []);

  const updateBlock = (id: string, patch: Partial<Block>) => {
    persist(blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)));
  };

  const deleteBlock = (id: string) => {
    persist(blocks.filter((b) => b.id !== id));
  };

  const addBlock = (type: Block["type"], afterId?: string) => {
    const newBlock: Block =
      type === "image"
        ? { id: uid(), type: "image", src: "" }
        : { id: uid(), type, text: "" };
    if (afterId) {
      const idx = blocks.findIndex((b) => b.id === afterId);
      const next = [...blocks];
      next.splice(idx + 1, 0, newBlock);
      persist(next);
    } else {
      persist([...blocks, newBlock]);
    }
  };

  const handleImageUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      updateBlock(id, { src: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex((b) => b.id === id);
    const target = idx + dir;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[target]] = [next[target], next[idx]];
    persist(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[92vh] w-[96vw] max-w-none gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Winning Day Document</DialogTitle>
        <div className="flex items-center justify-between border-b border-rule px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-medium text-ink">
              Winning Day
            </span>
            <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
              Your daily north star
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => addBlock("heading1")}
              icon={<Heading1 className="h-4 w-4" />}
              label="Title"
            />
            <ToolbarButton
              onClick={() => addBlock("heading2")}
              icon={<Heading2 className="h-4 w-4" />}
              label="Section"
            />
            <ToolbarButton
              onClick={() => addBlock("paragraph")}
              icon={<Type className="h-4 w-4" />}
              label="Text"
            />
            <ToolbarButton
              onClick={() => addBlock("quote")}
              icon={<Quote className="h-4 w-4" />}
              label="Quote"
            />
            <ToolbarButton
              onClick={() => addBlock("image")}
              icon={<ImagePlus className="h-4 w-4" />}
              label="Image"
            />
          </div>
        </div>
        <div className="overflow-y-auto px-6 py-8" style={{ height: "calc(92vh - 56px)" }}>
          <div className="mx-auto max-w-3xl space-y-3">
            {blocks.map((block, i) => (
              <BlockEditor
                key={block.id}
                block={block}
                onChange={(patch) => updateBlock(block.id, patch)}
                onDelete={() => deleteBlock(block.id)}
                onMoveUp={() => moveBlock(block.id, -1)}
                onMoveDown={() => moveBlock(block.id, 1)}
                onImageUpload={(file) => handleImageUpload(block.id, file)}
                onEnter={() => {
                  const type =
                    block.type === "heading1" || block.type === "heading2"
                      ? "paragraph"
                      : block.type;
                  addBlock(type, block.id);
                }}
                canMoveUp={i > 0}
                canMoveDown={i < blocks.length - 1}
              />
            ))}
            <div className="pt-4 text-center">
              <button
                onClick={() => addBlock("paragraph")}
                className="rounded-full border border-dashed border-rule px-6 py-2 text-sm text-muted-foreground transition-colors hover:border-ink hover:text-ink"
              >
                + Add text
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ToolbarButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-ink"
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function BlockEditor({
  block,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  onImageUpload,
  onEnter,
  canMoveUp,
  canMoveDown,
}: {
  block: Block;
  onChange: (patch: Partial<Block>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onImageUpload: (file: File) => void;
  onEnter: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [hovered, setHovered] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEnter();
    }
  };

  const blockClass = cn(
    "group relative rounded-lg transition-colors",
    hovered && "bg-accent/30",
  );

  const controls = (
    <div
      className={cn(
        "absolute -left-20 top-1 flex flex-col gap-0.5 transition-opacity",
        hovered ? "opacity-100" : "opacity-0",
      )}
    >
      {canMoveUp && (
        <button
          onClick={onMoveUp}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-ink"
          title="Move up"
        >
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
            <path d="M6 2L2 7h8z" fill="currentColor" />
          </svg>
        </button>
      )}
      {canMoveDown && (
        <button
          onClick={onMoveDown}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-ink"
          title="Move down"
        >
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
            <path d="M6 10L2 5h8z" fill="currentColor" />
          </svg>
        </button>
      )}
      <button
        onClick={onDelete}
        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        title="Delete"
      >
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
          <path
            d="M3 3l6 6M9 3l-6 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );

  if (block.type === "image") {
    return (
      <div
        className={blockClass}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {controls}
        {block.src ? (
          <figure className="space-y-2">
            <img
              src={block.src}
              alt={block.caption || ""}
              className="max-w-full rounded-lg border border-rule"
            />
            <input
              value={block.caption || ""}
              onChange={(e) => onChange({ caption: e.target.value })}
              placeholder="Add a caption…"
              className="w-full bg-transparent text-center text-sm italic text-muted-foreground focus:outline-none"
            />
          </figure>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-rule py-12 text-muted-foreground transition-colors hover:border-ink hover:text-ink"
          >
            <ImagePlus className="h-8 w-8" />
            <span className="text-sm">Click to upload an image</span>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImageUpload(file);
          }}
        />
      </div>
    );
  }

  const isHeading1 = block.type === "heading1";
  const isHeading2 = block.type === "heading2";
  const isQuote = block.type === "quote";

  return (
    <div
      className={blockClass}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {controls}
      <textarea
        value={block.text}
        onChange={(e) => onChange({ text: e.target.value })}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder={
          isHeading1
            ? "Title…"
            : isHeading2
              ? "Section heading…"
              : isQuote
                ? "A quote that inspires you…"
                : "Write here…"
        }
        className={cn(
          "w-full resize-none bg-transparent focus:outline-none",
          isHeading1 &&
            "font-display text-3xl font-medium leading-tight text-ink",
          isHeading2 &&
            "font-display text-xl font-medium leading-snug text-ink",
          isQuote &&
            "border-l-4 border-primary pl-4 text-lg italic leading-relaxed text-ink",
          !isHeading1 && !isHeading2 && !isQuote && "text-base leading-relaxed text-ink",
        )}
        style={{
          height: "auto",
          minHeight: isHeading1 ? 40 : isHeading2 ? 32 : 24,
        }}
        onInput={(e) => {
          const el = e.target as HTMLTextAreaElement;
          el.style.height = "auto";
          el.style.height = el.scrollHeight + "px";
        }}
        ref={(el) => {
          if (el) {
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
          }
        }}
      />
    </div>
  );
}
