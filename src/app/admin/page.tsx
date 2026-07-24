"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { TrendingUp, Users, Receipt, Tag, Building2, Target } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { BranchMultiSelect } from "@/components/BranchMultiSelect";
import { BranchTrends } from "@/components/BranchTrends";
import { BranchTargetTrends } from "@/components/BranchTargetTrends";
import { EmployeeTargetTrends } from "@/components/EmployeeTargetTrends";
import { InsightsTeaser } from "@/components/InsightsTeaser";
import { PlTeaser } from "@/components/PlTeaser";
import { InventoryTeaser } from "@/components/InventoryTeaser";
import { ServiceContributionTeaser } from "@/components/ServiceContributionTeaser";
import { PageHeader, StatCard, Card, ListRow, EmptyState, selectClass, QuickAction, PageLoader } from "@/components/ui";
import { DashboardHero, EnterpriseTableShell, LabeledProgressBar } from "@/components/enterprise-ui";
import { MissionStrip } from "@/components/brand/MissionStrip";

type Period = "all" | "days60" | "month" | "week" | "today";
const PERIODS: Period[] = ["all", "days60", "month", "week", "today"];

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

export default function AdminDashboardPage() {
  const t = useTranslations("admin.dashboard");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const tPeriods = useTranslations("components.insights.periods");
  const tBrand = useTranslations("brand");
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

  const inventoryMonth = monthRange.startDate?.slice(0, 8) + "01";
  const { data: inventoryOverview, isLoading: inventoryLoading } = useQuery({
    queryKey: ["inventory-overview", inventoryMonth, selectedBranches],
    queryFn: () =>
      api.getInventoryOverview({
        month: inventoryMonth,
        branchIds:
          selectedBranches.length > 0 && selectedBranches.length < branches.length
            ? selectedBranches
            : undefined,
      }),
    enabled: initialized && selectedBranches.length > 0 && !!inventoryMonth,
  });

  if (!initialized || branchesLoading) {
    return <PageLoader label={tAdmin("loadingDashboard")} />;
  }

  if (branchesError) {
    return (
      <EmptyState
        title={t("branchesErrorTitle")}
        description={t("branchesErrorDesc")}
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("title")}
        subtitle={isFetching && !isLoading ? tAdmin("updating") : tPeriods(period)}
        action={
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className={`${selectClass} py-2.5 w-full sm:w-auto min-w-0 sm:min-w-[7rem]`}
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {tPeriods(p)}
              </option>
            ))}
          </select>
        }
      />

      <MissionStrip variant="accent" />

      <BranchMultiSelect branches={branches} selected={selectedBranches} onChange={setSelectedBranches} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <QuickAction href="/admin/employees" icon={Target} label={t("employeesQuick")} description={t("employeesQuickDesc")} />
        <QuickAction href="/admin/branches" icon={Building2} label={t("organizationQuick")} description={t("organizationQuickDesc")} />
      </div>

      {selectedBranches.length === 0 ? (
        <EmptyState title={tAdmin("selectBranch")} description={tAdmin("chooseBranches")} />
      ) : isLoading || !dashboard ? (
        <PageLoader label={tAdmin("loadingDashboard")} />
      ) : (
        <>
          <DashboardHero
            eyebrow={tBrand("taglineShort")}
            title={t("title")}
            subtitle={tPeriods(period)}
            metric={formatCurrency(dashboard.totalRevenue)}
            metricLabel={t("totalRevenue")}
            badge={
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/15 text-white text-xs font-bold border border-white/20">
                {t("visits")}: {dashboard.totalVisits}
              </span>
            }
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 xl:gap-4">
            <StatCard label={t("totalRevenue")} value={formatCurrency(dashboard.totalRevenue)} icon={TrendingUp} accent="emerald" />
            <StatCard label={t("visits")} value={dashboard.totalVisits} icon={Users} accent="brand" />
            <StatCard label={t("avgTicket")} value={formatCurrency(dashboard.avgTicketSize)} icon={Receipt} accent="violet" />
            <StatCard label={t("discounts")} value={formatCurrency(dashboard.totalDiscounts)} icon={Tag} accent="amber" />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <InsightsTeaser data={recommendations} loading={recommendationsLoading} href="/admin/insights" />
            <PlTeaser data={plSummary} loading={plLoading} href="/admin/finance" />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <InventoryTeaser data={inventoryOverview} loading={inventoryLoading} href="/admin/inventory" />
            <ServiceContributionTeaser data={serviceContribution} loading={servicesLoading} href="/admin/services" />
          </div>

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

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            <EnterpriseTableShell title={t("branchComparison")} accent="brand">
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)]/40">
                      <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)]">{tCommon("branch")}</th>
                      <th className="px-4 py-2.5 text-right text-[10px] uppercase tracking-wider font-bold text-emerald-600">{t("revenue")}</th>
                      <th className="px-4 py-2.5 text-right text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)]">{t("visits")}</th>
                      <th className="px-4 py-2.5 text-right text-[10px] uppercase tracking-wider font-bold text-violet-600">{t("avgTicket")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.branchStats.map((b, i) => (
                      <tr key={b.branchId} className={cn("border-t border-[var(--border)]", i % 2 === 1 && "bg-[var(--surface-muted)]/30")}>
                        <td className="px-4 py-2.5 font-semibold">{b.branchName}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium text-emerald-700 dark:text-emerald-400">{formatCurrency(b.revenue)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{b.visits}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-violet-700 dark:text-violet-400">{formatCurrency(b.avgTicket)}</td>
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
                    subtitle={tAdmin("visits", { count: b.visits })}
                    trailing={
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatCurrency(b.revenue)}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">{tAdmin("avg", { amount: formatCurrency(b.avgTicket) })}</p>
                      </div>
                    }
                  />
                ))}
              </div>
            </EnterpriseTableShell>

            <Card padding={false}>
              <div className="px-4 py-3.5 border-b border-[var(--border)] bg-gradient-to-r from-violet-50/80 to-indigo-50/50 dark:from-violet-950/30 dark:to-indigo-950/20">
                <h2 className="font-bold text-sm text-[var(--text-primary)]">{t("staffLeaderboard")}</h2>
              </div>
              {dashboard.topStaff.length === 0 ? (
                <EmptyState title={t("noStaffData")} description={t("noStaffDataDesc")} />
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
              <div className="px-4 py-3.5 border-b border-[var(--border)] bg-gradient-to-r from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20">
                <h2 className="font-bold text-sm text-[var(--text-primary)]">{t("paymentMix")}</h2>
              </div>
              <div className="p-4 space-y-4">
                {[
                  { label: tCommon("cash"), value: dashboard.paymentMix.cash, color: "bg-emerald-500" },
                  { label: tCommon("upi"), value: dashboard.paymentMix.upi, color: "bg-[var(--brand)]" },
                  { label: tCommon("card"), value: dashboard.paymentMix.card, color: "bg-violet-500" },
                ].map((p) => {
                  const total =
                    dashboard.paymentMix.cash + dashboard.paymentMix.upi + dashboard.paymentMix.card || 1;
                  return (
                    <LabeledProgressBar
                      key={p.label}
                      label={p.label}
                      value={p.value}
                      total={total}
                      color={p.color}
                      formatValue={formatCurrency}
                    />
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
