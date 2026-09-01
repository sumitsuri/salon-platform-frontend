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
  panelVariant?: "default" | "dashboard";
}

export function EmployeeTargetTrends({ branches, periodLabel, compact, panelVariant = "default" }: EmployeeTargetTrendsProps) {
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

  const header = (
    <div className={panelVariant === "dashboard" ? "dashboard-widget-header px-4 py-3 flex items-center gap-2.5" : "flex items-center gap-2 px-0.5"}>
      {panelVariant === "dashboard" ? (
        <span className="dashboard-widget-icon shrink-0" aria-hidden>
          <TrendingUp className="w-4 h-4" />
        </span>
      ) : (
        <TrendingUp className="w-5 h-5 text-[var(--brand-text)] shrink-0" />
      )}
      <div className="min-w-0">
        <h2 className={panelVariant === "dashboard" ? "dashboard-widget-title" : "font-semibold text-sm text-[var(--text-primary)]"}>
          {t("title")}
        </h2>
        <p className={panelVariant === "dashboard" ? "dashboard-widget-subtitle" : "text-xs text-[var(--text-secondary)]"}>
          {periodLabel ? `${periodLabel} · ` : ""}
          {t("subtitle")}
        </p>
      </div>
    </div>
  );

  const charts = (
    <div className={compact ? "space-y-4" : "grid lg:grid-cols-2 gap-4"}>
      {branches.map((branch) => (
        <Card
          key={branch.branchId}
          padding={panelVariant !== "dashboard"}
          className={panelVariant === "dashboard" ? "border border-[var(--border-brand)] shadow-sm" : undefined}
        >
          <MetricChart
            title={t("chartTitle", { branch: branch.branchName })}
            labels={dateLabels}
            formatValue={formatCurrency}
            series={buildCombinedSeries(branch)}
          />
        </Card>
      ))}
    </div>
  );

  if (panelVariant === "dashboard") {
    return (
      <div className="dashboard-widget-card min-w-0 max-w-full">
        {header}
        <div className="dashboard-widget-body p-4 space-y-4">{charts}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}
      {charts}
    </div>
  );
}
