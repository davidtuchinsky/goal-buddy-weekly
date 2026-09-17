import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, APP_STATE_TABLE } from "@/lib/supabase";

export type SyncStatus = "idle" | "syncing" | "saved" | "error" | "offline";

let globalSyncStatus: SyncStatus = "idle";
const syncListeners = new Set<(s: SyncStatus) => void>();

function setSyncStatus(s: SyncStatus) {
  globalSyncStatus = s;
  for (const l of syncListeners) l(s);
}

export function getSyncStatus() {
  return globalSyncStatus;
}

export function subscribeSyncStatus(cb: (s: SyncStatus) => void) {
  syncListeners.add(cb);
  cb(globalSyncStatus);
  return () => syncListeners.delete(cb);
}

async function loadKey(key: string): Promise<unknown | null> {
  const { data, error } = await supabase
    .from(APP_STATE_TABLE)
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
}

async function saveKey(key: string, value: unknown): Promise<void> {
  const { error } = await supabase
    .from(APP_STATE_TABLE)
    .upsert({ key, value }, { onConflict: "key" });
  if (error) throw error;
}

const pendingWrites = new Map<string, unknown>();
const dirtyKeys = new Set<string>();
const lastWrittenJson = new Map<string, string>();
let flushScheduled = false;

function scheduleWrite(key: string, value: unknown) {
  dirtyKeys.add(key);
  pendingWrites.set(key, value);
  lastWrittenJson.set(key, JSON.stringify(value));
  if (flushScheduled) return;
  flushScheduled = true;
  queueMicrotask(flushWrites);
}

async function flushWrites() {
  flushScheduled = false;
  if (pendingWrites.size === 0) return;
  const batch = Array.from(pendingWrites.entries());
  pendingWrites.clear();
  setSyncStatus("syncing");
  try {
    await Promise.all(
      batch.map(async ([k, v]) => {
        await saveKey(k, v);
        if (!pendingWrites.has(k)) dirtyKeys.delete(k);
      }),
    );
    setSyncStatus("saved");
  } catch (err) {
    if (!navigator.onLine) {
      setSyncStatus("offline");
      for (const [k, v] of batch) pendingWrites.set(k, v);
    } else {
      console.error("sync write failed", err);
      setSyncStatus("error");
      for (const [k] of batch) if (!pendingWrites.has(k)) dirtyKeys.delete(k);
    }
  }
}

export async function writeKey(key: string, value: unknown): Promise<void> {
  notifyKey(key, value);
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
  scheduleWrite(key, value);
}

const keySubscribers = new Map<string, Set<(v: unknown) => void>>();

function notifyKey(key: string, value: unknown) {
  const subs = keySubscribers.get(key);
  if (subs) for (const s of subs) s(value);
}

function subscribeKey(key: string, cb: (v: unknown) => void) {
  let subs = keySubscribers.get(key);
  if (!subs) {
    subs = new Set();
    keySubscribers.set(key, subs);
  }
  subs.add(cb);
  return () => subs!.delete(cb);
}

let realtimeStarted = false;

function ensureRealtime() {
  if (realtimeStarted) return;
  realtimeStarted = true;
  supabase
    .channel("app_state_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: APP_STATE_TABLE },
      (payload) => {
        const row = payload.new as { key: string; value: unknown } | null;
        if (!row) return;
        if (dirtyKeys.has(row.key)) return;
        const lastJson = lastWrittenJson.get(row.key);
        if (lastJson !== undefined && lastJson === JSON.stringify(row.value))
          return;
        notifyKey(row.key, row.value);
      },
    )
    .subscribe();
}

window.addEventListener("online", () => {
  if (pendingWrites.size > 0) flushWrites();
});

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  const skipNextWrite = useRef(true);

  ensureRealtime();

  useEffect(() => {
    setHydrated(false);
    skipNextWrite.current = true;
    let cancelled = false;
    (async () => {
      try {
        const cloud = await loadKey(key);
        if (cancelled) return;
        if (cloud != null) {
          notifyKey(key, cloud);
          setValue(cloud as T);
        } else {
          try {
            const raw = window.localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw) as T;
              notifyKey(key, parsed);
              setValue(parsed);
              scheduleWrite(key, parsed);
            }
          } catch {
            /* ignore */
          }
        }
        setHydrated(true);
      } catch (err) {
        if (!navigator.onLine) {
          setSyncStatus("offline");
          try {
            const raw = window.localStorage.getItem(key);
            if (raw) setValue(JSON.parse(raw) as T);
          } catch {
            /* ignore */
          }
        } else {
          console.error("sync load failed", err);
          setSyncStatus("error");
        }
        setHydrated(true);
      }
    })();

    const unsub = subscribeKey(key, (v) => {
      if (v !== undefined) setValue(v as T);
    });

    return () => {
      cancelled = true;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
    scheduleWrite(key, value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value, hydrated]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) =>
        typeof next === "function" ? (next as (p: T) => T)(prev) : next,
      );
    },
    [],
  );

  return [value, set] as const;
}

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(globalSyncStatus);
  useEffect(() => subscribeSyncStatus(setStatus), []);
  return status;
}
