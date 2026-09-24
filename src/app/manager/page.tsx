"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  TrendingUp,
  Users,
  Fingerprint,
  ClipboardList,
  CalendarClock,
  CreditCard,
  Receipt,
  BarChart3,
  Sparkles,
  ChevronRight,
  Warehouse,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency, cn } from "@/lib/utils";
import { staffSalesRowsFromAnalytics } from "@/lib/staff-sales-rows";
import { InsightsTeaser } from "@/components/InsightsTeaser";
import { ServiceContributionTeaser } from "@/components/ServiceContributionTeaser";
import { ServiceSalesTeaser } from "@/components/ServiceSalesTeaser";
import { StaffPromoSalesTeaser } from "@/components/StaffPromoSalesTeaser";
import { ManagerHomeFloorActions } from "@/components/manager/ManagerHomeFloorActions";
import { ManagerHomeGlanceSection } from "@/components/manager/ManagerHomeGlanceSection";
import { ScopeFilterBar } from "@/components/ScopeFilterBar";
import { insightPeriodToRange } from "@/lib/insights-utils";
import {
  getLast30DaysRange,
  todayIsoDate,
  type ProductDateRange,
} from "@/lib/date-range";
import { Card } from "@/components/ui";
import { DashboardEmployeeSales, DashboardWidgetCard } from "@/components/enterprise-ui";

function managerDateRange(): ProductDateRange {
  return { preset: "last_30_days", ...getLast30DaysRange() };
}

function PeriodMetricCell({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  accent: "emerald" | "brand" | "violet";
}) {
  const styles = {
    emerald: {
      cell: "border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/25",
      icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
    },
    brand: {
      cell: "border-[var(--brand-muted)] bg-[var(--brand-light)]/50",
      icon: "bg-[var(--brand)] text-[var(--brand-on-brand)]",
    },
    violet: {
      cell: "border-violet-100 bg-violet-50/50 dark:border-violet-900/50 dark:bg-violet-950/25",
      icon: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300",
    },
  };
  const s = styles[accent];
  return (
    <div className={cn("flex items-center gap-2.5 rounded-xl border p-3 min-h-[4.5rem] w-full min-w-0 shadow-sm", s.cell)}>
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm", s.icon)}>
        <Icon className="w-4 h-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-[var(--text-secondary)] truncate heading-case">{label}</p>
        <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)] truncate mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function QuickNavChip({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof CalendarClock;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-xs font-semibold text-[var(--text-primary)] shadow-sm transition hover:border-[var(--brand)]/40 hover:bg-[var(--brand-light)]/30 active:scale-[0.98] touch-manipulation min-h-9"
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--brand-text)]" aria-hidden />
      {label}
    </Link>
  );
}

