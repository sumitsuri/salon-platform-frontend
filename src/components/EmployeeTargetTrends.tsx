"use client";

import { useLocale, useTranslations } from "next-intl";
import { BranchStaffTargetTrends } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { seriesColor, STAFF_SERIES_COLORS } from "@/lib/chart-colors";
import { MetricChart } from "@/components/LineChart";
import { Card, EmptyState } from "@/components/ui";
import { TrendingUp } from "lucide-react";

interface EmployeeTargetTrendsProps {
  branches: BranchStaffTargetTrends[];
  periodLabel?: string;
  compact?: boolean;
}

export function EmployeeTargetTrends({ branches, periodLabel, compact }: EmployeeTargetTrendsProps) {
  const t = useTranslations("components.employeeTargetTrends");
  const locale = useLocale();

  function buildCombinedSeries(branch: BranchStaffTargetTrends) {
    return branch.staff.flatMap((trend, idx) => {
      const color = seriesColor(idx, STAFF_SERIES_COLORS);
      const lastPoint = trend.points[trend.points.length - 1];
      const gap = lastPoint ? lastPoint.actualCumulative - lastPoint.idealCumulative : 0;
      const gapLabel =
        gap >= 0 ? t("ahead", { amount: formatCurrency(gap) }) : t("behind", { amount: formatCurrency(Math.abs(gap)) });

      return [
        {
          name: t("actualSeries", { name: trend.staffName }),
          color,
          values: trend.points.map((p) => p.actualCumulative),
          changePct: trend.actualChangePct,
        },
        {
          name: t("idealSeries", { name: trend.staffName, gap: gapLabel }),
          color,
          values: trend.points.map((p) => p.idealCumulative),
          dashed: true,
        },
      ];
    });
  }

  if (branches.length === 0) {
    return (
      <Card>
        <EmptyState title={t("emptyTitle")} description={t("emptyDesc")} />
      </Card>
    );
  }

  const dateLabels =
    branches[0]?.staff[0]?.points.map((p) => {
      const d = new Date(p.date + "T12:00:00");
      return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
    }) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-0.5">
        <TrendingUp className="w-5 h-5 text-[var(--brand-text)] shrink-0" />
        <div className="min-w-0">
          <h2 className="font-semibold text-sm text-[var(--text-primary)]">{t("title")}</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {periodLabel ? `${periodLabel} · ` : ""}
            {t("subtitle")}
          </p>
        </div>
      </div>

      <div className={compact ? "space-y-4" : "grid lg:grid-cols-2 gap-4"}>
        {branches.map((branch) => (
          <Card key={branch.branchId}>
            <MetricChart
              title={t("chartTitle", { branch: branch.branchName })}
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
