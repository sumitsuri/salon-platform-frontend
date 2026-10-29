"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Table2, LayoutGrid } from "lucide-react";
import type { BranchDemand, DemandRecommendation } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "@/components/ui";
import { useMediaQuery } from "@/lib/use-media-query";
import { TooltipLayer, useChartTooltip } from "./ChartTooltip";
import {
  DAY_LONG,
  DAY_SHORT,
  avgRevenue,
  avgStaff,
  avgVisits,
  cellKey,
  cellMap,
  divBin,
  whole,
  formatInr,
  hourLong,
  hourShort,
  hourSpan,
  inRecommendation,
  rangeLong,
  seqBin,
  type DivBin,
} from "./busy-model";

type Metric = "customers" | "revenue" | "staffing";

interface TipData {
  dow: number;
  hour: number;
  customers: number;
  revenue: number;
  staff: number;
  busy: number | null;
  state: string | null;
  cancelled: number;
  occurrences: number;
}

const SEQ_BINS = [0, 1, 2, 3, 4, 5, 6];
const DIV_ORDER: DivBin[] = ["p3", "p2", "p1", "0", "s1", "s2", "s3"];

function ScaleLegend({ metric, max }: { metric: Metric; max: number }) {
  const t = useTranslations("admin.busyHours");
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[var(--text-secondary)]" aria-hidden>
      {metric === "staffing" ? (
        <>
          <span className="font-semibold">{t("legendSpare")}</span>
          <span className="flex gap-0.5">
            {DIV_ORDER.map((b) => (
              <span key={b} className="h-3.5 w-6 rounded-[3px]" style={{ background: `var(--bv-div-${b})` }} />
            ))}
          </span>
          <span className="font-semibold">{t("legendStretched")}</span>
          <span className="ml-2">▼ {t("glyphSpare")} · ▲ {t("glyphStretched")}</span>
        </>
      ) : (
        <>
          <span className="font-semibold">{t("legendQuiet")}</span>
          <span className="flex gap-0.5">
            {SEQ_BINS.map((b) => (
              <span key={b} className="h-3.5 w-6 rounded-[3px]" style={{ background: `var(--bv-seq-${b})` }} />
            ))}
          </span>
          <span className="font-semibold">
            {t("legendBusy")}
            {max > 0 ? ` (${metric === "revenue" ? formatInr(max) : whole(max)} ${metric === "revenue" ? t("perHourBilled") : t("perHour")})` : ""}
          </span>
        </>
      )}
    </div>
  );
}

