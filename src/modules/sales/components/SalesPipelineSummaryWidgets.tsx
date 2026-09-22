"use client";

import { Users, Trophy, XCircle, FlaskConical, IndianRupee, TrendingDown } from "lucide-react";
import { LeadStage, PipelineSummary } from "@/modules/sales/api/salesApi";
import { formatMonthlyRevenue } from "@/modules/sales/lib/pricing";
import { CompactStatsStrip, CompactStatItem } from "@/components/CompactStatsStrip";

interface SalesPipelineSummaryWidgetsProps {
  summary: PipelineSummary;
  periodLabel: string;
  repLabel?: string;
  /** Tap a stat to jump to the List view filtered to that stage (omitted = clear stage filter). */
  onSelectStage?: (stage: LeadStage | undefined) => void;
}

export function SalesPipelineSummaryWidgets({
  summary,
  periodLabel,
  repLabel,
  onSelectStage,
}: SalesPipelineSummaryWidgetsProps) {
  const scope = repLabel ? `${periodLabel} · ${repLabel}` : periodLabel;
  const select = (stage?: LeadStage) => (onSelectStage ? () => onSelectStage(stage) : undefined);

  const items: CompactStatItem[] = [
    { id: "total", label: "Total leads", value: String(summary.totalLeads), icon: Users, accent: "violet", onClick: select(undefined) },
    { id: "won", label: "Won", value: String(summary.wonCount), icon: Trophy, accent: "emerald", onClick: select("WON") },
    { id: "lost", label: "Lost", value: String(summary.lostCount), icon: XCircle, accent: "rose", onClick: select("LOST") },
    {
      id: "wonRevenue",
      label: "Won revenue",
      value: formatMonthlyRevenue(summary.wonRevenue),
      icon: IndianRupee,
      accent: "emerald",
      onClick: select("WON"),
    },
    {
      id: "lostRevenue",
      label: "Lost revenue",
      value: formatMonthlyRevenue(summary.lostRevenue),
      icon: TrendingDown,
      accent: "rose",
      onClick: select("LOST"),
    },
    {
      id: "trials",
      label: "Trials to close",
      value: String(summary.freeTrialCount),
      icon: FlaskConical,
      accent: "amber",
      onClick: select("FREE_TRIAL"),
      // Every trial is a near-won deal sitting idle — pulse nudges the rep to go close it.
      pulse: summary.freeTrialCount > 0,
    },
  ];

  return (
    <div>
      <p className="mb-1.5 text-[11px] text-[var(--text-tertiary)]">{scope}</p>
      <CompactStatsStrip testId="pipeline-summary-widgets" items={items} dense3 />
    </div>
  );
}
