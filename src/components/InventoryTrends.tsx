"use client";

import { BranchInventoryTrend } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { seriesColor, BRANCH_SERIES_COLORS } from "@/lib/chart-colors";
import { MetricChart } from "@/components/LineChart";
import { Card, EmptyState } from "@/components/ui";
import { TrendingUp } from "lucide-react";

interface InventoryTrendsProps {
  branches: BranchInventoryTrend[];
  periodLabel?: string;
}

type MetricKey = "productCost" | "usageCost" | "wastageCost" | "stockValue";

const METRICS: { key: MetricKey; title: string; format: (v: number) => string }[] = [
  { key: "productCost", title: "Product cost trend", format: formatCurrency },
  { key: "usageCost", title: "Usage cost trend", format: formatCurrency },
  { key: "wastageCost", title: "Wastage cost trend", format: formatCurrency },
  { key: "stockValue", title: "Stock value trend", format: formatCurrency },
];

export function InventoryTrends({ branches, periodLabel }: InventoryTrendsProps) {
  if (branches.length === 0) {
    return (
      <Card>
        <EmptyState title="No inventory trends" description="Log stock movements to see trends" />
      </Card>
    );
  }

  const monthLabels =
    branches[0]?.points.map((p) => {
      const d = new Date(p.month + "T12:00:00");
      return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    }) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-0.5">
        <TrendingUp className="w-5 h-5 text-[var(--brand-text)] shrink-0" />
        <div className="min-w-0">
          <h2 className="font-semibold text-sm text-[var(--text-primary)]">Inventory & product cost trends</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {periodLabel ? `${periodLabel} · ` : ""}
            Monthly totals per branch · Switch chart type on each card
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {METRICS.map((metric) => (
          <MetricChart
            key={metric.key}
            title={metric.title}
            labels={monthLabels}
            formatValue={metric.format}
            series={branches.map((trend, idx) => ({
              name: trend.branchName,
              color: seriesColor(idx, BRANCH_SERIES_COLORS),
              values: trend.points.map((p) => p[metric.key] as number),
              changePct: metric.key === "productCost" ? trend.costChangePct : null,
            }))}
          />
        ))}
      </div>
    </div>
  );
}
