"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { BranchDemand } from "@/lib/api";
import { cn } from "@/lib/utils";
import { avgVisits, cellKey, cellMap, hourSpan, seqBin } from "./busy-model";

/** Tiny week-map: each branch's busy-hours "fingerprint", comparable at a glance across branches. */
function Fingerprint({ branch }: { branch: BranchDemand }) {
  const map = useMemo(() => cellMap(branch), [branch]);
  const [lo, hi] = hourSpan(branch);
  const hours = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  let max = 0;
  for (let d = 1; d <= 7; d++) for (const h of hours) max = Math.max(max, avgVisits(branch, map.get(cellKey(d, h))));
  return (
    <div
      className="grid gap-[2px] busy-viz"
      style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))` }}
      aria-hidden
    >
      {[1, 2, 3, 4, 5, 6, 7].flatMap((d) =>
        hours.map((h) => {
          const closed = (branch.dowOccurrences[d - 1] || 0) === 0;
          const bin = seqBin(avgVisits(branch, map.get(cellKey(d, h))), max);
          return (
            <span
              key={`${d}-${h}`}
              className="h-[9px] rounded-[2px]"
              style={{ background: closed ? "var(--surface-muted)" : `var(--bv-seq-${bin})` }}
            />
          );
        })
      )}
    </div>
  );
}

export function BranchCard({ branch, onOpen }: { branch: BranchDemand; onOpen: () => void }) {
  const t = useTranslations("admin.busyHours");
  const s = branch.summary;
  const high = branch.recommendations.filter((r) => r.priority === "HIGH").length;
  const top = branch.recommendations[0];

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left shadow-sm transition hover:border-[var(--border-brand)] hover:shadow-md touch-manipulation"
      data-testid="branch-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">{branch.branchName}</h3>
          <p className="text-[11px] text-[var(--text-secondary)]">
            {branch.enoughData && s ? t("customersADay", { n: Math.round(s.avgVisitsPerOpenDay) }) : t("notEnoughShort")}
          </p>
        </div>
        {high > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <AlertTriangle className="h-3 w-3" aria-hidden />
            {t("toActOn", { n: high })}
          </span>
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-secondary)] transition group-hover:translate-x-0.5" aria-hidden />
        )}
      </div>

      {branch.enoughData ? (
        <>
          <Fingerprint branch={branch} />
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-[var(--text-secondary)]">{t("busiestLabel")}</dt>
              <dd className="font-semibold text-[var(--text-primary)]">{s?.busiestSlot ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-secondary)]">{t("teamBusy")}</dt>
              <dd className={cn("font-semibold", s?.teamBusyPercent == null ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]")}>
                {s?.teamBusyPercent != null ? `${s.teamBusyPercent}%` : t("noAttendanceShort")}
              </dd>
            </div>
          </dl>
          {top && <p className={cn("rounded-lg bg-[var(--surface-muted)] px-2.5 py-2 text-xs font-medium text-[var(--text-primary)] leading-snug line-clamp-2")}>{top.title}</p>}
        </>
      ) : (
        <p className="text-xs text-[var(--text-secondary)] leading-snug">{branch.dataNote}</p>
      )}
    </button>
  );
}
