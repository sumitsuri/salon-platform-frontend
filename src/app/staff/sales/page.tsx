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
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["staff-portal-sales-insights", 2],
    queryFn: () => api.getStaffPortalSalesInsights(2),
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

  const boost = insights?.boost;

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
        <p className="text-[11px] text-[var(--text-secondary)]">
          {tHome("todaySalesLine", { count: data.todaySalesCount ?? 0 })}
        </p>
      </div>

      {boost && (
        <section className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">{t("boostTitle")}</h2>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{t("boostTrack", { track: boost.trackLabel })}</p>
          {boost.gapToTarget > 0 ? (
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 mt-2">
              {t("boostGap", {
                gap: formatCurrency(boost.gapToTarget),
                daily: formatCurrency(boost.dailyNeeded),
                days: boost.daysRemaining,
              })}
            </p>
          ) : (
            <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-2">{t("boostOnTarget")}</p>
          )}
          <ul className="mt-3 space-y-2">
            {boost.suggestions.map((s) => (
              <li
                key={s.serviceName}
                className="rounded-lg border border-[var(--border)]/60 bg-[var(--surface)] px-3 py-2 text-xs"
              >
                <p className="font-semibold text-[var(--text-primary)]">
                  {t("boostSuggested", {
                    count: s.suggestedCount,
                    service: s.serviceName,
                    amount: formatCurrency(s.typicalAmount),
                  })}
                </p>
                <p className="text-[var(--text-secondary)] mt-0.5">{s.rationale}</p>
                {boost.gapToTarget > 0 && s.estimatedRevenue > 0 && (
                  <p className="text-[10px] font-medium text-amber-800 dark:text-amber-300 mt-1">
                    {t("boostEst", { revenue: formatCurrency(s.estimatedRevenue) })}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-4">
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">{t("historyTitle")}</h2>
          <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
            {insights?.historyFilterLabel ?? t("historyFilter")}
          </span>
        </div>
        {insightsLoading ? (
          <p className="text-sm text-[var(--text-secondary)]">{t("loading")}</p>
        ) : !insights?.history.length ? (
          <p className="text-sm text-[var(--text-secondary)]">{t("historyEmpty")}</p>
        ) : (
          <div className="responsive-table-wrap rounded-xl border border-[var(--border)] max-h-72 overflow-y-auto">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 bg-[var(--surface-muted)]">
                <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
                  <th className="px-3 py-2">{t("historyDate")}</th>
                  <th className="px-3 py-2">{t("historyService")}</th>
                  <th className="px-3 py-2 text-right">{t("historyQty")}</th>
                  <th className="px-3 py-2 text-right">{t("historyAmount")}</th>
                </tr>
              </thead>
              <tbody>
                {insights.history.map((row, i) => (
                  <tr key={`${row.serviceDate}-${row.serviceName}-${i}`} className="border-t border-[var(--border)]/60">
                    <td className="px-3 py-2 tabular-nums text-[var(--text-secondary)]">{row.serviceDate}</td>
                    <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{row.serviceName}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">
                      {formatCurrency(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
