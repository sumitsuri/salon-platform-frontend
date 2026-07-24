"use client";

import { useTranslations } from "next-intl";
import { CalendarDays, TrendingDown, Zap } from "lucide-react";
import { WeekdaySalesInsight } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { Card, StatusBadge } from "@/components/ui";

const DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

function DayTrendChart({ insight }: { insight: WeekdaySalesInsight }) {
  const t = useTranslations("components.weekdayBoostPanel");
  const ordered = [...insight.dayStats].sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
  );
  const max = Math.max(...ordered.map((d) => d.avgRevenuePerDay), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1.5 h-28">
        {ordered.map((day) => {
          const height = Math.max(8, Math.round((day.avgRevenuePerDay / max) * 100));
          return (
            <div key={day.day} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div className="w-full flex items-end justify-center h-20">
                <div
                  className={cn(
                    "w-full max-w-[2.25rem] rounded-t-md transition-all",
                    day.slowDay ? "bg-amber-400 dark:bg-amber-500" : "bg-[var(--brand)]"
                  )}
                  style={{ height: `${height}%` }}
                  title={`${day.dayLabel}: ${formatCurrency(day.avgRevenuePerDay)} avg`}
                />
              </div>
              <span className="text-[9px] font-semibold text-[var(--text-tertiary)] truncate w-full text-center">
                {day.dayLabel.slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-[var(--text-tertiary)]">{t("chartLegend")}</p>
    </div>
  );
}

function SlowDayCard({ action }: { action: WeekdaySalesInsight["slowDayActions"][0] }) {
  const t = useTranslations("components.weekdayBoostPanel");
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shrink-0">
            <TrendingDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-[var(--text-primary)]">{action.headline}</p>
            <p className="text-xs text-[var(--text-secondary)]">{action.dayLabel}</p>
          </div>
        </div>
        <StatusBadge status={action.severity} className="shrink-0" />
      </div>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{action.insight}</p>
      {action.metricLabel && action.metricValue && (
        <p className="text-xs text-[var(--text-tertiary)] mt-2">
          <span className="font-medium">{action.metricLabel}:</span> {action.metricValue}
        </p>
      )}
      <div className="mt-3 space-y-2">
        <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-[var(--brand-text)]" />
          {t("actionsTitle")}
        </p>
        <ul className="space-y-1.5">
          {action.actions.map((item, i) => (
            <li key={i} className="text-sm text-[var(--text-secondary)] flex gap-2 leading-snug">
              <span className="text-[var(--brand-text)] font-bold shrink-0">{i + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function BranchWeekdaySection({ insight }: { insight: WeekdaySalesInsight }) {
  const t = useTranslations("components.weekdayBoostPanel");
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{insight.branchName}</h3>
      <DayTrendChart insight={insight} />
      {insight.slowDayActions.length > 0 ? (
        <div className="grid gap-3">
          {insight.slowDayActions.map((action) => (
            <SlowDayCard key={action.day} action={action} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">{t("balanced")}</p>
      )}
    </div>
  );
}

interface WeekdayBoostPanelProps {
  insights?: WeekdaySalesInsight[];
  loading?: boolean;
  variant?: "ceo" | "manager";
}

export function WeekdayBoostPanel({ insights = [], loading, variant = "ceo" }: WeekdayBoostPanelProps) {
  const t = useTranslations("components.weekdayBoostPanel");

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-[var(--text-secondary)]">{t("loading")}</p>
      </Card>
    );
  }

  const withData = insights.filter((i) => i.dayStats.length > 0);
  if (withData.length === 0) {
    return null;
  }

  return (
    <Card padding={false}>
      <div className="px-4 py-3.5 border-b border-[var(--border)] flex items-center gap-2">
        <CalendarDays className="w-5 h-5 text-[var(--brand-text)] shrink-0" />
        <div className="min-w-0">
          <h2 className="font-semibold text-[var(--text-primary)] text-sm">{t("title")}</h2>
          <p className="text-xs text-[var(--text-secondary)] truncate">
            {variant === "manager" ? t("managerSubtitle") : t("ceoSubtitle")}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {variant === "manager" && withData.length === 1 ? (
          <BranchWeekdaySection insight={withData[0]} />
        ) : (
          withData.map((insight) => <BranchWeekdaySection key={insight.branchId} insight={insight} />)
        )}
      </div>
    </Card>
  );
}
