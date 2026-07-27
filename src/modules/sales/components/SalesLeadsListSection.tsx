"use client";

import { SalesLead, SalesLocality } from "@/modules/sales/api/salesApi";
import {
  SalesLeadFilters,
  SalesLeadFilterState,
  hasActiveFilters,
} from "@/modules/sales/components/SalesLeadFilters";
import { SalesLeadsTable } from "@/modules/sales/components/SalesLeadsTable";
import { Card } from "@/components/ui";

interface SalesLeadsListSectionProps {
  leads: SalesLead[];
  filters: SalesLeadFilterState;
  onFiltersChange: (filters: SalesLeadFilterState) => void;
  localities: SalesLocality[];
  isLoading?: boolean;
  periodLabel: string;
  /** Leads visible on board (same date range, no list filters) — for empty-state hints. */
  boardLeadCount?: number;
}

export function SalesLeadsListSection({
  leads,
  filters,
  onFiltersChange,
  localities,
  isLoading,
  periodLabel,
  boardLeadCount = 0,
}: SalesLeadsListSectionProps) {
  const filteredEmpty = leads.length === 0 && hasActiveFilters(filters);
  const boardHasMore =
    filteredEmpty && boardLeadCount > 0 && boardLeadCount > leads.length;

  return (
    <section data-testid="pipeline-list-section">
      <div className="mb-3 border-b border-[var(--border)] pb-2">
        <h2 className="text-base font-semibold">List view</h2>
        <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
          Filter and open leads · {periodLabel}
        </p>
      </div>

      <div className="mb-3" data-testid="sales-lead-filters">
        <SalesLeadFilters filters={filters} onChange={onFiltersChange} localities={localities} />
      </div>

      {hasActiveFilters(filters) && (
        <p className="mb-2 text-xs text-[var(--ink-muted)]">
          {leads.length} lead{leads.length !== 1 ? "s" : ""} match filters
          {boardHasMore && (
            <span className="text-amber-700">
              {" "}
              · {boardLeadCount} in this period on the board — try clearing filters
            </span>
          )}
        </p>
      )}

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-[var(--ink-muted)]">Loading list…</Card>
      ) : (
        <SalesLeadsTable
          leads={leads}
          emptyMessage={
            hasActiveFilters(filters)
              ? boardHasMore
                ? "No leads match your filters — clear filters to see all leads in this period"
                : "No leads match your filters for this period"
              : "No leads created in this date range"
          }
        />
      )}
    </section>
  );
}
