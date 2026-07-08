"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Scissors, Hash, IndianRupee } from "lucide-react";
import { api } from "@/lib/api";
import { BranchMultiSelect } from "@/components/BranchMultiSelect";
import { ServiceContributionPanel } from "@/components/ServiceContributionPanel";
import { PageHeader, StatCard, EmptyState, selectClass } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

type Period = "all" | "days60" | "month" | "week" | "today";

function periodToRange(period: Period): { startDate?: string; endDate?: string } {
  if (period === "all") return {};
  const today = new Date();
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (period === "today") return { startDate: fmt(today), endDate: fmt(today) };
  if (period === "week") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { startDate: fmt(start), endDate: fmt(today) };
  }
  if (period === "days60") {
    const start = new Date(today);
    start.setDate(start.getDate() - 59);
    return { startDate: fmt(start), endDate: fmt(today) };
  }
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return { startDate: fmt(start), endDate: fmt(today) };
}

const PERIOD_LABELS: Record<Period, string> = {
  all: "All time",
  days60: "Last 60 days",
  month: "This month",
  week: "Last 7 days",
  today: "Today",
};

export default function AdminServicesPage() {
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [period, setPeriod] = useState<Period>("days60");
  const [initialized, setInitialized] = useState(false);
  const [serviceFilter, setServiceFilter] = useState("");
  const [servicePage, setServicePage] = useState(0);
  const [serviceSize, setServiceSize] = useState(20);

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

  const dateRange = periodToRange(period);
  const branchFilter =
    selectedBranches.length > 0 && selectedBranches.length < branches.length
      ? selectedBranches
      : undefined;

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["service-contribution", selectedBranches, period, serviceFilter, servicePage, serviceSize],
    queryFn: () =>
      api.getServiceContribution({
        ...dateRange,
        branchIds: branchFilter,
        serviceName: serviceFilter || undefined,
        page: servicePage,
        size: serviceSize,
      }),
    enabled: initialized && selectedBranches.length > 0,
  });

  const heroCount = Math.min(3, data?.services.length ?? 0);

  if (!initialized) {
    return <p className="text-[var(--text-tertiary)] text-sm py-8 text-center">Loading...</p>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Service sales"
        subtitle={isFetching && !isLoading ? "Updating..." : PERIOD_LABELS[period]}
        action={
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className={`${selectClass} py-2.5 w-full sm:w-auto min-w-0 sm:min-w-[7rem]`}
          >
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABELS[p]}
              </option>
            ))}
          </select>
        }
      />

      <BranchMultiSelect branches={branches} selected={selectedBranches} onChange={setSelectedBranches} />

      {selectedBranches.length === 0 ? (
        <EmptyState title="Select at least one branch" description="Choose branches above to view service contribution" />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <StatCard label="Services" value={data?.services.length ?? 0} icon={Scissors} accent="brand" />
            <StatCard label="Sold" value={data?.totalServiceCount ?? 0} icon={Hash} accent="violet" />
            <StatCard
              label="Service revenue"
              value={data ? formatCurrency(data.serviceRevenue) : "—"}
              icon={IndianRupee}
              accent="emerald"
              className="col-span-2 lg:col-span-1"
            />
          </div>

          {heroCount > 0 && data && (
            <p className="text-sm text-[var(--text-secondary)]">
              Top {heroCount} services account for{" "}
              <span className="font-medium text-[var(--text-primary)]">
                {data.services
                  .slice(0, heroCount)
                  .reduce((sum, s) => sum + s.revenueSharePct, 0)
                  .toFixed(1)}
                %
              </span>{" "}
              of service revenue — use this to coach teams on hero vs focus services.
            </p>
          )}

          {isError ? (
            <EmptyState
              title="Could not load service data"
              description={error instanceof Error ? error.message : "Please refresh or try again."}
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
        </>
      )}
    </div>
  );
}