export default function ManagerHomePage() {
  const t = useTranslations("manager.home");
  const tNav = useTranslations("manager.nav");
  const tDash = useTranslations("admin.dashboard");
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branchId || "";
  const today = todayIsoDate();
  const todayRange = useMemo(() => ({ startDate: today, endDate: today }), [today]);

  const [dateRange, setDateRange] = useState<ProductDateRange>(managerDateRange);
  const apiRange = insightPeriodToRange(dateRange);
  const branchFilter = branchId ? [branchId] : undefined;

  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ["bookings-today", branchId, today],
    queryFn: () =>
      api.getBookings({
        branchId,
        dateFrom: today,
        dateTo: today,
        page: 0,
        size: 200,
      }),
    enabled: !!branchId,
  });

  const { data: todayStaffSales, isLoading: todayStaffSalesLoading } = useQuery({
    queryKey: ["staff-sales-today", branchId, today],
    queryFn: () =>
      api.getStaffSalesPerformance({
        ...todayRange,
        branchIds: branchFilter,
      }),
    enabled: !!branchId,
  });

  const { data: todayServiceContribution, isLoading: todayServicesLoading } = useQuery({
    queryKey: ["service-contribution-today", branchId, today],
    queryFn: () =>
      api.getServiceContribution({
        ...todayRange,
        branchIds: branchFilter,
      }),
    enabled: !!branchId,
  });

  const { data: staffPromoSales, isLoading: staffPromoLoading } = useQuery({
    queryKey: ["staff-promo-sales", branchId, today],
    queryFn: () =>
      api.getStaffPromoSales({
        date: today,
        branchIds: branchFilter,
      }),
    enabled: !!branchId,
  });

  const todayBookings = todayData?.content ?? [];
  const inProgress = todayBookings.filter((b) => b.status !== "COMPLETED" && b.status !== "CANCELLED");

  const {
    data: periodDashboard,
    isLoading: periodLoading,
    isError: periodError,
    isFetching: periodFetching,
  } = useQuery({
    queryKey: ["manager-dashboard", branchId, dateRange.preset, dateRange.from, dateRange.to],
    queryFn: () =>
      api.getDashboard({
        ...apiRange,
        branchIds: branchFilter,
      }),
    enabled: !!branchId,
  });

  const { data: recommendations, isLoading: recommendationsLoading } = useQuery({
    queryKey: ["recommendations", branchId, dateRange.preset, dateRange.from, dateRange.to],
    queryFn: () =>
      api.getRecommendations({
        ...apiRange,
        branchIds: branchFilter,
      }),
    enabled: !!branchId,
  });

  const { data: serviceContribution, isLoading: servicesLoading } = useQuery({
    queryKey: ["service-contribution", branchId, dateRange.preset, dateRange.from, dateRange.to],
    queryFn: () =>
      api.getServiceContribution({
        ...apiRange,
        branchIds: branchFilter,
      }),
    enabled: !!branchId,
  });

  const todayEmployeeSales = useMemo(
    () => staffSalesRowsFromAnalytics(todayStaffSales?.staff ?? []),
    [todayStaffSales]
  );

  const periodReady = !!periodDashboard && !periodLoading;
  const periodSummaryLoading = (periodLoading || periodFetching) && !periodDashboard;

  return (
    <div className="mx-auto min-w-0 w-full max-w-6xl space-y-3 overflow-x-clip">
      <ManagerHomeFloorActions />

      {branchId ? <ManagerHomeGlanceSection branchId={branchId} /> : null}

      {inProgress.length > 0 ? (
        <Link
          href="/manager/walk-in"
          className="flex items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-sm font-semibold text-amber-950 shadow-sm touch-manipulation dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100"
        >
          <span>{t("openWalkInsBanner", { count: inProgress.length })}</span>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
        </Link>
      ) : null}

      <div className="hidden md:block">
        <InsightsTeaser
          data={recommendations}
          loading={recommendationsLoading}
          href="/manager/insights"
          previewCount={3}
        />
      </div>

      <div className="hidden md:flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <QuickNavChip href="/manager/schedule" icon={CalendarClock} label={tNav("floor")} />
        <QuickNavChip href="/manager/walk-in?tab=history" icon={ClipboardList} label={tNav("visitsShort")} />
        <QuickNavChip href="/manager/memberships" icon={CreditCard} label={tNav("member")} />
        <QuickNavChip href="/manager/attendance" icon={Fingerprint} label={tNav("employees")} />
        <QuickNavChip href="/manager/stock" icon={Warehouse} label={tNav("tabStock")} />
        <QuickNavChip href="/manager/insights" icon={Sparkles} label={tNav("tips")} />
      </div>

      <div id="team-performance" className="space-y-3 min-w-0 scroll-mt-20">
        <DashboardWidgetCard>
          <DashboardEmployeeSales
            loading={todayStaffSalesLoading}
            headerLabel={t("employeePerformanceToday")}
            subtitle={t("employeePerformanceSubtitle")}
            emptyLabel={tDash("noEmployeeSales")}
            staff={todayEmployeeSales}
            labels={{
              name: tNav("tabEmployees"),
              count: tDash("count"),
              avgTicket: tDash("avgTicket"),
              sales: tDash("sales"),
              listPrice: tDash("listTotal"),
              finalPrice: tDash("finalTotal"),
            }}
            formatValue={formatCurrency}
            staffHref={() => "/manager/attendance"}
          />
        </DashboardWidgetCard>

        <StaffPromoSalesTeaser data={staffPromoSales} loading={staffPromoLoading} />

        <ServiceSalesTeaser
          data={todayServiceContribution}
          loading={todayServicesLoading}
          href="/manager/services"
          panelVariant="dashboard"
          rowLimit={null}
        />
      </div>

      <section aria-labelledby="analysis-section" className="hidden md:block">
        <Card padding={false} className="overflow-hidden shadow-sm ring-1 ring-[var(--border)]">
          <div className="space-y-2.5 border-b border-[var(--border)] bg-gradient-to-br from-[var(--brand-light)]/60 via-[var(--surface)] to-violet-50/30 px-3 py-3 dark:from-indigo-950/30 dark:via-[var(--surface)] dark:to-violet-950/15 sm:px-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[var(--brand)] text-white flex items-center justify-center shadow-md shrink-0">
                  <BarChart3 className="w-4 h-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h2 id="analysis-section" className="dashboard-widget-title">
                    {t("analysisSection")}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{t("analysisSubtitle")}</p>
                </div>
              </div>
              <ScopeFilterBar
                showBranch={false}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                dateTestId="manager-home-date-range"
                className="w-full sm:max-w-[20rem] shrink-0"
              />
            </div>

            {periodSummaryLoading ? (
              <div className="period-metric-grid">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/40 min-h-[4.5rem] animate-pulse"
                  />
                ))}
              </div>
            ) : periodError ? (
              <p className="text-sm text-amber-700 dark:text-amber-400 rounded-xl border border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30 px-3 py-2">
                {t("periodUnavailable")}
              </p>
            ) : periodReady ? (
              <div className="period-metric-grid">
                <PeriodMetricCell
                  icon={TrendingUp}
                  label={t("periodRevenue")}
                  value={formatCurrency(periodDashboard.totalRevenue)}
                  accent="emerald"
                />
                <PeriodMetricCell
                  icon={Users}
                  label={t("periodVisits")}
                  value={String(periodDashboard.totalVisits)}
                  accent="brand"
                />
                <PeriodMetricCell
                  icon={Receipt}
                  label={t("periodAvgTicket")}
                  value={formatCurrency(periodDashboard.avgTicketSize)}
                  accent="violet"
                />
              </div>
            ) : null}
          </div>

          <div className="p-4 grid gap-3 md:grid-cols-1 min-w-0 bg-[var(--surface-muted)]/15">
            <ServiceContributionTeaser data={serviceContribution} loading={servicesLoading} href="/manager/services" />
          </div>
        </Card>
      </section>
    </div>
  );
}
