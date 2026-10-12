"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { UsageDailyPoint, UsageHealth, UsageHealthStatus, UsageMatrixCell } from "@/lib/api";
import { Sparkline } from "@/components/Sparkline";
import { featureLabel, featurePortalLabel } from "@/modules/platform/usage/feature-labels";
import {
  absoluteTime,
  formatCompact,
  HEALTH_META,
  pctChange,
  recencyTone,
  relativeTime,
} from "@/modules/platform/usage/insights/usage-format";

export function HealthBadge({ status, className }: { status: UsageHealthStatus; className?: string }) {
  const m = HEALTH_META[status];
  return (
    <span
      title={m.hint}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        m.bg,
        m.text,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} aria-hidden />
      {m.label}
    </span>
  );
}

/** Circular 0–100 gauge coloured by health status. */
export function HealthRing({ score, status, size = 88 }: { score: number; status: UsageHealthStatus; size?: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Health score ${clamped} of 100`}>
      <svg viewBox="0 0 80 80" width={size} height={size} className="-rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={HEALTH_META[status].ring}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * c} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tabular-nums leading-none text-[var(--text-primary)]">{clamped}</span>
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">score</span>
      </div>
    </div>
  );
}

const BREAKDOWN: { key: keyof Pick<UsageHealth, "adoption" | "breadth" | "stickiness" | "momentum">; label: string; help: string; weight: string }[] = [
  { key: "adoption", label: "Adoption", help: "Share of provisioned users who were active in the period", weight: "35%" },
  { key: "breadth", label: "Feature breadth", help: "Distinct features used, against a core set of up to 8", weight: "25%" },
  { key: "stickiness", label: "Stickiness", help: "Weekly active ÷ monthly active users at the end of the period", weight: "20%" },
  { key: "momentum", label: "Momentum", help: "Events versus the previous period of equal length (50 = flat)", weight: "20%" },
];

/** Shows what the score is made of so a low number is explainable, not a black box. */
export function ScoreBreakdown({ health }: { health: UsageHealth }) {
  return (
    <ul className="min-w-0 flex-1 space-y-2">
      {BREAKDOWN.map((b) => (
        <li key={b.key} title={b.help}>
          <div className="mb-0.5 flex items-baseline justify-between gap-2 text-xs">
            <span className="font-medium text-[var(--text-primary)]">
              {b.label} <span className="font-normal text-[var(--text-tertiary)]">· {b.weight}</span>
            </span>
            <span className="tabular-nums text-[var(--text-secondary)]">{health[b.key]}</span>
          </div>
          <MeterBar value={health[b.key]} />
        </li>
      ))}
    </ul>
  );
}

export function MeterBar({ value, className, color }: { value: number; className?: string; color?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]", className)} role="presentation">
      <div className="h-full rounded-full transition-[width]" style={{ width: `${v}%`, background: color ?? "var(--brand)" }} />
    </div>
  );
}

/** Change versus the previous period: ▲/▼ percent, "New" when there is no baseline, "—" when both are empty. */
export function DeltaChip({ current, previous, className }: { current: number; previous: number; className?: string }) {
  const base = "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums whitespace-nowrap";
  if (previous <= 0 && current <= 0) {
    return <span className={cn("text-xs text-[var(--text-tertiary)]", className)}>—</span>;
  }
  if (previous <= 0) {
    return <span className={cn(base, "bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300", className)} title="No activity in the previous period">New</span>;
  }
  const pct = pctChange(current, previous) ?? 0;
  const tone =
    pct > 0
      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
      : pct < 0
        ? "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300"
        : "bg-[var(--surface-muted)] text-[var(--text-secondary)]";
  return (
    <span className={cn(base, tone, className)} title={`${previous.toLocaleString()} → ${current.toLocaleString()} versus previous period`}>
      {pct > 0 ? "▲" : pct < 0 ? "▼" : "•"} {Math.abs(pct)}%
    </span>
  );
}

/** Relative timestamp with the exact time on hover; colour reflects how fresh the activity is. */
export function RelTime({ iso, className }: { iso?: string | null; className?: string }) {
  const tone = recencyTone(iso);
  return (
    <span
      title={absoluteTime(iso)}
      className={cn(
        "whitespace-nowrap tabular-nums",
        tone === "fresh" && "text-emerald-700 dark:text-emerald-400",
        tone === "ageing" && "text-[var(--text-secondary)]",
        tone === "stale" && "text-amber-700 dark:text-amber-400",
        tone === "never" && "text-[var(--text-tertiary)]",
        className,
      )}
    >
      {relativeTime(iso)}
    </span>
  );
}

export function TrendSpark({ values, status, width = 96, height = 28 }: { values: number[]; status?: UsageHealthStatus; width?: number; height?: number }) {
  return (
    <Sparkline
      values={values}
      width={width}
      height={height}
      color={status ? HEALTH_META[status].ring : "#6366f1"}
      className="block"
    />
  );
}

const PORTAL_SERIES: { key: "admin" | "manager" | "employee" | "other"; label: string; color: string }[] = [
  { key: "admin", label: "Admin app", color: "#6366f1" },
  { key: "manager", label: "Manager app", color: "#14b8a6" },
  { key: "employee", label: "Employee app", color: "#f59e0b" },
  { key: "other", label: "Other", color: "#94a3b8" },
];

/** Daily events stacked by app, with a hover readout (and an active-users sparkline beneath). */
export function StackedDailyBars({ data, height = 168 }: { data: UsageDailyPoint[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = useMemo(() => Math.max(1, ...data.map((d) => d.events)), [data]);
  const n = Math.max(1, data.length);
  const W = 1000;
  const colW = W / n;
  const barW = Math.max(2, colW * 0.72);
  const point = hover != null ? data[hover] : null;

  const dateLabel = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="min-w-0">
      <div className="mb-2 flex min-h-[2.25rem] flex-wrap items-center gap-x-4 gap-y-1 text-xs" aria-live="polite">
        {point ? (
          <>
            <span className="font-semibold text-[var(--text-primary)]">{dateLabel(point.date)}</span>
            <span className="tabular-nums text-[var(--text-secondary)]">{point.events.toLocaleString()} events</span>
            <span className="tabular-nums text-[var(--text-secondary)]">{point.activeUsers} active users</span>
            {PORTAL_SERIES.filter((s) => point[s.key] > 0).map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1 tabular-nums text-[var(--text-secondary)]">
                <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} aria-hidden />
                {s.label} {point[s.key]}
              </span>
            ))}
          </>
        ) : (
          <>
            <span className="text-[var(--text-tertiary)]">Hover a day for details</span>
            {PORTAL_SERIES.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} aria-hidden />
                {s.label}
              </span>
            ))}
          </>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${height}`}
        preserveAspectRatio="none"
        className="block w-full"
        style={{ height }}
        role="img"
        aria-label="Daily events by app"
        onMouseLeave={() => setHover(null)}
      >
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={0} x2={W} y1={height * (1 - g)} y2={height * (1 - g)} stroke="var(--border)" strokeDasharray="4 6" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        {data.map((d, i) => {
          let y = height;
          const x = i * colW + (colW - barW) / 2;
          return (
            <g key={d.date}>
              {hover === i ? <rect x={i * colW} y={0} width={colW} height={height} fill="var(--brand)" opacity={0.07} /> : null}
              {PORTAL_SERIES.map((s) => {
                const h = (d[s.key] / max) * (height - 4);
                if (h <= 0) return null;
                y -= h;
                return <rect key={s.key} x={x} y={y} width={barW} height={h} fill={s.color} rx={1.5} />;
              })}
              <rect x={i * colW} y={0} width={colW} height={height} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} />
            </g>
          );
        })}
      </svg>

      <div className="mt-1 flex justify-between text-[10px] text-[var(--text-tertiary)]">
        <span>{data[0] ? dateLabel(data[0].date) : ""}</span>
        <span>{data.length > 2 ? dateLabel(data[Math.floor(data.length / 2)].date) : ""}</span>
        <span>{data.length > 1 ? dateLabel(data[data.length - 1].date) : ""}</span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Active users</span>
        <div className="min-w-0 flex-1">
          <Sparkline values={data.map((d) => d.activeUsers)} width={600} height={30} color="#0ea5e9" className="block w-full" />
        </div>
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-[var(--text-secondary)]">
          {formatCompact(Math.max(0, ...data.map((d) => d.activeUsers)))} max
        </span>
      </div>
    </div>
  );
}

