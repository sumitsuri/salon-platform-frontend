"use client";

import { useLocale, useTranslations } from "next-intl";
import { TrendingUp } from "lucide-react";
import { BranchTrend } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { seriesColor, BRANCH_SERIES_COLORS } from "@/lib/chart-colors";
import { MetricChart } from "@/components/LineChart";
import { EmptyState } from "@/components/ui";
import { PanelShell } from "@/components/enterprise-ui";

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
      <PanelShell title={t("title")} icon={TrendingUp} accent="brand">
        <EmptyState title={t("emptyTitle")} description={t("emptyDesc")} />
      </PanelShell>
    );
  }

  const dateLabels =
    trends[0]?.points.map((p) => {
      const d = new Date(p.date);
      return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
    }) ?? [];

  return (
    <PanelShell
      title={t("title")}
      subtitle={dateLabels.length > 0 ? `${dateLabels[0]} – ${dateLabels[dateLabels.length - 1]}` : undefined}
      icon={TrendingUp}
      accent="brand"
      padding={false}
    >
      <div className="p-4 grid lg:grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <div key={metric.key} className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/30 p-4">
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
          </div>
        ))}
      </div>
    </PanelShell>
  );
}
