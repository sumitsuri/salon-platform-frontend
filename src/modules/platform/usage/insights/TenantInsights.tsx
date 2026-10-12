"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type {
  PlatformUsageAnalytics,
  UsageActivityEvent,
  UsageBranchRow,
  UsageFeatureRow,
  UsageInsightsTenant,
  UsageUserRow,
} from "@/lib/api";
import { Card } from "@/components/ui";
import { featureLabel, featurePortalLabel } from "@/modules/platform/usage/feature-labels";
import { formatCompact, HEALTH_META, roleLabel } from "@/modules/platform/usage/insights/usage-format";
import {
  DeltaChip,
  HealthBadge,
  HealthRing,
  MatrixGrid,
  MeterBar,
  RelTime,
  ScoreBreakdown,
  StackedDailyBars,
  TrendSpark,
} from "@/modules/platform/usage/insights/usage-viz";

type Tab = "overview" | "features" | "branches" | "users" | "activity";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "features", label: "Features" },
  { id: "branches", label: "Branches" },
  { id: "users", label: "Users" },
  { id: "activity", label: "Activity" },
];

type UserFilters = { userId: string; role: string; search: string };

export function TenantInsights({
  data,
  analytics,
  userFilters,
  onSelectBranch,
  periodDays,
}: {
  data: UsageInsightsTenant;
  /** Existing per-user snapshot data — supplies all-time last seen and sign-in status. */
  analytics?: PlatformUsageAnalytics;
  userFilters: UserFilters;
  onSelectBranch: (branchId: string) => void;
  /** Length of the selected period as the user sees it (the server counts whole UTC days). */
  periodDays: number;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const prevLabel = `vs previous ${periodDays} day${periodDays === 1 ? "" : "s"}`;

  return (
    <div className="min-w-0 space-y-4">
      <div role="tablist" aria-label="Usage sections" className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-lg px-4 py-1.5 text-sm font-semibold transition",
              tab === t.id ? "bg-[var(--surface)] text-[var(--brand-text)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <Overview data={data} prevLabel={prevLabel} />}
      {tab === "features" && <Features data={data} />}
      {tab === "branches" && <Branches data={data} onSelectBranch={onSelectBranch} />}
      {tab === "users" && <Users data={data} analytics={analytics} filters={userFilters} />}
      {tab === "activity" && <Activity events={data.recentActivity} />}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------- overview

function Overview({ data, prevLabel }: { data: UsageInsightsTenant; prevLabel: string }) {
  const t = data.totals;
  const findings = useMemo(() => buildFindings(data), [data]);
  return (
    <div className="space-y-4">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Account health</h2>
              <div className="mt-1">
                <HealthBadge status={data.health.status} />
              </div>
              <p className="mt-1.5 max-w-[14rem] text-xs text-[var(--text-tertiary)]">{HEALTH_META[data.health.status].hint}</p>
            </div>
            <HealthRing score={data.health.score} status={data.health.status} />
          </div>
          <ScoreBreakdown health={data.health} />
        </Card>

        <div className="grid min-w-0 grid-cols-2 gap-2 xl:grid-cols-4">
          <Metric label="Events" value={formatCompact(t.events)} current={t.events} previous={t.previousEvents} hint={prevLabel} />
          <Metric label="Active users" value={`${t.activeUsers}`} suffix={`/ ${t.provisionedUsers}`} current={t.activeUsers} previous={t.previousActiveUsers} hint={prevLabel} />
          <Metric label="Weekly / monthly" value={`${t.wau} / ${t.mau}`} hint="Active users, last 7 / 30 days" />
          <Metric label="Features used" value={String(t.distinctFeatures)} hint="Distinct features in the period" />
          <Card className="col-span-2 min-w-0 !p-3 xl:col-span-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Last activity</p>
            <p className="mt-1 text-lg font-bold">
              <RelTime iso={t.lastActivityAt} className="text-lg" />
            </p>
          </Card>
        </div>
      </div>

      {findings.length > 0 && (
        <Card className="min-w-0 space-y-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">What stands out</h2>
          <ul className="grid gap-2 md:grid-cols-2">
            {findings.map((f) => (
              <li key={f.id} className="flex items-start gap-2.5 rounded-lg bg-[var(--surface-muted)]/60 px-3 py-2 text-sm text-[var(--text-primary)]">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", f.tone === "good" ? "bg-emerald-500" : f.tone === "warn" ? "bg-amber-500" : "bg-sky-500")} aria-hidden />
                <span className="min-w-0">{f.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="min-w-0">
        <div className="mb-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Daily activity</h2>
          <p className="text-xs text-[var(--text-tertiary)]">Events per day, split by app, with active users underneath.</p>
        </div>
        <StackedDailyBars data={data.daily} />
      </Card>
    </div>
  );
}

type Finding = { id: string; tone: "good" | "warn" | "info"; text: string };

/** Turns the raw numbers into the few things a customer-success reader would flag first. */
function buildFindings(data: UsageInsightsTenant): Finding[] {
  const out: Finding[] = [];
  const t = data.totals;
  const top = data.features[0];
  if (top) out.push({ id: "top", tone: "info", text: `Most-used feature is ${featureLabel(top.featureKey)} with ${top.hits.toLocaleString()} events from ${top.uniqueUsers} user${top.uniqueUsers === 1 ? "" : "s"}.` });

  const growing = [...data.features]
    .filter((f) => f.previousHits >= 10 && f.hits > f.previousHits * 1.5)
    .sort((a, b) => b.hits / b.previousHits - a.hits / a.previousHits)[0];
  if (growing) out.push({ id: "growing", tone: "good", text: `${featureLabel(growing.featureKey)} is growing fast: ${growing.previousHits} → ${growing.hits} events.` });

  const dropping = [...data.features]
    .filter((f) => f.previousHits >= 10 && f.hits < f.previousHits * 0.5)
    .sort((a, b) => a.hits / a.previousHits - b.hits / b.previousHits)[0];
  if (dropping) out.push({ id: "dropping", tone: "warn", text: `${featureLabel(dropping.featureKey)} usage fell from ${dropping.previousHits} to ${dropping.hits} events.` });

  const silent = data.branches.filter((b) => b.provisionedUsers > 0 && b.events === 0);
  if (silent.length > 0) {
    out.push({ id: "silent", tone: "warn", text: `${silent.length} branch${silent.length === 1 ? "" : "es"} with users but no activity: ${silent.slice(0, 3).map((b) => b.branchName).join(", ")}${silent.length > 3 ? "…" : ""}.` });
  }
  const idle = data.users.filter((u) => u.active && u.events === 0).length;
  if (idle > 0) out.push({ id: "idle", tone: "warn", text: `${idle} active user${idle === 1 ? " has" : "s have"} not used the product in this period.` });

  if (t.events > 0 && t.previousEvents === 0) out.push({ id: "new", tone: "info", text: "First period with recorded activity — no earlier baseline to compare against." });
  if (t.provisionedUsers > 0 && t.activeUsers >= t.provisionedUsers) out.push({ id: "full", tone: "good", text: "Every provisioned user was active in this period." });
  return out.slice(0, 6);
}

function Metric({ label, value, suffix, current, previous, hint }: { label: string; value: string; suffix?: string; current?: number; previous?: number; hint?: string }) {
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

// ---------------------------------------------------------------------------------------------- features

function Features({ data }: { data: UsageInsightsTenant }) {
  const [showAll, setShowAll] = useState(false);
  const rows: UsageFeatureRow[] = showAll ? data.features : data.features.slice(0, 15);
  const max = Math.max(1, ...data.features.map((f) => f.hits));
  return (
    <Card className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Feature adoption</h2>
          <p className="text-xs text-[var(--text-tertiary)]">How often each feature is used, by how many people, and when it was last used.</p>
        </div>
        {data.features.length > 15 ? (
          <button type="button" className="text-xs font-semibold text-[var(--brand-text)] hover:underline" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show top 15" : `Show all ${data.features.length}`}
          </button>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--text-tertiary)]">No feature activity in this period.</p>
      ) : (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[42rem] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                <th className="px-3 py-2">Feature</th>
                <th className="px-3 py-2">Events</th>
                <th className="px-3 py-2">User reach</th>
                <th className="px-3 py-2">Trend</th>
                <th className="hidden px-3 py-2 xl:table-cell">First used</th>
                <th className="px-3 py-2">Last used</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.featureKey} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-[var(--text-primary)]" title={f.featureKey}>{featureLabel(f.featureKey)}</p>
                    {featurePortalLabel(f.featureKey) ? <p className="text-xs text-[var(--text-tertiary)]">{featurePortalLabel(f.featureKey)} app</p> : null}
                  </td>
                  <td className="w-48 px-3 py-2.5 xl:w-60">
                    <div className="flex items-center gap-2">
                      <MeterBar value={(f.hits / max) * 100} className="flex-1" />
                      <span className="w-12 shrink-0 text-right tabular-nums">{formatCompact(f.hits)}</span>
                      <DeltaChip current={f.hits} previous={f.previousHits} />
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="tabular-nums">{f.uniqueUsers}</span>{" "}
                    <span className="text-xs text-[var(--text-tertiary)]">({f.userReachPct}% of users)</span>
                  </td>
                  <td className="px-3 py-2.5"><TrendSpark values={f.trend} width={88} height={24} /></td>
                  <td className="hidden px-3 py-2.5 text-xs xl:table-cell"><RelTime iso={f.firstUsedAt} /></td>
                  <td className="px-3 py-2.5 text-xs"><RelTime iso={f.lastUsedAt} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------- branches

function Branches({ data, onSelectBranch }: { data: UsageInsightsTenant; onSelectBranch: (id: string) => void }) {
  const topKeys = useMemo(() => Array.from(new Set(data.featureBranchMatrix.map((c) => c.featureKey))), [data.featureBranchMatrix]);
  const orderedKeys = useMemo(() => {
    const rank = new Map(data.features.map((f, i) => [f.featureKey, i]));
    return [...topKeys].sort((a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99));
  }, [topKeys, data.features]);
  const columns = data.branches.map((b) => ({ id: b.branchId, label: b.branchCode || b.branchName, sub: b.branchName }));

  return (
    <div className="space-y-4">
      <Card className="min-w-0 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Branch scorecard</h2>
          <p className="text-xs text-[var(--text-tertiary)]">Select a branch to filter the whole page to it. Silent branches are listed too.</p>
        </div>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                <th className="px-3 py-2">Branch</th>
                <th className="px-3 py-2 text-right">Events</th>
                <th className="px-3 py-2">Active users</th>
                <th className="hidden px-3 py-2 text-right xl:table-cell">Features</th>
                <th className="hidden px-3 py-2 xl:table-cell">Top feature</th>
                <th className="px-3 py-2">Trend</th>
                <th className="px-3 py-2">Last active</th>
              </tr>
            </thead>
            <tbody>
              {data.branches.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-[var(--text-tertiary)]">No branches.</td></tr>
              ) : (
                data.branches.map((b) => <BranchLine key={b.branchId} b={b} onSelect={onSelectBranch} />)
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="min-w-0 space-y-2">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Which branch uses which feature</h2>
          <p className="text-xs text-[var(--text-tertiary)]">Top features by branch. Darker = more events. Hover a cell for the count and last-used time.</p>
        </div>
        <MatrixGrid features={orderedKeys} columns={columns} cells={data.featureBranchMatrix} emptyMessage="No branch-level feature activity in this period." columnHeaderTitle="Branch" />
      </Card>
    </div>
  );
}

function BranchLine({ b, onSelect }: { b: UsageBranchRow; onSelect: (id: string) => void }) {
  const pct = b.provisionedUsers > 0 ? Math.min(100, Math.round((b.activeUsers / b.provisionedUsers) * 100)) : 0;
  const silent = b.events === 0;
  return (
    <tr className={cn("border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)]/50", silent && "bg-amber-50/40 dark:bg-amber-950/10")}>
      <td className="px-3 py-3">
        <button type="button" onClick={() => onSelect(b.branchId)} className="text-left font-medium text-[var(--text-primary)] hover:text-[var(--brand-text)]">
          {b.branchName}
        </button>
        {b.branchCode ? <p className="text-xs text-[var(--text-tertiary)]">{b.branchCode}</p> : null}
      </td>
      <td className="px-3 py-3 text-right">
        <span className="tabular-nums font-medium">{formatCompact(b.events)}</span> <DeltaChip current={b.events} previous={b.previousEvents} />
      </td>
      <td className="w-36 px-3 py-3 xl:w-44">
        <div className="flex items-center gap-2">
          <MeterBar value={pct} className="flex-1" />
          <span className="w-12 shrink-0 text-right text-xs tabular-nums text-[var(--text-secondary)]">{b.activeUsers}/{b.provisionedUsers}</span>
        </div>
      </td>
      <td className="hidden px-3 py-3 text-right tabular-nums xl:table-cell">{b.distinctFeatures}</td>
      <td className="hidden px-3 py-3 text-xs text-[var(--text-secondary)] xl:table-cell">{b.topFeatureKey ? featureLabel(b.topFeatureKey) : "—"}</td>
      <td className="px-3 py-3"><TrendSpark values={b.trend} width={88} height={24} /></td>
      <td className="px-3 py-3 text-xs"><RelTime iso={b.lastActivityAt} /></td>
    </tr>
  );
}

// ---------------------------------------------------------------------------------------------- users

function Users({ data, analytics, filters }: { data: UsageInsightsTenant; analytics?: PlatformUsageAnalytics; filters: UserFilters }) {
  const snapshot = useMemo(() => new Map((analytics?.users ?? []).map((u) => [u.userId, u])), [analytics?.users]);
  const rows = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return data.users.filter(
      (u) =>
        (!filters.userId || u.userId === filters.userId) &&
        (!filters.role || u.role === filters.role) &&
        (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
    );
  }, [data.users, filters]);

  const topKeys = useMemo(() => {
    const rank = new Map(data.features.map((f, i) => [f.featureKey, i]));
    return Array.from(new Set(data.featureUserMatrix.map((c) => c.featureKey))).sort((a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99));
  }, [data.featureUserMatrix, data.features]);
  const matrixColumns = useMemo(() => {
    const ids = new Set(data.featureUserMatrix.map((c) => c.columnId));
    return data.users.filter((u) => ids.has(u.userId)).map((u) => ({ id: u.userId, label: u.name.split(" ")[0], sub: `${u.name} · ${roleLabel(u.role)}` }));
  }, [data.featureUserMatrix, data.users]);

  return (
    <div className="space-y-4">
      <Card className="min-w-0 space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">User activity</h2>
            <p className="text-xs text-[var(--text-tertiary)]">Most active first. “Last seen” covers all time, not just this period.</p>
          </div>
          <span className="text-xs tabular-nums text-[var(--text-tertiary)]">{rows.length} user{rows.length === 1 ? "" : "s"}</span>
        </div>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Branch</th>
                <th className="px-3 py-2 text-right">Events</th>
                <th className="px-3 py-2 text-right">Features</th>
                <th className="hidden px-3 py-2 text-right xl:table-cell">Active days</th>
                <th className="hidden px-3 py-2 xl:table-cell">Top feature</th>
                <th className="px-3 py-2">Trend</th>
                <th className="px-3 py-2">Last seen</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-10 text-center text-sm text-[var(--text-tertiary)]">No users match these filters.</td></tr>
              ) : (
                rows.map((u) => <UserLine key={u.userId} u={u} snap={snapshot.get(u.userId)} />)
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="min-w-0 space-y-2">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Which people use which feature</h2>
          <p className="text-xs text-[var(--text-tertiary)]">Top features × most active users. Hover a cell for the count and last-used time.</p>
        </div>
        <MatrixGrid features={topKeys} columns={matrixColumns} cells={data.featureUserMatrix} emptyMessage="No user-level feature activity in this period." columnHeaderTitle="User" />
      </Card>
    </div>
  );
}

function UserLine({ u, snap }: { u: UsageUserRow; snap?: PlatformUsageAnalytics["users"][number] }) {
  const lastSeen = [u.lastSeenAt, snap?.lastSeenAt].filter(Boolean).sort().pop() ?? null;
  const ever = (snap?.everLoggedIn ?? false) || u.events > 0;
  return (
    <tr className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)]/50">
      <td className="px-3 py-3">
        <p className="font-medium text-[var(--text-primary)]">{u.name}</p>
        <p className="text-xs text-[var(--text-tertiary)]">{roleLabel(u.role)} · {u.email}</p>
      </td>
      <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">{u.branchName ?? "—"}</td>
      <td className="px-3 py-3 text-right"><span className="tabular-nums font-medium">{formatCompact(u.events)}</span> <DeltaChip current={u.events} previous={u.previousEvents} /></td>
      <td className="px-3 py-3 text-right tabular-nums">{u.featuresUsed}</td>
      <td className="hidden px-3 py-3 text-right tabular-nums xl:table-cell">{u.activeDays}</td>
      <td className="hidden px-3 py-3 text-xs text-[var(--text-secondary)] xl:table-cell">{u.topFeatureKey ? featureLabel(u.topFeatureKey) : "—"}</td>
      <td className="px-3 py-3">{u.trend.length > 0 ? <TrendSpark values={u.trend} width={80} height={22} /> : <span className="text-xs text-[var(--text-tertiary)]">—</span>}</td>
      <td className="px-3 py-3 text-xs"><RelTime iso={lastSeen} /></td>
      <td className="px-3 py-3 text-xs font-medium">
        {!ever ? <span className="text-amber-700 dark:text-amber-400">Never signed in</span>
          : !u.active ? <span className="text-[var(--text-tertiary)]">Inactive</span>
          : u.events === 0 ? <span className="text-amber-700 dark:text-amber-400">Idle this period</span>
          : <span className="text-emerald-700 dark:text-emerald-400">Active</span>}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------------------------- activity

function Activity({ events }: { events: UsageActivityEvent[] }) {
  const grouped = useMemo(() => {
    const m = new Map<string, UsageActivityEvent[]>();
    for (const e of events) {
      const day = new Date(e.occurredAt).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
      m.set(day, [...(m.get(day) ?? []), e]);
    }
    return [...m.entries()];
  }, [events]);

  return (
    <Card className="min-w-0 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent activity</h2>
        <p className="text-xs text-[var(--text-tertiary)]">Latest {events.length} events in the selected period — who did what, where and when.</p>
      </div>
      {grouped.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--text-tertiary)]">No activity in this period.</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(([day, list]) => (
            <section key={day}>
              <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{day}</h3>
              <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
                {list.map((e, i) => (
                  <li key={`${e.occurredAt}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                    <span className="w-16 shrink-0 text-xs tabular-nums text-[var(--text-tertiary)]">
                      {new Date(e.occurredAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-[var(--text-primary)]">{e.userName ?? "Unknown user"}</span>{" "}
                      <span className="text-[var(--text-secondary)]">used</span>{" "}
                      <span className="font-medium text-[var(--text-primary)]" title={e.featureKey}>{featureLabel(e.featureKey)}</span>
                    </span>
                    <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">{roleLabel(e.role)}</span>
                    {e.branchName ? <span className="text-xs text-[var(--text-tertiary)]">{e.branchName}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}
