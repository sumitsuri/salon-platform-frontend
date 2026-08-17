import { useEffect } from "react";
import { lockBodyScroll, repairOrphanedScrollLock } from "@/lib/scroll-lock";

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) {
      repairOrphanedScrollLock();
      return;
    }
    const release = lockBodyScroll();
    return () => {
      release();
      repairOrphanedScrollLock();
    };
  }, [active]);
}
