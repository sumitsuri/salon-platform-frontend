"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  UserPlus,
  TrendingUp,
  Users,
  Clock,
  Fingerprint,
  ClipboardList,
  CalendarClock,
  CreditCard,
  ChevronRight,
  Receipt,
  BarChart3,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency, cn } from "@/lib/utils";
import { formatTenantDateTime, getTenantLocaleKit } from "@/lib/tenant-locale";
import { InsightsTeaser } from "@/components/InsightsTeaser";
import { ServiceContributionTeaser } from "@/components/ServiceContributionTeaser";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { insightPeriodToRange } from "@/lib/insights-utils";
import {
  getLast30DaysRange,
  todayIsoDate,
  formatDateRangeLabel,
  type ProductDateRange,
} from "@/lib/date-range";
import { Card, StatusBadge, ListRow, btnPrimary, StatCard } from "@/components/ui";
import { DashboardHero } from "@/components/enterprise-ui";

function useGreeting() {
  const t = useTranslations("manager.home");
  const h = new Date().getHours();
  if (h < 12) return t("goodMorning");
  if (h < 17) return t("goodAfternoon");
  return t("goodEvening");
}

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
        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)] truncate">{label}</p>
        <p className="text-sm sm:text-lg font-bold tabular-nums text-[var(--text-primary)] truncate mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function NavTile({
  href,
  icon: Icon,
  label,
  hint,
  accent,
}: {
  href: string;
  icon: typeof CalendarClock;
  label: string;
  hint: string;
  accent: "emerald" | "brand" | "violet" | "amber";
}) {
  const styles = {
    emerald: {
      cell: "border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-200 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40",
      icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
    },
    brand: {
      cell: "border-[var(--brand-muted)] bg-[var(--brand-light)]/40 hover:bg-[var(--brand-light)] hover:border-[var(--brand)]/30",
      icon: "bg-[var(--brand)] text-[var(--brand-on-brand)]",
    },
    violet: {
      cell: "border-violet-100 bg-violet-50/40 hover:bg-violet-50 hover:border-violet-200 dark:border-violet-900/50 dark:bg-violet-950/20 dark:hover:bg-violet-950/40",
      icon: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300",
    },
    amber: {
      cell: "border-amber-100 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-200 dark:border-amber-900/50 dark:bg-amber-950/20 dark:hover:bg-amber-950/40",
      icon: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300",
    },
  };
  const s = styles[accent];
  return (
    <Link
      href={href}
      aria-label={`${label} — ${hint}`}
      className={cn(
        "group flex items-center gap-2 rounded-xl border p-2.5 sm:p-3 min-h-[4rem] w-full min-w-0",
        "shadow-sm hover:shadow-md active:scale-[0.98] transition touch-manipulation",
        s.cell
      )}
    >
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm", s.icon)}>
        <Icon className="w-4 h-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] leading-tight truncate">{label}</p>
        <p className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] leading-snug truncate mt-0.5">{hint}</p>
      </div>
      <ChevronRight
        className="w-4 h-4 shrink-0 text-[var(--text-tertiary)] group-hover:text-[var(--brand-text)] group-hover:translate-x-0.5 transition-all"
        aria-hidden
      />
    </Link>
  );
}

