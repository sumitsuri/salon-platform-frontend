"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  TrendingUp,
  Trophy,
  FlaskConical,
  IndianRupee,
  Users,
  UserPlus,
  Percent,
  ArrowRight,
  BadgeCheck,
} from "lucide-react";
import { PlatformOverview, RepPerformance } from "@/modules/sales/api/salesApi";
import { formatMonthlyRevenue } from "@/modules/sales/lib/pricing";
import { StatCard, Card, ListRow } from "@/components/ui";

interface PlatformOverviewDashboardProps {
  overview: PlatformOverview;
  periodLabel: string;
  repLabel: string;
}

const quickLinkClass =
  "inline-flex w-full items-center justify-center rounded-lg border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium transition hover:border-[var(--brand-ring)] hover:bg-[var(--brand-light)] sm:w-auto touch-manipulation";

function formatWinRate(wonCount: number, lostCount: number): string {
  const closed = wonCount + lostCount;
  if (closed <= 0) return "—";
  return `${Math.round((wonCount / closed) * 100)}%`;
}

export function PlatformOverviewDashboard({
  overview,
  periodLabel,
  repLabel,
}: PlatformOverviewDashboardProps) {
  const summary = overview.periodSummary;
  const winRate = formatWinRate(summary.wonCount, summary.lostCount);
  const periodRepSuffix = repLabel !== "All reps" ? ` · ${repLabel}` : "";

  return (
    <div className="space-y-6">
      {/* Quick navigation */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link href="/platform/sales" className={quickLinkClass}>
          Open sales pipeline
        </Link>
        <Link href="/platform" className={quickLinkClass}>
          Manage tenants
        </Link>
      </div>

      {/* Platform health — stock metrics (no overlap with period row) */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)] break-words">
          Platform health · all time
        </p>
        <div
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          data-testid="platform-overview-widgets"
        >
          <StatCard
            label="Total customers"
            value={overview.totalCustomersAllTime}
            icon={Building2}
            accent="brand"
            trend="All time"
          />
          <StatCard
            label="Active customers"
            value={overview.activeCustomers}
            icon={BadgeCheck}
            accent="emerald"
            trend={`${overview.trialCustomers} on trial`}
          />
          <StatCard
            label="Booked MRR"
            value={formatMonthlyRevenue(overview.totalRevenueWonAllTime)}
            icon={IndianRupee}
            accent="emerald"
            trend="Won revenue · monthly equivalent"
          />
          <StatCard
            label="Trials at risk"
            value={overview.freeTrialNotWon}
            icon={FlaskConical}
            accent="amber"
            trend="Free trials not yet won"
          />
        </div>
      </div>

      {/* Period activity — flow metrics */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)] break-words">
          In selected period · {periodLabel}
          {periodRepSuffix}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="New customers"
            value={overview.customersAcquiredInPeriod}
            icon={UserPlus}
            accent="emerald"
            trend="Won conversions in period"
          />
          <StatCard
            label="Pipeline leads"
            value={summary.totalLeads}
            icon={Users}
            accent="brand"
            trend={`${summary.otherCount} still open`}
          />
          <StatCard
            label="Wins"
            value={summary.wonCount}
            icon={Trophy}
            accent="emerald"
            trend={formatMonthlyRevenue(summary.wonRevenue)}
          />
          <StatCard
            label="Win rate"
            value={winRate}
            icon={Percent}
            accent="brand"
            trend={`${summary.lostCount} lost · ${formatMonthlyRevenue(summary.lostRevenue)} left on table`}
          />
        </div>
      </div>

      {/* Rep trend */}
      <Card className="p-4 sm:p-5" padding={false}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-4 pt-4 sm:px-5 sm:pt-5">
          <h3 className="font-semibold">Sales rep performance</h3>
          <Link
            href="/platform/sales/team"
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-text)] hover:underline touch-manipulation"
          >
            Manage team <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <RepSalesTrendTable reps={overview.repTrend} periodLabel={periodLabel} />
      </Card>
    </div>
  );
}

