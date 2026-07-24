"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Scissors, Hash, IndianRupee } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { ServiceContributionPanel } from "@/components/ServiceContributionPanel";
import { PageHeader, StatCard, selectClass, EmptyState } from "@/components/ui";
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
  const [servicePage, setServicePage] = useState(0);
  const [serviceSize, setServiceSize] = useState(20);
  const dateRange = insightPeriodToRange(period);

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["service-contribution", branchId, period, serviceFilter, servicePage, serviceSize],
    queryFn: () =>
      api.getServiceContribution({
        ...dateRange,
        serviceName: serviceFilter || undefined,
        page: servicePage,
        size: serviceSize,
      }),
    enabled: !!branchId,
  });

  const heroCount = Math.min(3, data?.services.length ?? 0);

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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          label={t("services")}
          value={data?.services.length ?? 0}
          icon={Scissors}
          accent="brand"
        />
        <StatCard
          label={t("sold")}
          value={data?.totalServiceCount ?? 0}
          icon={Hash}
          accent="violet"
        />
        <StatCard
          label={t("revenue")}
          value={data ? formatCurrency(data.serviceRevenue) : "—"}
          icon={IndianRupee}
          accent="emerald"
        />
      </div>

      {heroCount > 0 && data && (
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
          data={data}
          loading={isLoading}
          serviceFilter={serviceFilter}
          onServiceFilterChange={(v) => {
            setServiceFilter(v);
            setServicePage(0);
          }}
          page={servicePage}
          size={serviceSize}
          onPageChange={setServicePage}
          onSizeChange={(s) => {
            setServiceSize(s);
            setServicePage(0);
          }}
        />
      )}
    </div>
  );
}
