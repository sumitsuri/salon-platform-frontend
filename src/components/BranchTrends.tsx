"use client";

import { useLocale, useTranslations } from "next-intl";
import { TrendingUp } from "lucide-react";
import { BranchTrend } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { seriesColor, BRANCH_SERIES_COLORS } from "@/lib/chart-colors";
import { MetricChart } from "@/components/LineChart";
import { Card, EmptyState } from "@/components/ui";

interface BranchTrendsProps {
  trends: BranchTrend[];
}

type MetricKey = "revenue" | "visits" | "avgTicket" | "discounts";

const CHANGE_KEYS: Record<MetricKey, keyof BranchTrend> = {
  revenue: "revenueChangePct",
  visits: "visitsChangePct",
  avgTicket: "avgTicketChangePct",
  discounts: "discountsChangePct",
};

export function BranchTrends({ trends }: BranchTrendsProps) {
  const t = useTranslations("components.branchTrends");
  const locale = useLocale();

  const metrics: { key: MetricKey; titleKey: "revenueTrend" | "visitsTrend" | "avgTicketTrend" | "discountsTrend"; format: (v: number) => string }[] = [
    { key: "revenue", titleKey: "revenueTrend", format: formatCurrency },
    { key: "visits", titleKey: "visitsTrend", format: (v) => String(Math.round(v)) },
    { key: "avgTicket", titleKey: "avgTicketTrend", format: formatCurrency },
    { key: "discounts", titleKey: "discountsTrend", format: formatCurrency },
  ];

  if (trends.length === 0) {
    return (
      <Card>
        <EmptyState title={t("emptyTitle")} description={t("emptyDesc")} />
      </Card>
    );
  }

  const dateLabels =
    trends[0]?.points.map((p) => {
      const d = new Date(p.date);
      return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
    }) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-0.5">
        <TrendingUp className="w-5 h-5 text-[var(--brand-text)] shrink-0" />
        <div className="min-w-0">
          <h2 className="font-semibold text-sm text-[var(--text-primary)]">{t("title")}</h2>
          {dateLabels.length > 0 && (
            <p className="text-xs text-[var(--text-secondary)] truncate">
              {dateLabels[0]} – {dateLabels[dateLabels.length - 1]}
            </p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.key}>
            <MetricChart
              title={t(metric.titleKey)}
              labels={dateLabels}
              formatValue={metric.format}
              series={trends.map((trend, idx) => ({
                name: trend.branchName,
                color: seriesColor(idx, BRANCH_SERIES_COLORS),
                values: trend.points.map((p) => p[metric.key] as number),
                changePct: trend[CHANGE_KEYS[metric.key]] as number | null,
              }))}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
