"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ChevronRight, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { DashboardWidgetCard } from "@/components/enterprise-ui";
import { staffPortalMtdRange } from "@/components/staff/staff-mtd-range";

const HOME_SUGGESTION_LIMIT = 4;

export function StaffHomeTargetRecommendations({ className }: { className?: string }) {
  const t = useTranslations("staff.growth");
  const tHome = useTranslations("staff.home");
  const range = useMemo(() => staffPortalMtdRange(), []);

  const { data: insights, isLoading } = useQuery({
    queryKey: ["staff-portal-sales-insights-home", range.from, range.to],
    queryFn: () => api.getStaffPortalSalesInsights(range.from, range.to),
  });

  const boost = insights?.boost;
  const suggestions = useMemo(() => {
    const list = boost?.suggestions ?? [];
    return list.filter((s) => s.serviceName !== "On target").slice(0, HOME_SUGGESTION_LIMIT);
  }, [boost?.suggestions]);

  if (isLoading) {
    return (
      <DashboardWidgetCard className={cn("staff-home-panel-card min-w-0", className)}>
        <div className="staff-home-summary-body">
          <p className="text-sm text-[var(--text-secondary)]">{t("loading")}</p>
        </div>
      </DashboardWidgetCard>
    );
  }

  if (!boost || boost.monthlyTarget <= 0) {
    return null;
  }

  return (
    <DashboardWidgetCard className={cn("staff-home-panel-card min-w-0", className)}>
      <div className="staff-home-summary-body">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-200"
              aria-hidden
            >
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">{t("targetFocusTitle")}</h2>
              <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-secondary)]">{t("boostPackagesLead")}</p>
            </div>
          </div>
          <Link
            href="/staff/sales"
            className="flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-[var(--brand-text)] hover:underline"
          >
            {tHome("viewSales")}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        <p className="mt-2 text-[11px] font-semibold text-[var(--text-secondary)]">
          {t("boostTrack", { track: boost.trackLabel })}
        </p>
        {boost.gapToTarget > 0 ? (
          <p className="mt-1 text-xs font-bold text-amber-900 dark:text-amber-200">
            {t("boostGap", {
              gap: formatCurrency(boost.gapToTarget),
              daily: formatCurrency(boost.dailyNeeded),
              days: boost.daysRemaining,
            })}
          </p>
        ) : (
          <p className="mt-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">{t("boostOnTarget")}</p>
        )}

        {suggestions.length > 0 ? (
          <ul className="mt-2.5 space-y-2">
            {suggestions.map((s) => (
              <li
                key={`${s.serviceName}-${s.packageOffer ? "pkg" : "svc"}`}
                className={cn(
                  "rounded-lg border bg-[var(--surface-muted)]/35 px-3 py-2 text-xs",
                  s.packageOffer ? "border-amber-400/60 ring-1 ring-amber-300/30" : "border-[var(--border)]/70",
                )}
              >
                <p className="flex flex-wrap items-center gap-1.5 font-bold text-[var(--text-primary)]">
                  {s.packageOffer && (
                    <span className="rounded-md bg-amber-200/90 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-950">
                      {t("boostPackageBadge")}
                    </span>
                  )}
                  {t("boostSuggested", {
                    count: s.suggestedCount,
                    service: s.serviceName,
                    amount: formatCurrency(s.typicalAmount),
                  })}
                </p>
                <p className="mt-0.5 text-[var(--text-secondary)]">{s.rationale}</p>
                {boost.gapToTarget > 0 && s.estimatedRevenue > 0 && (
                  <p className="mt-1 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                    {t("boostEst", { revenue: formatCurrency(s.estimatedRevenue) })}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </DashboardWidgetCard>
  );
}