export default function ManagerHomePage() {
  const t = useTranslations("manager.home");
  const tNav = useTranslations("manager.nav");
  const tCommon = useTranslations("common");
  const greeting = useGreeting();
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branchId || "";
  const localeKit = getTenantLocaleKit();
  const router = useRouter();
  const today = todayIsoDate();
  const todayLabel = formatDateRangeLabel(today, today);

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
        size: 30,
      }),
    enabled: !!branchId,
  });

  const todayBookings = todayData?.content ?? [];
  const completed = todayBookings.filter((b) => b.status === "COMPLETED");
  const inProgress = todayBookings.filter((b) => b.status !== "COMPLETED" && b.status !== "CANCELLED");
  const todayRevenue = completed.reduce((s, b) => s + (b.billPreview?.grandTotal || 0), 0);

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

  const firstName = user?.name?.split(" ")[0] || t("manager");
  const queue = [...inProgress, ...completed].slice(0, 8);

  const periodReady = !!periodDashboard && !periodLoading;
  const periodSummaryLoading = (periodLoading || periodFetching) && !periodDashboard;

  return (
    <div className="space-y-6 max-w-6xl mx-auto min-w-0 w-full">
      <DashboardHero
        eyebrow={`${greeting} · ${todayLabel}`}
        title={firstName}
        subtitle={user?.branchName}
        badge={
          inProgress.length > 0 ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/15 text-white text-xs font-bold border border-white/25">
              {t("openVisitsBadge", { count: inProgress.length })}
            </span>
          ) : undefined
        }
        action={
          <Link href="/manager/walk-in?new=1" className="hero-cta w-full sm:w-auto">
            <UserPlus className="w-4 h-4" />
            {t("newWalkIn")}
          </Link>
        }
      />

      <div className="mobile-stat-grid mobile-stat-grid--sm-3 gap-3">
        <StatCard
          label={t("todayRevenue")}
          value={todayLoading ? "…" : formatCurrency(todayRevenue)}
          icon={TrendingUp}
          accent="emerald"
        />
        <StatCard label={t("completed")} value={todayLoading ? "…" : completed.length} icon={Users} accent="brand" />
        <StatCard
          label={t("inProgress")}
          value={todayLoading ? "…" : inProgress.length}
          icon={Clock}
          accent="amber"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <Card padding={false} className="min-w-0 shadow-sm ring-1 ring-[var(--border)]">
        <div className="px-4 py-3.5 border-b border-[var(--border)] bg-gradient-to-r from-indigo-50/80 to-violet-50/50 dark:from-indigo-950/30 dark:to-violet-950/20">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-bold text-sm text-[var(--text-primary)]">{t("recentVisits")}</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t("recentVisitsHint")}</p>
            </div>
            <Link href="/manager/walk-in?tab=history" className="link-brand text-xs font-semibold shrink-0 pt-0.5">
              {tCommon("viewAll")}
            </Link>
          </div>
          <div className="nav-tile-grid mt-3 pt-3 border-t border-[var(--border)]/80">
            <NavTile href="/manager/schedule" icon={CalendarClock} label={t("schedule")} hint={t("scheduleDesc")} accent="emerald" />
            <NavTile href="/manager/walk-in?tab=history" icon={ClipboardList} label={tNav("visits")} hint={t("bookingsDesc")} accent="brand" />
            <NavTile href="/manager/memberships" icon={CreditCard} label={tNav("memberships")} hint={t("membershipsDesc")} accent="violet" />
            <NavTile href="/manager/attendance" icon={Fingerprint} label={t("attendance")} hint={t("attendanceDesc")} accent="amber" />
          </div>
        </div>
        {todayLoading ? (
          <p className="p-4 text-sm text-[var(--text-secondary)]">{tCommon("loading")}</p>
        ) : queue.length === 0 ? (
          <div className="px-4 py-6 text-center space-y-3">
            <p className="font-semibold text-[var(--text-primary)]">{t("noVisitsTitle")}</p>
            <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">{t("noVisitsDesc")}</p>
            <Link href="/manager/walk-in?new=1" className={`${btnPrimary} inline-flex min-h-11`}>
              <UserPlus className="w-4 h-4" />
              {t("newWalkIn")}
            </Link>
          </div>
        ) : (
          <div>
            {queue.map((b) => (
              <ListRow
                key={b.id}
                onClick={
                  b.status !== "COMPLETED" && b.status !== "CANCELLED"
                    ? () => router.push(`/manager/walk-in?bookingId=${b.id}`)
                    : undefined
                }
                title={b.customerName}
                subtitle={`${formatTenantDateTime(b.createdAt, localeKit)} · ${b.lines?.map((l) => l.serviceName).join(", ") || "—"}`}
                trailing={
                  <div className="text-right min-w-0">
                    {b.billPreview ? (
                      <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)] tabular-nums truncate">
                        {formatCurrency(b.billPreview.grandTotal)}
                      </p>
                    ) : null}
                    <StatusBadge status={b.status} className="mt-0.5" />
                  </div>
                }
              />
            ))}
          </div>
        )}
      </Card>

      <section aria-labelledby="analysis-section">
        <Card padding={false} className="overflow-hidden shadow-sm ring-1 ring-[var(--border)]">
          <div className="px-4 py-4 border-b border-[var(--border)] bg-gradient-to-br from-[var(--brand-light)]/60 via-[var(--surface)] to-violet-50/30 dark:from-indigo-950/30 dark:via-[var(--surface)] dark:to-violet-950/15 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[var(--brand)] text-white flex items-center justify-center shadow-md shrink-0">
                  <BarChart3 className="w-4 h-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h2 id="analysis-section" className="font-bold text-[var(--text-primary)] leading-tight">
                    {t("analysisSection")}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{t("analysisSubtitle")}</p>
                </div>
              </div>
              <DateRangeSelector
                value={dateRange}
                onChange={setDateRange}
                testId="manager-home-date-range"
                className="w-full sm:max-w-[15.5rem] shrink-0"
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

          <div className="p-4 grid gap-4 md:grid-cols-2 min-w-0 bg-[var(--surface-muted)]/15">
            <InsightsTeaser data={recommendations} loading={recommendationsLoading} href="/manager/insights" previewCount={3} />
            <ServiceContributionTeaser data={serviceContribution} loading={servicesLoading} href="/manager/services" />
          </div>
        </Card>
      </section>
    </div>
  );
}
