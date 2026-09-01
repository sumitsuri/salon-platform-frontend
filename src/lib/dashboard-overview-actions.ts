import type { AttendanceDashboard, Dashboard, RecommendationsResponse } from "@/lib/api";
import { flattenInsights } from "@/lib/insights-utils";
import type { ProductDateRange } from "@/lib/date-range";
import { adminBookingsPath } from "@/lib/navigation-scope";
import { resolveProductDateRange } from "@/lib/date-range";

export type OverviewActionTone = "urgent" | "growth" | "insight" | "celebrate";

export type OverviewAction = {
  id: string;
  titleKey: string;
  titleValues?: Record<string, string | number>;
  descKey: string;
  descValues?: Record<string, string | number>;
  href: string;
  tone: OverviewActionTone;
  metricLabel?: string;
  metricValue?: string;
};

export function deriveOverviewActions(input: {
  dashboard?: Dashboard;
  attendance?: AttendanceDashboard;
  recommendations?: RecommendationsResponse;
  dateRange: ProductDateRange;
  formatCurrency: (amount: number) => string;
}): OverviewAction[] {
  const { dashboard, attendance, recommendations, dateRange, formatCurrency } = input;
  if (!dashboard) return [];

  const actions: OverviewAction[] = [];
  const insights = flattenInsights(recommendations);
  const topInsight = insights[0];

  if (dashboard.totalVisits === 0) {
    actions.push({
      id: "zero-visits",
      titleKey: "actions.zeroVisitsTitle",
      descKey: "actions.zeroVisitsDesc",
      href: "/admin/campaigns",
      tone: "growth",
    });
  }

  if (dashboard.totalRevenue > 0) {
    const discountPct = Math.round((dashboard.totalDiscounts / dashboard.totalRevenue) * 100);
    if (discountPct >= 12) {
      actions.push({
        id: "high-discounts",
        titleKey: "actions.highDiscountsTitle",
        descKey: "actions.highDiscountsDesc",
        descValues: { pct: discountPct },
        href: "/admin/promotions",
        tone: "urgent",
        metricLabel: "Discounts",
        metricValue: formatCurrency(dashboard.totalDiscounts),
      });
    }
  }

  if (attendance && attendance.absentToday > 0) {
    actions.push({
      id: "staff-absent",
      titleKey: "actions.staffAbsentTitle",
      titleValues: { count: attendance.absentToday },
      descKey: "actions.staffAbsentDesc",
      href: "/admin/employees",
      tone: "urgent",
      metricLabel: "Present",
      metricValue: `${attendance.presentToday}/${attendance.totalStaff}`,
    });
  }

  if (topInsight) {
    actions.push({
      id: `insight-${topInsight.id}`,
      titleKey: "actions.insightTitle",
      titleValues: { title: topInsight.title },
      descKey: "actions.insightDesc",
      href: "/admin/insights",
      tone: topInsight.severity === "HIGH" ? "urgent" : "insight",
      metricLabel: topInsight.metricLabel,
      metricValue: topInsight.metricValue,
    });
  }

  const branches = [...dashboard.branchStats].sort((a, b) => a.revenue - b.revenue);
  const trailing = branches[0];
  const leading = branches[branches.length - 1];
  if (
    trailing &&
    leading &&
    branches.length > 1 &&
    leading.revenue > 0 &&
    trailing.revenue < leading.revenue * 0.65
  ) {
    actions.push({
      id: `branch-${trailing.branchId}`,
      titleKey: "actions.trailingBranchTitle",
      titleValues: { branch: trailing.branchName },
      descKey: "actions.trailingBranchDesc",
      descValues: { revenue: formatCurrency(trailing.revenue) },
      href: adminBookingsPath({
        branchId: trailing.branchId,
        branchName: trailing.branchName,
        dateRange: resolveProductDateRange(dateRange),
      }),
      tone: "growth",
    });
  }

  const topStaff = dashboard.topStaff[0];
  if (topStaff && topStaff.revenue > 0 && actions.length < 4) {
    actions.push({
      id: `star-${topStaff.staffId}`,
      titleKey: "actions.topPerformerTitle",
      titleValues: { name: topStaff.staffName },
      descKey: "actions.topPerformerDesc",
      descValues: { branch: topStaff.branchName },
      href: "/admin/employees",
      tone: "celebrate",
      metricLabel: "Sales",
      metricValue: formatCurrency(topStaff.revenue),
    });
  }

  const mix = dashboard.paymentMix;
  const mixTotal = mix.cash + mix.upi + mix.card;
  if (mixTotal > 0 && mix.cash / mixTotal > 0.55 && actions.length < 4) {
    actions.push({
      id: "cash-heavy",
      titleKey: "actions.cashHeavyTitle",
      descKey: "actions.cashHeavyDesc",
      descValues: { pct: Math.round((mix.cash / mixTotal) * 100) },
      href: "/admin/finance",
      tone: "insight",
    });
  }

  const seen = new Set<string>();
  return actions.filter((action) => {
    if (seen.has(action.id)) return false;
    seen.add(action.id);
    return true;
  }).slice(0, 3);
}
