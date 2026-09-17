"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  BadgePercent,
  FileText,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { api, type Dashboard, type TrendPoint } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { ManagerHomeDateSelector } from "./ManagerHomeDateSelector";
import { ManagerHomeTargetChip } from "./ManagerHomeTargetChip";
import {
  branchTargetTrackingRange,
  getManagerHomeDefaultRange,
  percentChange,
  previousComparisonRange,
  resolveManagerHomeRange,
  type ManagerHomeDateRange,
} from "@/lib/manager-home-date-range";

function MiniSparkline({ points, stroke }: { points: number[]; stroke: string }) {
  if (points.length < 2) {
    return <svg className="manager-home-glance-spark" viewBox="0 0 80 20" preserveAspectRatio="none" aria-hidden />;
  }
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const coords = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * 80;
      const y = 18 - ((v - min) / span) * 16;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className="manager-home-glance-spark" viewBox="0 0 80 20" preserveAspectRatio="none" aria-hidden>
      <polyline fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" points={coords} />
    </svg>
  );
}

function GlanceMetricCard({
  label,
  value,
  changePct,
  compareLabel,
  compareShortLabel,
  icon: Icon,
  theme,
  sparkValues,
  loading,
}: {
  label: string;
  value: string;
  changePct: number | null;
  compareLabel: string;
  compareShortLabel: string;
  icon: LucideIcon;
  theme: "green" | "purple" | "pink" | "amber";
  sparkValues: number[];
  loading?: boolean;
}) {
  const up = changePct != null && changePct >= 0;
  const TrendIcon = up ? TrendingUp : TrendingDown;
  const stroke =
    theme === "green"
      ? "#059669"
      : theme === "purple"
        ? "#7c3aed"
        : theme === "pink"
          ? "#db2777"
          : "#d97706";

  return (
    <div className={cn("manager-home-glance-metric", `manager-home-glance-metric--${theme}`)}>
      <div className="manager-home-glance-metric-top">
        <span className="manager-home-glance-metric-icon" aria-hidden>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="manager-home-glance-metric-label">{label}</span>
      </div>
      <p className={cn("manager-home-glance-metric-value tabular-nums", loading && "animate-pulse opacity-70")}>
        {loading ? "…" : value}
      </p>
      <div className="manager-home-glance-metric-delta">
        {changePct != null && !loading ? (
          <div className="manager-home-glance-metric-delta-row">
            <TrendIcon className={cn("h-2.5 w-2.5 shrink-0", up ? "text-emerald-600" : "text-rose-600")} aria-hidden />
            <span className={cn("text-[9px] font-bold tabular-nums leading-none sm:text-[10px]", up ? "text-emerald-700" : "text-rose-700")}>
              {up ? "+" : ""}
              {Math.round(changePct)}%
            </span>
          </div>
        ) : (
          <span className="text-[9px] font-medium text-[var(--text-tertiary)]">—</span>
        )}
        <span className="manager-home-glance-metric-compare" title={compareLabel}>
          <span className="manager-home-glance-metric-compare-full">{compareLabel}</span>
          <span className="manager-home-glance-metric-compare-short">{compareShortLabel}</span>
        </span>
      </div>
      <MiniSparkline points={sparkValues} stroke={stroke} />
    </div>
  );
}

function pickBranchTrendPoints(dashboard: Dashboard | undefined, branchId: string): TrendPoint[] {
  if (!dashboard?.branchTrends?.length) return [];
  const row = dashboard.branchTrends.find((b) => b.branchId === branchId) ?? dashboard.branchTrends[0];
  return row?.points ?? [];
}

type Props = {
  branchId: string;
};

