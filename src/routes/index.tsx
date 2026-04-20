import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { useLocalStorage } from "@/lib/storage";
import {
  DAYS,
  addDays,
  formatDayLabel,
  formatWeekRange,
  isSameDay,
  startOfWeek,
  weekKey,
  type DayName,
} from "@/lib/week";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Index,
});

type Task = {
  id: string;
  text: string;
  done: boolean;
  day: DayName;
};

type Objective = {
  id: string;
  text: string;
  done: boolean;
};

type WeekData = {
  tasks: Task[];
  objectives: Objective[];
};

const EMPTY_WEEK: WeekData = { tasks: [], objectives: [] };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function Index() {
  const [cursor, setCursor] = useState<Date>(() => startOfWeek(new Date()));
  const key = `weekly:${weekKey(cursor)}`;
  const [data, setData] = useLocalStorage<WeekData>(key, EMPTY_WEEK);

  const today = useMemo(() => new Date(), []);
  const isCurrentWeek = useMemo(
    () => weekKey(startOfWeek(today)) === weekKey(cursor),
    [today, cursor],
  );

  const addTask = (day: DayName, text: string) => {
    if (!text.trim()) return;
    setData({
      ...data,
      tasks: [
        ...data.tasks,
        { id: uid(), text: text.trim(), done: false, day },
      ],
    });
  };

  const toggleTask = (id: string) =>
    setData({
      ...data,
      tasks: data.tasks.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t,
      ),
    });

  const removeTask = (id: string) =>
    setData({ ...data, tasks: data.tasks.filter((t) => t.id !== id) });

  const addObjective = (text: string) => {
    if (!text.trim()) return;
    setData({
      ...data,
      objectives: [
        ...data.objectives,
        { id: uid(), text: text.trim(), done: false },
      ],
    });
  };

  const toggleObjective = (id: string) =>
    setData({
      ...data,
      objectives: data.objectives.map((o) =>
        o.id === id ? { ...o, done: !o.done } : o,
      ),
    });

  const removeObjective = (id: string) =>
    setData({
      ...data,
      objectives: data.objectives.filter((o) => o.id !== id),
    });

  const totalTasks = data.tasks.length;
  const doneTasks = data.tasks.filter((t) => t.done).length;
  const progress = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="min-h-screen">
      <header className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-8 md:px-10 md:py-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Weekly Planner
              </p>
              <h1 className="font-display mt-2 text-4xl font-medium leading-none tracking-tight text-ink md:text-6xl">
                Week of{" "}
                <span className="italic text-primary">
                  {formatWeekRange(cursor)}
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCursor(addDays(cursor, -7))}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rule text-ink transition-colors hover:bg-accent"
                aria-label="Previous week"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCursor(startOfWeek(new Date()))}
                disabled={isCurrentWeek}
                className="h-10 rounded-full border border-rule px-4 text-sm font-medium text-ink transition-colors hover:bg-accent disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
              >
                This week
              </button>
              <button
                onClick={() => setCursor(addDays(cursor, 7))}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rule text-ink transition-colors hover:bg-accent"
                aria-label="Next week"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl text-ink">
                {doneTasks}
              </span>
              <span>of {totalTasks} tasks done</span>
            </div>
            <div className="flex flex-1 items-center gap-3 md:max-w-md">
              <div className="h-[2px] flex-1 bg-rule">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="font-display text-sm tabular-nums text-ink">
                {progress}%
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Days grid */}
          <section>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {DAYS.map((dayName, i) => {
                const date = addDays(cursor, i);
                const dayTasks = data.tasks.filter((t) => t.day === dayName);
                return (
                  <DayCard
                    key={dayName}
                    dayName={dayName}
                    date={date}
                    isToday={isSameDay(date, today)}
                    tasks={dayTasks}
                    onAdd={(text) => addTask(dayName, text)}
                    onToggle={toggleTask}
                    onRemove={removeTask}
                  />
                );
              })}
            </div>
          </section>

          {/* Objectives sidebar */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <ObjectivesPanel
              objectives={data.objectives}
              onAdd={addObjective}
              onToggle={toggleObjective}
              onRemove={removeObjective}
            />
          </aside>
        </div>

        <footer className="mt-16 border-t border-rule pt-6 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Saved locally in your browser
        </footer>
      </main>
    </div>
  );
}

function DayCard({
  dayName,
  date,
  isToday,
  tasks,
  onAdd,
  onToggle,
  onRemove,
}: {
  dayName: DayName;
  date: Date;
  isToday: boolean;
  tasks: Task[];
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [text, setText] = useState("");
  const done = tasks.filter((t) => t.done).length;

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
            {isToday && (
              <span className="ml-2 text-primary">• Today</span>
            )}
          </p>
        </div>
        <span className="font-display text-sm tabular-nums text-muted-foreground">
          {done}/{tasks.length}
        </span>
      </div>

      <ul className="flex-1 space-y-1.5">
        {tasks.length === 0 && (
          <li className="py-2 text-sm italic text-muted-foreground/70">
            Nothing planned.
          </li>
        )}
        {tasks.map((t) => (
          <li
            key={t.id}
            className="group flex items-start gap-2 rounded-md px-1 py-1 hover:bg-accent/40"
          >
            <button
              onClick={() => onToggle(t.id)}
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
                t.done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-rule hover:border-ink",
              )}
              aria-label={t.done ? "Mark incomplete" : "Mark complete"}
            >
              {t.done && <Check className="h-3 w-3" strokeWidth={3} />}
            </button>
            <span
              className={cn(
                "flex-1 text-sm leading-snug text-ink transition-all",
                t.done && "text-muted-foreground line-through",
              )}
            >
              {t.text}
            </span>
            <button
              onClick={() => onRemove(t.id)}
              className="mt-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              aria-label="Delete task"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAdd(text);
          setText("");
        }}
        className="mt-3 flex items-center gap-2 border-t border-rule pt-3"
      >
        <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a task…"
          className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted-foreground/70 focus:outline-none"
        />
      </form>
    </div>
  );
}

function ObjectivesPanel({
  objectives,
  onAdd,
  onToggle,
  onRemove,
}: {
  objectives: Objective[];
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [text, setText] = useState("");
  const done = objectives.filter((o) => o.done).length;

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
            Objectives
          </h2>
        </div>
      </div>

      <ul className="space-y-2">
        {objectives.length === 0 && (
          <li className="py-2 text-sm italic text-muted-foreground/70">
            What do you want this week to add up to?
          </li>
        )}
        {objectives.map((o) => (
          <li
            key={o.id}
            className="group flex items-start gap-3 rounded-md py-1.5"
          >
            <button
              onClick={() => onToggle(o.id)}
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                o.done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-rule hover:border-ink",
              )}
              aria-label={o.done ? "Mark incomplete" : "Mark complete"}
            >
              {o.done && <Check className="h-3 w-3" strokeWidth={3} />}
            </button>
            <span
              className={cn(
                "font-display flex-1 text-base leading-snug text-ink transition-all",
                o.done && "text-muted-foreground line-through",
              )}
            >
              {o.text}
            </span>
            <button
              onClick={() => onRemove(o.id)}
              className="mt-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              aria-label="Delete objective"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAdd(text);
          setText("");
        }}
        className="mt-4 flex items-center gap-2 border-t border-rule pt-4"
      >
        <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add an objective…"
          className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted-foreground/70 focus:outline-none"
        />
      </form>

      {objectives.length > 0 && (
        <p className="mt-5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {done} of {objectives.length} achieved
        </p>
      )}
    </div>
  );
}
