"use client";

import { useEffect } from "react";
import { repairOrphanedScrollLock } from "@/lib/scroll-lock";

/** Recover scroll when Android PWA resumes or bfcache restores with stuck body styles. */
export function PwaScrollRecovery() {
  useEffect(() => {
    const recover = () => repairOrphanedScrollLock();

    window.addEventListener("pageshow", recover);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") recover();
    });

    recover();

    return () => {
      window.removeEventListener("pageshow", recover);
    };
  }, []);

  return null;
}
