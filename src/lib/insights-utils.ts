import { RecommendationsResponse, WeekdaySalesInsight } from "@/lib/api";
import type { SpotlightItem, SpotlightTone } from "@/components/SpotlightDeck";
import {
  DateRangePreset,
  ProductDateRange,
  DATE_RANGE_PRESET_LABELS,
  resolvePresetRange,
  toStartEndDates,
} from "@/lib/date-range";

/** @deprecated Use DateRangePreset from `@/lib/date-range`. */
export type InsightPeriod = DateRangePreset;

/** @deprecated Use DATE_RANGE_PRESET_LABELS from `@/lib/date-range`. */
export const INSIGHT_PERIOD_LABELS = DATE_RANGE_PRESET_LABELS;

export function insightPeriodToRange(
  period: DateRangePreset | ProductDateRange,
): { startDate: string; endDate: string } {
  if (typeof period === "object") {
    return toStartEndDates(period);
  }
  const { from, to } = resolvePresetRange(period);
  return toStartEndDates({ preset: period, from, to });
}

export function countInsights(data?: RecommendationsResponse): number {
  if (!data) return 0;
  const branchItems = data.branches.reduce((n, b) => n + b.items.length, 0);
  return data.brandWide.length + branchItems;
}

export function flattenInsights(data?: RecommendationsResponse) {
  if (!data) return [];
  const items = [...data.brandWide];
  for (const branch of data.branches) {
    items.push(...branch.items);
  }
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2, INFO: 3 };
  return items.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
}

export function severityToSpotlightTone(severity: string): SpotlightTone {
  if (severity === "HIGH") return "urgent";
  if (severity === "MEDIUM") return "insight";
  if (severity === "LOW") return "growth";
  return "celebrate";
}

const SPOTLIGHT_TONE_ORDER: Record<SpotlightTone, number> = {
  urgent: 0,
  insight: 1,
  growth: 2,
  celebrate: 3,
};

export function recommendationsToSpotlightItems(data?: RecommendationsResponse): SpotlightItem[] {
  if (!data) return [];
  const items: SpotlightItem[] = [];

  for (const item of data.brandWide) {
    items.push({
      id: `brand-${item.id}`,
      title: item.title,
      description: item.message,
      tone: severityToSpotlightTone(item.severity),
      metricLabel: item.metricLabel,
      metricValue: item.metricValue,
    });
  }

  for (const branch of data.branches) {
    for (const item of branch.items) {
      items.push({
        id: `${branch.branchId}-${item.id}`,
        title: `${branch.branchName} · ${item.title}`,
        description: item.message,
        tone: severityToSpotlightTone(item.severity),
        metricLabel: item.metricLabel,
        metricValue: item.metricValue,
        groupId: branch.branchId,
      });
    }
  }

  return items.sort((a, b) => (SPOTLIGHT_TONE_ORDER[a.tone] ?? 9) - (SPOTLIGHT_TONE_ORDER[b.tone] ?? 9));
}

export function weekdayActionsToSpotlightItems(insights: WeekdaySalesInsight[] = []): SpotlightItem[] {
  const items: SpotlightItem[] = [];

  for (const insight of insights) {
    for (const action of insight.slowDayActions) {
      const actionLines = action.actions.map((line, index) => `${index + 1}. ${line}`);
      items.push({
        id: `${insight.branchId}-${action.day}`,
        groupId: insight.branchId,
        dayKey: action.day,
        title: `${insight.branchName} · ${action.headline}`,
        description: [action.insight, ...actionLines].join("\n"),
        tone: severityToSpotlightTone(action.severity),
        metricLabel: action.metricLabel,
        metricValue: action.metricValue,
      });
    }
  }

  return items.sort((a, b) => (SPOTLIGHT_TONE_ORDER[a.tone] ?? 9) - (SPOTLIGHT_TONE_ORDER[b.tone] ?? 9));
}
