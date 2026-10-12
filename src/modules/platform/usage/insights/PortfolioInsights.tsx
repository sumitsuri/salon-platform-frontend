"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UsageAccountInsight, UsageHealthStatus, UsageInsightsPortfolio } from "@/lib/api";
import { Card } from "@/components/ui";
import { featureLabel, featurePortalLabel } from "@/modules/platform/usage/feature-labels";
import { formatCompact, HEALTH_META, SEGMENT_ORDER } from "@/modules/platform/usage/insights/usage-format";
import { DeltaChip, HealthBadge, MeterBar, RelTime, TrendSpark } from "@/modules/platform/usage/insights/usage-viz";

type SortKey = "attention" | "name" | "events" | "change" | "active" | "last";

const SORT_LABELS: Record<SortKey, string> = {
  attention: "Needs attention first",
  name: "Brand name",
  events: "Most events",
  change: "Biggest change",
  active: "Adoption",
  last: "Most recent activity",
};

function changeRatio(a: UsageAccountInsight) {
  const { events, previousEvents } = a.totals;
  if (previousEvents <= 0) return events > 0 ? 1 : 0;
  return (events - previousEvents) / previousEvents;
}

function adoptionRatio(a: UsageAccountInsight) {
  return a.totals.provisionedUsers > 0 ? a.totals.activeUsers / a.totals.provisionedUsers : 0;
}