export function WeekMap({ branch, highlight }: { branch: BranchDemand; highlight: DemandRecommendation | null }) {
  const t = useTranslations("admin.busyHours");
  const [metric, setMetric] = useState<Metric>("customers");
  const [tableView, setTableView] = useState(false);
  const { wrapRef, tip, onPointer, onFocus, hide } = useChartTooltip<TipData>();
  // On a phone the whole day has to fit without sideways scrolling, so the per-day total column is dropped.
  const roomy = useMediaQuery("(min-width: 640px)");

  const map = useMemo(() => cellMap(branch), [branch]);
  const [lo, hi] = hourSpan(branch);
  const hours = useMemo(() => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i), [lo, hi]);
  const days = [1, 2, 3, 4, 5, 6, 7];
  const canStaff = branch.staffDataAvailable;
  const active: Metric = metric === "staffing" && !canStaff ? "customers" : metric;

  const value = (dow: number, h: number) => {
    const c = map.get(cellKey(dow, h));
    return active === "revenue" ? avgRevenue(branch, c) : avgVisits(branch, c);
  };
  const max = useMemo(() => {
    let m = 0;
    for (const d of days) for (const h of hours) {
      const c = map.get(cellKey(d, h));
      m = Math.max(m, active === "revenue" ? avgRevenue(branch, c) : avgVisits(branch, c));
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, map, hours, active]);

  const visitHours = (branch.visitMinutes ?? 45) / 60;
  const rowTotal = (dow: number): string => {
    let visits = 0;
    let revenue = 0;
    let staff = 0;
    for (const h of hours) {
      const c = map.get(cellKey(dow, h));
      visits += avgVisits(branch, c);
      revenue += avgRevenue(branch, c);
      staff += avgStaff(branch, c);
    }
    if (active === "revenue") return formatInr(revenue);
    if (active === "staffing") return staff > 0 ? `${Math.round(((visits * visitHours) / staff) * 100)}%` : "—";
    return whole(visits);
  };
  const isClosed = (dow: number) => (branch.dowOccurrences[dow - 1] || 0) > 0 && hours.every((h) => !(map.get(cellKey(dow, h))?.visits));
  const isAbsent = (dow: number) => (branch.dowOccurrences[dow - 1] || 0) === 0;

  const tipFor = (dow: number, h: number): TipData => {
    const c = map.get(cellKey(dow, h));
    return {
      dow,
      hour: h,
      customers: avgVisits(branch, c),
      revenue: avgRevenue(branch, c),
      staff: avgStaff(branch, c),
      busy: c?.busyPercent ?? null,
      state: c?.state ?? null,
      cancelled: c?.cancelled ?? 0,
      occurrences: branch.dowOccurrences[dow - 1] || 0,
    };
  };

  const stateLabel = (s: string | null) =>
    s === "STRETCHED" ? t("stateStretched") : s === "IDLE" ? t("stateSpare") : s === "OK" ? t("stateRight") : "";

  const cellLabel = (d: TipData) =>
    `${DAY_LONG[d.dow - 1]} ${rangeLong(d.hour, d.hour + 1)}: ${whole(d.customers)} ${t("customersPerHour")}` +
    (d.staff > 0 ? `, ${whole(d.staff)} ${t("staffOnFloor")}` : "") +
    (d.state ? `, ${stateLabel(d.state)}` : "");

  const options = [
    { id: "customers" as const, label: t("lensCustomers") },
    { id: "revenue" as const, label: t("lensRevenue") },
    ...(canStaff ? [{ id: "staffing" as const, label: t("lensStaffing") }] : []),
  ];

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 shadow-sm space-y-3 busy-viz" data-testid="week-map">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[var(--text-primary)]">{t("weekMapTitle")}</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {active === "staffing" ? t("weekMapStaffingHint") : t("weekMapHint")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTableView((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] touch-manipulation"
          aria-pressed={tableView}
        >
          {tableView ? <LayoutGrid className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
          {tableView ? t("showMap") : t("showTable")}
        </button>
      </div>

      <div className="max-w-md">
        <SegmentedControl value={active} onChange={setMetric} options={options} />
      </div>

      {tableView ? (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-xs">
            <caption className="sr-only">{t("tableCaption")}</caption>
            <thead className="bg-[var(--surface-muted)] text-[var(--text-secondary)]">
              <tr>
                <th className="px-2 py-1.5 text-left font-semibold">{t("hour")}</th>
                {days.filter((d) => !isAbsent(d)).map((d) => (
                  <th key={d} className="px-2 py-1.5 text-right font-semibold">{DAY_SHORT[d - 1]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map((h) => (
                <tr key={h} className="border-t border-[var(--border)]">
                  <th scope="row" className="px-2 py-1 text-left font-medium text-[var(--text-secondary)] whitespace-nowrap">
                    {rangeLong(h, h + 1)}
                  </th>
                  {days.filter((d) => !isAbsent(d)).map((d) => {
                    const c = map.get(cellKey(d, h));
                    const cellText =
                      active === "staffing"
                        ? c?.busyPercent != null ? `${c.busyPercent}%` : "—"
                        : active === "revenue" ? formatInr(avgRevenue(branch, c)) : whole(avgVisits(branch, c));
                    return (
                      <td key={d} className="px-2 py-1 text-right tabular-nums text-[var(--text-primary)]">
                        {cellText}
                        {active === "staffing" && c?.state && c.state !== "OK" ? (c.state === "STRETCHED" ? " ▲" : " ▼") : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={wrapRef} className="relative" onPointerLeave={hide}>
          <div className="overflow-x-auto pb-1 -mx-1 px-1">
            <div
              role="grid"
              aria-label={t("weekMapTitle")}
              className="grid gap-[2px]"
              style={{
                gridTemplateColumns: roomy
                  ? `2.75rem repeat(${hours.length}, minmax(1.6rem, 1fr)) 3.6rem`
                  : `2.1rem repeat(${hours.length}, minmax(1rem, 1fr))`,
                minWidth: roomy ? `${hours.length * 1.6 + 6.5}rem` : `${hours.length * 1 + 2.1}rem`,
              }}
            >
              <div />
              {hours.map((h) => {
                const inHours = h >= branch.openHour && h < branch.closeHour;
                return (
                  <div
                    key={h}
                    className={cn("text-center text-[10px] leading-4 tabular-nums", inHours ? "text-[var(--text-secondary)]" : "text-[var(--bv-muted)] italic")}
                    title={inHours ? hourLong(h) : `${hourLong(h)} — ${t("outsideHours")}`}
                  >
                    {roomy || (h - lo) % 2 === 0 ? hourShort(h) : ""}
                  </div>
                );
              })}
              {roomy && (
                <div className="text-right text-[10px] leading-4 font-semibold text-[var(--text-secondary)]">
                  {active === "staffing" ? t("colBusy") : active === "revenue" ? t("colPerDayRevenue") : t("colPerDay")}
                </div>
              )}

              {days.map((d) => {
                if (isAbsent(d)) return null;
                const closed = isClosed(d);
                return (
                  <div key={d} role="row" className="contents">
                    <div className="flex flex-col justify-center pr-1 text-[11px] font-semibold leading-tight text-[var(--text-secondary)]" role="rowheader">
                      {DAY_SHORT[d - 1]}
                      {closed ? <span className="text-[9px] font-medium text-[var(--bv-muted)]">{t("closed")}</span> : null}
                    </div>
                    {hours.map((h) => {
                      const inHours = h >= branch.openHour && h < branch.closeHour;
                      const c = map.get(cellKey(d, h));
                      const dim = highlight != null && !inRecommendation(highlight, d, h);
                      const lit = highlight != null && inRecommendation(highlight, d, h);
                      if (closed) {
                        return <div key={h} role="gridcell" className="h-8 sm:h-9 rounded-[4px]" style={{ backgroundColor: "var(--surface-muted)", backgroundImage: "var(--bv-closed)" }} />;
                      }
                      let bg = "var(--surface-muted)";
                      let ink = "var(--text-secondary)";
                      let glyph = "";
                      if (active === "staffing") {
                        const bin = divBin(c);
                        if (bin) {
                          bg = `var(--bv-div-${bin})`;
                          ink = `var(--bv-div-ink-${bin})`;
                          glyph = bin.startsWith("s") ? "▲" : bin.startsWith("p") ? "▼" : "";
                        }
                      } else if (c) {
                        const bin = seqBin(value(d, h), max);
                        bg = `var(--bv-seq-${bin})`;
                        ink = `var(--bv-seq-ink-${bin})`;
                      }
                      const data = tipFor(d, h);
                      return (
                        <div
                          key={h}
                          role="gridcell"
                          tabIndex={0}
                          aria-label={cellLabel(data)}
                          onPointerMove={(e) => onPointer(e, data)}
                          onFocus={(e) => onFocus(e, data)}
                          onBlur={hide}
                          className={cn(
                            "h-8 sm:h-9 rounded-[3px] sm:rounded-[4px] flex items-center justify-center text-[10px] sm:text-[11px] font-bold outline-none transition",
                            "focus-visible:ring-2 focus-visible:ring-[var(--text-primary)] hover:brightness-95",
                            lit && "ring-2 ring-[var(--text-primary)] z-10 relative",
                            dim && "opacity-35"
                          )}
                          style={{ backgroundColor: bg, color: ink, backgroundImage: !inHours ? "var(--bv-closed)" : undefined }}
                        >
                          {glyph}
                        </div>
                      );
                    })}
                    {roomy && (
                      <div className="flex items-center justify-end text-[11px] font-semibold tabular-nums text-[var(--text-primary)]">
                        {closed ? "—" : rowTotal(d)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <TooltipLayer tip={tip}>
            {tip && (
              <div className="space-y-1">
                <p className="font-semibold text-[var(--text-primary)]">
                  {DAY_LONG[tip.data.dow - 1]}, {rangeLong(tip.data.hour, tip.data.hour + 1)}
                </p>
                <p className="text-[var(--text-primary)]">
                  <span className="text-sm font-bold">{whole(tip.data.customers)}</span>{" "}
                  <span className="text-[var(--text-secondary)]">{t("customersPerHour")}</span>
                </p>
                <p className="text-[var(--text-secondary)]">{formatInr(tip.data.revenue)} {t("billedPerHour")}</p>
                {tip.data.staff > 0 && (
                  <p className="text-[var(--text-secondary)]">
                    {whole(tip.data.staff)} {t("staffOnFloor")}
                    {tip.data.busy != null ? ` · ${t("busyFor", { pct: tip.data.busy })}` : ""}
                  </p>
                )}
                {tip.data.state && <p className="font-semibold text-[var(--text-primary)]">{stateLabel(tip.data.state)}</p>}
                {tip.data.cancelled > 0 && (
                  <p className="text-[var(--text-secondary)]">{t("cancelledInPeriod", { n: tip.data.cancelled })}</p>
                )}
                <p className="text-[10px] text-[var(--text-tertiary,var(--text-secondary))]">
                  {t("basedOn", { n: tip.data.occurrences, day: DAY_LONG[tip.data.dow - 1] })}
                </p>
              </div>
            )}
          </TooltipLayer>
        </div>
      )}

      {!tableView && <ScaleLegend metric={active} max={max} />}
      {highlight && (
        <p className="text-xs font-semibold text-[var(--brand-text)]">{t("showingOnMap", { title: highlight.title })}</p>
      )}
    </section>
  );
}