export function ManagerHomeGlanceSection({ branchId }: Props) {
  const t = useTranslations("manager.home");
  const [dateRange, setDateRange] = useState<ManagerHomeDateRange>(() => getManagerHomeDefaultRange());
  const resolved = resolveManagerHomeRange(dateRange);
  const compareRange = previousComparisonRange(resolved.from, resolved.to);
  const branchFilter = branchId ? [branchId] : undefined;
  const targetRange = branchTargetTrackingRange(resolved);

  const compareLabel =
    dateRange.preset === "today" ? t("comparePreviousDay") : t("comparePreviousPeriod");
  const compareShortLabel =
    dateRange.preset === "today" ? t("comparePreviousDayShort") : t("comparePreviousPeriodShort");

  const { data: current, isLoading: currentLoading } = useQuery({
    queryKey: ["manager-glance", branchId, resolved.from, resolved.to],
    queryFn: () =>
      api.getDashboard({
        startDate: resolved.from,
        endDate: resolved.to,
        branchIds: branchFilter,
      }),
    enabled: !!branchId,
  });

  const { data: previous, isLoading: previousLoading } = useQuery({
    queryKey: ["manager-glance-prev", branchId, compareRange.startDate, compareRange.endDate],
    queryFn: () =>
      api.getDashboard({
        startDate: compareRange.startDate,
        endDate: compareRange.endDate,
        branchIds: branchFilter,
      }),
    enabled: !!branchId,
  });

  const { data: targetPerf, isLoading: targetLoading } = useQuery({
    queryKey: ["manager-glance-target", branchId, targetRange.from, targetRange.to],
    queryFn: () =>
      api.getBranchTargetPerformance({
        startDate: targetRange.from,
        endDate: targetRange.to,
        branchIds: branchFilter,
      }),
    enabled: !!branchId,
  });

  const loading = currentLoading || previousLoading;
  const trendPoints = pickBranchTrendPoints(current, branchId);

  const metrics = useMemo(() => {
    const cur = current;
    const prev = previous;
    return {
      revenue: {
        value: formatCurrency(cur?.totalRevenue ?? 0),
        change: percentChange(cur?.totalRevenue ?? 0, prev?.totalRevenue ?? 0),
        spark: trendPoints.map((p) => p.revenue),
      },
      visits: {
        value: String(cur?.totalVisits ?? 0),
        change: percentChange(cur?.totalVisits ?? 0, prev?.totalVisits ?? 0),
        spark: trendPoints.map((p) => p.visits),
      },
      discounts: {
        value: formatCurrency(cur?.totalDiscounts ?? 0),
        change: percentChange(cur?.totalDiscounts ?? 0, prev?.totalDiscounts ?? 0),
        spark: trendPoints.map((p) => p.discounts),
      },
      avgTicket: {
        value: formatCurrency(cur?.avgTicketSize ?? 0),
        change: percentChange(cur?.avgTicketSize ?? 0, prev?.avgTicketSize ?? 0),
        spark: trendPoints.map((p) => p.avgTicket),
      },
    };
  }, [current, previous, trendPoints]);

  const targetBranch = targetPerf?.branches.find((b) => b.branchId === branchId) ?? targetPerf?.branches[0];
  const targetActual = targetBranch?.actualSales ?? 0;
  const targetGoal = targetBranch?.monthlySalesTarget ?? 0;
  const catchUp = targetBranch?.catchUpDailyAverage ?? 0;
  const dailyActual = targetBranch?.dailyAverageActual ?? 0;
  const dailyExpected = targetBranch?.dailyAverageExpected ?? 0;
  const achievementRaw = targetBranch?.achievementPercent ?? 0;

  return (
    <section className="manager-home-glance" aria-labelledby="manager-home-glance-title">
      <div className="manager-home-glance-head">
        <div className="min-w-0 flex-1">
          <h2 id="manager-home-glance-title" className="manager-home-glance-title">
            {t("glanceTitle")} <span aria-hidden>☀️</span>
          </h2>
          <p className="manager-home-glance-tagline">{t("glanceTagline")}</p>
        </div>
      </div>

      <ManagerHomeDateSelector value={dateRange} onChange={setDateRange} className="w-full" />

      <ManagerHomeTargetChip
        loading={targetLoading}
        monthlyTarget={targetGoal}
        actualSales={targetActual}
        achievementPercent={achievementRaw}
        catchUpDaily={catchUp}
        dailyAverageActual={dailyActual}
        dailyAverageExpected={dailyExpected}
        periodLabel={targetPerf?.periodLabel}
      />

      <div className="manager-home-glance-metrics">
        <GlanceMetricCard
          label={t("glanceRevenue")}
          value={metrics.revenue.value}
          changePct={metrics.revenue.change}
          compareLabel={compareLabel}
          compareShortLabel={compareShortLabel}
          icon={BarChart3}
          theme="green"
          sparkValues={metrics.revenue.spark}
          loading={loading}
        />
        <GlanceMetricCard
          label={t("glanceWalkIns")}
          value={metrics.visits.value}
          changePct={metrics.visits.change}
          compareLabel={compareLabel}
          compareShortLabel={compareShortLabel}
          icon={Users}
          theme="purple"
          sparkValues={metrics.visits.spark}
          loading={loading}
        />
        <GlanceMetricCard
          label={t("glanceDiscounts")}
          value={metrics.discounts.value}
          changePct={metrics.discounts.change}
          compareLabel={compareLabel}
          compareShortLabel={compareShortLabel}
          icon={BadgePercent}
          theme="pink"
          sparkValues={metrics.discounts.spark}
          loading={loading}
        />
        <GlanceMetricCard
          label={t("glanceAvgTicket")}
          value={metrics.avgTicket.value}
          changePct={metrics.avgTicket.change}
          compareLabel={compareLabel}
          compareShortLabel={compareShortLabel}
          icon={FileText}
          theme="amber"
          sparkValues={metrics.avgTicket.spark}
          loading={loading}
        />
      </div>
    </section>
  );
}
