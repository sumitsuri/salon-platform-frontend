"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDownRight, ArrowLeft, ArrowUpRight } from "lucide-react";
import type { BranchDemand, DemandInsights, DemandRecommendation } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/use-media-query";
import { BarChart } from "./BarChart";
import { DayShape } from "./DayShape";
import { Recommendations } from "./Recommendations";
import { WeekMap } from "./WeekMap";
import { fmt1, formatInr, hourLong, monthBars, weekBars } from "./busy-model";

function Tile({ label, value, sub, testId }: { label: string; value: React.ReactNode; sub?: React.ReactNode; testId?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-sm min-w-0" data-testid={testId}>
      <p className="text-xs font-semibold text-[var(--text-secondary)]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[var(--text-primary)] leading-tight break-words">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-[var(--text-secondary)] leading-snug">{sub}</p> : null}
    </div>
  );
}

/** How busy each person is, on a 0-150% scale split into the three zones the advice uses. */
function WorkloadGauge({ percent }: { percent: number }) {
  const t = useTranslations("admin.busyHours");
  const clamped = Math.max(0, Math.min(150, percent));
  const pos = (clamped / 150) * 100;
  return (
    <div className="busy-viz space-y-1.5" role="img" aria-label={t("gaugeLabel", { pct: percent })}>
      <div className="relative h-3 rounded-full overflow-hidden flex gap-[2px]">
        <span className="h-full rounded-l-full" style={{ width: `${(45 / 150) * 100}%`, background: "var(--bv-div-p2)" }} />
        <span className="h-full" style={{ width: `${(40 / 150) * 100}%`, background: "var(--bv-div-0)" }} />
        <span className="h-full rounded-r-full" style={{ width: `${(65 / 150) * 100}%`, background: "var(--bv-div-s2)" }} />
      </div>
      <div className="relative h-3">
        <span
          className="absolute -top-[18px] h-[22px] w-[3px] -translate-x-1/2 rounded bg-[var(--text-primary)] ring-2 ring-[var(--surface)]"
          style={{ left: `${pos}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-semibold text-[var(--text-secondary)]">
        <span>▼ {t("zoneSpare")}</span>
        <span>✓ {t("zoneRight")}</span>
        <span>▲ {t("zoneStretched")}</span>
      </div>
    </div>
  );
}

export function BranchDetail({
  branch,
  insights,
  onBack,
}: {
  branch: BranchDemand;
  insights: DemandInsights;
  onBack?: () => void;
}) {
  const t = useTranslations("admin.busyHours");
  const [highlight, setHighlight] = useState<DemandRecommendation | null>(null);
  const roomy = useMediaQuery("(min-width: 640px)");
  const s = branch.summary;
  const week = useMemo(() => weekBars(branch), [branch]);
  const months = useMemo(() => monthBars(branch), [branch]);
  const completeMonths = months.filter((m) => !m.partial).length;

  return (
    <div className="space-y-4" data-testid="branch-detail">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {onBack ? (
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-text)] hover:underline touch-manipulation">
            <ArrowLeft className="h-4 w-4" />
            {t("allBranches")}
          </button>
        ) : <span />}
        <p className="text-xs text-[var(--text-secondary)]">
          {t("openHoursLine", { from: hourLong(branch.openHour), to: hourLong(branch.closeHour) })}
          {s?.closedDays ? ` · ${t("closedOn", { days: s.closedDays })}` : ""}
        </p>
      </div>

      {!branch.enoughData || !s ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-secondary)]" data-testid="not-enough-data">
          <p className="font-semibold text-[var(--text-primary)] mb-1">{t("notEnoughTitle")}</p>
          {branch.dataNote}
        </div>
      ) : (
        <>
          <div className="grid gap-3 hub:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 shadow-sm space-y-3" data-testid="headline-card">
              {s.teamBusyPercent != null ? (
                <>
                  <p className="text-sm font-semibold text-[var(--text-secondary)]">{t("heroLabel")}</p>
                  <p className="text-5xl font-bold text-[var(--text-primary)] leading-none">{s.teamBusyPercent}%</p>
                  <p className="text-sm text-[var(--text-secondary)] leading-snug">{t("heroExplain", { minutes: Math.round(s.visitMinutes ?? 45) })}</p>
                  <WorkloadGauge percent={s.teamBusyPercent} />
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-[var(--text-secondary)]">{t("heroLabelNoStaff")}</p>
                  <p className="text-5xl font-bold text-[var(--text-primary)] leading-none">{fmt1(s.avgVisitsPerOpenDay)}</p>
                  <p className="text-sm text-[var(--text-secondary)] leading-snug">{t("heroExplainNoStaff")}</p>
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 content-start">
              <Tile
                label={t("tileCustomers")}
                value={fmt1(s.avgVisitsPerOpenDay)}
                sub={
                  s.trendPercent != null ? (
                    <span className={cn("inline-flex items-center gap-0.5 font-semibold", s.trendPercent >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")}>
                      {s.trendPercent >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />}
                      {Math.abs(Math.round(s.trendPercent))}% {t("vsPrev28")}
                    </span>
                  ) : t("perOpenDay")
                }
                testId="tile-customers"
              />
              <Tile label={t("tileBusiest")} value={s.busiestSlot ?? "—"} sub={t("tileBusiestSub", { n: fmt1(s.busiestSlotVisitsPerHour) })} testId="tile-busiest" />
              <Tile
                label={t("tileFit")}
                value={s.staffingFitPercent != null ? `${s.staffingFitPercent}%` : "—"}
                sub={s.staffingFitPercent != null ? t("tileFitSub") : t("noAttendanceShort")}
                testId="tile-fit"
              />
              <Tile
                label={t("tileIdle")}
                value={s.idleStaffCostPerMonth != null ? `≈ ${formatInr(s.idleStaffCostPerMonth)}` : s.spareStaffHoursPerWeek != null ? `${fmt1(s.spareStaffHoursPerWeek)} h` : "—"}
                sub={s.idleStaffCostPerMonth != null ? t("tileIdleSub") : s.spareStaffHoursPerWeek != null ? t("tileIdleHoursSub") : t("noAttendanceShort")}
                testId="tile-idle"
              />
            </div>
          </div>

          <Recommendations items={branch.recommendations} highlightId={highlight?.id ?? null} onHighlight={setHighlight} />

          <WeekMap branch={branch} highlight={highlight} />
          <DayShape branch={branch} />

          <div className="grid gap-4 hub:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 shadow-sm space-y-2" data-testid="week-shape">
              <h2 className="text-base font-bold text-[var(--text-primary)]">{t("weekShapeTitle")}</h2>
              <p className="text-xs text-[var(--text-secondary)]">{t("weekShapeHint")}</p>
              <BarChart data={week} width={360} unit={t("customersADayUnit")} label={t("weekShapeTitle")} />
            </section>
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 shadow-sm space-y-2" data-testid="year-shape">
              <h2 className="text-base font-bold text-[var(--text-primary)]">{t("yearShapeTitle")}</h2>
              <p className="text-xs text-[var(--text-secondary)]">{completeMonths >= 6 ? t("yearShapeHint") : t("yearShapeHintShort")}</p>
              <BarChart data={months} width={roomy ? 560 : 360} unit={t("customersADayUnit")} label={t("yearShapeTitle")} />
            </section>
          </div>

          <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm text-sm">
            <summary className="cursor-pointer font-semibold text-[var(--text-primary)]">{t("howToReadTitle")}</summary>
            <ul className="mt-3 space-y-2 text-[var(--text-secondary)] leading-relaxed list-disc pl-5">
              <li>{t("howArrival")}</li>
              <li>{t("howBusy")}</li>
              <li>{t("howStates")}</li>
              <li>{t("howEstimates")}</li>
              <li>{t("howAttendance")}</li>
            </ul>
          </details>

          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            {t("footnote", {
              visits: branch.totalVisits.toLocaleString("en-IN"),
              from: insights.startDate,
              to: insights.endDate,
              minutes: Math.round(branch.visitMinutes ?? 45),
              source: branch.visitMinutesSource === "recorded" ? t("sourceRecorded") : branch.visitMinutesSource === "estimated" ? t("sourceEstimated") : t("sourceAssumed"),
            })}
          </p>
        </>
      )}
    </div>
  );
}
