"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCurrency, cn } from "@/lib/utils";

export type TargetTrafficBand = "red" | "amber" | "green";

export function targetTrafficBand(achievementPercent: number): TargetTrafficBand {
  const pct = Math.round(achievementPercent);
  if (pct >= 100) return "green";
  if (pct >= 90) return "amber";
  return "red";
}

type Props = {
  loading?: boolean;
  monthlyTarget: number;
  actualSales: number;
  achievementPercent: number;
  catchUpDaily: number;
  dailyAverageActual: number;
  dailyAverageExpected: number;
  periodLabel?: string;
};

export function ManagerHomeTargetChip({
  loading,
  monthlyTarget,
  actualSales,
  achievementPercent,
  catchUpDaily,
  dailyAverageActual,
  dailyAverageExpected,
  periodLabel,
}: Props) {
  const t = useTranslations("manager.home");
  const displayPct = Math.round(achievementPercent);
  const barPct = Math.min(100, Math.max(0, displayPct));
  const band = targetTrafficBand(achievementPercent);
  const remaining = Math.max(0, monthlyTarget - actualSales);

  const actionLine =
    band === "green"
      ? t("glanceTargetActionGreen")
      : band === "amber"
        ? t("glanceTargetActionAmber", { remaining: formatCurrency(remaining) })
        : catchUpDaily > 0
          ? t("glanceTargetActionRed", { catchUp: formatCurrency(catchUpDaily) })
          : t("glanceTargetActionRed", { catchUp: formatCurrency(dailyAverageExpected) });

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
      <Link href="/manager/insights" className="manager-target-chip manager-target-chip--unset touch-manipulation">
        <p className="text-xs font-semibold text-[var(--text-secondary)]">{t("glanceTargetUnset")}</p>
        <ChevronRight className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
      </Link>
    );
  }

  return (
    <Link
      href="/manager/insights"
      className={cn("manager-target-chip touch-manipulation", `manager-target-chip--${band}`)}
      aria-label={`${t("glanceTargetMonthLabel")}, ${displayPct} percent, ${formatCurrency(actualSales)} of ${formatCurrency(monthlyTarget)}`}
    >
      <div
        className="manager-target-ring"
        style={{ ["--ring-pct" as string]: barPct }}
        aria-hidden
      >
        <div className="manager-target-ring-inner">
          <span className="tabular-nums">{displayPct}%</span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[11px] font-bold leading-tight">
            {t("glanceTargetMonthLabel")}
            {periodLabel ? (
              <span className="hidden font-semibold opacity-75 sm:inline"> · {periodLabel}</span>
            ) : null}
          </p>
          <p className="shrink-0 text-[11px] font-bold tabular-nums leading-tight">
            {formatCurrency(actualSales)}
            <span className="font-semibold opacity-60"> / {formatCurrency(monthlyTarget)}</span>
          </p>
        </div>

        <div className="manager-target-bar" aria-hidden>
          <div
            className="manager-target-bar-fill"
            style={{ ["--target-pct" as string]: `${barPct}%` }}
          />
          {band === "red" ? <div className="manager-target-bar-marker" style={{ left: "90%" }} /> : null}
        </div>

        <p className="manager-target-action">{actionLine}</p>
        <p className="manager-target-pace">
          {t("glanceTargetPaceLine", {
            actual: formatCurrency(dailyAverageActual),
            expected: formatCurrency(dailyAverageExpected),
          })}
          <span className="manager-target-insights-hint"> · {t("glanceTargetInsightsHint")}</span>
        </p>
      </div>

      <ChevronRight className="manager-target-chevron h-4 w-4 shrink-0" aria-hidden />
    </Link>
  );
}
