"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Users, Receipt, Tag, Building2, Target } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { BranchMultiSelect } from "@/components/BranchMultiSelect";
import { BranchTrends } from "@/components/BranchTrends";
import { BranchTargetTrends } from "@/components/BranchTargetTrends";
import { EmployeeTargetTrends } from "@/components/EmployeeTargetTrends";
import { InsightsTeaser } from "@/components/InsightsTeaser";
import { PlTeaser } from "@/components/PlTeaser";
import { ServiceContributionTeaser } from "@/components/ServiceContributionTeaser";
import { PageHeader, StatCard, Card, ListRow, EmptyState, selectClass, QuickAction } from "@/components/ui";

type Period = "all" | "days60" | "month" | "week" | "today";

function periodToRange(period: Period): { startDate?: string; endDate?: string } {
  if (period === "all") return {};
  const today = new Date();
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (period === "today") return { startDate: fmt(today), endDate: fmt(today) };
  if (period === "week") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { startDate: fmt(start), endDate: fmt(today) };
  }
  if (period === "days60") {
    const start = new Date(today);
    start.setDate(start.getDate() - 59);
    return { startDate: fmt(start), endDate: fmt(today) };
  }
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return { startDate: fmt(start), endDate: fmt(today) };
}

const PERIOD_LABELS: Record<Period, string> = {
  all: "All time",
  days60: "Last 60 days",
  month: "This month",
  week: "Last 7 days",
  today: "Today",
};

