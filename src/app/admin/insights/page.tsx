"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, Lightbulb, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { BranchMultiSelect } from "@/components/BranchMultiSelect";
import { RecommendationsPanel } from "@/components/RecommendationsPanel";
import { WeekdayBoostPanel } from "@/components/WeekdayBoostPanel";
import { PageHeader, StatCard, EmptyState, PageLoader } from "@/components/ui";
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
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<ProductDateRange>(getDefaultDateRange);
  const [initialized, setInitialized] = useState(false);
  const apiRange = insightPeriodToRange(dateRange);

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.getBranches(),
  });

  useEffect(() => {
    if (branches.length > 0 && !initialized) {
      setSelectedBranches(branches.map((b) => b.id));
      setInitialized(true);
    }
  }, [branches, initialized]);

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
    enabled: initialized && selectedBranches.length > 0,
  });

  const items = flattenInsights(data);
  const highCount = items.filter((i) => i.severity === "HIGH").length;
  const mediumCount = items.filter((i) => i.severity === "MEDIUM").length;

  if (!initialized) {
    return <PageLoader label={tCommon("loading")} />;
  }

  return (
    <div className="space-y-5">
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

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label={t("totalTips")} value={countInsights(data)} icon={Lightbulb} accent="brand" />
            <StatCard label={t("highPriority")} value={highCount} icon={AlertTriangle} accent="amber" />
            <StatCard label={t("medium")} value={mediumCount} icon={Sparkles} accent="violet" />
          </div>

          <WeekdayBoostPanel insights={data?.weekdayInsights} loading={isLoading} variant="ceo" />

          <RecommendationsPanel data={data} loading={isLoading} variant="ceo" />
        </>
      )}
    </div>
  );
}
