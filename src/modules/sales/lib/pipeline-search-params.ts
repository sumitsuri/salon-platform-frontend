import {
  LeadSource,
  LeadStage,
  LeadType,
  STAGES,
} from "@/modules/sales/api/salesApi";
import {
  SalesLeadFilterState,
  EMPTY_FILTERS,
} from "@/modules/sales/components/SalesLeadFilters";
import {
  SalesDateRange,
  dateRangeToSearchParams,
  parseDateRangeFromSearchParams,
} from "@/modules/sales/lib/date-range";

const LEAD_SOURCES: LeadSource[] = [
  "FIELD",
  "MARKETING_WEB",
  "REFERRAL",
  "INBOUND_CALL",
  "OTHER",
];

const LEAD_TYPES: LeadType[] = ["SHOP", "BRAND", "CHANNEL_PARTNER"];

export function parseFiltersFromSearchParams(
  params: URLSearchParams
): SalesLeadFilterState {
  const stageRaw = params.get("stage") ?? "";
  const sourceRaw = params.get("source") ?? "";
  const typeRaw = params.get("leadType") ?? "";
  return {
    stage: STAGES.includes(stageRaw as LeadStage) ? (stageRaw as LeadStage) : "",
    localityId: params.get("localityId") ?? "",
    source: LEAD_SOURCES.includes(sourceRaw as LeadSource)
      ? (sourceRaw as LeadSource)
      : "",
    leadType: LEAD_TYPES.includes(typeRaw as LeadType) ? (typeRaw as LeadType) : "",
  };
}

export function appendFiltersToSearchParams(
  params: URLSearchParams,
  filters: SalesLeadFilterState
): URLSearchParams {
  if (filters.stage) params.set("stage", filters.stage);
  else params.delete("stage");
  if (filters.localityId) params.set("localityId", filters.localityId);
  else params.delete("localityId");
  if (filters.source) params.set("source", filters.source);
  else params.delete("source");
  if (filters.leadType) params.set("leadType", filters.leadType);
  else params.delete("leadType");
  return params;
}

export function parseRepIdsFromSearchParams(params: URLSearchParams): string[] {
  const raw = params.get("reps");
  if (!raw) return [];
  return raw.split(",").filter(Boolean);
}

export function appendRepIdsToSearchParams(
  params: URLSearchParams,
  repIds: string[]
): URLSearchParams {
  if (repIds.length > 0) params.set("reps", repIds.join(","));
  else params.delete("reps");
  return params;
}

export function buildPipelineSearchParams(
  dateRange: SalesDateRange,
  filters: SalesLeadFilterState = EMPTY_FILTERS,
  repIds: string[] = []
): URLSearchParams {
  const params = dateRangeToSearchParams(dateRange);
  appendFiltersToSearchParams(params, filters);
  appendRepIdsToSearchParams(params, repIds);
  return params;
}

export function buildLeadListParams(
  filters: SalesLeadFilterState,
  dateRange: SalesDateRange,
  repIds: string[] = []
): Record<string, string | number | string[]> {
  const params: Record<string, string | number | string[]> = { page: 0, size: 500 };
  if (filters.stage) params.stage = filters.stage;
  if (filters.localityId) params.localityId = filters.localityId;
  if (filters.source) params.source = filters.source;
  if (filters.leadType) params.leadType = filters.leadType;
  if (dateRange.from) params.createdFrom = dateRange.from;
  if (dateRange.to) params.createdTo = dateRange.to;
  if (repIds.length > 0) params.assignedRepIds = repIds;
  return params;
}

export function parsePipelineSearchParams(params: URLSearchParams): {
  dateRange: SalesDateRange;
  filters: SalesLeadFilterState;
  selectedRepIds: string[];
} {
  return {
    dateRange: parseDateRangeFromSearchParams(params),
    filters: parseFiltersFromSearchParams(params),
    selectedRepIds: parseRepIdsFromSearchParams(params),
  };
}

/** Keep date + filter params when navigating between sales sub-pages. */
export function salesPathWithSearchParams(
  path: string,
  searchParams: URLSearchParams
): string {
  const q = searchParams.toString();
  return q ? `${path}?${q}` : path;
}
