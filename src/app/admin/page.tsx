"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Building2, Target, Trophy, Users } from "lucide-react";
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
import { Card, ListRow, EmptyState, PageLoader } from "@/components/ui";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { ProductDateRange, dashboardSecondaryRange, getTodayRange, resolveProductDateRange } from "@/lib/date-range";
import { insightPeriodToRange } from "@/lib/insights-utils";
import { adminBookingsPath } from "@/lib/navigation-scope";
import { useAdminBranchSelection } from "@/lib/use-admin-branch-selection";
import {
  DashboardCommandBar,
  DashboardQuickLink,
  DashboardKpiStrip,
  DashboardBranchPerformance,
  DashboardEmployeeCheckIn,
  DashboardEmployeeSales,
  DashboardWidgetCard,
  DashboardOverviewPanel,
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
          links={
            <>
              <DashboardQuickLink href="/admin/employees" icon={Target} label={t("employeesQuick")} />
              <DashboardQuickLink href="/admin/branches" icon={Building2} label={t("organizationQuick")} />
            </>
          }
        />

        {selectedBranches.length > 0 ? (
          <DashboardKpiStrip
            loading={dashboardLoading}
            headerLabel={t("keyMetricsLabel")}
            items={
              dashboardLoading
                ? [
                    { label: t("totalRevenue"), value: "…" },
                    { label: t("visits"), value: "…" },
                    { label: t("avgTicket"), value: "…" },
                    { label: t("discounts"), value: "…" },
                  ]
                : [
                    { label: t("totalRevenue"), value: formatCurrency(dashboard!.totalRevenue) },
                    { label: t("visits"), value: dashboard!.totalVisits },
                    { label: t("avgTicket"), value: formatCurrency(dashboard!.avgTicketSize) },
                    { label: t("discounts"), value: formatCurrency(dashboard!.totalDiscounts) },
                  ]
            }
          />
        ) : null}
      </DashboardOverviewPanel>

      {selectedBranches.length === 0 ? (
        <EmptyState title={tAdmin("selectBranch")} description={tAdmin("chooseBranches")} icon={Building2} />
      ) : (
        <>
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

          <div className="grid gap-6 md:grid-cols-2">
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

          <div className="grid gap-6 xl:grid-cols-2">
            <ServiceSalesTeaser data={serviceContribution} loading={servicesLoading} href="/admin/services" />
            {dashboardLoading ? (
              <PlTeaser data={undefined} loading href="/admin/finance" />
            ) : (
              <PlTeaser data={plSummary} loading={plLoading} href="/admin/finance" />
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <InventoryTeaser data={inventoryOverview} loading={inventoryLoading} href="/admin/inventory" />
            <PaymentMixTeaser
              loading={dashboardLoading}
              paymentMix={dashboardLoading ? undefined : dashboard!.paymentMix}
            />
          </div>

          {dashboardLoading ? null : (
            <>
              {dashboard!.branchTrends && dashboard!.branchTrends.length > 0 && (
                <BranchTrends trends={dashboard!.branchTrends} />
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

              <div className="grid gap-6 md:grid-cols-2 min-w-0">
                <Card padding={false}>
                  <div className="px-4 py-3.5 border-b border-[var(--border)] bg-gradient-to-r from-violet-50/80 to-indigo-50/50 dark:from-violet-950/30 dark:to-indigo-950/20">
                    <h2 className="font-bold text-sm text-[var(--text-primary)]">{t("staffLeaderboard")}</h2>
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
                </Card>

                <InsightsTeaser
                  data={recommendations}
                  loading={recommendationsLoading}
                  href="/admin/insights"
                />
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
