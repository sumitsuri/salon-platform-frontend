"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui";
import { StaffPageShell } from "@/components/staff/StaffPageShell";
import { ManagerHomeTargetChip } from "@/components/manager/ManagerHomeTargetChip";
import { StaffDailySectionLabel } from "@/components/staff/StaffMtdPeriodHeader";

function salesPaceMeta(target: number, actual: number) {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(0, daysInMonth - now.getDate());
  const remaining = Math.max(0, target - actual);
  const catchUpDaily = daysRemaining > 0 ? remaining / daysRemaining : remaining;
  const dailyAverageExpected = daysInMonth > 0 ? target / daysInMonth : 0;
  return { daysRemaining, catchUpDaily, dailyAverageExpected };
}

export default function StaffSalesPage() {
  const t = useTranslations("staff.growth");
  const tHome = useTranslations("staff.home");
  const { data, isLoading } = useQuery({
    queryKey: ["staff-portal-growth"],
    queryFn: () => api.getStaffPortalGrowth(),
  });

  const pace = useMemo(
    () => (data ? salesPaceMeta(data.monthlySalesTarget, data.actualSales) : null),
    [data],
  );

  if (isLoading || !data) {
    return (
      <StaffPageShell className="pb-6">
        <PageHeader title={t("title")} />
        <p className="text-sm text-[var(--text-secondary)]">{t("loading")}</p>
      </StaffPageShell>
    );
  }

  return (
    <StaffPageShell className="pb-6">
      <PageHeader title={t("title")} subtitle={data.periodLabel} />

      {data.monthlySalesTarget > 0 && pace && (
        <ManagerHomeTargetChip
          compact
          messagesNamespace="manager.home"
          insightsHref="/staff/sales"
          monthlyTarget={data.monthlySalesTarget}
          actualSales={data.actualSales}
          achievementPercent={Number(data.achievementPercent) || 0}
          catchUpDaily={pace.catchUpDaily}
          dailyAverageExpected={pace.dailyAverageExpected}
          daysRemaining={pace.daysRemaining}
          periodLabel={data.periodLabel}
        />
      )}

      <div className="manager-home-glance-metrics mt-2">
        <MetricGlance label={t("services")} value={String(data.salesCount)} theme="purple" />
        <MetricGlance label={t("avgTicket")} value={formatCurrency(data.avgTicketSize)} theme="pink" />
        <MetricGlance label={t("attendanceScore")} value={`${data.attendanceComplianceScore}%`} theme="green" />
        <MetricGlance
          label={t("incentiveShort")}
          value={data.projectedIncentive > 0 ? formatCurrency(data.projectedIncentive) : "—"}
          theme="amber"
        />
      </div>

      <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
        <StaffDailySectionLabel className="pt-0" />
        <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums mt-1">
          {formatCurrency(data.todaySales ?? 0)}
        </p>
        <p className="text-[11px] text-[var(--text-secondary)]">{tHome("todaySalesLine", { count: data.todaySalesCount ?? 0 })}</p>
      </div>

      <p className="staff-home-tip mt-2">{t("attendanceDays", { present: data.daysPresent, absent: data.daysAbsent })}</p>
    </StaffPageShell>
  );
}

function MetricGlance({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: "green" | "purple" | "pink" | "amber";
}) {
  return (
    <div className={cn("manager-home-glance-metric", `manager-home-glance-metric--${theme}`)}>
      <div className="manager-home-glance-metric-top">
        <span className="manager-home-glance-metric-label">{label}</span>
      </div>
      <p className="manager-home-glance-metric-value tabular-nums">{value}</p>
    </div>
  );
}
