"use client";

import { useLocale, useTranslations } from "next-intl";
import { Lightbulb, Target, TrendingUp, Zap } from "lucide-react";
import { StaffTargetPerformance, StaffTargetPerformanceItem } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { Card, EmptyState } from "@/components/ui";

interface EmployeeTargetCoachingPanelProps {
  performance?: StaffTargetPerformance;
  loading?: boolean;
}

function buildCoachingTips(
  item: StaffTargetPerformanceItem,
  t: ReturnType<typeof useTranslations<"components.employeeTargetCoaching">>
): string[] {
  const tips: string[] = [];
  const target = item.monthlySalesTarget;
  const actual = item.actualSales;
  const gap = target - actual;

  if (item.meetingTarget) {
    tips.push(t("tips.targetAchieved"));
    if (item.incentivePercent > 0) {
      tips.push(
        t("tips.eligibleIncentive", {
          percent: item.incentivePercent,
          amount: formatCurrency(item.projectedIncentive),
        })
      );
    }
    return tips;
  }

  if (item.onTrack) {
    tips.push(t("tips.onPace"));
  } else {
    tips.push(t("tips.behindPace", { gap: formatCurrency(gap) }));
    tips.push(t("tips.walkInSlots"));
  }

  if (item.achievementPercent < 50) {
    tips.push(t("tips.eodReview"));
  } else if (item.achievementPercent < 80) {
    tips.push(t("tips.pushMembership"));
  }

  if (item.incentivePercent > 0 && !item.meetingTarget) {
    const needed = Math.max(0, gap);
    tips.push(
      t("tips.incentiveUnlock", {
        incentive: formatCurrency((target * item.incentivePercent) / 100),
        needed: formatCurrency(needed),
      })
    );
  }

  return tips;
}

function CoachingCard({
  item,
  t,
}: {
  item: StaffTargetPerformanceItem;
  t: ReturnType<typeof useTranslations<"components.employeeTargetCoaching">>;
}) {
  const tips = buildCoachingTips(item, t);
  const status = item.meetingTarget ? "met" : item.onTrack ? "track" : "behind";
  const statusCls =
    status === "met"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "track"
        ? "bg-sky-50 text-sky-700 border-sky-200"
        : "bg-amber-50 text-amber-700 border-amber-200";
  const statusLabel =
    status === "met" ? t("targetMet") : status === "track" ? t("onTrack") : t("needsSupport");

  return (
    <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-muted)]/30">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-[var(--text-primary)]">{item.staffName}</p>
          <p className="text-xs text-[var(--text-secondary)]">
            {item.branchName} ·{" "}
            {t("salesOfTarget", {
              actual: formatCurrency(item.actualSales),
              target: formatCurrency(item.monthlySalesTarget),
              percent: item.achievementPercent,
            })}
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
  const t = useTranslations("components.employeeTargetCoaching");

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-[var(--text-tertiary)]">{t("loading")}</p>
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
        <EmptyState title={t("emptyTitle")} description={t("emptyDesc")} />
      </Card>
    );
  }

  const priority = [...needsHelp, ...onTrack, ...met];

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 px-0.5">
        <Lightbulb className="w-5 h-5 text-[var(--brand-text)] shrink-0" />
        <div>
          <h2 className="font-semibold text-sm text-[var(--text-primary)]">{t("title")}</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {t("subtitle")}
            {performance?.periodLabel && ` · ${performance.periodLabel}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <div className="flex items-center gap-2 text-amber-700 mb-1">
            <Target className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">{t("behindPace")}</span>
          </div>
          <p className="text-2xl font-bold text-amber-800">{needsHelp.length}</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3">
          <div className="flex items-center gap-2 text-sky-700 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">{t("onTrack")}</span>
          </div>
          <p className="text-2xl font-bold text-sky-800">{onTrack.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-emerald-700 mb-1">
            <Target className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">{t("targetMet")}</span>
          </div>
          <p className="text-2xl font-bold text-emerald-800">{met.length}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {priority.slice(0, 6).map((item) => (
          <CoachingCard key={item.staffId} item={item} t={t} />
        ))}
      </div>

      {priority.length > 6 && (
        <p className="text-xs text-[var(--text-tertiary)] text-center">{t("showingTop6")}</p>
      )}
    </section>
  );
}
