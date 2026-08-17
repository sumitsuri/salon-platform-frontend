"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Building2, Target } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { BranchMultiSelect } from "@/components/BranchMultiSelect";
import { BranchTrends } from "@/components/BranchTrends";
import { BranchTargetTrends } from "@/components/BranchTargetTrends";
import { EmployeeTargetTrends } from "@/components/EmployeeTargetTrends";
import { InsightsTeaser } from "@/components/InsightsTeaser";
import { PlTeaser } from "@/components/PlTeaser";
import { InventoryTeaser } from "@/components/InventoryTeaser";
import { ServiceContributionTeaser } from "@/components/ServiceContributionTeaser";
import { Card, ListRow, EmptyState, PageLoader } from "@/components/ui";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { ProductDateRange, dashboardSecondaryRange, getTodayRange, resolveProductDateRange } from "@/lib/date-range";
import { insightPeriodToRange } from "@/lib/insights-utils";
import { adminBookingsPath } from "@/lib/navigation-scope";
import {
  DashboardCommandBar,
  DashboardQuickLink,
  DashboardKpiStrip,
  DashboardBranchPerformance,
  DashboardOverviewPanel,
  LabeledProgressBar,
} from "@/components/enterprise-ui";

export default function AdminDashboardPage() {
  const t = useTranslations("admin.dashboard");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<ProductDateRange>(() => ({
    preset: "today",
    ...getTodayRange(),
  }));
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

  const apiRange = insightPeriodToRange(dateRange);

  const { data: dashboard, isLoading, isFetching } = useQuery({
    queryKey: ["dashboard", selectedBranches, dateRange.preset, dateRange.from, dateRange.to],
    queryFn: () =>
      api.getDashboard({
        ...apiRange,
        branchIds:
          selectedBranches.length > 0 && selectedBranches.length < branches.length
            ? selectedBranches
            : undefined,
      }),
    enabled: initialized && selectedBranches.length > 0,
  });

  const { data: recommendations, isLoading: recommendationsLoading } = useQuery({
    queryKey: ["recommendations", selectedBranches, dateRange.preset, dateRange.from, dateRange.to],
    queryFn: () =>
      api.getRecommendations({
        ...apiRange,
        branchIds:
          selectedBranches.length > 0 && selectedBranches.length < branches.length
            ? selectedBranches
            : undefined,
      }),
    enabled: initialized && selectedBranches.length > 0,
  });

  const { data: serviceContribution, isLoading: servicesLoading } = useQuery({
    queryKey: ["service-contribution", selectedBranches, dateRange.preset, dateRange.from, dateRange.to],
    queryFn: () =>
      api.getServiceContribution({
        ...apiRange,
        branchIds:
          selectedBranches.length > 0 && selectedBranches.length < branches.length
            ? selectedBranches
            : undefined,
      }),
    enabled: initialized && selectedBranches.length > 0,
  });

  const monthRange = dashboardSecondaryRange(dateRange);

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

  const periodSubtitle = isFetching && !isLoading ? tAdmin("updating") : undefined;

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
    <div className="page-stack space-y-4">
      <DashboardOverviewPanel>
        <DashboardCommandBar
          eyebrow={t("overviewEyebrow")}
          title={t("title")}
          subtitle={periodSubtitle}
          action={
            <DateRangeSelector value={dateRange} onChange={setDateRange} testId="admin-dashboard-date-range" />
          }
          filters={
            <BranchMultiSelect branches={branches} selected={selectedBranches} onChange={setSelectedBranches} />
          }
          links={
            <>
              <DashboardQuickLink href="/admin/employees" icon={Target} label={t("employeesQuick")} />
              <DashboardQuickLink href="/admin/branches" icon={Building2} label={t("organizationQuick")} />
            </>
          }
        />

        {selectedBranches.length === 0 ? null : isLoading || !dashboard ? (
          <>
            <DashboardKpiStrip
              loading
              headerLabel={t("keyMetricsLabel")}
              items={[
                { label: t("totalRevenue"), value: "…" },
                { label: t("visits"), value: "…" },
                { label: t("avgTicket"), value: "…" },
                { label: t("discounts"), value: "…" },
              ]}
            />
            <DashboardBranchPerformance
              loading
              headerLabel={t("branchPerformance")}
              branches={[]}
              labels={{
                branch: tCommon("branch"),
                revenue: t("revenue"),
                visits: t("visits"),
                avgTicket: t("avgTicket"),
                discounts: t("discounts"),
              }}
              formatValue={formatCurrency}
            />
          </>
        ) : (
          <>
            <DashboardKpiStrip
              headerLabel={t("keyMetricsLabel")}
              items={[
                { label: t("totalRevenue"), value: formatCurrency(dashboard.totalRevenue) },
                { label: t("visits"), value: dashboard.totalVisits },
                { label: t("avgTicket"), value: formatCurrency(dashboard.avgTicketSize) },
                { label: t("discounts"), value: formatCurrency(dashboard.totalDiscounts) },
              ]}
            />
            {dashboard.branchStats.length > 0 && (
              <DashboardBranchPerformance
                headerLabel={t("branchPerformance")}
                branches={dashboard.branchStats.map((b) => ({
                  branchId: b.branchId,
                  branchName: b.branchName,
                  revenue: b.revenue,
                  visits: b.visits,
                  avgTicket: b.avgTicket,
                  discountAmount: b.discountAmount ?? 0,
                }))}
                labels={{
                  branch: tCommon("branch"),
                  revenue: t("revenue"),
                  visits: t("visits"),
                  avgTicket: t("avgTicket"),
                  discounts: t("discounts"),
                }}
                formatValue={formatCurrency}
                branchHref={(b) =>
                  adminBookingsPath({
                    branchId: b.branchId,
                    branchName: b.branchName,
                    dateRange: resolveProductDateRange(dateRange),
                  })
                }
              />
            )}
          </>
        )}
      </DashboardOverviewPanel>

      {selectedBranches.length === 0 ? (
        <EmptyState title={tAdmin("selectBranch")} description={tAdmin("chooseBranches")} />
      ) : isLoading || !dashboard ? null : (
        <>
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

          <div className="grid gap-4 md:grid-cols-2 min-w-0">
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
                      trailing={<span className="text-xs sm:text-sm font-bold text-[var(--brand-text)] tabular-nums truncate">{formatCurrency(s.revenue)}</span>}
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
                  { label: tCommon("card"), value: dashboard.paymentMix.card, color: "bg-[var(--brand)]" },
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
