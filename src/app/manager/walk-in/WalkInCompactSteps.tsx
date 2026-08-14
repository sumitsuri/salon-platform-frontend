"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function WalkInCompactSteps({
  steps,
  current,
  onStepSelect,
  embedded = false,
  className,
}: {
  steps: string[];
  current: number;
  /** When set, completed steps are tappable to navigate back. */
  onStepSelect?: (step: number) => void;
  /** Render inside a parent chrome card without its own outer frame. */
  embedded?: boolean;
  className?: string;
}) {
  const progressPct = steps.length > 1 ? ((current - 1) / (steps.length - 1)) * 100 : 100;

  return (
    <div
      className={cn(
        "md:hidden",
        embedded
          ? "p-0.5"
          : "rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/40 p-1",
        className,
      )}
      aria-label={`Step ${current} of ${steps.length}`}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-full bg-[var(--border)]",
          embedded ? "mb-0.5 h-px" : "mb-1 h-0.5",
        )}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--brand)] transition-all duration-300"
          style={{ width: `${progressPct}%` }}
          aria-hidden
        />
      </div>
      <div className="flex gap-0.5" role="list">
        {steps.map((label, i) => {
          const n = i + 1;
          const active = n === current;
          const done = n < current;
          const clickable = !!onStepSelect && done;
          return (
            <button
              key={label}
              type="button"
              role="listitem"
              disabled={!clickable}
              onClick={() => clickable && onStepSelect?.(n)}
              aria-label={clickable ? `Go back to ${label}` : active ? label : `Step ${n}: ${label}`}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1 py-1 text-[10px] font-bold uppercase tracking-wide transition touch-manipulation",
                active && "bg-[var(--brand)] text-[var(--brand-on-brand)] shadow-sm",
                done && !active && "text-emerald-700 dark:text-emerald-400",
                !active && !done && "text-[var(--text-tertiary)]",
                clickable && "hover:bg-[var(--surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand)]",
                !clickable && !active && "cursor-default",
              )}
            >
              {done ? <Check className="h-3 w-3 shrink-0" strokeWidth={3} aria-hidden /> : null}
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
