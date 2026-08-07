"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Scissors, Hash, IndianRupee } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { ServiceContributionPanel } from "@/components/ServiceContributionPanel";
import { PageHeader, StatCard, EmptyState, DEFAULT_PAGE_SIZE } from "@/components/ui";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { useInfiniteQuery } from "@tanstack/react-query";
import { MissionStrip } from "@/components/brand/MissionStrip";
import { insightPeriodToRange } from "@/lib/insights-utils";
import { ProductDateRange, getDefaultDateRange } from "@/lib/date-range";
import { formatCurrency } from "@/lib/utils";

export default function ManagerServicesPage() {
  const t = useTranslations("manager.services");
  const tPeriods = useTranslations("components.dateRange.periods");
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branchId || "";
  const [dateRange, setDateRange] = useState<ProductDateRange>(getDefaultDateRange);
  const [serviceFilter, setServiceFilter] = useState("");
  const apiRange = insightPeriodToRange(dateRange);

  const perfInfinite = useInfiniteQuery({
    queryKey: ["service-contribution", branchId, dateRange.preset, dateRange.from, dateRange.to, serviceFilter],
    queryFn: ({ pageParam }) =>
      api.getServiceContribution({
        ...apiRange,
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
          period: tPeriods(dateRange.preset),
          updating: isFetching && !isLoading ? t("updating") : "",
        })}
        action={
          <DateRangeSelector
            value={dateRange}
            onChange={setDateRange}
            testId="manager-services-date-range"
          />
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