function sortRepsByRevenue(reps: RepPerformance[]) {
  return [...reps].sort((a, b) => (b.revenueWon ?? 0) - (a.revenueWon ?? 0));
}

export function RepSalesTrendTable({
  reps,
  periodLabel,
}: {
  reps: PlatformOverview["repTrend"];
  periodLabel: string;
}) {
  const ranked = useMemo(() => sortRepsByRevenue(reps), [reps]);

  if (ranked.length === 0) {
    return (
      <p className="px-4 pb-4 text-sm text-[var(--ink-muted)] sm:px-5">
        No rep activity in this period.
      </p>
    );
  }

  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden md:block responsive-table-wrap px-4 pb-4 sm:px-5">
        <table className="w-full min-w-[640px] text-left text-sm" data-testid="rep-sales-trend">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--ink-muted)]">
              <th className="py-2 pr-4 font-medium">Rank</th>
              <th className="py-2 pr-4 font-medium">Rep</th>
              <th className="py-2 pr-4 font-medium">Revenue</th>
              <th className="py-2 pr-4 font-medium">Leads</th>
              <th className="py-2 pr-4 font-medium">Visits</th>
              <th className="py-2 pr-4 font-medium">Wins</th>
              <th className="py-2 pr-4 font-medium">Lost</th>
              <th className="py-2 font-medium">Target %</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p, index) => (
              <RepTrendTableRow key={p.repId} p={p} rank={index + 1} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-[var(--border)] md:hidden" data-testid="rep-sales-trend-mobile">
        {ranked.map((p, index) => (
          <ListRow
            key={p.repId}
            title={`#${index + 1} ${p.repName}`}
            subtitle={`${p.leadsAdded} leads · ${p.visits} visits · ${p.conversions} wins · ${p.lost ?? 0} lost`}
            trailing={
              <div className="text-right">
                <p
                  className="text-sm font-bold text-emerald-700 tabular-nums"
                  data-testid={`rep-revenue-${p.repId}`}
                >
                  {formatMonthlyRevenue(p.revenueWon ?? 0)}
                </p>
                <p className="text-xs text-[var(--ink-muted)] tabular-nums">
                  {p.targetAchievementPercent.toFixed(0)}% target
                </p>
              </div>
            }
          />
        ))}
      </div>

      <p className="px-4 pb-4 text-xs text-[var(--ink-muted)] sm:px-5">
        Ranked by revenue won · {periodLabel}
      </p>
    </>
  );
}

function RepTrendTableRow({ p, rank }: { p: RepPerformance; rank: number }) {
  return (
    <tr className="border-b border-[var(--border)]">
      <td className="py-2.5 pr-4 tabular-nums font-medium text-[var(--brand-text)]">#{rank}</td>
      <td className="py-2.5 pr-4 font-medium">{p.repName}</td>
      <td
        className="py-2.5 pr-4 tabular-nums font-medium text-emerald-700"
        data-testid={`rep-revenue-${p.repId}`}
      >
        {formatMonthlyRevenue(p.revenueWon ?? 0)}
      </td>
      <td className="py-2.5 pr-4 tabular-nums">{p.leadsAdded}</td>
      <td className="py-2.5 pr-4 tabular-nums">{p.visits}</td>
      <td className="py-2.5 pr-4 tabular-nums text-emerald-700">{p.conversions}</td>
      <td className="py-2.5 pr-4 tabular-nums text-red-600">{p.lost ?? 0}</td>
      <td className="py-2.5 tabular-nums">
        <span className="inline-flex items-center gap-1">
          <TrendingUp className="h-3.5 w-3.5 text-[var(--brand-text)]" />
          {p.targetAchievementPercent.toFixed(0)}%
        </span>
      </td>
    </tr>
  );
}
