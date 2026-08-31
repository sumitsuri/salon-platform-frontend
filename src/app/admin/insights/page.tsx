"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, Lightbulb, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAdminBranchSelection } from "@/lib/use-admin-branch-selection";
import { BranchMultiSelect } from "@/components/BranchMultiSelect";
import { RecommendationsPanel } from "@/components/RecommendationsPanel";
import { WeekdayBoostPanel } from "@/components/WeekdayBoostPanel";
import { PageHeader, StatCard, EmptyState } from "@/components/ui";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { DashboardHero } from "@/components/enterprise-ui";
import { MissionStrip } from "@/components/brand/MissionStrip";
import { countInsights, flattenInsights, insightPeriodToRange } from "@/lib/insights-utils";
import { ProductDateRange, getDefaultDateRange } from "@/lib/date-range";

export default function AdminInsightsPage() {
  const t = useTranslations("admin.insights");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const tPeriods = useTranslations("components.dateRange.periods");
  const [dateRange, setDateRange] = useState<ProductDateRange>(getDefaultDateRange);
  const apiRange = insightPeriodToRange(dateRange);

  const { branches, selectedBranches, setSelectedBranches, branchesSelected } =
    useAdminBranchSelection();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["recommendations", selectedBranches, dateRange.preset, dateRange.from, dateRange.to],
    queryFn: () =>
      api.getRecommendations({
        ...apiRange,
        branchIds:
          selectedBranches.length > 0 && selectedBranches.length < branches.length
            ? selectedBranches
            : undefined,
      }),
    enabled: branchesSelected,
  });

  const items = flattenInsights(data);
  const highCount = items.filter((i) => i.severity === "HIGH").length;
  const mediumCount = items.filter((i) => i.severity === "MEDIUM").length;

  return (
    <div className="page-stack space-y-5">
      <PageHeader
        title={t("title")}
        subtitle={`${tPeriods(dateRange.preset)}${isFetching && !isLoading ? tAdmin("updatingSuffix") : ""}`}
        action={
          <DateRangeSelector
            value={dateRange}
            onChange={setDateRange}
            testId="admin-insights-date-range"
          />
        }
      />

      <MissionStrip />

      <BranchMultiSelect branches={branches} selected={selectedBranches} onChange={setSelectedBranches} />

      {selectedBranches.length === 0 ? (
        <EmptyState title={tAdmin("selectBranch")} description={tAdmin("chooseBranchesInsights")} />
      ) : (
        <>
          <DashboardHero
            title={t("title")}
            subtitle={tPeriods(dateRange.preset)}
            metric={countInsights(data)}
            metricLabel={t("totalTips")}
            badge={
              highCount > 0 ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/15 text-white text-xs font-bold border border-white/20">
                  {t("highPriority")}: {highCount}
                </span>
              ) : undefined
            }
          />

          <div className="mobile-stat-grid mobile-stat-grid--sm-3 gap-3">
            <StatCard label={t("totalTips")} value={countInsights(data)} icon={Lightbulb} accent="brand" />
            <StatCard label={t("highPriority")} value={highCount} icon={AlertTriangle} accent="amber" />
            <StatCard label={t("medium")} value={mediumCount} icon={Sparkles} accent="violet" className="col-span-2 sm:col-span-1" />
          </div>

          <WeekdayBoostPanel insights={data?.weekdayInsights} loading={isLoading} variant="ceo" />

          <RecommendationsPanel data={data} loading={isLoading} variant="ceo" />
        </>
      )}
    </div>
  );
}
