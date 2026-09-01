"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppNav } from "@/lib/app-nav-context";

/** Thin top bar — visible for the full client route transition (static export). */
export function NavigationProgress() {
  const pathname = usePathname();
  const { isNavigating } = useAppNav();
  const [phase, setPhase] = useState<"idle" | "active" | "done">("idle");

  useEffect(() => {
    setPhase("active");
    const finish = window.setTimeout(() => setPhase("done"), 420);
    const idle = window.setTimeout(() => setPhase("idle"), 700);
    return () => {
      window.clearTimeout(finish);
      window.clearTimeout(idle);
    };
  }, [pathname]);

  const visible = isNavigating || phase !== "idle";
  if (!visible) return null;

  return (
    <div
      className="nav-progress pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px] overflow-hidden"
      aria-hidden
    >
      <div
        className={cn(
          "nav-progress-bar h-full",
          isNavigating || phase === "active"
            ? "nav-progress-bar--active"
            : "nav-progress-bar--done"
        )}
      />
    </div>
  );
}
