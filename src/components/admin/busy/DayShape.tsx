"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LayoutGrid, Table2 } from "lucide-react";
import type { BranchDemand } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "@/components/ui";
import { useMediaQuery } from "@/lib/use-media-query";
import { TooltipLayer, useChartTooltip } from "./ChartTooltip";
import { DAY_LONG, DAY_SHORT, daySeries, fmt1, hourShort, niceScale, openWeekdays, rangeLong, type HourPoint } from "./busy-model";

const PLOT_H = 210;
const LEFT = 34;
const RIGHT = 10;
const TOP = 14;
const AXIS_H = 22;
const RIBBON_H = 20;
const H = TOP + PLOT_H + AXIS_H + RIBBON_H + 10;
const W_WIDE = 760;
const W_PHONE = 360;

/** A bar with a 4px rounded top and a square base, as the mark spec asks. */
function barPath(x: number, y: number, w: number, h: number, r = 4): string {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

/** Contiguous hours sharing a state, as "5-8 pm" strings. */
function stateRanges(points: HourPoint[], state: "STRETCHED" | "IDLE"): string[] {
  const out: string[] = [];
  let start: number | null = null;
  for (let i = 0; i <= points.length; i++) {
    const p = points[i];
    const hit = p && p.inHours && p.state === state;
    if (hit && start === null) start = p.hour;
    if (!hit && start !== null) {
      out.push(rangeLong(start, points[i - 1].hour + 1));
      start = null;
    }
  }
  return out;
}

export function DayShape({ branch }: { branch: BranchDemand }) {
  const t = useTranslations("admin.busyHours");
  const open = useMemo(() => openWeekdays(branch), [branch]);
  const [sel, setSel] = useState<string>("all");
  const [tableView, setTableView] = useState(false);
  const { wrapRef, tip, onPointer, onFocus, hide } = useChartTooltip<HourPoint>();
  // Drawn at phone width on phones so the text stays readable instead of shrinking with the whole picture.
  const roomy = useMediaQuery("(min-width: 640px)");
  const W = roomy ? W_WIDE : W_PHONE;

  const days = useMemo(() => {
    if (sel === "weekdays") return open.filter((d) => d <= 5);
    if (sel === "weekends") return open.filter((d) => d >= 6);
    if (/^[1-7]$/.test(sel)) return open.filter((d) => d === Number(sel));
    return open;
  }, [sel, open]);
  const safeDays = days.length > 0 ? days : open;
  const series = useMemo(() => daySeries(branch, safeDays), [branch, safeDays]);

  const hasStaff = branch.staffDataAvailable && !!branch.customersPerStaffHour;
  const perStaff = branch.customersPerStaffHour ?? 0;
  const cap = (p: HourPoint) => (hasStaff ? p.staff * perStaff : 0);

  const maxVal = Math.max(...series.map((p) => Math.max(p.visits, cap(p))), 0);
  const scale = niceScale(maxVal * 1.08);
  const yMax = scale.max;
  const n = series.length;
  const band = (W - LEFT - RIGHT) / Math.max(n, 1);
  const barW = Math.min(24, band * 0.62);
  const y = (v: number) => TOP + PLOT_H - (v / yMax) * PLOT_H;
  const ticks = scale.ticks;

  const peak = series.reduce((best, p) => (p.visits > best.visits ? p : best), series[0]);
  const stretched = stateRanges(series, "STRETCHED");
  const spare = stateRanges(series, "IDLE");

  const options = [
    { id: "all", label: t("daysAll") },
    ...(open.some((d) => d <= 5) && open.some((d) => d >= 6)
      ? [{ id: "weekdays", label: t("daysWeekdays") }, { id: "weekends", label: t("daysWeekends") }]
      : []),
    ...open.map((d) => ({ id: String(d), label: DAY_SHORT[d - 1] as string })),
  ];

  const dayName = sel === "all" ? t("anAverageDay") : sel === "weekdays" ? t("anAverageWeekday") : sel === "weekends" ? t("anAverageWeekendDay") : `${t("anAverage")} ${DAY_LONG[Number(sel) - 1]}`;
  const stateText = (s: HourPoint["state"]) => (s === "STRETCHED" ? t("stateStretched") : s === "IDLE" ? t("stateSpare") : s === "OK" ? t("stateRight") : "");

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 shadow-sm space-y-3 busy-viz" data-testid="day-shape">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[var(--text-primary)]">{t("dayShapeTitle")}</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{hasStaff ? t("dayShapeHint") : t("dayShapeHintNoStaff")}</p>
        </div>
        <button
          type="button"
          onClick={() => setTableView((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] touch-manipulation"
          aria-pressed={tableView}
        >
          {tableView ? <LayoutGrid className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
          {tableView ? t("showChart") : t("showTable")}
        </button>
      </div>

      <SegmentedControl value={sel} onChange={setSel} options={options} />

      {series.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">{t("noData")}</p>
      ) : (
        <>
          <p className="text-sm text-[var(--text-primary)]" data-testid="day-shape-summary">
            {t("onADay", { day: dayName })}{" "}
            <strong>{rangeLong(peak.hour, peak.hour + 1)}</strong> {t("isBusiest", { n: fmt1(peak.visits) })}.
            {hasStaff && stretched.length > 0 ? <> {t("shortOnPeople")} <strong>{stretched.join(", ")}</strong>.</> : null}
            {hasStaff && spare.length > 0 ? <> {t("sparePeople")} <strong>{spare.join(", ")}</strong>.</> : null}
          </p>

          {tableView ? (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-xs">
                <caption className="sr-only">{t("dayTableCaption")}</caption>
                <thead className="bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold">{t("hour")}</th>
                    <th className="px-2 py-1.5 text-right font-semibold">{t("colCustomers")}</th>
                    {hasStaff && <th className="px-2 py-1.5 text-right font-semibold">{t("colStaff")}</th>}
                    {hasStaff && <th className="px-2 py-1.5 text-right font-semibold">{t("colCanServe")}</th>}
                    {hasStaff && <th className="px-2 py-1.5 text-right font-semibold">{t("colBusy")}</th>}
                    {hasStaff && <th className="px-2 py-1.5 text-left font-semibold">{t("colStatus")}</th>}
                  </tr>
                </thead>
                <tbody>
                  {series.map((p) => (
                    <tr key={p.hour} className="border-t border-[var(--border)]">
                      <th scope="row" className="px-2 py-1 text-left font-medium text-[var(--text-secondary)] whitespace-nowrap">{rangeLong(p.hour, p.hour + 1)}</th>
                      <td className="px-2 py-1 text-right tabular-nums">{fmt1(p.visits)}</td>
                      {hasStaff && <td className="px-2 py-1 text-right tabular-nums">{fmt1(p.staff)}</td>}
                      {hasStaff && <td className="px-2 py-1 text-right tabular-nums">{fmt1(cap(p))}</td>}
                      {hasStaff && <td className="px-2 py-1 text-right tabular-nums">{p.busy != null ? `${p.busy}%` : "—"}</td>}
                      {hasStaff && <td className="px-2 py-1">{stateText(p.state)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div ref={wrapRef} className="relative" onPointerLeave={hide}>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" role="img" aria-label={t("dayShapeTitle")}>
                {ticks.map((v) => (
                  <g key={v}>
                    <line x1={LEFT} x2={W - RIGHT} y1={y(v)} y2={y(v)} stroke="var(--bv-grid)" strokeWidth={1} />
                    <text x={LEFT - 6} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill="var(--bv-muted)" className="tabular-nums">
                      {Number.isInteger(v) ? v : v.toFixed(1)}
                    </text>
                  </g>
                ))}
                <line x1={LEFT} x2={W - RIGHT} y1={y(0)} y2={y(0)} stroke="var(--bv-axis)" strokeWidth={1} />

                {series.map((p, i) => {
                  const cx = LEFT + band * i + band / 2;
                  const h = Math.max(0, (p.visits / yMax) * PLOT_H);
                  return (
                    <g key={p.hour}>
                      {h > 0 && (
                        <path d={barPath(cx - barW / 2, y(p.visits), barW, h)} fill="var(--bv-series-1)" opacity={p.inHours ? 1 : 0.45} />
                      )}
                      <text x={cx} y={TOP + PLOT_H + 14} textAnchor="middle" fontSize={10} fill="var(--bv-muted)" fontStyle={p.inHours ? "normal" : "italic"}>
                        {roomy || i % 2 === 0 ? hourShort(p.hour) : ""}
                      </text>
                    </g>
                  );
                })}

                {hasStaff && (
                  <path
                    d={series
                      .map((p, i) => {
                        const x0 = LEFT + band * i;
                        const x1 = x0 + band;
                        const yy = y(cap(p));
                        return `${i === 0 ? "M" : "L"}${x0},${yy} L${x1},${yy}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="var(--bv-series-2)"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    data-testid="capacity-line"
                  />
                )}

                {/* Peak bar: the one direct label. */}
                {peak && peak.visits > 0 && (
                  <text
                    x={LEFT + band * series.indexOf(peak) + band / 2}
                    y={y(peak.visits) - 5}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={700}
                    fill="var(--text-primary)"
                  >
                    {fmt1(peak.visits)}
                  </text>
                )}

                {hasStaff && (
                  <g>
                    {series.map((p, i) => {
                      const x = LEFT + band * i + 1;
                      const w = band - 2;
                      const yy = TOP + PLOT_H + AXIS_H;
                      const bin = p.state === "STRETCHED" ? "s2" : p.state === "IDLE" ? "p2" : "0";
                      return (
                        <g key={p.hour}>
                          <rect x={x} y={yy} width={w} height={RIBBON_H} rx={4} fill={p.state ? `var(--bv-div-${bin})` : "var(--surface-muted)"} />
                          {p.state && (
                            <text x={x + w / 2} y={yy + 14} textAnchor="middle" fontSize={11} fontWeight={700} fill={`var(--bv-div-ink-${bin})`}>
                              {p.state === "STRETCHED" ? "▲" : p.state === "IDLE" ? "▼" : "✓"}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* Hover/focus targets — wider than the marks. */}
                {series.map((p, i) => (
                  <rect
                    key={p.hour}
                    x={LEFT + band * i}
                    y={TOP}
                    width={band}
                    height={PLOT_H + AXIS_H + (hasStaff ? RIBBON_H : 0)}
                    fill="transparent"
                    tabIndex={0}
                    role="img"
                    aria-label={`${rangeLong(p.hour, p.hour + 1)}: ${fmt1(p.visits)} ${t("customersPerHour")}${hasStaff ? `, ${fmt1(p.staff)} ${t("staffOnFloor")}, ${stateText(p.state)}` : ""}`}
                    onPointerMove={(e) => onPointer(e, p)}
                    onFocus={(e) => onFocus(e, p)}
                    onBlur={hide}
                    className="outline-none focus-visible:stroke-[var(--text-primary)]"
                    style={{ cursor: "crosshair" }}
                  />
                ))}
              </svg>

              <TooltipLayer tip={tip}>
                {tip && (
                  <div className="space-y-1">
                    <p className="font-semibold text-[var(--text-primary)]">{rangeLong(tip.data.hour, tip.data.hour + 1)}</p>
                    <p>
                      <span className="inline-block h-0.5 w-3 align-middle mr-1.5" style={{ background: "var(--bv-series-1)", height: 8, width: 8, borderRadius: 2 }} />
                      <span className="text-sm font-bold text-[var(--text-primary)]">{fmt1(tip.data.visits)}</span>{" "}
                      <span className="text-[var(--text-secondary)]">{t("customersPerHour")}</span>
                    </p>
                    {hasStaff && (
                      <>
                        <p>
                          <span className="inline-block align-middle mr-1.5" style={{ background: "var(--bv-series-2)", height: 2, width: 12 }} />
                          <span className="text-sm font-bold text-[var(--text-primary)]">{fmt1(cap(tip.data))}</span>{" "}
                          <span className="text-[var(--text-secondary)]">{t("canComfortablyServe")}</span>
                        </p>
                        <p className="text-[var(--text-secondary)]">
                          {fmt1(tip.data.staff)} {t("staffOnFloor")}
                          {tip.data.busy != null ? ` · ${t("busyFor", { pct: tip.data.busy })}` : ""}
                        </p>
                        {tip.data.state && <p className="font-semibold text-[var(--text-primary)]">{stateText(tip.data.state)}</p>}
                      </>
                    )}
                  </div>
                )}
              </TooltipLayer>
            </div>
          )}

          {!tableView && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: "var(--bv-series-1)" }} />
                {t("legendArriving")}
              </span>
              {hasStaff && (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0.5 w-4 rounded" style={{ background: "var(--bv-series-2)", height: 2 }} />
                    {t("legendCapacity")}
                  </span>
                  <span className={cn("inline-flex items-center gap-1.5")}>
                    <span className="font-bold">▲</span> {t("glyphStretched")} · <span className="font-bold">✓</span> {t("glyphRight")} · <span className="font-bold">▼</span> {t("glyphSpare")}
                  </span>
                </>
              )}
            </div>
          )}
          {!hasStaff && <p className="text-xs text-[var(--text-secondary)]">{t("noAttendanceNote")}</p>}
        </>
      )}
    </section>
  );
}
