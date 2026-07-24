"use client";

import Link from "next/link";
import { LucideIcon, ArrowRight, TrendingDown, TrendingUp, Minus, Trophy, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { PulseStatCard } from "@/components/enterprise-ui";
import {
  BenchmarkMetricComparison,
  BenchmarkPlaybookItem,
  BenchmarkResponse,
} from "@/lib/api";

export function formatMetric(value: number | undefined | null, unit: string) {
  if (value == null) return "—";
  if (unit === "INR") return `₹${Math.round(value).toLocaleString("en-IN")}`;
  if (unit === "%") return `${Number(value).toFixed(1)}%`;
  return Number(value).toFixed(1);
}

export function statusStyles(status: string) {
  if (status === "AHEAD") {
    return {
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
      stripe: "bg-emerald-500",
      text: "text-emerald-700 dark:text-emerald-400",
      icon: TrendingUp,
    };
  }
  if (status === "BEHIND") {
    return {
      badge: "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
      stripe: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-400",
      icon: TrendingDown,
    };
  }
  if (status === "ON_PAR") {
    return {
      badge: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
      stripe: "bg-sky-400",
      text: "text-sky-700 dark:text-sky-400",
      icon: Minus,
    };
  }
  return {
    badge: "bg-[var(--surface-muted)] text-[var(--text-secondary)] border-[var(--border)]",
    stripe: "bg-[var(--border-strong)]",
    text: "text-[var(--text-secondary)]",
    icon: Minus,
  };
}

export function PulseStatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label: string;
  className?: string;
}) {
  const s = statusStyles(status);
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wide",
        s.badge,
        className
      )}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {label}
    </span>
  );
}