export type MatrixColumn = { id: string; label: string; sub?: string };

/** Feature × (branch | user) grid: shade = how much, tooltip = count and when it was last used. */
export function MatrixGrid({
  features,
  columns,
  cells,
  emptyMessage,
  columnHeaderTitle,
}: {
  features: string[];
  columns: MatrixColumn[];
  cells: UsageMatrixCell[];
  emptyMessage: string;
  columnHeaderTitle: string;
}) {
  const byKey = useMemo(() => {
    const m = new Map<string, UsageMatrixCell>();
    for (const c of cells) m.set(`${c.featureKey}|${c.columnId}`, c);
    return m;
  }, [cells]);
  const max = useMemo(() => Math.max(1, ...cells.map((c) => c.hits)), [cells]);

  if (features.length === 0 || columns.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--text-tertiary)]">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Feature \ {columnHeaderTitle}
            </th>
            {columns.map((c) => (
              <th key={c.id} className="min-w-[4.5rem] px-1 py-1 text-center font-medium text-[var(--text-secondary)]" title={c.sub ? `${c.label} · ${c.sub}` : c.label}>
                <span className="block max-w-[6rem] truncate">{c.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((f) => (
            <tr key={f}>
              <th scope="row" className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-1 text-left font-medium text-[var(--text-primary)]" title={f}>
                <span className="block max-w-[12rem] truncate">{featureLabel(f)}</span>
                {featurePortalLabel(f) ? (
                  <span className="block text-[10px] font-normal text-[var(--text-tertiary)]">{featurePortalLabel(f)} app</span>
                ) : null}
              </th>
              {columns.map((c) => {
                const cell = byKey.get(`${f}|${c.id}`);
                if (!cell) {
                  return (
                    <td key={c.id} className="rounded-md bg-[var(--surface-muted)]/50 py-2 text-center text-[var(--text-tertiary)]" title={`${featureLabel(f)} · ${c.label}: not used in this period`}>
                      ·
                    </td>
                  );
                }
                const level = Math.max(0.12, cell.hits / max);
                return (
                  <td
                    key={c.id}
                    className="rounded-md py-2 text-center font-semibold tabular-nums text-[var(--text-primary)]"
                    style={{ background: `color-mix(in srgb, var(--brand) ${Math.round(level * 60)}%, transparent)` }}
                    title={`${featureLabel(f)} · ${c.label}: ${cell.hits.toLocaleString()} events · last used ${relativeTime(cell.lastUsedAt)} (${absoluteTime(cell.lastUsedAt)})`}
                  >
                    {formatCompact(cell.hits)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
