"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Scissors, Hash, IndianRupee } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { ServiceContributionPanel } from "@/components/ServiceContributionPanel";
import { PageHeader, StatCard, selectClass, EmptyState, DEFAULT_PAGE_SIZE } from "@/components/ui";
import { useInfiniteQuery } from "@tanstack/react-query";
import { MissionStrip } from "@/components/brand/MissionStrip";
import { insightPeriodToRange, InsightPeriod } from "@/lib/insights-utils";
import { formatCurrency } from "@/lib/utils";

const PERIODS: InsightPeriod[] = ["days60", "month", "week"];

export default function ManagerServicesPage() {
  const t = useTranslations("manager.services");
  const tPeriods = useTranslations("components.insights.periods");
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branchId || "";
  const [period, setPeriod] = useState<InsightPeriod>("days60");
  const [serviceFilter, setServiceFilter] = useState("");
  const dateRange = insightPeriodToRange(period);

  const perfInfinite = useInfiniteQuery({
    queryKey: ["service-contribution", branchId, period, serviceFilter],
    queryFn: ({ pageParam }) =>
      api.getServiceContribution({
        ...dateRange,
        serviceName: serviceFilter || undefined,
        page: pageParam as number,
        size: DEFAULT_PAGE_SIZE,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const next = lastPage.page + 1;
      return next < lastPage.totalPages ? next : undefined;
    },
    enabled: !!branchId,
  });

  const summary = perfInfinite.data?.pages[0];
  const services = perfInfinite.data?.pages.flatMap((p) => p.services) ?? [];
  const totalElements = summary?.totalElements ?? 0;
  const hasMore = perfInfinite.hasNextPage ?? false;
  const isLoading = perfInfinite.isLoading;
  const isFetching = perfInfinite.isFetching;
  const isError = perfInfinite.isError;
  const error = perfInfinite.error;
  const isFetchingNextPage = perfInfinite.isFetchingNextPage;
  const fetchNextPage = perfInfinite.fetchNextPage;
  const heroCount = Math.min(3, services.length ?? 0);

  return (
    <div className="space-y-4">
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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          label={t("services")}
          value={services.length}
          icon={Scissors}
          accent="brand"
        />
        <StatCard
          label={t("sold")}
          value={summary?.totalServiceCount ?? 0}
          icon={Hash}
          accent="violet"
        />
        <StatCard
          label={t("revenue")}
          value={summary ? formatCurrency(summary.serviceRevenue) : "—"}
          icon={IndianRupee}
          accent="emerald"
        />
      </div>

      {heroCount > 0 && summary && (
        <p className="text-sm text-[var(--text-secondary)]">
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            {t("heroServices", { count: heroCount })}
          </span>
        </p>
      )}

      {isError ? (
        <EmptyState
          title={t("loadErrorTitle")}
          description={error instanceof Error ? error.message : t("loadErrorDesc")}
        />
      ) : (
        <ServiceContributionPanel
          data={summary ? { ...summary, services } : undefined}
          services={services}
          loading={isLoading}
          serviceFilter={serviceFilter}
          onServiceFilterChange={setServiceFilter}
          infiniteScroll={{
            totalElements,
            loadedCount: services.length,
            hasMore,
            isFetchingNextPage,
            isLoading,
            onLoadMore: () => void fetchNextPage(),
          }}
        />
      )}
    </div>
  );
}
