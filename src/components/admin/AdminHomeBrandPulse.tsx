"use client";

import Link from "next/link";
import { ChevronRight, Receipt } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCurrency, cn } from "@/lib/utils";
import { ManagerHomeTargetChip } from "@/components/manager/ManagerHomeTargetChip";
import type { BrandTargetAggregate } from "@/lib/admin-mtd-range";
import type { LucideIcon } from "lucide-react";

const PERIOD_THEME: Record<string, string> = {
  violet: "manager-home-glance-metric--purple",
  sky: "manager-home-glance-metric--purple",
  emerald: "manager-home-glance-metric--green",
  amber: "manager-home-glance-metric--amber",
};

function ExpenditureMtdCompact({
  loading,
  totalExpenses,
  mtdSales,
  href,
}: {
  loading?: boolean;
  totalExpenses: number;
  mtdSales: number;
  href: string;
}) {
  const t = useTranslations("admin.dashboard");
  const expenseRatio = mtdSales > 0 ? Math.round((totalExpenses / mtdSales) * 100) : null;

  if (loading) {
    return <div className="admin-mtd-expense-compact animate-pulse min-h-[2.75rem] bg-[var(--surface-muted)]/50" aria-busy="true" />;
  }

  return (
    <Link href={href} className="admin-mtd-expense-compact touch-manipulation">
      <span className="admin-mtd-expense-compact__icon" aria-hidden>
        <Receipt className="h-3.5 w-3.5" />
      </span>
      <span className="admin-mtd-expense-compact__label">{t("brandExpenditureMtdShort")}</span>
      <span className="admin-mtd-expense-compact__value tabular-nums">{formatCurrency(totalExpenses)}</span>
      <span className="admin-mtd-expense-compact__meta">
        {expenseRatio != null ? t("brandExpenditureMtdRatioShort", { pct: expenseRatio }) : t("brandExpenditureMtdHint")}
        {" · "}
        {t("brandExpenditureFinanceHint")}
      </span>
    </Link>
  );
}

function PeriodMetricCell({
  href,
  label,
  value,
  icon: Icon,
  accent = "violet",
  loading,
}: {
  href?: string;
  label: string;
  value: string | number;
  icon?: LucideIcon;
  accent?: "violet" | "sky" | "emerald" | "amber";
  loading?: boolean;
}) {
  const theme = PERIOD_THEME[accent] ?? PERIOD_THEME.violet;
  const inner = (
    <>
      <div className="admin-ceo-period-metric__top">
        {Icon ? (
          <span className="manager-home-glance-metric-icon" aria-hidden>
            <Icon className="h-3 w-3" />
          </span>
        ) : null}
        <span className="admin-ceo-period-metric__value tabular-nums">{loading ? "…" : value}</span>
      </div>
      <span className="admin-ceo-period-metric__label">{label}</span>
    </>
  );

  const className = cn("manager-home-glance-metric admin-ceo-period-metric touch-manipulation", theme);

  if (href && !loading) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}

type PeriodKpi = {
  label: string;
  value: string | number;
  href?: string;
  icon?: LucideIcon;
  accent?: "violet" | "sky" | "emerald" | "amber";
};

export type AdminHomeBrandPulseSection = "full" | "mtd" | "period";

export function AdminHomeBrandPulse({
  mtdLoading,
  brandTarget,
  targetPeriodLabel,
  plLoading,
  mtdExpenses,
  mtdSales,
  periodLoading,
  periodKpis,
  section = "full",
}: {
  mtdLoading: boolean;
  brandTarget: BrandTargetAggregate;
  periodLabel?: string;
  targetPeriodLabel?: string;
  plLoading: boolean;
  mtdExpenses: number;
  mtdSales: number;
  periodLoading: boolean;
  periodKpis: PeriodKpi[];
  /** full: CEO overview; mtd: header + target + spend; period: selected-range KPI grid */
  section?: AdminHomeBrandPulseSection;
}) {
  const t = useTranslations("admin.dashboard");
  const showMtd = section === "full" || section === "mtd";
  const showPeriod = section === "full" || section === "period";

  return (
    <section
      className={cn(
        "manager-home-glance admin-ceo-pulse min-w-0 max-w-full",
        section === "period" && "admin-ceo-pulse--period-only",
      )}
      aria-labelledby={showMtd ? "admin-ceo-pulse-title" : "admin-ceo-period-heading"}
    >
      {showMtd ? (
        <>
          <div className="manager-home-glance-head">
            <div className="min-w-0 flex-1 w-full">
              <h2 id="admin-ceo-pulse-title" className="manager-home-glance-title text-base sm:text-[1.0625rem]">
                {t("brandPulseMtdTitle")}
              </h2>
              {targetPeriodLabel ? (
                <p className="manager-home-glance-tagline truncate">{targetPeriodLabel}</p>
              ) : (
                <p className="manager-home-glance-tagline">{t("brandPulseMtdHintShort")}</p>
              )}
            </div>
          </div>

          <ManagerHomeTargetChip
            loading={mtdLoading}
            monthlyTarget={brandTarget.monthlyTarget}
            actualSales={brandTarget.actualSales}
            achievementPercent={brandTarget.achievementPercent}
            catchUpDaily={brandTarget.catchUpDailyAverage}
            dailyAverageActual={brandTarget.dailyAverageActual}
            dailyAverageExpected={brandTarget.dailyAverageExpected}
            insightsHref="/admin/branches"
            messagesNamespace="admin.dashboard"
            compact
          />

          <ExpenditureMtdCompact
            loading={plLoading}
            totalExpenses={mtdExpenses}
            mtdSales={mtdSales}
            href="/admin/finance"
          />
        </>
      ) : null}

      {showPeriod ? (
        <>
          <p id="admin-ceo-period-heading" className="admin-ceo-period-label">
            {t("keyMetricsPeriodShort")}
          </p>
          <div className="manager-home-glance-metrics">
            {periodKpis.map((item) => (
              <PeriodMetricCell
                key={item.label}
                href={item.href}
                label={item.label}
                value={item.value}
                icon={item.icon}
                accent={item.accent}
                loading={periodLoading}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
