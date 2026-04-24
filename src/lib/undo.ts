import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Generic undo history (last N snapshots) for a set of named state slices.
 * Wrap your raw setters with `wrap("label", setter)` and the wrapped setter
 * will snapshot the current state before applying changes.
 */
export type UndoSnapshot<S> = {
  id: string;
  label: string;
  at: number;
  state: S;
};

export function useUndoHistory<S extends Record<string, unknown>>(
  current: S,
  setters: { [K in keyof S]: (v: S[K]) => void },
  limit = 3,
) {
  const [history, setHistory] = useState<UndoSnapshot<S>[]>([]);
  const currentRef = useRef(current);
  const settersRef = useRef(setters);
  const isUndoingRef = useRef(false);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);
  useEffect(() => {
    settersRef.current = setters;
  }, [setters]);

  const snapshot = useCallback(
    (label: string) => {
      if (isUndoingRef.current) return;
      const snap: UndoSnapshot<S> = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label,
        at: Date.now(),
        state: JSON.parse(JSON.stringify(currentRef.current)) as S,
      };
      setHistory((h) => [snap, ...h].slice(0, limit));
    },
    [limit],
  );

  const restore = (snap: UndoSnapshot<S>) => {
    isUndoingRef.current = true;
    try {
      const s = snap.state;
      const setterMap = settersRef.current;
      (Object.keys(setterMap) as (keyof S)[]).forEach((k) => {
        setterMap[k](s[k]);
      });
    } finally {
      setTimeout(() => {
        isUndoingRef.current = false;
      }, 0);
    }
  };

  const undoTo = useCallback((id: string) => {
    setHistory((h) => {
      const idx = h.findIndex((s) => s.id === id);
      if (idx < 0) return h;
      restore(h[idx]);
      return h.slice(idx + 1);
    });
  }, []);

  const undoLast = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      restore(h[0]);
      return h.slice(1);
    });
  }, []);

  return { history, snapshot, undoTo, undoLast };
}
