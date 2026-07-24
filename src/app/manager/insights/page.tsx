"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, Lightbulb, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { RecommendationsPanel } from "@/components/RecommendationsPanel";
import { WeekdayBoostPanel } from "@/components/WeekdayBoostPanel";
import { PageHeader, StatCard, selectClass } from "@/components/ui";
import { DashboardHero } from "@/components/enterprise-ui";
import { MissionStrip } from "@/components/brand/MissionStrip";
import {
  countInsights,
  flattenInsights,
  insightPeriodToRange,
  InsightPeriod,
} from "@/lib/insights-utils";

const PERIODS: InsightPeriod[] = ["days60", "month", "week"];

export default function ManagerInsightsPage() {
  const t = useTranslations("manager.insights");
  const tPeriods = useTranslations("components.insights.periods");
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branchId || "";
  const [period, setPeriod] = useState<InsightPeriod>("days60");
  const dateRange = insightPeriodToRange(period);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["recommendations", branchId, period],
    queryFn: () => api.getRecommendations(dateRange),
    enabled: !!branchId,
  });

  const items = flattenInsights(data);
  const highCount = items.filter((i) => i.severity === "HIGH").length;
  const mediumCount = items.filter((i) => i.severity === "MEDIUM").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle", {
          branch: user?.branchName ?? "",
          period: tPeriods(period),
          updating: isFetching && !isLoading ? t("updating") : "",
        })}
        action={
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as InsightPeriod)}
            className={`${selectClass} py-2.5 w-full sm:w-auto min-w-0 sm:min-w-[7rem]`}
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {tPeriods(p)}
              </option>
            ))}
          </select>
        }
      />

      <MissionStrip />

      <DashboardHero
        eyebrow={user?.branchName}
        title={t("title")}
        subtitle={tPeriods(period)}
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

      <WeekdayBoostPanel
        insights={data?.weekdayInsights}
        loading={isLoading}
        variant="manager"
      />

      <RecommendationsPanel data={data} loading={isLoading} variant="manager" />
    </div>
  );
}
