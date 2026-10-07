"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui";
import { StaffPageShell } from "@/components/staff/StaffPageShell";
import { ManagerHomeTargetChip } from "@/components/manager/ManagerHomeTargetChip";
import { StaffDailySectionLabel } from "@/components/staff/StaffMtdPeriodHeader";

type SalesRangePreset = "mtd" | "last_month" | "two_months";

function isoLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function salesRangeForPreset(preset: SalesRangePreset): { from: string; to: string } {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const to = isoLocal(today);

  if (preset === "mtd") {
    const fromDate = new Date(today.getFullYear(), today.getMonth(), 1, 12);
    return { from: isoLocal(fromDate), to };
  }
  if (preset === "last_month") {
    const fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1, 12);
    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0, 12);
    return { from: isoLocal(fromDate), to: isoLocal(lastDay) };
  }
  const fromDate = new Date(today.getFullYear(), today.getMonth() - 2, 1, 12);
  return { from: isoLocal(fromDate), to };
}

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
  const [rangePreset, setRangePreset] = useState<SalesRangePreset>("mtd");
  const range = useMemo(() => salesRangeForPreset(rangePreset), [rangePreset]);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-portal-growth"],
    queryFn: () => api.getStaffPortalGrowth(),
  });
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["staff-portal-sales-insights", range.from, range.to],
    queryFn: () => api.getStaffPortalSalesInsights(range.from, range.to),
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
  const period = insights?.periodSummary;
  const servicesValue = period != null ? String(period.serviceCount) : "—";
  const avgTicketValue = period != null ? formatCurrency(period.avgTicket) : "—";

  const rangeOptions: { id: SalesRangePreset; label: string }[] = [
    { id: "mtd", label: t("rangeMtd") },
    { id: "last_month", label: t("rangeLastMonth") },
    { id: "two_months", label: t("rangeTwoMonths") },
  ];

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

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
          {t("rangeLabel")}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {rangeOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setRangePreset(opt.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-bold transition-colors touch-manipulation",
                rangePreset === opt.id
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] font-medium text-[var(--text-tertiary)] w-full sm:w-auto">
          {insights?.historyFilterLabel ?? "…"}
        </span>
      </div>

      <p className="text-[11px] font-semibold text-[var(--text-secondary)] mt-1">{t("periodSalesHint")}</p>

      <div className="staff-sales-kpi-grid mt-2">
        <StaffSalesKpi label={t("services")} value={servicesValue} theme="purple" loading={insightsLoading} />
        <StaffSalesKpi label={t("avgTicket")} value={avgTicketValue} theme="pink" loading={insightsLoading} />
        <StaffSalesKpi
          label={t("attendanceScore")}
          value={`${data.attendanceComplianceScore}%`}
          theme="green"
          sub={t("attendanceDays", { present: data.daysPresent, absent: data.daysAbsent })}
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

      {(insights?.focusSummary || (insights?.serviceContributions?.length ?? 0) > 0) && (
        <section className="mt-4 rounded-xl border border-violet-200/80 bg-violet-50/40 p-3 dark:border-violet-900/40 dark:bg-violet-950/20">
          <h2 className="text-sm font-black uppercase tracking-wide text-[var(--text-primary)]">
            {t("insightsTitle")}
          </h2>
          {insights?.focusSummary && (
            <p className="text-sm font-semibold text-[var(--text-primary)] mt-2 leading-snug">
              {insights.focusSummary}
            </p>
          )}
          {insights?.serviceContributions && insights.serviceContributions.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] mb-2">
                {t("contributionTitle")}
              </p>
              <ul className="space-y-2.5">
                {insights.serviceContributions.map((c) => (
                  <li key={c.serviceName}>
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-bold text-[var(--text-primary)] truncate">{c.serviceName}</span>
                      <span className="tabular-nums font-black text-violet-800 dark:text-violet-200 shrink-0">
                        {Number(c.sharePercent).toFixed(Number(c.sharePercent) % 1 ? 1 : 0)}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-violet-200/60 dark:bg-violet-900/40 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-600 dark:bg-violet-400"
                        style={{ width: `${Math.min(100, Number(c.sharePercent))}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                      {t("contributionLine", {
                        share: Number(c.sharePercent).toFixed(1),
                        count: c.count,
                        revenue: formatCurrency(c.revenue),
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {boost && (
        <section className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
          <h2 className="text-sm font-black uppercase tracking-wide text-[var(--text-primary)]">
            {t("targetFocusTitle")}
          </h2>
          <p className="text-[11px] font-semibold text-[var(--text-secondary)] mt-0.5">
            {t("boostTrack", { track: boost.trackLabel })}
          </p>
          {boost.gapToTarget > 0 ? (
            <p className="text-xs font-bold text-amber-900 dark:text-amber-200 mt-2">
              {t("boostGap", {
                gap: formatCurrency(boost.gapToTarget),
                daily: formatCurrency(boost.dailyNeeded),
                days: boost.daysRemaining,
              })}
            </p>
          ) : (
            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mt-2">{t("boostOnTarget")}</p>
          )}
          <ul className="mt-3 space-y-2">
            {boost.suggestions.map((s) => (
              <li
                key={s.serviceName}
                className="rounded-lg border border-[var(--border)]/60 bg-[var(--surface)] px-3 py-2 text-xs"
              >
                <p className="font-bold text-[var(--text-primary)]">
                  {t("boostSuggested", {
                    count: s.suggestedCount,
                    service: s.serviceName,
                    amount: formatCurrency(s.typicalAmount),
                  })}
                </p>
                <p className="text-[var(--text-secondary)] mt-0.5">{s.rationale}</p>
                {boost.gapToTarget > 0 && s.estimatedRevenue > 0 && (
                  <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 mt-1">
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
    </StaffPageShell>
  );
}

function StaffSalesKpi({
  label,
  value,
  theme,
  loading,
  sub,
}: {
  label: string;
  value: string;
  theme: "green" | "purple" | "pink";
  loading?: boolean;
  sub?: string;
}) {
  return (
    <div className={cn("staff-sales-kpi", `staff-sales-kpi--${theme}`)}>
      <span className="staff-sales-kpi-label">{label}</span>
      <p className={cn("staff-sales-kpi-value tabular-nums", loading && "animate-pulse opacity-60")}>{value}</p>
      {sub && <p className="staff-sales-kpi-sub">{sub}</p>}
    </div>
  );
}
