import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initial: T) {
  // Always start with `initial` so SSR and the first client render match.
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  // After mount, hydrate from localStorage (client-only).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore parse errors */
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Persist changes — but only after we've hydrated, to avoid clobbering
  // stored data with the `initial` value on first mount.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota errors */
    }
  }, [key, value, hydrated]);

  return [value, setValue] as const;
}
