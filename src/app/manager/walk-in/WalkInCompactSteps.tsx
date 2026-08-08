"use client";

import { cn } from "@/lib/utils";

export function WalkInCompactSteps({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <div className="md:hidden flex items-center justify-center gap-2 py-1" aria-label={`Step ${current} of ${steps.length}`}>
      {steps.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                active && "bg-[var(--brand)] text-[var(--brand-on-brand)]",
                done && !active && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
                !active && !done && "bg-[var(--surface-muted)] text-[var(--text-tertiary)]"
              )}
            >
              {done ? "✓" : n}
            </div>
            {active && <span className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-[8rem]">{label}</span>}
            {i < steps.length - 1 && <div className="h-px w-4 bg-[var(--border)]" aria-hidden />}
          </div>
        );
      })}
    </div>
  );
}
