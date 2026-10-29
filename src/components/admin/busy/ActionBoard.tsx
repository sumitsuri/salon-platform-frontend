"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, ChevronDown, CircleHelp, Wrench } from "lucide-react";
import type { BranchDemand } from "@/lib/api";
import { cn } from "@/lib/utils";
import { HourStrip } from "./HourStrip";
import { formatInr, openWeekdays } from "./busy-model";

type Status = "ACT" | "TWEAK" | "OK" | "NO_DATA";

function statusOf(b: BranchDemand): Status {
  if (!b.enoughData) return "NO_DATA";
  if (b.recommendations.some((r) => r.priority === "HIGH")) return "ACT";
  return b.recommendations.length > 0 ? "TWEAK" : "OK";
}

const STATUS_STYLE: Record<Status, string> = {
  ACT: "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
  TWEAK: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  OK: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  NO_DATA: "bg-[var(--surface-muted)] text-[var(--text-secondary)] border-[var(--border)]",
};

function StatusChip({ status }: { status: Status }) {
  const t = useTranslations("admin.busyHours");
  const Icon = status === "ACT" ? AlertTriangle : status === "TWEAK" ? Wrench : status === "OK" ? CheckCircle2 : CircleHelp;
  const label = status === "ACT" ? t("statusAct") : status === "TWEAK" ? t("statusTweak") : status === "OK" ? t("statusOk") : t("statusNoData");
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold", STATUS_STYLE[status])}>
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}

function Swatch({ colour, label }: { colour: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: colour }} />
      {label}
    </span>
  );
}

function BranchRow({ branch, onOpen, defaultOpen }: { branch: BranchDemand; onOpen: () => void; defaultOpen: boolean }) {
  const t = useTranslations("admin.busyHours");
  const [open, setOpen] = useState(defaultOpen);
  const status = statusOf(branch);
  const recs = branch.recommendations;
  const top = recs[0];
  const days = useMemo(() => openWeekdays(branch), [branch]);
  const weekdays = days.filter((d) => d <= 5);
  const weekends = days.filter((d) => d >= 6);
  const split = weekdays.length > 0 && weekends.length > 0;
  const shortLabel = t("barsShort");
  const spareLabel = t("barsSpare");

  return (
    <li className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm" data-testid="board-row">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 p-4 text-left touch-manipulation hub:grid-cols-[minmax(10rem,1fr)_minmax(11rem,15rem)_minmax(0,2fr)_auto]"
      >
        <div className="min-w-0 space-y-1.5">
          <p className="truncate text-sm font-bold text-[var(--text-primary)]">{branch.branchName}</p>
          <StatusChip status={status} />
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform hub:order-4", open && "rotate-180")} aria-hidden />
        <div className="col-span-2 min-w-0 hub:col-span-1 hub:order-2">
          {branch.enoughData ? <HourStrip branch={branch} labels="ends" shortLabel={shortLabel} spareLabel={spareLabel} /> : null}
        </div>
        <div className="col-span-2 min-w-0 hub:col-span-1 hub:order-3">
          {branch.enoughData ? (
            top ? (
              <>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--brand-text)]">{t("doThis")}</p>
                <p className="text-sm font-semibold leading-snug text-[var(--text-primary)]" data-testid="board-action">{top.action ?? top.title}</p>
                {top.impactAmount != null && top.impactAmount > 0 && (
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">≈ {formatInr(top.impactAmount)}{t("perMonth")} · {t("estimate")}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">{t("nothingToChange")}</p>
            )
          ) : (
            <p className="text-xs text-[var(--text-secondary)] leading-snug">{branch.dataNote}</p>
          )}
        </div>
      </button>

      {open && branch.enoughData && (
        <div className="space-y-4 border-t border-[var(--border)] p-4" data-testid="board-detail">
          <div className="grid gap-4 sm:grid-cols-2">
            {split ? (
              <>
                <div>
                  <p className="mb-1 text-xs font-semibold text-[var(--text-secondary)]">{t("daysWeekdays")}</p>
                  <HourStrip branch={branch} days={weekdays} labels="some" shortLabel={shortLabel} spareLabel={spareLabel} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold text-[var(--text-secondary)]">{t("daysWeekends")}</p>
                  <HourStrip branch={branch} days={weekends} labels="some" shortLabel={shortLabel} spareLabel={spareLabel} />
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <HourStrip branch={branch} labels="some" shortLabel={shortLabel} spareLabel={spareLabel} />
              </div>
            )}
          </div>

          {recs.length > 0 && (
            <ol className="space-y-3">
              {recs.slice(0, 3).map((r, i) => (
                <li key={r.id} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand-light)] text-[11px] font-bold text-[var(--brand-text)]">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug text-[var(--text-primary)]">{r.action ?? r.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">{r.whatWeSee}</p>
                    {r.impactAmount != null && r.impactAmount > 0 && (
                      <p className="mt-0.5 text-xs font-medium text-[var(--text-secondary)]">≈ {formatInr(r.impactAmount)}{t("perMonth")} · {t("estimate")}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[var(--text-secondary)]">{recs.length > 3 ? t("moreSuggestions", { n: recs.length - 3 }) : ""}</p>
            <button type="button" onClick={onOpen} className="text-sm font-semibold text-[var(--brand-text)] hover:underline touch-manipulation" data-testid="full-analysis">
              {t("fullAnalysis")} →
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export function ActionBoard({ branches, onOpen }: { branches: BranchDemand[]; onOpen: (branchId: string) => void }) {
  const t = useTranslations("admin.busyHours");

  const sorted = useMemo(() => {
    const score = (b: BranchDemand) =>
      (b.recommendations.some((r) => r.priority === "HIGH") ? 1_000_000 : 0) + (b.summary?.idleStaffCostPerMonth ?? 0) + b.recommendations.length;
    return [...branches].sort((a, b) => score(b) - score(a) || a.branchName.localeCompare(b.branchName));
  }, [branches]);

  const needAction = sorted.filter((b) => statusOf(b) === "ACT");
  const idle = branches.reduce((a, b) => a + (b.summary?.idleStaffCostPerMonth ?? 0), 0);
  const first = needAction[0];

  return (
    <div className="space-y-4" data-testid="action-board">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 shadow-sm space-y-2" data-testid="board-summary">
        {first ? (
          <>
            <p className="text-lg font-bold leading-snug text-[var(--text-primary)]">
              {t("summaryAct", { n: needAction.length, total: branches.length })}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              {t("summaryStart", { branch: first.branchName })} <strong className="text-[var(--text-primary)]">{first.recommendations[0]?.action ?? first.recommendations[0]?.title}</strong>
            </p>
          </>
        ) : (
          <p className="text-lg font-bold leading-snug text-[var(--text-primary)]">{t("summaryOk", { total: branches.length })}</p>
        )}
        {idle > 0 && <p className="text-sm text-[var(--text-secondary)]">{t("summaryIdle", { amount: formatInr(idle) })}</p>}
      </div>

      <div className="busy-viz flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[var(--text-secondary)]" data-testid="board-legend">
        <span className="font-semibold">{t("boardLegend")}</span>
        <Swatch colour="var(--bv-div-s2)" label={t("barsShort")} />
        <Swatch colour="var(--bv-div-p2)" label={t("barsSpare")} />
        <Swatch colour="var(--bv-div-0)" label={t("barsRight")} />
      </div>

      <ul className="space-y-3">
        {sorted.map((b, i) => (
          <BranchRow key={b.branchId} branch={b} onOpen={() => onOpen(b.branchId)} defaultOpen={i === 0 && statusOf(b) === "ACT"} />
        ))}
      </ul>
    </div>
  );
}
