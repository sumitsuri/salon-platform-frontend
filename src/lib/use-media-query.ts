"use client";

import { useSyncExternalStore } from "react";

/** Subscribes to a CSS media query; `false` during SSR/static export so the first paint matches the phone layout. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
