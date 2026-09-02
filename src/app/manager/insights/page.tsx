"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, Lightbulb, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { RecommendationsPanel } from "@/components/RecommendationsPanel";
import { WeekdayBoostPanel } from "@/components/WeekdayBoostPanel";
import { ScopeFilterBar } from "@/components/ScopeFilterBar";
import { CompactStatsStrip } from "@/components/CompactStatsStrip";
import { PageHeader } from "@/components/ui";
import { DashboardOverviewShell } from "@/components/enterprise-ui";
import { countInsights, insightPeriodToRange } from "@/lib/insights-utils";
import { ProductDateRange, getDefaultDateRange } from "@/lib/date-range";

export default function ManagerInsightsPage() {
  const t = useTranslations("manager.insights");
  const tPeriods = useTranslations("components.dateRange.periods");
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branchId || "";
  const [dateRange, setDateRange] = useState<ProductDateRange>(getDefaultDateRange);
  const apiRange = insightPeriodToRange(dateRange);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["recommendations", branchId, dateRange.preset, dateRange.from, dateRange.to],
    queryFn: () => api.getRecommendations(apiRange),
    enabled: !!branchId,
  });

  const allItems = (data?.brandWide ?? []).concat(...(data?.branches ?? []).flatMap((branch) => branch.items));
  const highCount = allItems.filter((item) => item.severity === "HIGH").length;
  const mediumCount = allItems.filter((item) => item.severity === "MEDIUM").length;

  return (
    <div className="dashboard-page-flow">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle", {
          branch: user?.branchName ?? "",
          period: tPeriods(dateRange.preset),
          updating: isFetching && !isLoading ? t("updating") : "",
        })}
      />

      <ScopeFilterBar
        layout="card"
        showBranch={false}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        dateTestId="manager-insights-date-range"
      />

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
              testId="manager-insights-summary-strip"
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

          <WeekdayBoostPanel insights={data?.weekdayInsights} loading={isLoading} variant="manager" compact />
          <RecommendationsPanel data={data} loading={isLoading} variant="manager" compact />
        </div>
      </DashboardOverviewShell>
    </div>
  );
}
