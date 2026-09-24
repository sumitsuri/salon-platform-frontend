"use client";

import { useEffect, useRef, useState } from "react";

function readStorage<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota/private-mode errors — persistence is a convenience, not a requirement.
  }
}

/**
 * Drop-in useState replacement that persists to sessionStorage, keyed by `key`.
 * Restores the last value on remount (e.g. navigating to another tab and back)
 * within the same browser session; falls back to `initialValue` otherwise.
 *
 * Uses SSR-safe initial state, then hydrates from sessionStorage on the client so
 * a server render does not clobber stored values.
 */
export type PersistentStateOptions = {
  /** When true on mount, sessionStorage is not applied (e.g. URL query owns initial state). */
  skipRestoreIf?: () => boolean;
};

export function usePersistentState<T>(
  key: string,
  initialValue: T | (() => T),
  revive?: (stored: T) => T,
  options?: PersistentStateOptions,
): [T, (value: T | ((prev: T) => T)) => void] {
  const initialRef = useRef(initialValue);
  const reviveRef = useRef(revive);
  reviveRef.current = revive;
  const skipRestoreIfRef = useRef(options?.skipRestoreIf);
  skipRestoreIfRef.current = options?.skipRestoreIf;

  const [state, setState] = useState<T>(() => {
    const init = initialRef.current;
    return init instanceof Function ? (init as () => T)() : init;
  });

  useEffect(() => {
    if (skipRestoreIfRef.current?.()) return;
    const stored = readStorage<T>(key);
    if (stored === undefined) return;
    const next = reviveRef.current ? reviveRef.current(stored) : stored;
    setState(next);
    writeStorage(key, next);
    // Only re-run when the storage key itself changes (distinct widget instance).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setPersistentState = (value: T | ((prev: T) => T)) => {
    setState((prev) => {
      const next = value instanceof Function ? value(prev) : value;
      writeStorage(key, next);
      return next;
    });
  };

  return [state, setPersistentState];
}