function ComparisonBars({
  you,
  peer,
  top,
}: {
  you: number;
  peer?: number | null;
  top?: number | null;
}) {
  const max = Math.max(you, peer ?? 0, top ?? 0, 1);
  const pct = (v: number) => `${Math.min(100, Math.round((v / max) * 100))}%`;

  return (
    <div className="mt-2 space-y-1.5" aria-hidden>
      <div className="flex items-center gap-2">
        <span className="w-10 sm:w-14 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">You</span>
        <div className="flex-1 h-2 rounded-full bg-indigo-100 dark:bg-indigo-950/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 mp-bar-fill"
            style={{ width: pct(you) }}
          />
        </div>
      </div>
      {peer != null && (
        <div className="flex items-center gap-2">
          <span className="w-10 sm:w-14 text-[10px] font-semibold text-slate-500 shrink-0">Peers</span>
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-slate-400 mp-bar-fill" style={{ width: pct(peer) }} />
          </div>
        </div>
      )}
      {top != null && (
        <div className="flex items-center gap-2">
          <span className="w-10 sm:w-14 text-[10px] font-semibold text-violet-600 dark:text-violet-400 shrink-0">Top 25%</span>
          <div className="flex-1 h-1.5 rounded-full bg-violet-100 dark:bg-violet-950/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-600 mp-bar-fill"
              style={{ width: pct(top) }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function MarketPulseHero({
  data,
  settingsCity,
  onViewPlaybook,
  labels,
}: {
  data: BenchmarkResponse;
  settingsCity?: string;
  onViewPlaybook?: () => void;
  labels: {
    cohort: string;
    brandRank: string;
    city: string;
    metricsAboveMedian: string;
    monthlyOpportunity: string;
    viewActionPlan: string;
    competitiveScore: string;
  };
}) {
  const scorePct =
    data.totalMetrics > 0 ? Math.round((data.metricsAboveMedian / data.totalMetrics) * 100) : 0;
  const hasPlaybook = data.playbook.length > 0;

  return (
    <div
      className="hero-banner relative overflow-hidden rounded-2xl p-5 sm:p-6 shadow-xl mp-animate-in"
      data-testid="market-pulse-hero"
    >
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl mp-pulse-glow" />
      <div className="absolute -left-4 bottom-0 w-32 h-32 rounded-full bg-white/5 blur-xl" />

      <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {data.brandRank != null && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold backdrop-blur-sm border border-white/20">
                <Trophy className="w-3.5 h-3.5" />
                {labels.brandRank}
              </span>
            )}
            <span className="text-xs hero-muted">{data.cohortLabel}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{data.brandName}</h2>
          <p className="text-sm hero-subtitle">
            {labels.city}: {data.marketCity ?? settingsCity ?? "—"} · {data.periodLabel}
          </p>
          {hasPlaybook && onViewPlaybook && (
            <button
              type="button"
              onClick={onViewPlaybook}
              className="hero-cta mt-1 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              {labels.viewActionPlan}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 w-full lg:w-auto lg:shrink-0">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${scorePct} ${100 - scorePct}`}
                pathLength={100}
                className="mp-score-ring"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <span className="text-xl sm:text-2xl font-bold tabular-nums">
                {data.metricsAboveMedian}/{data.totalMetrics}
              </span>
              <span className="text-[9px] uppercase tracking-wider hero-muted text-center px-1 leading-tight">
                {labels.competitiveScore}
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1 sm:flex-none space-y-0.5 sm:space-y-2 text-left sm:text-right">
            <p className="text-[10px] sm:text-xs hero-muted uppercase tracking-wider">{labels.monthlyOpportunity}</p>
            <p className="text-xl sm:text-2xl font-bold tabular-nums break-words">
              ₹{Math.round(data.estimatedMonthlyOpportunity).toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export { PulseStatCard } from "@/components/enterprise-ui";

export function HeroComparisonTable({
  metrics,
  labels,
}: {
  metrics: BenchmarkMetricComparison[];
  labels: {
    title: string;
    hint: string;
    metric: string;
    you: string;
    peerMedian: string;
    topQuartile: string;
    vsPeers: string;
    ahead: string;
    onPar: string;
    gap: (value: string) => string;
  };
}) {
  return (
    <div
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden mp-animate-in mp-stagger-2"
      data-testid="market-pulse-hero-table"
    >
      <div className="px-4 sm:px-5 py-4 border-b border-[var(--border)] bg-gradient-to-r from-indigo-50/80 to-violet-50/50 dark:from-indigo-950/30 dark:to-violet-950/20">
        <h3 className="font-bold text-[var(--text-primary)] text-base">{labels.title}</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{labels.hint}</p>
      </div>

      <div className="responsive-table-wrap">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider font-bold border-b border-[var(--border)]">
              <th className="text-left py-3 pl-4 pr-3 bg-[var(--surface-muted)]/60 text-[var(--text-secondary)]">
                {labels.metric}
              </th>
              <th className="text-right py-3 px-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 min-w-[5.5rem]">
                {labels.you}
              </th>
              <th className="text-right py-3 px-3 bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 min-w-[5.5rem]">
                {labels.peerMedian}
              </th>
              <th className="text-right py-3 px-3 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 min-w-[5.5rem]">
                {labels.topQuartile}
              </th>
              <th className="text-right py-3 pr-4 pl-3 bg-[var(--surface-muted)]/60 text-[var(--text-secondary)] min-w-[7rem]">
                {labels.vsPeers}
              </th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, i) => {
              const s = statusStyles(m.status);
              const statusLabel =
                m.status === "BEHIND" && m.gapToTopQuartile
                  ? labels.gap(formatMetric(m.gapToTopQuartile, m.unit))
                  : m.status === "AHEAD"
                    ? labels.ahead
                    : m.status === "ON_PAR"
                      ? labels.onPar
                      : "—";

              return (
                <tr
                  key={m.key}
                  className={cn(
                    "border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--surface-muted)]/40",
                    i % 2 === 1 && "bg-[var(--surface-muted)]/20"
                  )}
                >
                  <td className="py-4 pl-4 pr-3 align-top">
                    <div className="flex gap-3">
                      <div className={cn("w-1 rounded-full shrink-0 self-stretch min-h-[3rem]", s.stripe)} />
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--text-primary)]">{m.label}</p>
                        <ComparisonBars you={m.yourValue} peer={m.peerMedian} top={m.topQuartile} />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-3 text-right align-top tabular-nums font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/30 dark:bg-indigo-950/15">
                    {formatMetric(m.yourValue, m.unit)}
                  </td>
                  <td className="py-4 px-3 text-right align-top tabular-nums text-[var(--text-secondary)]">
                    {formatMetric(m.peerMedian ?? null, m.unit)}
                  </td>
                  <td className="py-4 px-3 text-right align-top tabular-nums text-violet-700 dark:text-violet-400 bg-violet-50/20 dark:bg-violet-950/10">
                    {formatMetric(m.topQuartile ?? null, m.unit)}
                  </td>
                  <td className="py-4 pr-4 pl-3 text-right align-top">
                    <PulseStatusBadge status={m.status} label={statusLabel} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AllMetricsPanel({
  metrics,
  title,
  labels,
}: {
  metrics: BenchmarkMetricComparison[];
  title: string;
  labels: { metric: string; you: string; peerMedian: string; topQuartile: string; percentile: string };
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden mp-animate-in mp-stagger-3">
      <div className="px-4 sm:px-5 py-3 border-b border-[var(--border)] flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-bold text-[var(--text-primary)] text-sm">{title}</h3>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Ahead
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Gap
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-400" /> On par
          </span>
        </div>
      </div>
      <div className="responsive-table-wrap">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] border-b border-[var(--border)] bg-[var(--surface-muted)]/50">
              <th className="text-left py-2.5 pl-4 pr-3">{labels.metric}</th>
              <th className="text-right py-2.5 px-2 text-indigo-600 dark:text-indigo-400">{labels.you}</th>
              <th className="text-right py-2.5 px-2">{labels.peerMedian}</th>
              <th className="text-right py-2.5 px-2 text-violet-600 dark:text-violet-400">{labels.topQuartile}</th>
              <th className="text-right py-2.5 pr-4 pl-2">{labels.percentile}</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => {
              const s = statusStyles(m.status);
              const Icon = s.icon;
              return (
                <tr key={m.key} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)]/30">
                  <td className="py-3 pl-4 pr-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.stripe)} />
                      <span className="font-medium">{m.label}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right tabular-nums font-semibold text-indigo-700 dark:text-indigo-300">
                    {formatMetric(m.yourValue, m.unit)}
                  </td>
                  <td className="py-3 px-2 text-right tabular-nums text-[var(--text-secondary)]">
                    {formatMetric(m.peerMedian ?? null, m.unit)}
                  </td>
                  <td className="py-3 px-2 text-right tabular-nums text-violet-700 dark:text-violet-400">
                    {formatMetric(m.topQuartile ?? null, m.unit)}
                  </td>
                  <td className={cn("py-3 pr-4 pl-2 text-right text-xs font-bold", s.text)}>
                    <span className="inline-flex items-center gap-0.5 justify-end">
                      <Icon className="w-3.5 h-3.5" />
                      {m.percentileRank != null ? `${m.percentileRank}th` : "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function rankMedal(rank: number) {
  if (rank === 1) return { icon: Trophy, className: "text-amber-500 bg-amber-50 dark:bg-amber-950/40" };
  if (rank === 2) return { icon: Medal, className: "text-slate-500 bg-slate-100 dark:bg-slate-800" };
  if (rank === 3) return { icon: Medal, className: "text-orange-600 bg-orange-50 dark:bg-orange-950/40" };
  return null;
}

export function BranchRankTable({
  rows,
  labels,
}: {
  rows: BenchmarkResponse["branchRankings"];
  labels: Record<string, string>;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden mp-animate-in">
      <div className="responsive-table-wrap">
        <table className="w-full text-sm min-w-[640px]" data-testid="market-pulse-branch-table">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] bg-[var(--surface-muted)]/60 border-b border-[var(--border)]">
              <th className="text-left py-3 pl-4 font-bold">{labels.branch}</th>
              <th className="text-right py-3 px-2">{labels.revPerDay}</th>
              <th className="text-right py-3 px-2">{labels.atv}</th>
              <th className="text-right py-3 px-2">{labels.retail}</th>
              <th className="text-right py-3 px-2">{labels.margin}</th>
              <th className="text-right py-3 pr-4 pl-2">{labels.rank}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const medal = b.rankInBrand != null ? rankMedal(b.rankInBrand) : null;
              const MedalIcon = medal?.icon;
              return (
                <tr
                  key={b.branchId}
                  className={cn(
                    "border-b border-[var(--border)] last:border-0 transition-colors",
                    b.rankInBrand === 1 && "bg-emerald-50/50 dark:bg-emerald-950/20"
                  )}
                >
                  <td className="py-3 pl-4 font-semibold">
                    <div className="flex items-center gap-2">
                      {medal && MedalIcon && (
                        <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", medal.className)}>
                          <MedalIcon className="w-4 h-4" />
                        </span>
                      )}
                      {b.branchName}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right tabular-nums font-medium">
                    ₹{Math.round(b.revenuePerBranchDay).toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-2 text-right tabular-nums">₹{Math.round(b.avgTicket).toLocaleString("en-IN")}</td>
                  <td className="py-3 px-2 text-right tabular-nums">{b.retailAttachPercent.toFixed(1)}%</td>
                  <td className="py-3 px-2 text-right tabular-nums">{b.netMarginPercent.toFixed(1)}%</td>
                  <td className="py-3 pr-4 pl-2 text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-xs font-bold">
                      #{b.rankInBrand}
                      <span className="text-[var(--text-tertiary)] font-normal">· {b.brandPercentileLabel}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function NetworkPeersTable({
  peers,
  labels,
}: {
  peers: BenchmarkResponse["networkPeers"];
  labels: Record<string, string>;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden mp-animate-in">
      <div className="responsive-table-wrap">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] bg-violet-50/50 dark:bg-violet-950/20 border-b border-[var(--border)]">
              <th className="text-left py-3 pl-4">{labels.peer}</th>
              <th className="text-right py-3 px-2">{labels.branches}</th>
              <th className="text-right py-3 px-2">{labels.revPerDay}</th>
              <th className="text-right py-3 px-2">{labels.atv}</th>
              <th className="text-right py-3 px-2">{labels.retail}</th>
              <th className="text-right py-3 pr-4 pl-2">{labels.margin}</th>
            </tr>
          </thead>
          <tbody>
            {peers.map((p) => (
              <tr
                key={p.peerLabel}
                className={cn(
                  "border-b border-[var(--border)] last:border-0",
                  p.isYou && "bg-indigo-50 dark:bg-indigo-950/30 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-800"
                )}
              >
                <td className="py-3 pl-4 font-semibold">
                  {p.peerLabel}
                  {p.isYou && (
                    <span className="ml-2 text-[10px] uppercase px-2 py-0.5 rounded-full bg-indigo-600 text-white font-bold">
                      {labels.you}
                    </span>
                  )}
                </td>
                <td className="py-3 px-2 text-right">{p.branchCount}</td>
                <td className="py-3 px-2 text-right tabular-nums font-medium">
                  ₹{Math.round(p.revenuePerBranchDay).toLocaleString("en-IN")}
                </td>
                <td className="py-3 px-2 text-right tabular-nums">₹{Math.round(p.avgTicket).toLocaleString("en-IN")}</td>
                <td className="py-3 px-2 text-right tabular-nums">{p.retailAttachPercent.toFixed(1)}%</td>
                <td className="py-3 pr-4 pl-2 text-right tabular-nums">{p.netMarginPercent.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PlaybookCard({ item }: { item: BenchmarkPlaybookItem }) {
  const href =
    item.actionModule === "finance"
      ? "/admin/finance"
      : item.actionModule === "campaigns"
        ? "/admin/campaigns"
        : item.actionModule === "employees"
          ? "/admin/employees"
          : item.actionModule === "inventory"
            ? "/admin/inventory"
            : "/admin/insights";

  const severityClass =
    item.severity === "HIGH"
      ? "severity-high border-l-4 border-l-amber-500"
      : "severity-medium border-l-4 border-l-violet-500";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-3 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 mp-animate-in",
        severityClass
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold text-[var(--text-primary)]">{item.title}</p>
        <span
          className={cn(
            "text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-bold shrink-0",
            item.severity === "HIGH" ? "badge-high" : "badge-medium"
          )}
        >
          {item.severity}
        </span>
      </div>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.message}</p>
      {item.estimatedMonthlyImpact != null && item.estimatedMonthlyImpact > 0 && (
        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
          Est. opportunity: ₹{Math.round(item.estimatedMonthlyImpact).toLocaleString("en-IN")}/mo
        </p>
      )}
      <Link
        href={href}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand)] text-[var(--brand-on-brand)] text-sm font-bold shadow-sm hover:opacity-90 active:scale-[0.98] transition"
      >
        {item.actionLabel}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
