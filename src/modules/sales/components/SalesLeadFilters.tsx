"use client";

import { LeadSource, LeadStage, LeadType, STAGES, SalesLocality } from "@/modules/sales/api/salesApi";
import { STAGE_LABELS } from "@/modules/sales/lib/stage-utils";
import { selectClass, btnSecondary } from "@/components/ui";

export interface SalesLeadFilterState {
  stage: LeadStage | "";
  localityId: string;
  source: LeadSource | "";
  leadType: LeadType | "";
}

export const EMPTY_FILTERS: SalesLeadFilterState = {
  stage: "",
  localityId: "",
  source: "",
  leadType: "",
};

export function hasActiveFilters(
  filters: SalesLeadFilterState,
  ignore: (keyof SalesLeadFilterState)[] = []
): boolean {
  return (Object.entries(filters) as [keyof SalesLeadFilterState, string][]).some(
    ([key, value]) => !ignore.includes(key) && value !== ""
  );
}

export function filtersToQueryParams(
  filters: SalesLeadFilterState,
  dateRange?: { from: string; to: string }
): Record<string, string | number> {
  const params: Record<string, string | number> = { page: 0, size: 500 };
  if (filters.stage) params.stage = filters.stage;
  if (filters.localityId) params.localityId = filters.localityId;
  if (filters.source) params.source = filters.source;
  if (filters.leadType) params.leadType = filters.leadType;
  if (dateRange?.from) params.createdFrom = dateRange.from;
  if (dateRange?.to) params.createdTo = dateRange.to;
  return params;
}

interface SalesLeadFiltersProps {
  filters: SalesLeadFilterState;
  onChange: (filters: SalesLeadFilterState) => void;
  localities: SalesLocality[];
  hideSourceFilter?: boolean;
}

export function SalesLeadFilters({
  filters,
  onChange,
  localities,
  hideSourceFilter = false,
}: SalesLeadFiltersProps) {
  const set = (patch: Partial<SalesLeadFilterState>) =>
    onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
      <label className="block min-w-[120px] text-xs">
        <span className="mb-1 block font-medium text-[var(--ink-muted)]">Stage</span>
        <select
          className={selectClass}
          value={filters.stage}
          onChange={(e) => set({ stage: e.target.value as LeadStage | "" })}
        >
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      <label className="block min-w-[140px] text-xs">
        <span className="mb-1 block font-medium text-[var(--ink-muted)]">Location</span>
        <select
          className={selectClass}
          value={filters.localityId}
          onChange={(e) => set({ localityId: e.target.value })}
        >
          <option value="">All areas</option>
          {localities.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>

      {!hideSourceFilter && (
      <label className="block min-w-[120px] text-xs">
        <span className="mb-1 block font-medium text-[var(--ink-muted)]">Source</span>
        <select
          className={selectClass}
          value={filters.source}
          onChange={(e) => set({ source: e.target.value as LeadSource | "" })}
        >
          <option value="">All sources</option>
          <option value="FIELD">Field</option>
          <option value="MARKETING_WEB">Marketing Web</option>
          <option value="REFERRAL">Referral</option>
          <option value="INBOUND_CALL">Inbound call</option>
          <option value="OTHER">Other</option>
        </select>
      </label>
      )}

      {hideSourceFilter && (
        <div className="flex min-w-[140px] flex-col justify-end text-xs">
          <span className="mb-1 block font-medium text-[var(--ink-muted)]">Source</span>
          <span className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 font-medium text-violet-800">
            Marketing Web
          </span>
        </div>
      )}

      <label className="block min-w-[120px] text-xs">
        <span className="mb-1 block font-medium text-[var(--ink-muted)]">Type</span>
        <select
          className={selectClass}
          value={filters.leadType}
          onChange={(e) => set({ leadType: e.target.value as LeadType | "" })}
        >
          <option value="">All types</option>
          <option value="SHOP">Shop</option>
          <option value="BRAND">Brand</option>
          <option value="CHANNEL_PARTNER">Channel partner</option>
        </select>
      </label>

      {hasActiveFilters(filters, hideSourceFilter ? ["source"] : []) && (
        <button
          type="button"
          className={btnSecondary}
          onClick={() =>
            onChange(
              hideSourceFilter ? { ...EMPTY_FILTERS, source: filters.source } : EMPTY_FILTERS
            )
          }
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
