import { useEffect, useRef, useState } from "react";

export function useAutoSave<T extends Record<string, unknown>>(
  key: string,
  state: T,
  setState: (s: T) => void,
  options: { delay?: number; enabled?: boolean } = {}
) {
  const { delay = 1000, enabled = true } = options;
  const [restored, setRestored] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const skipNextSave = useRef(true);

  useEffect(() => {
    if (!enabled || restored) return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && typeof draft === "object") {
          setState({ ...state, ...draft });
          setHasDraft(true);
        }
      }
    } catch { /* ignore */ }
    setRestored(true);
    skipNextSave.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!enabled || !restored) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    const timer = setTimeout(() => {
      try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* ignore */ }
    }, delay);
    return () => clearTimeout(timer);
  }, [state, key, delay, enabled, restored]);

  function clear() {
    try { localStorage.removeItem(key); setHasDraft(false); } catch { /* ignore */ }
  }

  return { hasDraft, clearDraft: clear };
}
