"use client";

import { Pencil } from "lucide-react";
import { SalesTarget } from "@/modules/sales/api/salesApi";
import {
  TargetProgressBar,
  overallTargetPercent,
  targetStatusLabel,
} from "@/modules/sales/components/TargetProgressBar";

type RepTargetProgressCardProps = {
  target: SalesTarget;
  periodLabel: string;
  hasSavedTarget?: boolean;
  onEdit?: () => void;
};

export function RepTargetProgressCard({
  target,
  periodLabel,
  hasSavedTarget = true,
  onEdit,
}: RepTargetProgressCardProps) {
  const metrics = [
    { label: "New leads", actual: target.actualLeads ?? 0, target: target.targetLeads },
    { label: "Visits", actual: target.actualVisits ?? 0, target: target.targetVisits },
    { label: "Pitches", actual: target.actualPitches ?? 0, target: target.targetPitches },
    { label: "Trials", actual: target.actualTrials ?? 0, target: target.targetTrials },
    { label: "Wins", actual: target.actualConversions ?? 0, target: target.targetConversions },
  ];
  const overall = overallTargetPercent(metrics);
  const status = hasSavedTarget ? targetStatusLabel(overall) : { label: "Not set", className: "bg-gray-100 text-gray-600" };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm" data-testid="rep-target-card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{target.repName ?? "Rep"}</p>
          <p className="text-xs text-[var(--ink-muted)]">Actuals · {periodLabel}</p>
          {!hasSavedTarget && (
            <p className="mt-1 text-xs text-amber-600">Using default targets — save to persist</p>
          )}
        </div>
        <div className="flex shrink-0 items-start gap-2">
          <div className="text-right">
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
              {status.label}
            </span>
            {hasSavedTarget && <p className="mt-1 text-lg font-bold tabular-nums">{overall}%</p>}
          </div>
          {onEdit && (
            <button
              type="button"
              className="rounded p-1.5 text-[var(--ink-muted)] hover:bg-violet-50 hover:text-violet-600"
              aria-label={`Edit targets for ${target.repName}`}
              data-testid="edit-rep-targets"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="space-y-3">
        {metrics.map((m) => (
          <TargetProgressBar key={m.label} label={m.label} actual={m.actual} target={m.target} />
        ))}
      </div>
    </div>
  );
}