export default function AdminDashboardPage() {
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [period, setPeriod] = useState<Period>("days60");
  const [initialized, setInitialized] = useState(false);

  const { data: branches = [], isLoading: branchesLoading, isError: branchesError } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.getBranches(),
    retry: 2,
  });

  useEffect(() => {
    if (branchesLoading) return;
    if (!initialized) {
      if (branches.length > 0) {
        setSelectedBranches(branches.map((b) => b.id));
      }
      setInitialized(true);
    }
  }, [branches, branchesLoading, initialized]);

  const dateRange = periodToRange(period);

  const { data: dashboard, isLoading, isFetching } = useQuery({
    queryKey: ["dashboard", selectedBranches, period],
    queryFn: () =>
      api.getDashboard({
        ...dateRange,
        branchIds:
          selectedBranches.length > 0 && selectedBranches.length < branches.length
            ? selectedBranches
            : undefined,
      }),
    enabled: initialized && selectedBranches.length > 0,
  });

  const { data: recommendations, isLoading: recommendationsLoading } = useQuery({
    queryKey: ["recommendations", selectedBranches, period],
    queryFn: () =>
      api.getRecommendations({
        ...dateRange,
        branchIds:
          selectedBranches.length > 0 && selectedBranches.length < branches.length
            ? selectedBranches
            : undefined,
      }),
    enabled: initialized && selectedBranches.length > 0,
  });

  const { data: serviceContribution, isLoading: servicesLoading } = useQuery({
    queryKey: ["service-contribution", selectedBranches, period],
    queryFn: () =>
      api.getServiceContribution({
        ...dateRange,
        branchIds:
          selectedBranches.length > 0 && selectedBranches.length < branches.length
            ? selectedBranches
            : undefined,
      }),
    enabled: initialized && selectedBranches.length > 0,
  });

  const monthRange = period === "month" || period === "today" || period === "week"
    ? dateRange
    : periodToRange("month");

  const { data: staffTargetTrends, isLoading: staffTrendsLoading } = useQuery({
    queryKey: ["staff-target-trends", selectedBranches, monthRange.startDate, monthRange.endDate],
    queryFn: () =>
      api.getStaffTargetTrends({
        startDate: monthRange.startDate,
        endDate: monthRange.endDate,
        branchIds:
          selectedBranches.length > 0 && selectedBranches.length < branches.length
            ? selectedBranches
            : undefined,
      }),
    enabled: initialized && selectedBranches.length > 0,
  });

  const { data: branchTargetTrends, isLoading: branchTrendsLoading } = useQuery({
    queryKey: ["branch-target-trends", selectedBranches, monthRange.startDate, monthRange.endDate],
    queryFn: () =>
      api.getBranchTargetTrends({
        startDate: monthRange.startDate,
        endDate: monthRange.endDate,
        branchIds:
          selectedBranches.length > 0 && selectedBranches.length < branches.length
            ? selectedBranches
            : undefined,
      }),
    enabled: initialized && selectedBranches.length > 0,
  });

  const { data: plSummary, isLoading: plLoading } = useQuery({
    queryKey: ["pl-summary", selectedBranches, monthRange.startDate, monthRange.endDate],
    queryFn: () =>
      api.getPlSummary({
        startDate: monthRange.startDate,
        endDate: monthRange.endDate,
        branchIds:
          selectedBranches.length > 0 && selectedBranches.length < branches.length
            ? selectedBranches
            : undefined,
      }),
    enabled: initialized && selectedBranches.length > 0,
  });

  if (!initialized || branchesLoading) {
    return <p className="text-[var(--text-tertiary)] text-sm py-8 text-center">Loading dashboard...</p>;
  }

  if (branchesError) {
    return (
      <EmptyState
        title="Could not load branches"
        description="Check that the backend is running and try refreshing the page."
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="CEO Dashboard"
        subtitle={isFetching && !isLoading ? "Updating..." : PERIOD_LABELS[period]}
        action={
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className={`${selectClass} py-2.5 w-full sm:w-auto min-w-0 sm:min-w-[7rem]`}
          >
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABELS[p]}
              </option>
            ))}
          </select>
        }
      />

      <BranchMultiSelect branches={branches} selected={selectedBranches} onChange={setSelectedBranches} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <QuickAction href="/admin/employees" icon={Target} label="Employees" description="Targets & incentives" />
        <QuickAction href="/admin/branches" icon={Building2} label="Organization" description="Branches & managers" />
      </div>

      {selectedBranches.length === 0 ? (
        <EmptyState title="Select at least one branch" description="Choose branches above to view analytics" />
      ) : isLoading || !dashboard ? (
        <p className="text-[var(--text-tertiary)] text-sm py-8 text-center">Loading dashboard...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total Revenue" value={formatCurrency(dashboard.totalRevenue)} icon={TrendingUp} accent="emerald" />
            <StatCard label="Visits" value={dashboard.totalVisits} icon={Users} accent="brand" />
            <StatCard label="Avg Ticket" value={formatCurrency(dashboard.avgTicketSize)} icon={Receipt} accent="violet" />
            <StatCard label="Discounts" value={formatCurrency(dashboard.totalDiscounts)} icon={Tag} accent="amber" className="col-span-2 lg:col-span-1" />
          </div>

          <InsightsTeaser data={recommendations} loading={recommendationsLoading} href="/admin/insights" />

          <PlTeaser data={plSummary} loading={plLoading} href="/admin/finance" />

          <ServiceContributionTeaser data={serviceContribution} loading={servicesLoading} href="/admin/services" />

          {dashboard.branchTrends && dashboard.branchTrends.length > 0 && (
            <BranchTrends trends={dashboard.branchTrends} />
          )}

          {!branchTrendsLoading && branchTargetTrends && branchTargetTrends.branches.length > 0 && (
            <BranchTargetTrends
              branches={branchTargetTrends.branches}
              periodLabel={branchTargetTrends.periodLabel}
            />
          )}

          {!staffTrendsLoading && staffTargetTrends && staffTargetTrends.branches.length > 0 && (
            <EmployeeTargetTrends
              branches={staffTargetTrends.branches}
              periodLabel={staffTargetTrends.periodLabel}
              compact
            />
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <Card padding={false}>
              <div className="px-4 py-3.5 border-b border-[var(--border)]">
                <h2 className="font-semibold text-sm text-[var(--text-primary)]">Branch comparison</h2>
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--text-secondary)] border-b border-[var(--border)]">
                      <th className="px-4 py-2 font-medium">Branch</th>
                      <th className="px-4 py-2 font-medium">Revenue</th>
                      <th className="px-4 py-2 font-medium">Visits</th>
                      <th className="px-4 py-2 font-medium">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.branchStats.map((b) => (
                      <tr key={b.branchId} className="border-t border-[var(--border)]">
                        <td className="px-4 py-2.5 font-medium">{b.branchName}</td>
                        <td className="px-4 py-2.5">{formatCurrency(b.revenue)}</td>
                        <td className="px-4 py-2.5">{b.visits}</td>
                        <td className="px-4 py-2.5">{formatCurrency(b.avgTicket)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-[var(--border)]">
                {dashboard.branchStats.map((b) => (
                  <ListRow
                    key={b.branchId}
                    title={b.branchName}
                    subtitle={`${b.visits} visits`}
                    trailing={
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatCurrency(b.revenue)}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">avg {formatCurrency(b.avgTicket)}</p>
                      </div>
                    }
                  />
                ))}
              </div>
            </Card>

            <Card padding={false}>
              <div className="px-4 py-3.5 border-b border-[var(--border)]">
                <h2 className="font-semibold text-sm text-[var(--text-primary)]">Staff leaderboard</h2>
              </div>
              {dashboard.topStaff.length === 0 ? (
                <EmptyState title="No staff data" description="For selected branches in this period" />
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {dashboard.topStaff.map((s, i) => (
                    <ListRow
                      key={s.staffId}
                      title={`${i + 1}. ${s.staffName}`}
                      subtitle={s.branchName}
                      trailing={<span className="text-sm font-bold text-[var(--brand-text)]">{formatCurrency(s.revenue)}</span>}
                    />
                  ))}
                </div>
              )}
            </Card>

            <Card padding={false}>
              <div className="px-4 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
                <h2 className="font-semibold text-sm text-[var(--text-primary)]">Payment mix</h2>
              </div>
              <div className="p-4 space-y-3">
                {[
                  { label: "Cash", value: dashboard.paymentMix.cash, color: "bg-emerald-500" },
                  { label: "UPI", value: dashboard.paymentMix.upi, color: "bg-[var(--brand)]" },
                  { label: "Card", value: dashboard.paymentMix.card, color: "bg-violet-500" },
                ].map((p) => {
                  const total =
                    dashboard.paymentMix.cash + dashboard.paymentMix.upi + dashboard.paymentMix.card || 1;
                  const pct = Math.round((p.value / total) * 100);
                  return (
                    <div key={p.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[var(--text-secondary)]">{p.label}</span>
                        <span className="font-semibold">{formatCurrency(p.value)}</span>
                      </div>
                      <div className="h-2 bg-[var(--surface-muted)] rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", p.color)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
