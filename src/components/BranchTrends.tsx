"use client";

import { BranchTrend } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { seriesColor, BRANCH_SERIES_COLORS } from "@/lib/chart-colors";
import { MetricChart } from "@/components/LineChart";
import { TrendingUp } from "lucide-react";
import { Card, EmptyState } from "@/components/ui";

interface BranchTrendsProps {
  trends: BranchTrend[];
}

type MetricKey = "revenue" | "visits" | "avgTicket" | "discounts";

const METRICS: { key: MetricKey; title: string; format: (v: number) => string }[] = [
  { key: "revenue", title: "Revenue Trend", format: formatCurrency },
  { key: "visits", title: "Visits Trend", format: (v) => String(Math.round(v)) },
  { key: "avgTicket", title: "Avg Ticket Trend", format: formatCurrency },
  { key: "discounts", title: "Discounts Trend", format: formatCurrency },
];

const CHANGE_KEYS: Record<MetricKey, keyof BranchTrend> = {
  revenue: "revenueChangePct",
  visits: "visitsChangePct",
  avgTicket: "avgTicketChangePct",
  discounts: "discountsChangePct",
};

export function BranchTrends({ trends }: BranchTrendsProps) {
  if (trends.length === 0) {
    return (
      <Card>
        <EmptyState title="No trend data" description="For selected branches in this period" />
      </Card>
    );
  }

  const dateLabels =
    trends[0]?.points.map((p) => {
      const d = new Date(p.date);
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    }) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-0.5">
        <TrendingUp className="w-5 h-5 text-[var(--brand-text)] shrink-0" />
        <div className="min-w-0">
          <h2 className="font-semibold text-sm text-[var(--text-primary)]">Branch performance trends</h2>
          {dateLabels.length > 0 && (
            <p className="text-xs text-[var(--text-secondary)] truncate">
              {dateLabels[0]} – {dateLabels[dateLabels.length - 1]}
            </p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {METRICS.map((metric) => (
          <Card key={metric.key}>
            <MetricChart
            title={metric.title}
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
