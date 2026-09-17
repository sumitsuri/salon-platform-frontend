"use client";

import { cn } from "@/lib/utils";

export function ScratchCelebration({ active, className }: { active?: boolean; className?: string }) {
  if (!active) return null;

  return (
    <div className={cn("scratch-celebration pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          className="scratch-confetti-piece"
          style={{ ["--i" as string]: i, ["--drift" as string]: `${(i - 14) * 6}px` }}
        />
      ))}
      <span className="scratch-glow-ring" />
    </div>
  );
}
