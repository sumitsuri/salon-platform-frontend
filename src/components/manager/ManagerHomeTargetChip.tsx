"use client";

import Link from "next/link";
import { ChevronRight, Flame, PartyPopper, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCurrency, cn } from "@/lib/utils";

export type TargetTrafficBand = "red" | "amber" | "green";

export function targetTrafficBand(achievementPercent: number): TargetTrafficBand {
  const pct = Math.round(achievementPercent);
  if (pct >= 100) return "green";
  if (pct >= 90) return "amber";
  return "red";
}

const BAND_ICON = { red: Flame, amber: Zap, green: PartyPopper } as const;

type Props = {
  loading?: boolean;
  monthlyTarget: number;
  actualSales: number;
  achievementPercent: number;
  catchUpDaily: number;
  dailyAverageExpected: number;
  /** Days left in the period — lets the action line say "for the next N days". */
  daysRemaining?: number;
  periodLabel?: string;
  insightsHref?: string;
  /** Defaults to manager.home */
  messagesNamespace?: string;
  /** Single-line footer — manager-style density for CEO dashboard */
  compact?: boolean;
};

export function ManagerHomeTargetChip({
  loading,
  monthlyTarget,
  actualSales,
  achievementPercent,
  catchUpDaily,
  dailyAverageExpected,
  daysRemaining,
  periodLabel,
  insightsHref = "/manager/insights",
  messagesNamespace = "manager.home",
  compact,
}: Props) {
  const t = useTranslations(messagesNamespace);
  const displayPct = Math.round(achievementPercent);
  const barPct = Math.min(100, Math.max(0, displayPct));
  const band = targetTrafficBand(achievementPercent);
  const remaining = Math.max(0, monthlyTarget - actualSales);
  const catchUpAmount = catchUpDaily > 0 ? catchUpDaily : dailyAverageExpected;
  const BandIcon = BAND_ICON[band];

  const actionLine =
    band === "green"
      ? t("glanceTargetActionGreen")
      : band === "amber"
        ? daysRemaining
          ? t("glanceTargetActionAmberWithDays", { remaining: formatCurrency(remaining), days: daysRemaining })
          : t("glanceTargetActionAmber", { remaining: formatCurrency(remaining) })
        : daysRemaining
          ? t("glanceTargetActionRedWithDays", { catchUp: formatCurrency(catchUpAmount), days: daysRemaining })
          : t("glanceTargetActionRed", { catchUp: formatCurrency(catchUpAmount) });

  if (loading) {
    return (
      <div className="manager-target-chip manager-target-chip--loading" aria-busy="true">
        <div className="manager-target-ring manager-target-ring--skeleton" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-3 w-28 rounded bg-[var(--surface-muted)] animate-pulse" />
          <div className="manager-target-bar manager-target-bar--skeleton" />
          <div className="h-2.5 w-full max-w-[14rem] rounded bg-[var(--surface-muted)] animate-pulse" />
        </div>
      </div>
    );
  }

  if (monthlyTarget <= 0) {
    return (
      <Link href={insightsHref} className="manager-target-chip manager-target-chip--unset touch-manipulation">
        <p className="text-xs font-semibold text-[var(--text-secondary)]">{t("glanceTargetUnset")}</p>
        <ChevronRight className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
      </Link>
    );
  }

  return (
    <Link
      href={insightsHref}
      className={cn(
        "manager-target-chip touch-manipulation",
        `manager-target-chip--${band}`,
        compact && "manager-target-chip--compact",
      )}
      aria-label={`${t("glanceTargetMonthLabel")}: ${formatCurrency(actualSales)} so far of ${formatCurrency(monthlyTarget)} target, ${displayPct} percent`}
    >
      <div className="manager-target-top">
        <div className="manager-target-ring" style={{ ["--ring-pct" as string]: barPct }} aria-hidden>
          {band === "red" ? <span className="manager-target-ring-pulse" aria-hidden /> : null}
          <div className="manager-target-ring-inner">
            <span className="tabular-nums">{displayPct}%</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="manager-target-title truncate">
            {t("glanceTargetMonthLabel")}
            {periodLabel ? <span className="manager-target-period"> · {periodLabel}</span> : null}
          </p>

          <p className="manager-target-progress-line tabular-nums">
            <span className="manager-target-progress-actual">{formatCurrency(actualSales)}</span>
            <span className="manager-target-progress-of"> {t("glanceTargetOfLabel")} </span>
            <span className="manager-target-progress-goal">{formatCurrency(monthlyTarget)}</span>
          </p>

          <div className="manager-target-bar" aria-hidden>
            <div className="manager-target-bar-fill" style={{ ["--target-pct" as string]: `${barPct}%` }} />
            {band === "red" ? <div className="manager-target-bar-marker" style={{ left: "90%" }} /> : null}
          </div>
        </div>
      </div>

      <div className="manager-target-foot">
        <p className="manager-target-action line-clamp-2 leading-snug">
          <BandIcon className="manager-target-action-icon h-3 w-3 shrink-0" aria-hidden />
          {actionLine}
        </p>
        <span className="manager-target-cta shrink-0">
          {t("glanceTargetCta")}
          <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
