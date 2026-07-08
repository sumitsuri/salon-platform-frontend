"use client";

import { BranchTargetTrend } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { BRANCH_SERIES_COLORS, seriesColor } from "@/lib/chart-colors";
import { MetricChart } from "@/components/LineChart";
import { Card, EmptyState } from "@/components/ui";
import { TrendingUp } from "lucide-react";

function buildBranchTargetSeries(branches: BranchTargetTrend[]) {
  return branches.flatMap((trend, idx) => {
    const color = seriesColor(idx, BRANCH_SERIES_COLORS);
    const lastPoint = trend.points[trend.points.length - 1];
    const gap = lastPoint ? lastPoint.actualCumulative - lastPoint.idealCumulative : 0;
    const gapLabel =
      gap >= 0 ? `+${formatCurrency(gap)} ahead` : `${formatCurrency(Math.abs(gap))} behind`;

    return [
      {
        name: `${trend.branchName} · actual`,
        color,
        values: trend.points.map((p) => p.actualCumulative),
        changePct: trend.actualChangePct,
      },
      {
        name: `${trend.branchName} · ideal (${gapLabel})`,
        color,
        values: trend.points.map((p) => p.idealCumulative),
        dashed: true,
      },
    ];
  });
}

interface BranchTargetTrendsProps {
  branches: BranchTargetTrend[];
  periodLabel?: string;
}

export function BranchTargetTrends({ branches, periodLabel }: BranchTargetTrendsProps) {
  if (branches.length === 0) {
    return (
      <Card>
        <EmptyState title="No branch target trends" description="Set monthly sales targets on branches" />
      </Card>
    );
  }

  const dateLabels =
    branches[0]?.points.map((p) => {
      const d = new Date(p.date + "T12:00:00");
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    }) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-0.5">
        <TrendingUp className="w-5 h-5 text-[var(--brand-text)] shrink-0" />
        <div className="min-w-0">
          <h2 className="font-semibold text-sm text-[var(--text-primary)]">Branch sales vs ideal target pace</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {periodLabel ? `${periodLabel} · ` : ""}
            Each branch uses a distinct color · Solid = actual · Dashed = ideal pace
          </p>
        </div>
      </div>

      <Card>
        <MetricChart
          title="All branches — actual vs ideal"
          labels={dateLabels}
          formatValue={formatCurrency}
          series={buildBranchTargetSeries(branches)}
        />
      </Card>
    </div>
  );
}
