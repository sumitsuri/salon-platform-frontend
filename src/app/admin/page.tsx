"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { BadgePercent, Building2, ClipboardList, IndianRupee, Trophy, Users } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { BranchMultiSelect } from "@/components/BranchMultiSelect";
import { BranchTrends } from "@/components/BranchTrends";
import { BranchTargetTrends } from "@/components/BranchTargetTrends";
import { EmployeeTargetTrends } from "@/components/EmployeeTargetTrends";
import { ServiceSalesTeaser } from "@/components/ServiceSalesTeaser";
import { InsightsTeaser } from "@/components/InsightsTeaser";
import { PaymentMixTeaser } from "@/components/PaymentMixTeaser";
import { PlTeaser } from "@/components/PlTeaser";
import { InventoryTeaser } from "@/components/InventoryTeaser";
import { ListRow, EmptyState } from "@/components/ui";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { ProductDateRange, dashboardSecondaryRange, getTodayRange, resolveProductDateRange } from "@/lib/date-range";
import { insightPeriodToRange } from "@/lib/insights-utils";
import { adminBookingsPath } from "@/lib/navigation-scope";
import { useAdminBranchSelection } from "@/lib/use-admin-branch-selection";
import { deriveOverviewActions } from "@/lib/dashboard-overview-actions";
import {
  DashboardCommandBar,
  DashboardKpiStrip,
  DashboardBranchPerformance,
  DashboardEmployeeCheckIn,
  DashboardEmployeeSales,
  DashboardWidgetCard,
  DashboardOverviewPanel,
  DashboardActionRail,
} from "@/components/enterprise-ui";

