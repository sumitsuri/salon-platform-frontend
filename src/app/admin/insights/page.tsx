"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, Lightbulb, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAdminBranchSelection } from "@/lib/use-admin-branch-selection";
import { ScopeFilterBar } from "@/components/ScopeFilterBar";
import { RecommendationsPanel } from "@/components/RecommendationsPanel";
import { WeekdayBoostPanel } from "@/components/WeekdayBoostPanel";
import { CompactStatsStrip } from "@/components/CompactStatsStrip";
import { PageHeader, EmptyState } from "@/components/ui";
import { DashboardOverviewShell } from "@/components/enterprise-ui";
import { countInsights, insightPeriodToRange } from "@/lib/insights-utils";
import { ProductDateRange, getDefaultDateRange } from "@/lib/date-range";

export default function AdminInsightsPage() {
  const t = useTranslations("admin.insights");
  const tAdmin = useTranslations("admin.common");
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

  const highCount = (data?.brandWide ?? [])
    .concat(...(data?.branches ?? []).flatMap((branch) => branch.items))
    .filter((item) => item.severity === "HIGH").length;
  const mediumCount = (data?.brandWide ?? [])
    .concat(...(data?.branches ?? []).flatMap((branch) => branch.items))
    .filter((item) => item.severity === "MEDIUM").length;

  return (
    <div className="dashboard-page-flow">
      <PageHeader
        title={t("title")}
        subtitle={`${tPeriods(dateRange.preset)}${isFetching && !isLoading ? tAdmin("updatingSuffix") : ""}`}
      />

      <ScopeFilterBar
        layout="card"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        dateTestId="admin-insights-date-range"
        branches={branches}
        selectedBranches={selectedBranches}
        onBranchesChange={setSelectedBranches}
      />

      {selectedBranches.length === 0 ? (
        <EmptyState title={tAdmin("selectBranch")} description={tAdmin("chooseBranchesInsights")} />
      ) : (
        <DashboardOverviewShell>
          <div className="dashboard-overview-modules dashboard-overview-modules--nested">
            <div className="dashboard-kpi-strip min-w-0 max-w-full">
              <div className="dashboard-overview-section-head dashboard-overview-section-head--metrics">
                <span className="dashboard-overview-section-icon dashboard-overview-section-icon--metrics" aria-hidden>
                  <Lightbulb className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="dashboard-overview-section-title">{t("summaryLabel")}</h2>
                </div>
              </div>
              <CompactStatsStrip
                loading={isLoading}
                testId="insights-summary-strip"
                items={[
                  {
                    id: "total",
                    label: t("totalTips"),
                    value: isLoading ? "…" : String(countInsights(data)),
                    icon: Lightbulb,
                    accent: "violet",
                    featured: true,
                  },
                  {
                    id: "high",
                    label: t("highPriority"),
                    value: isLoading ? "…" : String(highCount),
                    icon: AlertTriangle,
                    accent: "amber",
                  },
                  {
                    id: "medium",
                    label: t("medium"),
                    value: isLoading ? "…" : String(mediumCount),
                    icon: Sparkles,
                    accent: "sky",
                  },
                ]}
              />
            </div>

            <RecommendationsPanel data={data} loading={isLoading} variant="ceo" compact />
            <WeekdayBoostPanel insights={data?.weekdayInsights} loading={isLoading} variant="ceo" compact />
          </div>
        </DashboardOverviewShell>
      )}
    </div>
  );
}
