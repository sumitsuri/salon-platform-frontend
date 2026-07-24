"use client";

import { useState, useRef, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { ChangeBadge } from "@/components/Sparkline";
import { BRANCH_SERIES_COLORS } from "@/lib/chart-colors";

/** @deprecated Import from @/lib/chart-colors */
export const BRANCH_COLORS = BRANCH_SERIES_COLORS;

export type ChartType = "line" | "bar" | "pie";

export interface ChartSeries {
  name: string;
  color: string;
  values: number[];
  changePct?: number | null;
  /** Dashed line for ideal/target pace overlays */
  dashed?: boolean;
}

interface MetricChartProps {
  title: string;
  labels: string[];
  series: ChartSeries[];
  formatValue?: (v: number) => string;
}

interface TooltipData {
  series: string;
  label: string;
  value: number;
  color: string;
  x: number;
  y: number;
}

const CHART_PAD = { top: 20, right: 20, bottom: 36, left: 52 };
const CHART_WIDTH = 560;
const CHART_HEIGHT = 220;

function ChartLegend({ series }: { series: ChartSeries[] }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2 pt-3 border-t border-[var(--border)]">
      {series.map((s) => (
        <div key={s.name} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          {s.dashed ? (
            <div
              className="w-5 h-0 border-t-[2.5px] border-dashed shrink-0 rounded-full"
              style={{ borderColor: s.color }}
            />
          ) : (
            <div className="w-3 h-3 rounded-sm shrink-0 ring-1 ring-black/5" style={{ backgroundColor: s.color }} />
          )}
          <span className="font-medium">{s.name}</span>
          <ChangeBadge pct={s.changePct} />
        </div>
      ))}
    </div>
  );
}

function ChartTooltip({
  tooltip,
  formatValue,
}: {
  tooltip: TooltipData | null;
  formatValue: (v: number) => string;
}) {
  if (!tooltip) return null;

  const leftPct = (tooltip.x / CHART_WIDTH) * 100;
  const topPct = (tooltip.y / CHART_HEIGHT) * 100;

  return (
    <div
      className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full"
      style={{ left: `${leftPct}%`, top: `${topPct}%`, marginTop: -8 }}
    >
      <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg min-w-[120px]">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tooltip.color }} />
          <span className="font-semibold">{tooltip.series}</span>
        </div>
        <p className="text-[var(--text-tertiary)]">{tooltip.label}</p>
        <p className="font-bold text-sm mt-0.5">{formatValue(tooltip.value)}</p>
      </div>
    </div>
  );
}

function ChartContainer({
  children,
  tooltip,
  formatValue,
  onLeave,
}: {
  children: React.ReactNode;
  tooltip: TooltipData | null;
  formatValue: (v: number) => string;
  onLeave: () => void;
}) {
  return (
    <div className="relative" onMouseLeave={onLeave}>
      {children}
      <ChartTooltip tooltip={tooltip} formatValue={formatValue} />
    </div>
  );
}

function showTooltip(
  e: MouseEvent<SVGElement>,
  data: Omit<TooltipData, "x" | "y">,
  svgRef: SVGSVGElement | null,
  setTooltip: (t: TooltipData | null) => void
) {
  if (!svgRef) return;
  const rect = svgRef.getBoundingClientRect();
  const scaleX = CHART_WIDTH / rect.width;
  const scaleY = CHART_HEIGHT / rect.height;
  setTooltip({
    ...data,
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  });
}

