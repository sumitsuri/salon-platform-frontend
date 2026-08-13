import { useEffect } from "react";
import { lockBodyScroll } from "@/lib/scroll-lock";

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    return lockBodyScroll();
  }, [active]);
}
