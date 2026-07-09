"use client";

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

const METRICS: { key: MetricKey; title: string; format: (v: number) => string }[] = [
  { key: "revenue", title: "Revenue trend", format: formatCurrency },
  { key: "totalExpenses", title: "Expenditure trend", format: formatCurrency },
  { key: "netProfit", title: "Net P&L trend", format: formatCurrency },
  { key: "marginPercent", title: "Margin % trend", format: (v) => `${v.toFixed(1)}%` },
];

const CHANGE_KEYS: Record<MetricKey, keyof BranchPlTrend> = {
  revenue: "revenueChangePct",
  totalExpenses: "expensesChangePct",
  netProfit: "netProfitChangePct",
  marginPercent: "marginChangePct",
};

export function FinanceTrends({ branches, periodLabel }: FinanceTrendsProps) {
  if (branches.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No P&L trend data"
          description="Add monthly expenditures and record sales to see trends across branches"
        />
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
          <h2 className="font-semibold text-sm text-[var(--text-primary)]">P&amp;L &amp; expenditure trends</h2>
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
              changePct: trend[CHANGE_KEYS[metric.key]] as number | null,
            }))}
          />
        ))}
      </div>
    </div>
  );
}
