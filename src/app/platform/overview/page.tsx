"use client";

import { useQuery } from "@tanstack/react-query";
import { salesApi } from "@/modules/sales/api/salesApi";
import { SalesPipelineToolbar } from "@/modules/sales/components/SalesPipelineToolbar";
import { PlatformOverviewDashboard } from "@/modules/platform/components/PlatformOverviewDashboard";
import { useSalesPipelineParams } from "@/modules/sales/hooks/useSalesPipelineParams";
import { formatDateRangeLabel } from "@/modules/sales/lib/date-range";
import { PageHeader, Card, AlertBanner } from "@/components/ui";
import { MissionStrip } from "@/components/brand/MissionStrip";

export default function PlatformOverviewPage() {
  const { dateRange, selectedRepIds, setDateRange, setSelectedRepIds } = useSalesPipelineParams();
  const periodLabel = formatDateRangeLabel(dateRange.from, dateRange.to);

  const { data: reps = [] } = useQuery({
    queryKey: ["sales-reps"],
    queryFn: () => salesApi.listReps(),
  });

  const {
    data: overview,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["platform-overview", dateRange.from, dateRange.to, selectedRepIds],
    queryFn: () =>
      salesApi.platformOverview({
        from: dateRange.from,
        to: dateRange.to,
        assignedRepIds: selectedRepIds.length > 0 ? selectedRepIds : undefined,
      }),
  });

  const repLabel =
    selectedRepIds.length > 0
      ? reps
          .filter((r) => selectedRepIds.includes(r.id))
          .map((r) => r.name.split(" ")[0])
          .join(", ")
      : "All reps";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Overview"
        subtitle="Antrahq platform health — customers, revenue, and sales performance"
      />
      <MissionStrip />

      <SalesPipelineToolbar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        showRepFilter
        reps={reps}
        selectedRepIds={selectedRepIds}
        onRepIdsChange={setSelectedRepIds}
        dateTestId="platform-overview-date-range"
      />

      {isError && (
        <AlertBanner variant="error">
          {error instanceof Error ? error.message : "Failed to load overview"}
        </AlertBanner>
      )}

      {isLoading && !overview && (
        <Card className="p-8 text-center text-sm text-[var(--ink-muted)]">Loading overview…</Card>
      )}

      {overview && (
        <PlatformOverviewDashboard
          overview={overview}
          periodLabel={periodLabel}
          repLabel={repLabel}
        />
      )}
    </div>
  );
}
