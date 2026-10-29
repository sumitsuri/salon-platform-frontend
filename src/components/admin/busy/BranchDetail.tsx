"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, BarChart3, CalendarRange, Gauge, ListChecks, Sun } from "lucide-react";
import type { BranchDemand, DemandInsights, DemandRecommendation } from "@/lib/api";
import { CompactStatsStrip, type CompactStatItem } from "@/components/CompactStatsStrip";
import { PanelShell } from "@/components/enterprise-ui";
import { ColumnChart, type ColumnItem } from "./ColumnChart";
import { CustomersByHour } from "./CustomersByHour";
import { Recommendations } from "./Recommendations";
import { WeekMap } from "./WeekMap";
import { formatInr, hourLong, monthBars, weekBars, whole, type BarDatum } from "./busy-model";

/** How busy each person is, on a 0-150% scale split into the three zones the advice uses. */
function WorkloadGauge({ percent }: { percent: number }) {
  const t = useTranslations("admin.busyHours");
  const pos = (Math.max(0, Math.min(150, percent)) / 150) * 100;
  return (
    <div className="busy-viz space-y-1.5" role="img" aria-label={t("gaugeLabel", { pct: percent })}>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
        <span className="h-full rounded-l-full" style={{ width: `${(45 / 150) * 100}%`, background: "var(--bv-div-p2)" }} />
        <span className="h-full" style={{ width: `${(40 / 150) * 100}%`, background: "var(--bv-div-0)" }} />
        <span className="h-full rounded-r-full" style={{ width: `${(65 / 150) * 100}%`, background: "var(--bv-div-s2)" }} />
      </div>
      <div className="relative h-2">
        <span className="absolute -top-[17px] h-[22px] w-[3px] -translate-x-1/2 rounded bg-[var(--text-primary)] ring-2 ring-[var(--surface)]" style={{ left: `${pos}%` }} />
      </div>
      <div className="flex justify-between text-[10px] font-semibold text-[var(--text-secondary)]">
        <span>▼ {t("zoneSpare")}</span>
        <span>✓ {t("zoneRight")}</span>
        <span>▲ {t("zoneStretched")}</span>
      </div>
    </div>
  );
}

function toColumns(bars: BarDatum[], unit: string): ColumnItem[] {
  return bars.map((b) => ({
    key: b.key,
    label: b.label,
    value: b.value,
    faded: b.partial,
    tip: { title: b.label, lines: [`${whole(b.value)} ${unit}`, ...(b.detail ? [b.detail] : [])] },
  }));
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
  const s = branch.summary;
  const unit = t("customersADayUnit");
  const week = useMemo(() => toColumns(weekBars(branch), unit), [branch, unit]);
  const months = useMemo(() => toColumns(monthBars(branch), unit), [branch, unit]);
  const completeMonths = branch.months.filter((m) => !m.partial).length;

  const stats: CompactStatItem[] = s
    ? [
        { id: "customers", label: t("tileCustomers"), value: whole(s.avgVisitsPerOpenDay), accent: "violet", featured: true },
        { id: "busiest", label: t("tileBusiest"), value: s.busiestSlot ?? "—", accent: "sky" },
        { id: "busy", label: t("teamBusyLabel"), value: s.teamBusyPercent != null ? `${s.teamBusyPercent}%` : "—", accent: "amber" },
        { id: "fit", label: t("tileFit"), value: s.staffingFitPercent != null ? `${s.staffingFitPercent}%` : "—", accent: "emerald" },
        {
          id: "idle",
          label: t("tileIdle"),
          value: s.idleStaffCostPerMonth != null ? `≈ ${formatInr(s.idleStaffCostPerMonth)}` : s.spareStaffHoursPerWeek != null ? `${whole(s.spareStaffHoursPerWeek)} h` : "—",
          accent: "rose",
        },
      ]
    : [];

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
          <strong className="text-[var(--text-primary)]">{branch.branchName}</strong> · {t("openHoursLine", { from: hourLong(branch.openHour), to: hourLong(branch.closeHour) })}
          {s?.closedDays ? ` · ${t("closedOn", { days: s.closedDays })}` : ""}
        </p>
      </div>

      {!branch.enoughData || !s ? (
        <PanelShell title={t("notEnoughTitle")} icon={Gauge} variant="dashboard">
          <p className="text-sm text-[var(--text-secondary)]" data-testid="not-enough-data">{branch.dataNote}</p>
        </PanelShell>
      ) : (
        <>
          <CompactStatsStrip items={stats} testId="detail-stats" />

          <div className="grid items-start gap-4 hub:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <PanelShell title={t("recsTitle")} subtitle={t("recsHint")} icon={ListChecks} variant="dashboard">
              <Recommendations items={branch.recommendations} highlightId={highlight?.id ?? null} onHighlight={setHighlight} />
            </PanelShell>
            <PanelShell title={t("teamWorkloadTitle")} subtitle={s.teamBusyPercent != null ? t("heroExplain", { minutes: Math.round(s.visitMinutes ?? 45) }) : undefined} icon={Gauge} variant="dashboard">
              {s.teamBusyPercent != null ? (
                <div className="space-y-3" data-testid="headline-card">
                  <p className="text-3xl font-bold leading-none text-[var(--text-primary)]">{s.teamBusyPercent}%</p>
                  <WorkloadGauge percent={s.teamBusyPercent} />
                </div>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]" data-testid="headline-card">{t("heroExplainNoStaff")}</p>
              )}
            </PanelShell>
          </div>

          <PanelShell title={t("customersByHourTitle")} subtitle={t("customersByHourHint")} icon={BarChart3} variant="dashboard">
            <CustomersByHour branch={branch} />
          </PanelShell>

          <WeekMap branch={branch} highlight={highlight} />

          <div className="grid gap-4 hub:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <PanelShell title={t("weekShapeTitle")} subtitle={t("weekShapeHint")} icon={CalendarRange} variant="dashboard">
              <div data-testid="week-shape"><ColumnChart items={week} label={unit} /></div>
            </PanelShell>
            <PanelShell title={t("yearShapeTitle")} subtitle={completeMonths >= 6 ? t("yearShapeHint") : t("yearShapeHintShort")} icon={Sun} variant="dashboard">
              <div data-testid="year-shape"><ColumnChart items={months} label={unit} /></div>
            </PanelShell>
          </div>

          <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm shadow-sm">
            <summary className="cursor-pointer font-semibold text-[var(--text-primary)]">{t("howToReadTitle")}</summary>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-[var(--text-secondary)]">
              <li>{t("howArrival")}</li>
              <li>{t("howBusy")}</li>
              <li>{t("howStates")}</li>
              <li>{t("howEstimates")}</li>
              <li>{t("howAttendance")}</li>
            </ul>
          </details>

          <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
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