export function PortfolioInsights({
  data,
  brandSearch,
  brandFilterId,
  periodDays,
}: {
  data: UsageInsightsPortfolio;
  brandSearch: string;
  brandFilterId: string;
  /** Length of the selected period as the user sees it (the server counts whole UTC days). */
  periodDays: number;
}) {
  const [segment, setSegment] = useState<UsageHealthStatus | "ALL">("ALL");
  const [sort, setSort] = useState<SortKey>("attention");
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  const scoped = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    return data.accounts.filter(
      (a) =>
        (!brandFilterId || a.tenantId === brandFilterId) &&
        (!q || a.tenantName.toLowerCase().includes(q) || a.tenantSlug.toLowerCase().includes(q)),
    );
  }, [data.accounts, brandSearch, brandFilterId]);

  const counts = useMemo(() => {
    const m = new Map<UsageHealthStatus, number>();
    for (const a of scoped) m.set(a.health.status, (m.get(a.health.status) ?? 0) + 1);
    return m;
  }, [scoped]);

  const rows = useMemo(() => {
    const list = scoped.filter((a) => segment === "ALL" || a.health.status === segment);
    const priority = (s: UsageHealthStatus) => SEGMENT_ORDER.indexOf(s);
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.tenantName.localeCompare(b.tenantName);
        case "events":
          return b.totals.events - a.totals.events;
        case "change":
          return changeRatio(a) - changeRatio(b);
        case "active":
          return adoptionRatio(a) - adoptionRatio(b);
        case "last":
          return (Date.parse(b.totals.lastActivityAt ?? "") || 0) - (Date.parse(a.totals.lastActivityAt ?? "") || 0);
        default:
          return priority(a.health.status) - priority(b.health.status) || a.health.score - b.health.score;
      }
    });
    return sorted;
  }, [scoped, segment, sort]);

  const p = data.platform;
  const activeBrands = scoped.filter((a) => a.totals.events > 0).length;
  const previousActiveBrands = scoped.filter((a) => a.totals.previousEvents > 0).length;
  const stickiness = p.mau > 0 ? Math.round((p.wau / p.mau) * 100) : 0;
  const adoption = p.provisionedUsers > 0 ? Math.min(100, Math.round((p.activeUsers / p.provisionedUsers) * 100)) : 0;
  const features = showAllFeatures ? data.featureReach : data.featureReach.slice(0, 10);
  const prevLabel = `vs previous ${periodDays} day${periodDays === 1 ? "" : "s"}`;

  return (
    <div className="min-w-0 space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Active brands" value={`${activeBrands}`} suffix={`/ ${scoped.length}`} current={activeBrands} previous={previousActiveBrands} hint={prevLabel} />
        <Kpi label="Active users" value={formatCompact(p.activeUsers)} current={p.activeUsers} previous={p.previousActiveUsers} hint={prevLabel} />
        <Kpi label="Events" value={formatCompact(p.events)} current={p.events} previous={p.previousEvents} hint={prevLabel} />
        <Kpi label="Stickiness" value={`${stickiness}%`} hint="Weekly ÷ monthly active users" />
        <Kpi label="User adoption" value={`${adoption}%`} hint={`${p.activeUsers} active · ${p.provisionedUsers} provisioned`} />
        <Kpi label="Features in use" value={String(data.platformFeatureCount)} hint="Distinct features used across brands" />
      </div>

      <Card className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Account health</h2>
            <p className="text-xs text-[var(--text-tertiary)]">
              Adoption, feature breadth, stickiness and momentum combined into one score. Select a group to filter.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            Sort
            <select
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <HealthDistribution total={scoped.length} counts={counts} />

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by health">
          <SegmentChip active={segment === "ALL"} onClick={() => setSegment("ALL")} label="All" count={scoped.length} />
          {SEGMENT_ORDER.map((s) => (
            <SegmentChip
              key={s}
              active={segment === s}
              onClick={() => setSegment(s)}
              label={HEALTH_META[s].label}
              count={counts.get(s) ?? 0}
              dot={HEALTH_META[s].dot}
              disabled={(counts.get(s) ?? 0) === 0}
            />
          ))}
        </div>

        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                <th className="px-3 py-2">Brand</th>
                <th className="px-3 py-2">Health</th>
                <th className="px-3 py-2">Trend ({periodDays}d)</th>
                <th className="px-3 py-2 text-right">Events</th>
                <th className="px-3 py-2">Active users</th>
                <th className="hidden px-3 py-2 text-right xl:table-cell">Features</th>
                <th className="px-3 py-2">Last active</th>
                <th className="w-8" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-sm text-[var(--text-tertiary)]">
                    No brands in this group.
                  </td>
                </tr>
              ) : (
                rows.map((a) => <AccountRow key={a.tenantId} a={a} />)
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Feature adoption across brands</h2>
            <p className="text-xs text-[var(--text-tertiary)]">
              Reach = brands that used the feature. Ranked by activity; last used shows the most recent use anywhere.
            </p>
          </div>
          {data.featureReach.length > 10 ? (
            <button type="button" className="text-xs font-semibold text-[var(--brand-text)] hover:underline" onClick={() => setShowAllFeatures((v) => !v)}>
              {showAllFeatures ? "Show top 10" : `Show all ${data.featureReach.length}`}
            </button>
          ) : null}
        </div>
        {features.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-tertiary)]">No feature activity in this period.</p>
        ) : (
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                  <th className="px-3 py-2">Feature</th>
                  <th className="px-3 py-2">Brand reach</th>
                  <th className="px-3 py-2 text-right">Events</th>
                  <th className="hidden px-3 py-2 text-right xl:table-cell">Users</th>
                  <th className="px-3 py-2">Trend</th>
                  <th className="px-3 py-2">Last used</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f) => {
                  const reach = data.totalBrands > 0 ? Math.round((f.brands / data.totalBrands) * 100) : 0;
                  return (
                    <tr key={f.featureKey} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-[var(--text-primary)]" title={f.featureKey}>
                          {featureLabel(f.featureKey)}
                        </p>
                        {featurePortalLabel(f.featureKey) ? (
                          <p className="text-xs text-[var(--text-tertiary)]">{featurePortalLabel(f.featureKey)} app</p>
                        ) : null}
                      </td>
                      <td className="w-44 px-3 py-2.5 xl:w-56">
                        <div className="flex items-center gap-2">
                          <MeterBar value={reach} className="flex-1" />
                          <span className="w-20 shrink-0 text-right text-xs tabular-nums text-[var(--text-secondary)]">
                            {f.brands} of {data.totalBrands}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="tabular-nums">{formatCompact(f.hits)}</span>{" "}
                        <DeltaChip current={f.hits} previous={f.previousHits} />
                      </td>
                      <td className="hidden px-3 py-2.5 text-right tabular-nums xl:table-cell">{f.uniqueUsers}</td>
                      <td className="px-3 py-2.5">
                        <TrendSpark values={f.trend} width={88} height={24} />
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        <RelTime iso={f.lastUsedAt} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  suffix,
  current,
  previous,
  hint,
}: {
  label: string;
  value: string;
  suffix?: string;
  current?: number;
  previous?: number;
  hint?: string;
}) {
  return (
    <Card className="min-w-0 !p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{label}</p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold leading-none tabular-nums text-[var(--text-primary)]">{value}</span>
        {suffix ? <span className="text-xs text-[var(--text-tertiary)]">{suffix}</span> : null}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        {current != null && previous != null ? <DeltaChip current={current} previous={previous} /> : null}
        {hint ? <span className="truncate text-[10px] text-[var(--text-tertiary)]">{hint}</span> : null}
      </div>
    </Card>
  );
}

