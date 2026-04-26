import type { DayName } from "./week";

/* ============================================================
 * Domain types
 * ============================================================ */

/** Curated palette for objectives. Index referenced by Objective.colorIndex. */
export const OBJECTIVE_PALETTE = [
  { name: "Terracotta", value: "oklch(0.62 0.16 35)" },
  { name: "Sage", value: "oklch(0.62 0.1 150)" },
  { name: "Indigo", value: "oklch(0.55 0.13 260)" },
  { name: "Ochre", value: "oklch(0.7 0.14 80)" },
  { name: "Plum", value: "oklch(0.5 0.15 320)" },
  { name: "Teal", value: "oklch(0.6 0.1 200)" },
  { name: "Rose", value: "oklch(0.65 0.15 10)" },
  { name: "Moss", value: "oklch(0.5 0.08 130)" },
] as const;

export type SubBullet = {
  id: string;
  text: string;
  done: boolean;
};

export type ObjectiveKind = "work" | "personal";

export type Objective = {
  id: string;
  text: string;
  colorIndex: number;
  /** Optional override color (oklch string). When set, takes precedence. */
  colorOverride?: string;
  subBullets: SubBullet[];
  /** "work" (Big Rocks) or "personal" (hobbies/personal goals). Defaults to "work". */
  kind?: ObjectiveKind;
  createdAt: number;
};

export type Recurrence =
  | { kind: "none" }
  | { kind: "weekly"; days: DayName[] }; // e.g. ["Wednesday"]

export type LibraryTask = {
  id: string;
  text: string;
  /** Optional link to an objective for color coding. */
  objectiveId?: string;
  recurrence: Recurrence;
  /** "work" or "personal". Defaults to "work". */
  kind?: ObjectiveKind;
  createdAt: number;
};

/**
 * A task instance scheduled on a specific day of a specific week.
 * For recurring tasks, instances are auto-generated per week and
 * tracked independently (each occurrence is independent).
 */
/**
 * Vertical zone within a day, defined by the 3 energy ritual blocks.
 * 0 = before the "Before" ritual block (top)
 * 1 = between Before and Mid
 * 2 = between Mid and After
 * 3 = below the "After" block (bottom)
 */
export type TaskZone = 0 | 1 | 2 | 3;

export type TaskInstance = {
  id: string;
  /** Source library task id (if generated from library) */
  libraryId?: string;
  /** Source big-rock sub-bullet id (if generated from a big rock sub-bullet) */
  subBulletId?: string;
  /** Snapshot of text at creation time (so library edits don't rewrite history) */
  text: string;
  objectiveId?: string;
  day: DayName;
  done: boolean;
  /** Sort order within the day (lower = earlier). */
  order?: number;
  /** Which ritual zone this task lives in. Defaults to 0. */
  zone?: TaskZone;
  /** "work" or "personal". Defaults to "work". */
  kind?: ObjectiveKind;
};

export type EnergySlot = "before" | "mid" | "after";

export const ENERGY_SLOTS: { id: EnergySlot; label: string; short: string }[] =
  [
    { id: "before", label: "Before work", short: "Before" },
    { id: "mid", label: "Midday", short: "Mid" },
    { id: "after", label: "After work", short: "After" },
  ];

export type EnergyRitual = {
  id: string;
  text: string;
  slot: EnergySlot;
  createdAt: number;
};

export type BacklogSubBullet = {
  id: string;
  text: string;
};

export type BacklogItem = {
  id: string;
  text: string;
  subBullets: BacklogSubBullet[];
  createdAt: number;
};

export type RadarItem = {
  id: string;
  text: string;
  createdAt: number;
};

/** Per-week storage: only ad-hoc instances + completion overrides for recurring instances. */
export type WeekState = {
  /** Ad-hoc one-off tasks added directly to a day */
  adHoc: TaskInstance[];
  /**
   * Completion state for recurring instances.
   * Key: `${libraryId}:${day}` — value: true if done.
   */
  recurringDone: Record<string, boolean>;
  /**
   * Deletions for recurring instances on this week only.
   * Key: `${libraryId}:${day}`.
   */
  recurringSkipped: Record<string, boolean>;
  /**
   * Sort order overrides for recurring instances within a day.
   * Key: `${libraryId}:${day}` — value: order number.
   */
  recurringOrder?: Record<string, number>;
  /**
   * Zone overrides for recurring instances within a day.
   * Key: `${libraryId}:${day}` — value: TaskZone.
   */
  recurringZone?: Record<string, number>;
  /**
   * Energy ritual completion. Key: `${ritualId}:${day}` — value: true.
   */
  energyDone?: Record<string, boolean>;
};

export const EMPTY_WEEK: WeekState = {
  adHoc: [],
  recurringDone: {},
  recurringSkipped: {},
  recurringOrder: {},
  recurringZone: {},
  energyDone: {},
};

/* ============================================================
 * Helpers
 * ============================================================ */

export function recurringKey(libraryId: string, day: DayName): string {
  return `${libraryId}:${day}`;
}

export function energyKey(ritualId: string, day: DayName): string {
  return `${ritualId}:${day}`;
}

export function objectiveColor(obj: Objective | undefined | null): string {
  if (!obj) return "oklch(0.6 0 0)";
  if (obj.colorOverride) return obj.colorOverride;
  return OBJECTIVE_PALETTE[obj.colorIndex % OBJECTIVE_PALETTE.length].value;
}

export function nextPaletteIndex(existing: Objective[]): number {
  const used = new Set(existing.map((o) => o.colorIndex));
  for (let i = 0; i < OBJECTIVE_PALETTE.length; i++) {
    if (!used.has(i)) return i;
  }
  return existing.length % OBJECTIVE_PALETTE.length;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
