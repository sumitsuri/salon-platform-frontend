"use client";

import { useLocale, useTranslations } from "next-intl";
import { BranchPlTrend } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { seriesColor, BRANCH_SERIES_COLORS } from "@/lib/chart-colors";
import { MetricChart } from "@/components/LineChart";
import { Card, EmptyState } from "@/components/ui";
import { TrendingUp } from "lucide-react";

interface FinanceTrendsProps {
  branches: BranchPlTrend[];
  periodLabel?: string;
}

type MetricKey = "revenue" | "totalExpenses" | "netProfit" | "marginPercent";

const CHANGE_KEYS: Record<MetricKey, keyof BranchPlTrend> = {
  revenue: "revenueChangePct",
  totalExpenses: "expensesChangePct",
  netProfit: "netProfitChangePct",
  marginPercent: "marginChangePct",
};

export function FinanceTrends({ branches, periodLabel }: FinanceTrendsProps) {
  const t = useTranslations("components.financeTrends");
  const locale = useLocale();

  const metrics: { key: MetricKey; titleKey: "revenueTrend" | "expenditureTrend" | "netPlTrend" | "marginTrend"; format: (v: number) => string }[] = [
    { key: "revenue", titleKey: "revenueTrend", format: formatCurrency },
    { key: "totalExpenses", titleKey: "expenditureTrend", format: formatCurrency },
    { key: "netProfit", titleKey: "netPlTrend", format: formatCurrency },
    { key: "marginPercent", titleKey: "marginTrend", format: (v) => `${v.toFixed(1)}%` },
  ];

  if (branches.length === 0) {
    return (
      <Card>
        <EmptyState title={t("emptyTitle")} description={t("emptyDesc")} />
      </Card>
    );
  }

  const monthLabels =
    branches[0]?.points.map((p) => {
      const d = new Date(p.month + "T12:00:00");
      return d.toLocaleDateString(locale, { month: "short", year: "2-digit" });
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

      <div className="grid lg:grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <MetricChart
            key={metric.key}
            title={t(metric.titleKey)}
            labels={monthLabels}
            formatValue={metric.format}
            series={branches.map((trend, idx) => ({
              name: trend.branchName,
              color: seriesColor(idx, BRANCH_SERIES_COLORS),
              values: trend.points.map((p) => p[metric.key] as number),
              changePct: trend[CHANGE_KEYS[metric.key]] as number | null,
            }))}
          />
        ))}
      </div>
    </div>
  );
}
