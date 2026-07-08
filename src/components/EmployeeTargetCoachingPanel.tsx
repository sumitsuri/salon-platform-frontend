"use client";

import { Lightbulb, Target, TrendingUp, Zap } from "lucide-react";
import { StaffTargetPerformance, StaffTargetPerformanceItem } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { Card, EmptyState } from "@/components/ui";

interface EmployeeTargetCoachingPanelProps {
  performance?: StaffTargetPerformance;
  loading?: boolean;
}

function buildCoachingTips(item: StaffTargetPerformanceItem): string[] {
  const tips: string[] = [];
  const target = item.monthlySalesTarget;
  const actual = item.actualSales;
  const gap = target - actual;

  if (item.meetingTarget) {
    tips.push("Target achieved — maintain service quality and mentor peers on upselling.");
    if (item.incentivePercent > 0) {
      tips.push(`Eligible for ${item.incentivePercent}% incentive on target (${formatCurrency(item.projectedIncentive)}).`);
    }
    return tips;
  }

  if (item.onTrack) {
    tips.push("On pace for the month — focus on premium services and add-ons to exceed target.");
  } else {
    tips.push(`Behind ideal pace by ~${formatCurrency(gap)} — prioritize high-ticket services and package bundles.`);
    tips.push("Offer walk-in slots on slower weekdays and follow up with regular clients for rebooking.");
  }

  if (item.achievementPercent < 50) {
    tips.push("Run end-of-day review: track services per client and aim for at least one add-on per visit.");
  } else if (item.achievementPercent < 80) {
    tips.push("Push membership or combo packages — a few multi-session sales can close the gap quickly.");
  }

  if (item.incentivePercent > 0 && !item.meetingTarget) {
    const needed = Math.max(0, gap);
    tips.push(`Hitting target unlocks ${formatCurrency(target * item.incentivePercent / 100)} incentive — ${formatCurrency(needed)} more needed.`);
  }

  return tips;
}

function CoachingCard({ item }: { item: StaffTargetPerformanceItem }) {
  const tips = buildCoachingTips(item);
  const status = item.meetingTarget ? "met" : item.onTrack ? "track" : "behind";
  const statusCls =
    status === "met"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "track"
        ? "bg-sky-50 text-sky-700 border-sky-200"
        : "bg-amber-50 text-amber-700 border-amber-200";
  const statusLabel = status === "met" ? "Target met" : status === "track" ? "On track" : "Needs support";

  return (
    <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-muted)]/30">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-[var(--text-primary)]">{item.staffName}</p>
          <p className="text-xs text-[var(--text-secondary)]">
            {item.branchName} · {formatCurrency(item.actualSales)} of {formatCurrency(item.monthlySalesTarget)} ({item.achievementPercent}%)
          </p>
        </div>
        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0", statusCls)}>
          {statusLabel}
        </span>
      </div>
      <ul className="space-y-2">
        {tips.map((tip, i) => (
          <li key={i} className="flex gap-2 text-sm text-[var(--text-secondary)] leading-relaxed">
            <Zap className="w-4 h-4 text-[var(--brand-text)] shrink-0 mt-0.5" />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EmployeeTargetCoachingPanel({ performance, loading }: EmployeeTargetCoachingPanelProps) {
  if (loading) {
    return (
      <Card>
        <p className="text-sm text-[var(--text-tertiary)]">Loading coaching insights...</p>
      </Card>
    );
  }

  const staff = performance?.staff.filter((s) => s.monthlySalesTarget > 0) ?? [];
  const needsHelp = staff.filter((s) => !s.meetingTarget && !s.onTrack);
  const onTrack = staff.filter((s) => !s.meetingTarget && s.onTrack);
  const met = staff.filter((s) => s.meetingTarget);

  if (staff.length === 0) {
    return (
      <Card>
        <EmptyState title="No coaching data" description="Set monthly sales targets for employees" />
      </Card>
    );
  }

  const priority = [...needsHelp, ...onTrack, ...met];

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 px-0.5">
        <Lightbulb className="w-5 h-5 text-[var(--brand-text)] shrink-0" />
        <div>
          <h2 className="font-semibold text-sm text-[var(--text-primary)]">Target coaching</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Actionable steps to help staff reach monthly targets
            {performance?.periodLabel && ` · ${performance.periodLabel}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <div className="flex items-center gap-2 text-amber-700 mb-1">
            <Target className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Behind pace</span>
          </div>
          <p className="text-2xl font-bold text-amber-800">{needsHelp.length}</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3">
          <div className="flex items-center gap-2 text-sky-700 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">On track</span>
          </div>
          <p className="text-2xl font-bold text-sky-800">{onTrack.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-emerald-700 mb-1">
            <Target className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Target met</span>
          </div>
          <p className="text-2xl font-bold text-emerald-800">{met.length}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {priority.slice(0, 6).map((item) => (
          <CoachingCard key={item.staffId} item={item} />
        ))}
      </div>

      {priority.length > 6 && (
        <p className="text-xs text-[var(--text-tertiary)] text-center">
          Showing top 6 staff — view full roster below for everyone&apos;s status
        </p>
      )}
    </section>
  );
}
