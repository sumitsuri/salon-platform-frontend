"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays } from "lucide-react";
import { WeekdaySalesInsight } from "@/lib/api";
import { weekdayActionsToSpotlightItems } from "@/lib/insights-utils";
import { formatCurrency, cn } from "@/lib/utils";
import { Card } from "@/components/ui";
import { PanelShell } from "@/components/enterprise-ui";
import { SpotlightDeck, SpotlightSection, type SpotlightItem } from "@/components/SpotlightDeck";

const DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

function WeekdayTrendChart({
  insight,
  highlightDay,
  legend,
}: {
  insight: WeekdaySalesInsight;
  highlightDay?: string;
  legend?: string;
}) {
  const ordered = [...insight.dayStats].sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
  );
  const max = Math.max(...ordered.map((d) => d.avgRevenuePerDay), 1);

  return (
    <div className="weekday-trend-chart">
      <div className="weekday-trend-chart-head">
        <p className="weekday-trend-chart-branch">{insight.branchName}</p>
        <p className="weekday-trend-chart-legend">{legend}</p>
      </div>

      <div className="weekday-trend-chart-grid" role="img" aria-label={`Weekday revenue trend for ${insight.branchName}`}>
        {ordered.map((day) => {
          const height = Math.max(12, Math.round((day.avgRevenuePerDay / max) * 100));
          const isHighlighted = highlightDay === day.day;
          return (
            <div
              key={day.day}
              className={cn(
                "weekday-trend-chart-col",
                day.slowDay && "weekday-trend-chart-col--slow",
                isHighlighted && "weekday-trend-chart-col--active"
              )}
            >
              <span className="weekday-trend-chart-value tabular-nums">
                {formatCurrency(day.avgRevenuePerDay)}
              </span>
              <div className="weekday-trend-chart-bar-track">
                <div
                  className={cn(
                    "weekday-trend-chart-bar mp-bar-fill",
                    day.slowDay ? "weekday-trend-chart-bar--slow" : "weekday-trend-chart-bar--strong"
                  )}
                  style={{ height: `${height}%` }}
                  title={`${day.dayLabel}: ${formatCurrency(day.avgRevenuePerDay)} avg`}
                />
              </div>
              <span className="weekday-trend-chart-day">{day.dayLabel.slice(0, 3)}</span>
              {day.slowDay && day.vsWeeklyAvgPct !== 0 ? (
                <span className="weekday-trend-chart-delta tabular-nums">
                  {day.vsWeeklyAvgPct > 0 ? "+" : ""}
                  {day.vsWeeklyAvgPct.toFixed(0)}%
                </span>
              ) : (
                <span className="weekday-trend-chart-delta weekday-trend-chart-delta--placeholder" aria-hidden>
                  ·
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekdayBoostBody({
  withData,
  items,
  insightByBranch,
  revealHint,
  actionsLabel,
  chartLegend,
}: {
  withData: WeekdaySalesInsight[];
  items: SpotlightItem[];
  insightByBranch: Map<string, WeekdaySalesInsight>;
  revealHint: string;
  actionsLabel: string;
  chartLegend: string;
}) {
  const initialInsight = withData[0];
  const [chartInsight, setChartInsight] = useState(initialInsight);
  const [highlightDay, setHighlightDay] = useState<string | undefined>(items[0]?.dayKey);

  const syncChartFromItem = useCallback(
    (item: SpotlightItem) => {
      const insight = item.groupId ? insightByBranch.get(item.groupId) : initialInsight;
      if (insight) setChartInsight(insight);
      setHighlightDay(item.dayKey);
    },
    [insightByBranch, initialInsight]
  );

  useEffect(() => {
    if (items[0]) syncChartFromItem(items[0]);
  }, [items, syncChartFromItem]);

  return (
    <div className="weekday-boost-body">
      <WeekdayTrendChart insight={chartInsight} highlightDay={highlightDay} legend={chartLegend} />

      <div className="weekday-boost-actions">
        <p className="weekday-boost-actions-label">{actionsLabel}</p>
        <SpotlightDeck
          items={items}
          revealHint={revealHint}
          onActiveItemChange={syncChartFromItem}
          className="px-0 pb-0 pt-0"
        />
      </div>
    </div>
  );
}

interface WeekdayBoostPanelProps {
  insights?: WeekdaySalesInsight[];
  loading?: boolean;
  variant?: "ceo" | "manager";
  compact?: boolean;
}

export function WeekdayBoostPanel({
  insights = [],
  loading,
  variant = "ceo",
  compact = false,
}: WeekdayBoostPanelProps) {
  const t = useTranslations("components.weekdayBoostPanel");
  const withData = insights.filter((i) => i.dayStats.length > 0);
  const items = weekdayActionsToSpotlightItems(withData);
  const insightByBranch = useMemo(
    () => new Map(withData.map((insight) => [insight.branchId, insight])),
    [withData]
  );
  const chartLegend = compact ? t("chartLegendShort") : t("chartLegend");

  if (loading) {
    if (compact) {
      return (
        <SpotlightSection title={t("title")} icon={CalendarDays} iconVariant="weekday">
          <SpotlightDeck items={[]} loading revealHint={t("revealHint")} />
        </SpotlightSection>
      );
    }
    return (
      <Card>
        <p className="text-sm text-[var(--text-secondary)]">{t("loading")}</p>
      </Card>
    );
  }

  if (withData.length === 0) {
    return null;
  }

  if (compact) {
    if (items.length === 0) {
      return (
        <SpotlightSection title={t("title")} icon={CalendarDays} iconVariant="weekday">
          <div className="weekday-boost-body weekday-boost-body--empty">
            <WeekdayTrendChart insight={withData[0]} legend={chartLegend} />
            <p className="weekday-boost-balanced">{t("balanced")}</p>
          </div>
        </SpotlightSection>
      );
    }

    return (
      <SpotlightSection title={t("title")} icon={CalendarDays} iconVariant="weekday" count={items.length}>
        <WeekdayBoostBody
          withData={withData}
          items={items}
          insightByBranch={insightByBranch}
          revealHint={t("revealHint")}
          actionsLabel={t("actionsLabel")}
          chartLegend={chartLegend}
        />
      </SpotlightSection>
    );
  }

  return (
    <PanelShell
      title={t("title")}
      subtitle={variant === "manager" ? t("managerSubtitle") : t("ceoSubtitle")}
      icon={CalendarDays}
      accent="amber"
    >
      {variant === "manager" && withData.length === 1 ? (
        <WeekdayBoostBody
          withData={withData}
          items={items}
          insightByBranch={insightByBranch}
          revealHint={t("revealHint")}
          actionsLabel={t("actionsLabel")}
          chartLegend={chartLegend}
        />
      ) : (
        <div className="space-y-6">
          {withData.map((insight) => {
            const branchItems = items.filter((item) => item.groupId === insight.branchId);
            return (
              <div key={insight.branchId} className="weekday-boost-body weekday-boost-body--stacked">
                <WeekdayTrendChart insight={insight} legend={chartLegend} />
                {branchItems.length > 0 ? (
                  <div className="weekday-boost-actions">
                    <p className="weekday-boost-actions-label">{t("actionsLabel")}</p>
                    <SpotlightDeck
                      items={branchItems}
                      revealHint={t("revealHint")}
                      className="px-0 pb-0 pt-0"
                    />
                  </div>
                ) : (
                  <p className="weekday-boost-balanced">{t("balanced")}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PanelShell>
  );
}
