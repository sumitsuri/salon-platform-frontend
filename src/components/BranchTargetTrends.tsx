"use client";

import { useLocale, useTranslations } from "next-intl";
import { BranchTargetTrend } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { BRANCH_SERIES_COLORS, seriesColor } from "@/lib/chart-colors";
import { MetricChart } from "@/components/LineChart";
import { Card, EmptyState } from "@/components/ui";
import { TrendingUp } from "lucide-react";

interface BranchTargetTrendsProps {
  branches: BranchTargetTrend[];
  periodLabel?: string;
}

export function BranchTargetTrends({ branches, periodLabel }: BranchTargetTrendsProps) {
  const t = useTranslations("components.branchTargetTrends");
  const locale = useLocale();

  function buildBranchTargetSeries(branchList: BranchTargetTrend[]) {
    return branchList.flatMap((trend, idx) => {
      const color = seriesColor(idx, BRANCH_SERIES_COLORS);
      const lastPoint = trend.points[trend.points.length - 1];
      const gap = lastPoint ? lastPoint.actualCumulative - lastPoint.idealCumulative : 0;
      const gapLabel =
        gap >= 0 ? t("ahead", { amount: formatCurrency(gap) }) : t("behind", { amount: formatCurrency(Math.abs(gap)) });

      return [
        {
          name: t("actualSeries", { name: trend.branchName }),
          color,
          values: trend.points.map((p) => p.actualCumulative),
          changePct: trend.actualChangePct,
        },
        {
          name: t("idealSeries", { name: trend.branchName, gap: gapLabel }),
          color,
          values: trend.points.map((p) => p.idealCumulative),
          dashed: true,
        },
      ];
    });
  }

  if (branches.length === 0) {
    return (
      <Card>
        <EmptyState title={t("emptyTitle")} description={t("emptyDesc")} />
      </Card>
    );
  }

  const dateLabels =
    branches[0]?.points.map((p) => {
      const d = new Date(p.date + "T12:00:00");
      return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
    }) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-0.5">
        <TrendingUp className="w-5 h-5 text-[var(--brand-text)] shrink-0" />
        <div className="min-w-0">
          <h2 className="font-semibold text-sm text-[var(--text-primary)]">{t("title")}</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {periodLabel ? `${periodLabel} · ` : ""}
            {t("subtitle")}
          </p>
        </div>
      </div>

      <Card>
        <MetricChart
          title={t("chartTitle")}
          labels={dateLabels}
          formatValue={formatCurrency}
          series={buildBranchTargetSeries(branches)}
        />
      </Card>
    </div>
  );
}
