"use client";

import { cn } from "@/lib/utils";

export function TargetProgressBar({
  label,
  actual,
  target,
}: {
  label: string;
  actual: number;
  target: number;
  accent?: "violet" | "emerald" | "amber";
}) {
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : actual > 0 ? 100 : 0;
  const barColor =
    pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-[var(--brand-light)]0" : "bg-amber-500";

  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-[var(--ink-muted)]">{label}</span>
        <span className="font-medium tabular-nums">
          {actual}
          <span className="text-[var(--ink-muted)]"> / {target}</span>
          {target > 0 && (
            <span className="ml-1.5 text-xs text-[var(--ink-muted)]">({pct}%)</span>
          )}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function overallTargetPercent(
  metrics: { actual: number; target: number }[]
): number {
  const withTargets = metrics.filter((m) => m.target > 0);
  if (withTargets.length === 0) return 0;
  const sum = withTargets.reduce(
    (acc, m) => acc + Math.min(100, (m.actual / m.target) * 100),
    0
  );
  return Math.round(sum / withTargets.length);
}

export function targetStatusLabel(pct: number): { label: string; className: string } {
  if (pct >= 100) return { label: "Exceeding", className: "bg-emerald-100 text-emerald-800" };
  if (pct >= 70) return { label: "On track", className: "bg-[var(--brand-light)] text-[var(--brand-text)]" };
  return { label: "Needs attention", className: "bg-amber-100 text-amber-800" };
}
