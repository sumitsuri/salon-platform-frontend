import { RecommendationsResponse } from "@/lib/api";

export type InsightPeriod = "days60" | "month" | "week";

export const INSIGHT_PERIOD_LABELS: Record<InsightPeriod, string> = {
  days60: "Last 60 days",
  month: "This month",
  week: "Last 7 days",
};

export function insightPeriodToRange(period: InsightPeriod): { startDate: string; endDate: string } {
  const today = new Date();
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (period === "week") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { startDate: fmt(start), endDate: fmt(today) };
  }
  if (period === "days60") {
    const start = new Date(today);
    start.setDate(start.getDate() - 59);
    return { startDate: fmt(start), endDate: fmt(today) };
  }
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return { startDate: fmt(start), endDate: fmt(today) };
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
