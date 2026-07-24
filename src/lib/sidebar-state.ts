"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "app-sidebar-collapsed";

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true" || stored === "false") {
        setCollapsed(stored === "true");
      } else if (window.matchMedia("(min-width: 768px) and (max-width: 1023px)").matches) {
        setCollapsed(true);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { collapsed, toggle, ready };
}