export default function AdminDashboardPage() {
  const t = useTranslations("admin.dashboard");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const tAtt = useTranslations("components.attendanceDashboard");
  const [dateRange, setDateRange] = useState<ProductDateRange>(() => ({
    preset: "today",
    ...getTodayRange(),
  }));

  const {
    branches,
    branchesError,
    selectedBranches,
    setSelectedBranches,
    branchIdsFilter,
    branchesSelected,
  } = useAdminBranchSelection();

  const apiRange = insightPeriodToRange(dateRange);

  const { data: dashboard, isLoading, isFetching } = useQuery({
    queryKey: ["dashboard", selectedBranches, dateRange.preset, dateRange.from, dateRange.to],
    queryFn: () =>
      api.getDashboard({
        ...apiRange,
        branchIds: branchIdsFilter,
      }),
    enabled: branchesSelected,
  });

  const { data: attendanceDashboard, isLoading: attendanceLoading } = useQuery({
    queryKey: ["attendance-dashboard", selectedBranches, dateRange.preset, dateRange.from, dateRange.to],
    queryFn: () => api.getAttendanceDashboard({ ...apiRange, branchIds: branchIdsFilter }),
    enabled: branchesSelected,
  });

  const { data: staffPerformance, isLoading: staffPerfLoading } = useQuery({
    queryKey: ["staff-target-performance", selectedBranches, dateRange.preset, dateRange.from, dateRange.to],
    queryFn: () => api.getStaffTargetPerformance({ ...apiRange, branchIds: branchIdsFilter }),
    enabled: branchesSelected,
  });

  const { data: serviceContribution, isLoading: servicesLoading } = useQuery({
    queryKey: ["service-contribution", selectedBranches, dateRange.preset, dateRange.from, dateRange.to],
    queryFn: () => api.getServiceContribution({ ...apiRange, branchIds: branchIdsFilter }),
    enabled: branchesSelected,
  });

  const { data: recommendations, isLoading: recommendationsLoading } = useQuery({
    queryKey: ["recommendations", selectedBranches, dateRange.preset, dateRange.from, dateRange.to],
    queryFn: () => api.getRecommendations({ ...apiRange, branchIds: branchIdsFilter }),
    enabled: branchesSelected,
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
    enabled: branchesSelected,
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
    enabled: branchesSelected,
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
    enabled: branchesSelected,
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
    enabled: branchesSelected && !!inventoryMonth,
  });

  const periodSubtitle = isFetching && !isLoading ? tAdmin("updating") : undefined;

  const employeeCheckInLabels = {
    staff: tAtt("staff"),
    checkIn: t("checkInTime"),
    checkOut: t("checkOutTime"),
  };

  const employeeSalesLabels = {
    name: tAtt("staff"),
    count: t("count"),
    avgTicket: t("avgTicket"),
    sales: t("sales"),
  };

  if (branchesError) {
    return (
      <EmptyState
        title={t("branchesErrorTitle")}
        description={t("branchesErrorDesc")}
        icon={Building2}
      />
    );
  }

  const branchPerformanceLabels = {
    branch: tCommon("branch"),
    revenue: t("revenue"),
    visits: t("visits"),
    avgTicket: t("avgTicket"),
    discounts: t("discounts"),
  };

  const dashboardLoading = isLoading || !dashboard;
  const showBranchPerformance = dashboardLoading || (dashboard?.branchStats.length ?? 0) > 0;
  const resolvedDateRange = resolveProductDateRange(dateRange);

  const overviewActions = useMemo(() => {
    if (dashboardLoading || !dashboard) return [];
    const raw = deriveOverviewActions({
      dashboard,
      attendance: attendanceDashboard,
      recommendations,
      dateRange,
      formatCurrency,
    });
    return raw.map((action) => ({
      id: action.id,
      title: t(action.titleKey as "actions.zeroVisitsTitle", action.titleValues),
      description: t(action.descKey as "actions.zeroVisitsDesc", action.descValues),
      href: action.href,
      tone: action.tone,
      metricLabel: action.metricLabel,
      metricValue: action.metricValue,
    }));
  }, [dashboardLoading, dashboard, attendanceDashboard, recommendations, dateRange, t]);

  const kpiItems = useMemo(
    () => [
      {
        label: t("totalRevenue"),
        value: dashboardLoading ? "…" : formatCurrency(dashboard!.totalRevenue),
        href: "/admin/finance",
        icon: IndianRupee,
        accent: "violet" as const,
      },
      {
        label: t("visits"),
        value: dashboardLoading ? "…" : dashboard!.totalVisits,
        href: adminBookingsPath({ dateRange: resolvedDateRange }),
        icon: ClipboardList,
        accent: "sky" as const,
      },
      {
        label: t("avgTicket"),
        value: dashboardLoading ? "…" : formatCurrency(dashboard!.avgTicketSize),
        href: "/admin/services",
        icon: Users,
        accent: "emerald" as const,
      },
      {
        label: t("discounts"),
        value: dashboardLoading ? "…" : formatCurrency(dashboard!.totalDiscounts),
        href: "/admin/promotions",
        icon: BadgePercent,
        accent: "amber" as const,
      },
    ],
    [dashboardLoading, dashboard, resolvedDateRange, t]
  );

  return (
    <>
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
        />

      </DashboardOverviewPanel>

      {selectedBranches.length > 0 ? (
        <div className="dashboard-overview-modules">
          <DashboardWidgetCard variant="metrics">
            <DashboardKpiStrip
              loading={dashboardLoading}
              headerLabel={t("keyMetricsLabel")}
              headerHint={t("keyMetricsHint")}
              items={kpiItems}
            />
          </DashboardWidgetCard>
          {(dashboardLoading || recommendationsLoading || overviewActions.length > 0) ? (
            <DashboardWidgetCard variant="actions">
              <DashboardActionRail
                title={t("actionsTitle")}
                subtitle={t("actionsHint")}
                loading={dashboardLoading || recommendationsLoading}
                actions={overviewActions}
              />
            </DashboardWidgetCard>
          ) : null}
        </div>
      ) : null}

      {selectedBranches.length === 0 ? (
        <EmptyState title={tAdmin("selectBranch")} description={tAdmin("chooseBranches")} icon={Building2} />
      ) : (
        <div className="dashboard-widgets-section">
          {showBranchPerformance ? (
            <DashboardWidgetCard>
              <DashboardBranchPerformance
                loading={dashboardLoading}
                headerLabel={t("branchPerformance")}
                branches={
                  dashboardLoading
                    ? []
                    : dashboard!.branchStats.map((b) => ({
                        branchId: b.branchId,
                        branchName: b.branchName,
                        revenue: b.revenue,
                        visits: b.visits,
                        avgTicket: b.avgTicket,
                        discountAmount: b.discountAmount ?? 0,
                      }))
                }
                labels={branchPerformanceLabels}
                formatValue={formatCurrency}
                branchHref={
                  dashboardLoading
                    ? undefined
                    : (b) =>
                        adminBookingsPath({
                          branchId: b.branchId,
                          branchName: b.branchName,
                          dateRange: resolveProductDateRange(dateRange),
                        })
                }
              />
            </DashboardWidgetCard>
          ) : null}

          <div className="dashboard-widgets-grid dashboard-widgets-grid--2">
            <DashboardWidgetCard>
              <DashboardEmployeeCheckIn
                loading={attendanceLoading}
                headerLabel={t("employeeCheckIn")}
                emptyLabel={t("noEmployeeCheckIn")}
                staff={(attendanceDashboard?.staffSummaries ?? []).map((s) => ({
                  staffId: s.staffId,
                  staffName: s.staffName,
                  attendanceRecordId: s.attendanceRecordId,
                  entryTime: s.entryTime,
                  exitTime: s.exitTime,
                  hasEntryPhoto: s.hasEntryPhoto,
                }))}
                labels={employeeCheckInLabels}
                staffHref={() => "/admin/employees"}
              />
            </DashboardWidgetCard>
            <DashboardWidgetCard>
              <DashboardEmployeeSales
                loading={staffPerfLoading}
                headerLabel={t("employeeSales")}
                emptyLabel={t("noEmployeeSales")}
                staff={(staffPerformance?.staff ?? []).map((s) => ({
                  staffId: s.staffId,
                  staffName: s.staffName,
                  salesCount: s.salesCount ?? 0,
                  avgTicketSize: s.avgTicketSize ?? 0,
                  totalSales: s.actualSales,
                }))}
                labels={employeeSalesLabels}
                formatValue={formatCurrency}
                staffHref={() => "/admin/employees"}
              />
            </DashboardWidgetCard>
          </div>

          <div className="dashboard-widgets-grid dashboard-widgets-grid--2-xl">
            <ServiceSalesTeaser data={serviceContribution} loading={servicesLoading} href="/admin/services" panelVariant="dashboard" />
            {dashboardLoading ? (
              <PlTeaser data={undefined} loading href="/admin/finance" panelVariant="dashboard" />
            ) : (
              <PlTeaser data={plSummary} loading={plLoading} href="/admin/finance" panelVariant="dashboard" />
            )}
          </div>

          <div className="dashboard-widgets-grid dashboard-widgets-grid--2-xl">
            <InventoryTeaser data={inventoryOverview} loading={inventoryLoading} href="/admin/inventory" panelVariant="dashboard" />
            <PaymentMixTeaser
              loading={dashboardLoading}
              paymentMix={dashboardLoading ? undefined : dashboard!.paymentMix}
              panelVariant="dashboard"
            />
          </div>

          {dashboardLoading ? null : (
            <>
              {dashboard!.branchTrends && dashboard!.branchTrends.length > 0 && (
                <BranchTrends trends={dashboard!.branchTrends} panelVariant="dashboard" />
              )}

              {!branchTrendsLoading && branchTargetTrends && branchTargetTrends.branches.length > 0 && (
                <BranchTargetTrends
                  branches={branchTargetTrends.branches}
                  periodLabel={branchTargetTrends.periodLabel}
                  panelVariant="dashboard"
                />
              )}

              {!staffTrendsLoading && staffTargetTrends && staffTargetTrends.branches.length > 0 && (
                <EmployeeTargetTrends
                  branches={staffTargetTrends.branches}
                  periodLabel={staffTargetTrends.periodLabel}
                  compact
                  panelVariant="dashboard"
                />
              )}

              <div className="dashboard-widgets-grid dashboard-widgets-grid--2 min-w-0">
                <DashboardWidgetCard>
                  <div className="dashboard-widget-header px-4 py-3 flex items-center gap-2.5">
                    <span className="dashboard-widget-icon shrink-0" aria-hidden>
                      <Trophy className="w-4 h-4" />
                    </span>
                    <h2 className="dashboard-widget-title">{t("staffLeaderboard")}</h2>
                  </div>
                  {dashboard!.topStaff.length === 0 ? (
                    <EmptyState title={t("noStaffData")} description={t("noStaffDataDesc")} icon={Trophy} />
                  ) : (
                    <div className="divide-y divide-[var(--border)]">
                      {dashboard!.topStaff.map((s, i) => (
                        <ListRow
                          key={s.staffId}
                          title={`${i + 1}. ${s.staffName}`}
                          subtitle={s.branchName}
                          trailing={
                            <span className="text-xs sm:text-sm font-bold text-[var(--brand-text)] tabular-nums truncate">
                              {formatCurrency(s.revenue)}
                            </span>
                          }
                        />
                      ))}
                    </div>
                  )}
                </DashboardWidgetCard>

                <InsightsTeaser
                  data={recommendations}
                  loading={recommendationsLoading}
                  href="/admin/insights"
                  panelVariant="dashboard"
                />
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
