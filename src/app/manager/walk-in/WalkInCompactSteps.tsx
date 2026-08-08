"use client";

import { cn } from "@/lib/utils";

export function WalkInCompactSteps({
  steps,
  current,
  onStepSelect,
}: {
  steps: string[];
  current: number;
  /** When set, completed steps are tappable to navigate back. */
  onStepSelect?: (step: number) => void;
}) {
  return (
    <div
      className="md:hidden flex items-center justify-center gap-2 py-1"
      aria-label={`Step ${current} of ${steps.length}`}
    >
      {steps.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        const clickable = !!onStepSelect && done;
        return (
          <div key={label} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepSelect?.(n)}
              aria-label={clickable ? `Go back to ${label}` : active ? label : `Step ${n}`}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition",
                active && "bg-[var(--brand)] text-[var(--brand-on-brand)]",
                done && !active && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
                !active && !done && "bg-[var(--surface-muted)] text-[var(--text-tertiary)]",
                clickable && "cursor-pointer hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand)]",
                !clickable && "cursor-default"
              )}
            >
              {done ? "✓" : n}
            </button>
            {active && (
              <span className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-[8rem]">{label}</span>
            )}
            {i < steps.length - 1 && <div className="h-px w-4 bg-[var(--border)]" aria-hidden />}
          </div>
        );
      })}
    </div>
  );
}