function LineChartView({
  labels,
  series,
  formatValue,
}: {
  labels: string[];
  series: ChartSeries[];
  formatValue: (v: number) => string;
}) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pad = CHART_PAD;
  const chartW = CHART_WIDTH - pad.left - pad.right;
  const chartH = CHART_HEIGHT - pad.top - pad.bottom;
  const allValues = series.flatMap((s) => s.values);
  const max = Math.max(...allValues, 1);
  const pointCount = labels.length;
  const yTicks = [0, max * 0.5, max];
  const labelStep = pointCount <= 7 ? 1 : Math.ceil(pointCount / 7);

  const toX = (i: number) =>
    pad.left + (pointCount <= 1 ? chartW / 2 : (i / (pointCount - 1)) * chartW);
  const toY = (v: number) => pad.top + chartH - (v / max) * chartH;

  return (
    <ChartContainer tooltip={tooltip} formatValue={formatValue} onLeave={() => setTooltip(null)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full min-w-0 sm:min-w-[280px]"
      >
        {yTicks.map((tick) => {
          const y = toY(tick);
          return (
            <g key={tick}>
              <line x1={pad.left} y1={y} x2={CHART_WIDTH - pad.right} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px]">
                {formatValue(tick)}
              </text>
            </g>
          );
        })}
        {labels.map((label, i) =>
          i % labelStep === 0 || i === labels.length - 1 ? (
            <text key={i} x={toX(i)} y={CHART_HEIGHT - 10} textAnchor="middle" className="fill-slate-400 text-[10px]">
              {label}
            </text>
          ) : null
        )}
        {series.map((s) => {
          const coords = s.values.map((v, i) => ({ x: toX(i), y: toY(v), v, i }));
          return (
            <g key={s.name}>
              <polyline
                points={coords.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={s.color}
                strokeWidth={s.dashed ? 2 : 3}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={s.dashed ? "6 4" : undefined}
                opacity={s.dashed ? 0.85 : 1}
              />
              {coords.map((p) => (
                <g key={p.i}>
                  <circle cx={p.x} cy={p.y} r={8} fill="transparent" className="cursor-pointer"
                    onMouseEnter={(e) =>
                      showTooltip(e, { series: s.name, label: labels[p.i], value: p.v, color: s.color }, svgRef.current, setTooltip)
                    }
                    onMouseMove={(e) =>
                      showTooltip(e, { series: s.name, label: labels[p.i], value: p.v, color: s.color }, svgRef.current, setTooltip)
                    }
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={tooltip?.series === s.name && tooltip?.label === labels[p.i] ? 5 : 3}
                    fill={s.color}
                    className="pointer-events-none transition-all"
                    opacity={s.dashed ? 0.7 : 1}
                  />
                </g>
              ))}
            </g>
          );
        })}
      </svg>
    </ChartContainer>
  );
}

