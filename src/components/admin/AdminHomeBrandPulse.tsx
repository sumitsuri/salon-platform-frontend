"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Building2, CheckCircle2, ChevronRight, PartyPopper, Receipt } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCurrency, formatCurrencyCompact, cn } from "@/lib/utils";
import { ManagerHomeTargetChip, targetTrafficBand } from "@/components/manager/ManagerHomeTargetChip";
import { CenterModal } from "@/components/ui";
import type { BrandTargetAggregate } from "@/lib/admin-mtd-range";
import type { BranchTargetPerformanceItem } from "@/lib/api";
import type { LucideIcon } from "lucide-react";

type SpendBand = "healthy" | "high" | "over";

function spendBand(ratioPercent: number | null): SpendBand {
  if (ratioPercent == null) return "healthy";
  if (ratioPercent >= 100) return "over";
  if (ratioPercent >= 70) return "high";
  return "healthy";
}

const PERIOD_THEME: Record<string, string> = {
  violet: "manager-home-glance-metric--purple",
  sky: "manager-home-glance-metric--purple",
  emerald: "manager-home-glance-metric--green",
  amber: "manager-home-glance-metric--amber",
};

const SPEND_BAND_ICON: Record<SpendBand, LucideIcon> = {
  over: AlertTriangle,
  high: Receipt,
  healthy: CheckCircle2,
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

  const band = spendBand(expenseRatio);
  const Icon = SPEND_BAND_ICON[band];
  const barPct = expenseRatio != null ? Math.min(100, Math.max(0, expenseRatio)) : 0;
  const verdict =
    band === "over"
      ? t("brandExpenditureVerdictOver")
      : band === "high"
        ? t("brandExpenditureVerdictHigh")
        : t("brandExpenditureVerdictHealthy");

  return (
    <Link
      href={href}
      className={cn("admin-mtd-expense-compact", `admin-mtd-expense-compact--${band}`, "touch-manipulation")}
    >
      <span className="admin-mtd-expense-compact__top">
        <span className="admin-mtd-expense-compact__icon" aria-hidden>
          {band === "over" ? <span className="admin-mtd-expense-compact__icon-pulse" aria-hidden /> : null}
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="admin-mtd-expense-compact__verdict">{verdict}</span>
          <span className="admin-mtd-expense-compact__meta">
            {t("brandExpenditureMtdSpentShort", { amount: formatCurrency(totalExpenses) })}
            {expenseRatio != null ? " · " + t("brandExpenditureMtdRatioShort", { pct: expenseRatio }) : null}
          </span>
          <span className="admin-mtd-expense-compact__bar" aria-hidden>
            <span className="admin-mtd-expense-compact__bar-fill" style={{ width: `${barPct}%` }} />
          </span>
        </span>
      </span>
      <span className="admin-mtd-expense-compact__foot">
        <span className="admin-mtd-expense-compact__cta">
          {t("brandExpenditureFinanceHint")}
          <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
        </span>
      </span>
    </Link>
  );
}

/**
 * Always-visible trigger — one lean row with plain-language danger badges. Tapping opens
 * the full breakdown in a popup so the home screen never carries the detail twice.
 */
function PulseCompactTrigger({
  loading,
  achievementPercent,
  actualSales,
  monthlyTarget,
  behindCount,
  expenseRatio,
  onOpen,
}: {
  loading?: boolean;
  achievementPercent: number;
  actualSales: number;
  monthlyTarget: number;
  behindCount: number;
  expenseRatio: number | null;
  onOpen: () => void;
}) {
  const t = useTranslations("admin.dashboard");

  if (loading) {
    return (
      <div className="admin-pulse-summary animate-pulse min-h-[3.25rem] bg-[var(--surface-muted)]/50" aria-busy="true" />
    );
  }

  const band = targetTrafficBand(achievementPercent);
  const spendBandValue = spendBand(expenseRatio);
  const hasDanger = band === "red" || spendBandValue === "over" || behindCount > 0;
  const displayPct = Math.round(achievementPercent);
  const barPct = Math.min(100, Math.max(0, displayPct));

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn("admin-pulse-summary touch-manipulation", `admin-pulse-summary--${band}`)}
      aria-label={`${t("brandPulseSummaryLabel")} ${displayPct}% — ${t("brandPulseSummaryCta")}`}
    >
      <span className="manager-target-ring admin-pulse-summary-ring" style={{ ["--ring-pct" as string]: barPct }} aria-hidden>
        {band === "red" ? <span className="manager-target-ring-pulse" aria-hidden /> : null}
        <span className="manager-target-ring-inner">
          <span className="tabular-nums">{displayPct}%</span>
        </span>
      </span>

      <span className="admin-pulse-summary-text min-w-0">
        <span className="admin-pulse-summary-label">{t("brandPulseSummaryLabel")}</span>
        <span className="admin-pulse-summary-value tabular-nums">
          {formatCurrencyCompact(actualSales)}
          <span className="admin-pulse-summary-of"> {t("glanceTargetOfLabel")} </span>
          {formatCurrencyCompact(monthlyTarget)}
        </span>
      </span>

      <span className="admin-pulse-summary-badges">
        {hasDanger ? (
          <>
            {behindCount > 0 ? (
              <span className="admin-pulse-badge admin-pulse-badge--danger">
                <Building2 className="h-3 w-3 shrink-0" aria-hidden />
                {t("brandPulseBadgeBranches", { count: behindCount })}
              </span>
            ) : null}
            {spendBandValue === "over" ? (
              <span className="admin-pulse-badge admin-pulse-badge--danger">
                <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                {t("brandPulseBadgeSpend")}
              </span>
            ) : null}
          </>
        ) : (
          <span className="admin-pulse-badge admin-pulse-badge--ok">
            <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden />
            {t("brandPulseBadgeAllGood")}
          </span>
        )}
      </span>

      <ChevronRight className="admin-pulse-summary-chevron h-4 w-4 shrink-0" aria-hidden />
    </button>
  );
}

