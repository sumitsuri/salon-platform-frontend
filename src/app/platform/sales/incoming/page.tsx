"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { salesApi } from "@/modules/sales/api/salesApi";
import {
  EMPTY_FILTERS,
  SalesLeadFilterState,
} from "@/modules/sales/components/SalesLeadFilters";
import { SalesLeadsListSection } from "@/modules/sales/components/SalesLeadsListSection";
import { SalesPipelineToolbar } from "@/modules/sales/components/SalesPipelineToolbar";
import { useSalesPipelineParams } from "@/modules/sales/hooks/useSalesPipelineParams";
import { buildLeadListParams } from "@/modules/sales/lib/pipeline-search-params";
import { INCOMING_LEADS_SOURCE } from "@/modules/sales/lib/source-labels";
import { formatDateRangeLabel } from "@/modules/sales/lib/date-range";
import { salesQueryKeys } from "@/modules/sales/lib/query-keys";
import { PageHeader, AlertBanner, Card } from "@/components/ui";
import { useAuthStore } from "@/lib/auth-store";

const INCOMING_FILTERS: SalesLeadFilterState = {
  ...EMPTY_FILTERS,
  source: INCOMING_LEADS_SOURCE,
};

export default function IncomingLeadsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "PLATFORM_SUPER_ADMIN";
  const { dateRange, setDateRange } = useSalesPipelineParams();
  const [filters, setFilters] = useState<SalesLeadFilterState>(INCOMING_FILTERS);

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace("/platform/sales");
    }
  }, [user, isAdmin, router]);

  const listParams = useMemo(
    () => buildLeadListParams({ ...filters, source: INCOMING_LEADS_SOURCE }, dateRange, []),
    [filters, dateRange]
  );

  const { data: listData, isLoading, isError, error } = useQuery({
    queryKey: salesQueryKeys.leadsList(listParams),
    queryFn: () => salesApi.listLeads(listParams),
  });

  const { data: localities = [] } = useQuery({
    queryKey: ["sales-localities"],
    queryFn: () => salesApi.listLocalities(),
  });

  const periodLabel = formatDateRangeLabel(dateRange.from, dateRange.to);
  const leads = listData?.content ?? [];

  if (user && !isAdmin) {
    return null;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Incoming leads"
        subtitle="Demo requests and enquiries from antrahq.com — stored as Marketing Web leads"
        action={
          <Link
            href="/platform/sales"
            className="text-sm font-medium text-[var(--brand-text)] hover:underline"
          >
            View full pipeline
          </Link>
        }
      />

      <Card className="border-[var(--brand-ring)] bg-[var(--brand-light)]/40 p-4 text-sm text-[var(--ink-muted)]">
        Leads submitted via the{" "}
        <a
          href="https://antrahq.com/demo/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[var(--brand-text)] hover:underline"
        >
          marketing demo form
        </a>{" "}
        appear here with source <strong>Marketing Web</strong>. Open any row for the same lead
        detail view used in the sales pipeline.
      </Card>

      <SalesPipelineToolbar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        dateTestId="incoming-leads-date-range"
      />

      {isError && (
        <AlertBanner variant="error">
          {error instanceof Error ? error.message : "Failed to load incoming leads"}
        </AlertBanner>
      )}

      <SalesLeadsListSection
        leads={leads}
        filters={filters}
        onFiltersChange={(next) => setFilters({ ...next, source: INCOMING_LEADS_SOURCE })}
        localities={localities}
        isLoading={isLoading}
        periodLabel={periodLabel}
        hideSourceFilter
        title="Marketing Web leads"
        subtitle={`Inbound from antrahq.com · ${periodLabel}`}
        emptyMessage="No incoming marketing leads in this period"
      />
    </div>
  );
}
