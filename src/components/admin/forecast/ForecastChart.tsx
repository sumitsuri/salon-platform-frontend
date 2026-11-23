"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils";
import { TooltipLayer, useChartTooltip } from "@/components/admin/busy/ChartTooltip";
import { niceCeiling, shortDate, weekday, type ChartPoint } from "./forecast-model";

const W = 760;
const H = 280;
const M = { left: 52, right: 12, top: 14, bottom: 30 };

/**
 * What happened and what is expected, on one axis: a solid line for recent sales, a dashed line for the forecast with its
 * likely range as a soft band, and a marker on days that fall on a festival. Hovering or focusing a day shows the same
 * readout. A table of the same numbers sits under the chart for anyone who prefers it.
 */
export function ForecastChart({ points, label }: { points: ChartPoint[]; label: string }) {
  const t = useTranslations("admin.forecast");
  const { wrapRef, tip, onPointer, onFocus, hide } = useChartTooltip<ChartPoint>();

  const geo = useMemo(() => {
    const top = niceCeiling(Math.max(1, ...points.map((p) => Math.max(p.actual ?? 0, p.high ?? 0))) * 1.05);
    const innerW = W - M.left - M.right;
    const innerH = H - M.top - M.bottom;
    const x = (i: number) => M.left + (points.length <= 1 ? 0 : (i / (points.length - 1)) * innerW);
    const y = (v: number) => M.top + innerH - (Math.min(v, top) / top) * innerH;
    const line = (pick: (p: ChartPoint) => number | undefined) =>
      points
        .map((p, i) => ({ i, v: pick(p) }))
        .filter((q): q is { i: number; v: number } => q.v !== undefined)
        .map((q, n) => `${n === 0 ? "M" : "L"}${x(q.i).toFixed(1)},${y(q.v).toFixed(1)}`)
        .join(" ");
    const ahead = points.map((p, i) => ({ p, i })).filter((q) => q.p.expected !== undefined);
    const band = ahead.length
      ? `${ahead.map((q, n) => `${n === 0 ? "M" : "L"}${x(q.i).toFixed(1)},${y(q.p.high ?? 0).toFixed(1)}`).join(" ")} ` +
        [...ahead].reverse().map((q) => `L${x(q.i).toFixed(1)},${y(q.p.low ?? 0).toFixed(1)}`).join(" ") + " Z"
      : "";
    const firstAhead = ahead.length ? ahead[0].i : points.length;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top);
    const everyN = Math.max(1, Math.round(points.length / 7));
    return { top, x, y, innerH, history: line((p) => p.actual), forecast: line((p) => p.expected), band, firstAhead, ticks, everyN };
  }, [points]);

  return (
    <div ref={wrapRef} className="relative" onPointerLeave={hide}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-auto w-full select-none">
        {geo.ticks.map((v) => (
          <g key={v}>
            <line x1={M.left} x2={W - M.right} y1={geo.y(v)} y2={geo.y(v)} stroke="var(--border)" strokeWidth={1} />
            <text x={M.left - 8} y={geo.y(v)} textAnchor="end" dominantBaseline="middle" fontSize={10.5} fill="var(--text-tertiary)">
              {v === 0 ? "0" : formatCurrencyCompact(v)}
            </text>
          </g>
        ))}
        {geo.firstAhead < points.length && (
          <line x1={geo.x(geo.firstAhead)} x2={geo.x(geo.firstAhead)} y1={M.top} y2={M.top + geo.innerH} stroke="var(--border-strong)" strokeDasharray="3 4" />
        )}
        {geo.band && <path d={geo.band} fill="var(--brand)" opacity={0.14} />}
        <path d={geo.history} fill="none" stroke="var(--text-secondary)" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
        <path d={geo.forecast} fill="none" stroke="var(--brand)" strokeWidth={2.2} strokeDasharray="6 4" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) =>
          p.events.length > 0 ? (
            <g key={`ev-${p.date}`}>
              <line x1={geo.x(i)} x2={geo.x(i)} y1={M.top} y2={M.top + geo.innerH} stroke="var(--brand)" strokeDasharray="1 4" opacity={0.5} />
              <circle cx={geo.x(i)} cy={M.top + 4} r={3.5} fill="var(--brand)" stroke="var(--surface)" strokeWidth={2} />
            </g>
          ) : null,
        )}
        {points.map((p, i) =>
          i % geo.everyN === 0 ? (
            <text key={`x-${p.date}`} x={geo.x(i)} y={H - 8} textAnchor="middle" fontSize={10.5} fill="var(--text-tertiary)">
              {shortDate(p.date)}
            </text>
          ) : null,
        )}
        {/* one wide, invisible target per day: easier to hit than the line itself, and focusable for keyboard users */}
        {points.map((p, i) => {
          const step = points.length > 1 ? (W - M.left - M.right) / (points.length - 1) : 20;
          return (
            <rect
              key={`hit-${p.date}`}
              x={geo.x(i) - step / 2}
              y={M.top}
              width={step}
              height={geo.innerH}
              fill="transparent"
              tabIndex={i % 3 === 0 ? 0 : -1}
              aria-label={`${shortDate(p.date)}: ${formatCurrency(p.expected ?? p.actual ?? 0)}`}
              onPointerMove={(e) => onPointer(e, p)}
              onFocus={(e) => onFocus(e, p)}
              onBlur={hide}
            />
          );
        })}
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-[var(--text-secondary)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 bg-[var(--text-secondary)]" aria-hidden />
          {t("legendActual")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0 w-5 border-t-2 border-dashed border-[var(--brand)]" aria-hidden />
          {t("legendExpected")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-5 rounded-sm bg-[var(--brand)] opacity-20" aria-hidden />
          {t("legendRange")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--brand)]" aria-hidden />
          {t("legendFestival")}
        </span>
      </div>
      <TooltipLayer tip={tip}>
        {tip && (
          <div className="space-y-0.5">
            <p className="font-semibold text-[var(--text-primary)]">
              {weekday(tip.data.date)}, {shortDate(tip.data.date)}
            </p>
            {tip.data.actual !== undefined && (
              <p className="text-[var(--text-secondary)]">
                {t("tipActual")}: <span className="font-medium text-[var(--text-primary)]">{formatCurrency(tip.data.actual)}</span>
              </p>
            )}
            {tip.data.expected !== undefined && (
              <>
                <p className="text-[var(--text-secondary)]">
                  {t("tipExpected")}: <span className="font-medium text-[var(--text-primary)]">{formatCurrency(tip.data.expected)}</span>
                </p>
                <p className="text-[var(--text-tertiary)]">
                  {t("tipRange", { low: formatCurrency(tip.data.low ?? 0), high: formatCurrency(tip.data.high ?? 0) })}
                </p>
              </>
            )}
            {tip.data.events.map((e) => (
              <p key={e} className="font-medium text-[var(--brand-text)]">
                {e}
              </p>
            ))}
          </div>
        )}
      </TooltipLayer>
    </div>
  );
}
