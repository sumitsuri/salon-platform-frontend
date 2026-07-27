"use client";

import {
  Users,
  Trophy,
  XCircle,
  FlaskConical,
  TrendingDown,
  IndianRupee,
  Layers,
} from "lucide-react";
import { PipelineSummary } from "@/modules/sales/api/salesApi";
import { formatMonthlyRevenue } from "@/modules/sales/lib/pricing";
import { StatCard } from "@/components/ui";

interface SalesPipelineSummaryWidgetsProps {
  summary: PipelineSummary;
  periodLabel: string;
  repLabel?: string;
}

export function SalesPipelineSummaryWidgets({
  summary,
  periodLabel,
  repLabel,
}: SalesPipelineSummaryWidgetsProps) {
  const trend = repLabel ? `${periodLabel} · ${repLabel}` : periodLabel;

  return (
    <div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7"
      data-testid="pipeline-summary-widgets"
    >
      <StatCard label="Total leads" value={summary.totalLeads} icon={Users} accent="violet" trend={trend} />
      <StatCard label="Won" value={summary.wonCount} icon={Trophy} accent="emerald" />
      <StatCard label="Lost" value={summary.lostCount} icon={XCircle} />
      <StatCard
        label="Won revenue"
        value={formatMonthlyRevenue(summary.wonRevenue)}
        icon={IndianRupee}
        accent="emerald"
        trend="Monthly equivalent"
      />
      <StatCard
        label="Lost revenue"
        value={formatMonthlyRevenue(summary.lostRevenue)}
        icon={TrendingDown}
        trend="Monthly equivalent"
      />
      <StatCard label="Free trials" value={summary.freeTrialCount} icon={FlaskConical} accent="amber" />
      <StatCard label="Other" value={summary.otherCount} icon={Layers} accent="violet" trend="Open pipeline" />
    </div>
  );
}
