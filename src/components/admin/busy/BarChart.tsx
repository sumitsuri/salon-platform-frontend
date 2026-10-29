"use client";

import { useTranslations } from "next-intl";
import { TooltipLayer, useChartTooltip } from "./ChartTooltip";
import { fmt1, niceScale, type BarDatum } from "./busy-model";

const H = 190;
const TOP = 18;
const AXIS = 22;
const LEFT = 30;
const RIGHT = 8;

function barPath(x: number, y: number, w: number, h: number, r = 4): string {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

/**
 * Plain column chart for one series. Only the highest and lowest bars carry a value label; every bar has a hover
 * and focus readout, and the average is a solid hairline with its value named at the right edge.
 */
export function BarChart({
  data,
  width,
  unit,
  label,
}: {
  data: BarDatum[];
  width: number;
  /** Tooltip unit, e.g. "customers a day". */
  unit: string;
  label: string;
}) {
  const t = useTranslations("admin.busyHours");
  const { wrapRef, tip, onPointer, onFocus, hide } = useChartTooltip<BarDatum>();
  const complete = data.filter((d) => !d.partial && d.value > 0);
  const maxV = Math.max(...data.map((d) => d.value), 0);
  const scale = niceScale(maxV * 1.1);
  const yMax = scale.max;
  const plotH = H - TOP - AXIS;
  const n = Math.max(data.length, 1);
  const band = (width - LEFT - RIGHT) / n;
  const barW = Math.min(24, band * 0.62);
  const y = (v: number) => TOP + plotH - (v / yMax) * plotH;
  const avg = complete.length ? complete.reduce((a, d) => a + d.value, 0) / complete.length : 0;
  const hiKey = complete.length ? complete.reduce((b, d) => (d.value > b.value ? d : b)).key : null;
  const loKey = complete.length > 1 ? complete.reduce((b, d) => (d.value < b.value ? d : b)).key : null;
  const ticks = scale.ticks;

  return (
    <div ref={wrapRef} className="relative busy-viz" onPointerLeave={hide}>
      <svg viewBox={`0 0 ${width} ${H}`} className="w-full h-auto select-none" role="img" aria-label={label}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={LEFT} x2={width - RIGHT} y1={y(v)} y2={y(v)} stroke="var(--bv-grid)" strokeWidth={1} />
            <text x={LEFT - 5} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill="var(--bv-muted)">
              {Number.isInteger(v) ? v : v.toFixed(1)}
            </text>
          </g>
        ))}
        {avg > 0 && (
          <>
            <line x1={LEFT} x2={width - RIGHT} y1={y(avg)} y2={y(avg)} stroke="var(--bv-axis)" strokeWidth={1.5} />
            <text x={width - RIGHT} y={y(avg) - 4} textAnchor="end" fontSize={10} fill="var(--bv-muted)">
              {t("average")} {fmt1(avg)}
            </text>
          </>
        )}
        {data.map((d, i) => {
          const cx = LEFT + band * i + band / 2;
          const h = Math.max(0, (d.value / yMax) * plotH);
          const labelled = d.key === hiKey || d.key === loKey;
          return (
            <g key={d.key}>
              {h > 0 && <path d={barPath(cx - barW / 2, y(d.value), barW, h)} fill="var(--bv-series-1)" opacity={d.partial ? 0.45 : 1} />}
              {labelled && h > 0 && (
                <text x={cx} y={y(d.value) - 5} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text-primary)">
                  {fmt1(d.value)}
                </text>
              )}
              <text x={cx} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--bv-muted)">
                {d.label}
              </text>
              <rect
                x={LEFT + band * i}
                y={TOP}
                width={band}
                height={plotH + AXIS}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={`${d.label}: ${fmt1(d.value)} ${unit}`}
                onPointerMove={(e) => onPointer(e, d)}
                onFocus={(e) => onFocus(e, d)}
                onBlur={hide}
                className="outline-none focus-visible:stroke-[var(--text-primary)]"
              />
            </g>
          );
        })}
      </svg>
      <TooltipLayer tip={tip}>
        {tip && (
          <div className="space-y-0.5">
            <p className="font-semibold text-[var(--text-primary)]">{tip.data.label}</p>
            <p>
              <span className="text-sm font-bold text-[var(--text-primary)]">{fmt1(tip.data.value)}</span>{" "}
              <span className="text-[var(--text-secondary)]">{unit}</span>
            </p>
            {avg > 0 && !tip.data.partial && (
              <p className="text-[var(--text-secondary)]">
                {tip.data.value >= avg ? "+" : "−"}
                {Math.round(Math.abs(tip.data.value / avg - 1) * 100)}% {t("vsAverage")}
              </p>
            )}
            {tip.data.detail && <p className="text-[var(--text-secondary)]">{tip.data.detail}</p>}
            {tip.data.partial && <p className="text-[var(--text-secondary)]">{t("monthInProgress")}</p>}
          </div>
        )}
      </TooltipLayer>
    </div>
  );
}
