"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { PageHeader, inputClass } from "@/components/ui";
import { StaffPageShell } from "@/components/employee/StaffPageShell";
import { ManagerHomeTargetChip } from "@/components/manager/ManagerHomeTargetChip";
import { StaffDailySectionLabel } from "@/components/employee/StaffMtdPeriodHeader";
import { useClientPagedList, DEFAULT_LIST_PAGE_SIZE } from "@/lib/use-client-paged-list";
import { ListPageArrows } from "@/components/employee/ListPageArrows";

function isoLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultSalesRange(): { from: string; to: string } {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const fromDate = new Date(today.getFullYear(), today.getMonth(), 1, 12);
  return { from: isoLocal(fromDate), to: isoLocal(today) };
}

function earliestAllowedFrom(): string {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const fromDate = new Date(today.getFullYear(), today.getMonth() - 2, 1, 12);
  return isoLocal(fromDate);
}

function clampSalesRange(from: string, to: string): { from: string; to: string } {
  const today = isoLocal(new Date());
  const earliest = earliestAllowedFrom();
  let f = from;
  let t = to;
  if (f < earliest) f = earliest;
  if (t > today) t = today;
  if (f > t) f = t;
  return { from: f, to: t };
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
  const t = useTranslations("employee.growth");
  const tHome = useTranslations("employee.home");
  const [range, setRange] = useState(defaultSalesRange);
  const clampedRange = useMemo(() => clampSalesRange(range.from, range.to), [range.from, range.to]);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-portal-growth"],
    queryFn: () => api.getStaffPortalGrowth(),
  });
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["staff-portal-sales-insights", clampedRange.from, clampedRange.to],
    queryFn: () => api.getStaffPortalSalesInsights(clampedRange.from, clampedRange.to),
  });

  const contributions = insights?.serviceContributions ?? [];
  const boostSuggestions = insights?.boost?.suggestions ?? [];

  const contributionsPager = useClientPagedList(contributions, DEFAULT_LIST_PAGE_SIZE);
  const boostPager = useClientPagedList(boostSuggestions, DEFAULT_LIST_PAGE_SIZE);

  const pace = useMemo(
    () => (data ? salesPaceMeta(data.monthlySalesTarget, data.actualSales) : null),
    [data],
  );

  function setFrom(from: string) {
    setRange((prev) => clampSalesRange(from, prev.to));
  }

  function setTo(to: string) {
    setRange((prev) => clampSalesRange(prev.from, to));
  }

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
  const totalSalesValue = period != null ? formatCurrency(period.totalSales) : "—";
  const avgTicketValue = period != null ? formatCurrency(period.avgTicket) : "—";
  const todayIso = isoLocal(new Date());

  return (
    <StaffPageShell className="pb-6">
      <PageHeader title={t("title")} subtitle={data.periodLabel} />

      {data.monthlySalesTarget > 0 && pace && (
        <ManagerHomeTargetChip
          compact
          messagesNamespace="manager.home"
          insightsHref="/employee/sales"
          monthlyTarget={data.monthlySalesTarget}
          actualSales={data.actualSales}
          achievementPercent={Number(data.achievementPercent) || 0}
          catchUpDaily={pace.catchUpDaily}
          dailyAverageExpected={pace.dailyAverageExpected}
          daysRemaining={pace.daysRemaining}
          periodLabel={data.periodLabel}
        />
      )}

      <div className="mt-3 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">{t("rangeLabel")}</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[10px] font-semibold text-[var(--text-secondary)]">
            {t("rangeFrom")}
            <input
              type="date"
              className={`${inputClass} mt-1 text-sm py-2 min-h-10`}
              value={clampedRange.from}
              min={earliestAllowedFrom()}
              max={clampedRange.to}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="text-[10px] font-semibold text-[var(--text-secondary)]">
            {t("rangeTo")}
            <input
              type="date"
              className={`${inputClass} mt-1 text-sm py-2 min-h-10`}
              value={clampedRange.to}
              min={clampedRange.from}
              max={todayIso}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
        {insights?.historyFilterLabel && (
          <p className="text-[10px] font-medium text-[var(--text-tertiary)]">{insights.historyFilterLabel}</p>
        )}
      </div>

      <p className="text-[11px] font-semibold text-[var(--text-secondary)] mt-2">{t("periodSalesHint")}</p>

      <div className="staff-sales-kpi-grid mt-2">
        <StaffSalesKpi label={t("services")} value={servicesValue} theme="purple" loading={insightsLoading} />
        <StaffSalesKpi
          label={t("periodTotalSales")}
          value={totalSalesValue}
          theme="total"
          loading={insightsLoading}
        />
        <StaffSalesKpi label={t("avgTicket")} value={avgTicketValue} theme="pink" loading={insightsLoading} />
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

      {(insights?.focusSummary || contributions.length > 0) && (
        <section className="mt-4 rounded-xl border border-violet-200/80 bg-violet-50/40 p-3 dark:border-violet-900/40 dark:bg-violet-950/20">
          <h2 className="text-sm font-black uppercase tracking-wide text-[var(--text-primary)]">
            {t("insightsTitle")}
          </h2>
          {insights?.focusSummary && (
            <p className="text-sm font-semibold text-[var(--text-primary)] mt-2 leading-snug">
              {insights.focusSummary}
            </p>
          )}
          {contributions.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] mb-2">
                {t("contributionTitle")}
              </p>
              <ul className="space-y-2.5">
                {contributionsPager.pageItems.map((c) => (
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
              {contributionsPager.showPager && (
                <ListPageArrows
                  className="mt-2 rounded-lg border border-[var(--border)]"
                  page={contributionsPager.page}
                  totalPages={contributionsPager.totalPages}
                  hasPrev={contributionsPager.hasPrev}
                  hasNext={contributionsPager.hasNext}
                  onPrev={contributionsPager.goPrev}
                  onNext={contributionsPager.goNext}
                />
              )}
            </div>
          )}
        </section>
      )}

      {boost && (
        <section className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
          <h2 className="text-sm font-black uppercase tracking-wide text-[var(--text-primary)]">
            {t("targetFocusTitle")}
          </h2>
          <p className="text-[11px] font-semibold text-amber-950/90 dark:text-amber-100/90 mt-2 leading-snug">
            {t("boostPackagesLead")}
          </p>
          <p className="text-[11px] font-semibold text-[var(--text-secondary)] mt-2">
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
            {boostPager.pageItems.map((s) => (
              <li
                key={`${s.serviceName}-${s.packageOffer ? "pkg" : "svc"}`}
                className={cn(
                  "rounded-lg border bg-[var(--surface)] px-3 py-2 text-xs",
                  s.packageOffer
                    ? "border-amber-400/70 ring-1 ring-amber-300/40"
                    : "border-[var(--border)]/60",
                )}
              >
                <p className="font-bold text-[var(--text-primary)] flex flex-wrap items-center gap-1.5">
                  {s.packageOffer && (
                    <span className="rounded-md bg-amber-200/90 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-950">
                      {t("boostPackageBadge")}
                    </span>
                  )}
                  {s.serviceName === "On target"
                    ? s.serviceName
                    : t("boostSuggested", {
                        count: s.suggestedCount,
                        service: s.serviceName,
                        amount: formatCurrency(s.typicalAmount),
                      })}
                </p>
                <p className="text-[var(--text-secondary)] mt-0.5">{s.rationale}</p>
                {boost.gapToTarget > 0 && s.estimatedRevenue > 0 && s.serviceName !== "On target" && (
                  <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 mt-1">
                    {t("boostEst", { revenue: formatCurrency(s.estimatedRevenue) })}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {boostPager.showPager && (
            <ListPageArrows
              className="mt-2 rounded-lg border border-[var(--border)]"
              page={boostPager.page}
              totalPages={boostPager.totalPages}
              hasPrev={boostPager.hasPrev}
              hasNext={boostPager.hasNext}
              onPrev={boostPager.goPrev}
              onNext={boostPager.goNext}
            />
          )}
        </section>
      )}
    </StaffPageShell>
  );
}

function StaffSalesKpi({
  label,
  value,
  theme,
  loading,
}: {
  label: string;
  value: string;
  theme: "purple" | "pink" | "total";
  loading?: boolean;
}) {
  return (
    <div className={cn("staff-sales-kpi", `staff-sales-kpi--${theme}`)}>
      <span className="staff-sales-kpi-label">{label}</span>
      <p className={cn("staff-sales-kpi-value tabular-nums", loading && "animate-pulse opacity-60")}>{value}</p>
    </div>
  );
}
