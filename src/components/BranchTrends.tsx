"use client";

import { BranchTrend } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { BRANCH_COLORS, MetricChart } from "@/components/LineChart";
import { TrendingUp } from "lucide-react";

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
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <h2 className="font-semibold text-slate-800">Branch Trends</h2>
        <p className="text-slate-400 text-sm py-6">No trend data for selected branches</p>
      </div>
    );
  }

  const dateLabels =
    trends[0]?.points.map((p) => {
      const d = new Date(p.date);
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    }) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-indigo-600" />
        <h2 className="font-semibold text-slate-800">Branch Trends</h2>
        <span className="text-xs text-slate-400 ml-1">
          {dateLabels.length > 0 && `${dateLabels[0]} – ${dateLabels[dateLabels.length - 1]}`}
        </span>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {METRICS.map((metric) => (
          <MetricChart
            key={metric.key}
            title={metric.title}
            labels={dateLabels}
            formatValue={metric.format}
            series={trends.map((trend, idx) => ({
              name: trend.branchName,
              color: BRANCH_COLORS[idx % BRANCH_COLORS.length],
              values: trend.points.map((p) => p[metric.key] as number),
              changePct: trend[CHANGE_KEYS[metric.key]] as number | null,
            }))}
          />
        ))}
      </div>
    </div>
  );
}