function BarChartView({
  labels,
  series,
  formatValue,
}: {
  labels: string[];
  series: ChartSeries[];
  formatValue: (v: number) => string;
}) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pad = CHART_PAD;
  const chartW = CHART_WIDTH - pad.left - pad.right;
  const chartH = CHART_HEIGHT - pad.top - pad.bottom;
  const allValues = series.flatMap((s) => s.values);
  const max = Math.max(...allValues, 1);
  const pointCount = labels.length;
  const yTicks = [0, max * 0.5, max];
  const labelStep = pointCount <= 7 ? 1 : Math.ceil(pointCount / 7);
  const groupW = pointCount > 0 ? chartW / pointCount : chartW;
  const barW = Math.max(4, (groupW / Math.max(series.length, 1)) * 0.75);

  const toY = (v: number) => pad.top + chartH - (v / max) * chartH;

  return (
    <ChartContainer tooltip={tooltip} formatValue={formatValue} onLeave={() => setTooltip(null)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full min-w-0 sm:min-w-[280px]"
      >
        {yTicks.map((tick) => {
          const y = toY(tick);
          return (
            <g key={tick}>
              <line x1={pad.left} y1={y} x2={CHART_WIDTH - pad.right} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px]">
                {formatValue(tick)}
              </text>
            </g>
          );
        })}
        {labels.map((label, dayIdx) => {
          const groupX = pad.left + dayIdx * groupW + groupW / 2;
          return (
            <g key={dayIdx}>
              {(dayIdx % labelStep === 0 || dayIdx === labels.length - 1) && (
                <text x={groupX} y={CHART_HEIGHT - 10} textAnchor="middle" className="fill-slate-400 text-[10px]">
                  {label}
                </text>
              )}
              {series.map((s, sIdx) => {
                const v = s.values[dayIdx] ?? 0;
                const x = groupX - (series.length * barW) / 2 + sIdx * barW;
                const y = toY(v);
                const h = pad.top + chartH - y;
                return (
                  <rect
                    key={s.name}
                    x={x}
                    y={y}
                    width={barW - 1}
                    height={Math.max(h, v > 0 ? 2 : 0)}
                    fill={s.color}
                    rx={2}
                    opacity={tooltip?.series === s.name && tooltip?.label === label ? 1 : 0.85}
                    className="cursor-pointer transition-opacity"
                    onMouseEnter={(e) =>
                      showTooltip(e, { series: s.name, label, value: v, color: s.color }, svgRef.current, setTooltip)
                    }
                    onMouseMove={(e) =>
                      showTooltip(e, { series: s.name, label, value: v, color: s.color }, svgRef.current, setTooltip)
                    }
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
    </ChartContainer>
  );
}

function PieChartView({
  series,
  formatValue,
}: {
  series: ChartSeries[];
  formatValue: (v: number) => string;
}) {
  const t = useTranslations("components.lineChart");
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const totals = series.map((s) => ({
    ...s,
    total: s.values.reduce((a, b) => a + b, 0),
  }));
  const grandTotal = totals.reduce((sum, t) => sum + t.total, 0) || 1;

  const cx = CHART_WIDTH / 2;
  const cy = CHART_HEIGHT / 2 - 8;
  const r = Math.min(chartRadius(), 88);

  function chartRadius() {
    return Math.min(CHART_WIDTH - CHART_PAD.left - CHART_PAD.right, CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom) / 2 - 10;
  }

  let startAngle = -Math.PI / 2;
  const slices = totals.map((t) => {
    const slice = (t.total / grandTotal) * 2 * Math.PI;
    const endAngle = startAngle + slice;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = slice > Math.PI ? 1 : 0;
    const midAngle = startAngle + slice / 2;
    const path =
      t.total > 0
        ? `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
        : "";
    const pct = ((t.total / grandTotal) * 100).toFixed(1);
    const labelX = cx + r * 0.6 * Math.cos(midAngle);
    const labelY = cy + r * 0.6 * Math.sin(midAngle);
    startAngle = endAngle;
    return { ...t, path, pct, labelX, labelY, midAngle };
  });

  const hasData = grandTotal > 0;

  return (
    <ChartContainer tooltip={tooltip} formatValue={formatValue} onLeave={() => setTooltip(null)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full min-w-0 sm:min-w-[280px]"
      >
        {!hasData ? (
          <text x={cx} y={cy} textAnchor="middle" className="fill-slate-400 text-sm">
            {t("noData")}
          </text>
        ) : (
          <>
            {slices.map((s) =>
              s.path ? (
                <path
                  key={s.name}
                  d={s.path}
                  fill={s.color}
                  opacity={tooltip?.series === s.name ? 1 : 0.9}
                  className="cursor-pointer transition-opacity"
                  onMouseEnter={(e) =>
                    showTooltip(
                      e,
                      { series: s.name, label: t("periodTotal"), value: s.total, color: s.color },
                      svgRef.current,
                      setTooltip
                    )
                  }
                  onMouseMove={(e) =>
                    showTooltip(
                      e,
                      {
                        series: s.name,
                        label: t("periodTotalWithPct", { percent: s.pct }),
                        value: s.total,
                        color: s.color,
                      },
                      svgRef.current,
                      setTooltip
                    )
                  }
                />
              ) : null
            )}
            {slices.map(
              (s) =>
                parseFloat(s.pct) >= 8 && (
                  <text
                    key={`lbl-${s.name}`}
                    x={s.labelX}
                    y={s.labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-white text-[9px] font-semibold pointer-events-none"
                  >
                    {s.pct}%
                  </text>
                )
            )}
          </>
        )}
        <text x={cx} y={CHART_HEIGHT - 12} textAnchor="middle" className="fill-slate-400 text-[10px]">
          {t("shareByBranch")}
        </text>
      </svg>
    </ChartContainer>
  );
}

export function MetricChart({ title, labels, series, formatValue = (v) => String(v) }: MetricChartProps) {
  const t = useTranslations("components.lineChart");
  const [chartType, setChartType] = useState<ChartType>("line");

  return (
    <div className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)] shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
        <select
          value={chartType}
          onChange={(e) => setChartType(e.target.value as ChartType)}
          className="px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--brand)] shadow-sm transition shrink-0"
          aria-label={t("chartTypeAria", { title })}
        >
          <option value="line">{t("lineChart")}</option>
          <option value="bar">{t("barChart")}</option>
          <option value="pie">{t("pieChart")}</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        {chartType === "line" && <LineChartView labels={labels} series={series} formatValue={formatValue} />}
        {chartType === "bar" && <BarChartView labels={labels} series={series} formatValue={formatValue} />}
        {chartType === "pie" && <PieChartView series={series} formatValue={formatValue} />}
      </div>

      <ChartLegend series={series} />
    </div>
  );
}

/** @deprecated Use MetricChart */
export const MultiLineChart = MetricChart;
