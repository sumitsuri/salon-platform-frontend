"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SalesLeadFilterState } from "@/modules/sales/components/SalesLeadFilters";
import { SalesDateRange, getDefaultDateRange } from "@/modules/sales/lib/date-range";
import {
  buildPipelineSearchParams,
  parseFiltersFromSearchParams,
  parsePipelineSearchParams,
  parseRepIdsFromSearchParams,
} from "@/modules/sales/lib/pipeline-search-params";

/** Date range + list filters + optional rep filter kept in sync via URL. */
export function useSalesPipelineParams(): {
  dateRange: SalesDateRange;
  filters: SalesLeadFilterState;
  selectedRepIds: string[];
  setDateRange: (range: SalesDateRange) => void;
  setFilters: (filters: SalesLeadFilterState) => void;
  setSelectedRepIds: (repIds: string[]) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { dateRange, filters, selectedRepIds } = useMemo(
    () => parsePipelineSearchParams(searchParams),
    [searchParams]
  );

  useEffect(() => {
    if (!searchParams.get("range")) {
      const nextFilters = parseFiltersFromSearchParams(searchParams);
      const repIds = parseRepIdsFromSearchParams(searchParams);
      const q = buildPipelineSearchParams(getDefaultDateRange(), nextFilters, repIds);
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  const setDateRange = useCallback(
    (next: SalesDateRange) => {
      const q = buildPipelineSearchParams(next, filters, selectedRepIds);
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [pathname, router, filters, selectedRepIds]
  );

  const setFilters = useCallback(
    (next: SalesLeadFilterState) => {
      const q = buildPipelineSearchParams(dateRange, next, selectedRepIds);
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [pathname, router, dateRange, selectedRepIds]
  );

  const setSelectedRepIds = useCallback(
    (repIds: string[]) => {
      const q = buildPipelineSearchParams(dateRange, filters, repIds);
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [pathname, router, dateRange, filters]
  );

  return { dateRange, filters, selectedRepIds, setDateRange, setFilters, setSelectedRepIds };
}
