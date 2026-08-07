import { RecommendationsResponse } from "@/lib/api";
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