function BranchDangerHighlights({
  branches,
  href,
}: {
  branches: BranchTargetPerformanceItem[];
  href: string;
}) {
  const t = useTranslations("admin.dashboard");
  const withTarget = branches.filter((b) => (b.monthlySalesTarget ?? 0) > 0);
  if (withTarget.length === 0) return null;

  const behind = [...withTarget]
    .filter((b) => !b.meetingTarget)
    .sort((a, b) => (a.achievementPercent ?? 0) - (b.achievementPercent ?? 0));

  if (behind.length === 0) {
    return (
      <div className="admin-branch-danger admin-branch-danger--ok">
        <PartyPopper className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <p className="admin-branch-danger-label">{t("branchDangerAllOnPace", { count: withTarget.length })}</p>
      </div>
    );
  }

  return (
    <div className="admin-branch-danger">
      <p className="admin-branch-danger-label">
        <AlertTriangle className="admin-branch-danger-icon h-3.5 w-3.5 shrink-0" aria-hidden />
        {t("branchDangerBehindCount", { count: behind.length })}
      </p>
      <div className="admin-branch-danger-chips">
        {behind.map((b) => {
          const gap = Math.max(0, (b.monthlySalesTarget ?? 0) - (b.actualSales ?? 0));
          return (
            <Link key={b.branchId} href={`${href}?branchId=${b.branchId}`} className="admin-branch-danger-chip">
              <span className="admin-branch-danger-dot" aria-hidden />
              <span className="admin-branch-danger-chip-name truncate">{b.branchName}</span>
              <span className="admin-branch-danger-chip-gap tabular-nums">-{formatCurrency(gap)}</span>
            </Link>
          );
        })}
      </div>
    </div>
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
  brandBranches = [],
  targetPeriodLabel,
  plLoading,
  mtdExpenses,
  mtdSales,
  periodLoading,
  periodKpis,
  section = "full",
  hidePeriodHeading = false,
}: {
  mtdLoading: boolean;
  brandTarget: BrandTargetAggregate;
  /** Per-branch target performance — drives the "behind target" highlight chips. */
  brandBranches?: BranchTargetPerformanceItem[];
  periodLabel?: string;
  targetPeriodLabel?: string;
  plLoading: boolean;
  mtdExpenses: number;
  mtdSales: number;
  periodLoading: boolean;
  periodKpis: PeriodKpi[];
  /** full: CEO overview; mtd: header + target + spend; period: selected-range KPI grid */
  section?: AdminHomeBrandPulseSection;
  /** When a parent section already titles the block (mobile scope area). */
  hidePeriodHeading?: boolean;
}) {
  const t = useTranslations("admin.dashboard");
  const showMtd = section === "full" || section === "mtd";
  const showPeriod = section === "full" || section === "period";
  const [detailOpen, setDetailOpen] = useState(false);

  const behindCount = brandBranches.filter((b) => (b.monthlySalesTarget ?? 0) > 0 && !b.meetingTarget).length;
  const expenseRatio = mtdSales > 0 ? Math.round((mtdExpenses / mtdSales) * 100) : null;

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

          <PulseCompactTrigger
            loading={mtdLoading}
            achievementPercent={brandTarget.achievementPercent}
            actualSales={brandTarget.actualSales}
            monthlyTarget={brandTarget.monthlyTarget}
            behindCount={behindCount}
            expenseRatio={expenseRatio}
            onOpen={() => setDetailOpen(true)}
          />

          <CenterModal
            open={detailOpen}
            onClose={() => setDetailOpen(false)}
            title={t("brandPulseSummaryLabel")}
            subtitle={targetPeriodLabel}
          >
            <div className="space-y-3">
              <ManagerHomeTargetChip
                loading={mtdLoading}
                monthlyTarget={brandTarget.monthlyTarget}
                actualSales={brandTarget.actualSales}
                achievementPercent={brandTarget.achievementPercent}
                catchUpDaily={brandTarget.catchUpDailyAverage}
                dailyAverageExpected={brandTarget.dailyAverageExpected}
                daysRemaining={Math.max(0, brandTarget.daysInMonth - brandTarget.daysElapsed)}
                insightsHref="/admin/branches"
                messagesNamespace="admin.dashboard"
                compact
              />

              {!mtdLoading ? <BranchDangerHighlights branches={brandBranches} href="/admin/branches" /> : null}

              <ExpenditureMtdCompact loading={plLoading} totalExpenses={mtdExpenses} mtdSales={mtdSales} href="/admin/finance" />
            </div>
          </CenterModal>
        </>
      ) : null}

      {showPeriod ? (
        <>
          {!hidePeriodHeading ? (
            <p id="admin-ceo-period-heading" className="admin-ceo-period-label">
              {t("keyMetricsPeriodShort")}
            </p>
          ) : (
            <span id="admin-ceo-period-heading" className="sr-only">
              {t("keyMetricsPeriodShort")}
            </span>
          )}
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
