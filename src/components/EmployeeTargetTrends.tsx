"use client";

import { BranchStaffTargetTrends } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { seriesColor, STAFF_SERIES_COLORS } from "@/lib/chart-colors";
import { MetricChart } from "@/components/LineChart";
import { Card, EmptyState } from "@/components/ui";
import { TrendingUp } from "lucide-react";

function buildCombinedSeries(branch: BranchStaffTargetTrends) {
  return branch.staff.flatMap((trend, idx) => {
    const color = seriesColor(idx, STAFF_SERIES_COLORS);
    const lastPoint = trend.points[trend.points.length - 1];
    const gap = lastPoint ? lastPoint.actualCumulative - lastPoint.idealCumulative : 0;
    const gapLabel =
      gap >= 0 ? `+${formatCurrency(gap)} ahead` : `${formatCurrency(Math.abs(gap))} behind`;

    return [
      {
        name: `${trend.staffName} · actual`,
        color,
        values: trend.points.map((p) => p.actualCumulative),
        changePct: trend.actualChangePct,
      },
      {
        name: `${trend.staffName} · ideal (${gapLabel})`,
        color,
        values: trend.points.map((p) => p.idealCumulative),
        dashed: true,
      },
    ];
  });
}

interface EmployeeTargetTrendsProps {
  branches: BranchStaffTargetTrends[];
  periodLabel?: string;
  compact?: boolean;
}

export function EmployeeTargetTrends({ branches, periodLabel, compact }: EmployeeTargetTrendsProps) {
  if (branches.length === 0) {
    return (
      <Card>
        <EmptyState title="No target trends" description="Add employees with monthly sales targets" />
      </Card>
    );
  }

  const dateLabels =
    branches[0]?.staff[0]?.points.map((p) => {
      const d = new Date(p.date + "T12:00:00");
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    }) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-0.5">
        <TrendingUp className="w-5 h-5 text-[var(--brand-text)] shrink-0" />
        <div className="min-w-0">
          <h2 className="font-semibold text-sm text-[var(--text-primary)]">Employee sales vs ideal target pace</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {periodLabel ? `${periodLabel} · ` : ""}
            Distinct color per employee · Solid = actual · Dashed = ideal pace
          </p>
        </div>
      </div>

      <div className={compact ? "space-y-4" : "grid lg:grid-cols-2 gap-4"}>
        {branches.map((branch) => (
          <Card key={branch.branchId}>
            <MetricChart
              title={`${branch.branchName} — actual vs ideal`}
              labels={dateLabels}
              formatValue={formatCurrency}
              series={buildCombinedSeries(branch)}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