function HealthDistribution({ total, counts }: { total: number; counts: Map<UsageHealthStatus, number> }) {
  if (total === 0) return null;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--border)]" role="img" aria-label="Brands by health status">
      {SEGMENT_ORDER.map((s) => {
        const n = counts.get(s) ?? 0;
        return n > 0 ? <div key={s} className={HEALTH_META[s].dot} style={{ width: `${(n / total) * 100}%` }} title={`${HEALTH_META[s].label}: ${n}`} /> : null;
      })}
    </div>
  );
}

function SegmentChip({
  active,
  onClick,
  label,
  count,
  dot,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  dot?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
        active
          ? "border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand-text)]"
          : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]",
        disabled && "cursor-default opacity-40 hover:bg-transparent",
      )}
    >
      {dot ? <span className={cn("h-1.5 w-1.5 rounded-full", dot)} aria-hidden /> : null}
      {label}
      <span className="tabular-nums text-[var(--text-tertiary)]">{count}</span>
    </button>
  );
}

function AccountRow({ a }: { a: UsageAccountInsight }) {
  const t = a.totals;
  const href = `/platform/usage/detail?tenantId=${encodeURIComponent(a.tenantId)}`;
  const adoptionPct = t.provisionedUsers > 0 ? Math.min(100, Math.round((t.activeUsers / t.provisionedUsers) * 100)) : 0;
  return (
    <tr className="group border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)]/50">
      <td className="px-3 py-3">
        <Link href={href} className="flex min-w-0 items-center gap-2 font-medium text-[var(--text-primary)] hover:text-[var(--brand-text)]">
          <span className="truncate">{a.tenantName}</span>
          {a.demoTenant ? (
            <span className="shrink-0 rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">demo</span>
          ) : null}
        </Link>
        <p className="truncate text-xs text-[var(--text-tertiary)]">{a.tenantSlug}</p>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <HealthBadge status={a.health.status} />
          <span className="text-xs tabular-nums text-[var(--text-secondary)]" title="Health score out of 100">
            {a.health.score}
          </span>
        </div>
      </td>
      <td className="px-3 py-3">
        <TrendSpark values={a.trend} status={a.health.status} />
      </td>
      <td className="px-3 py-3 text-right">
        <span className="tabular-nums font-medium">{formatCompact(t.events)}</span>{" "}
        <DeltaChip current={t.events} previous={t.previousEvents} />
      </td>
      <td className="w-36 px-3 py-3 xl:w-44">
        <div className="flex items-center gap-2">
          <MeterBar value={adoptionPct} className="flex-1" />
          <span className="w-14 shrink-0 text-right text-xs tabular-nums text-[var(--text-secondary)]" title={`${t.activeUsers} active of ${t.provisionedUsers} provisioned`}>
            {t.activeUsers}/{t.provisionedUsers}
          </span>
        </div>
      </td>
      <td className="hidden px-3 py-3 text-right tabular-nums xl:table-cell">{t.distinctFeatures}</td>
      <td className="px-3 py-3 text-xs">
        <RelTime iso={t.lastActivityAt} />
      </td>
      <td className="pr-2">
        <Link href={href} aria-label={`Open ${a.tenantName}`} className="text-[var(--text-tertiary)] group-hover:text-[var(--brand-text)]">
          <ChevronRight size={16} />
        </Link>
      </td>
    </tr>
  );
}
