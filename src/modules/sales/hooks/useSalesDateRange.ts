"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SalesDateRange, getDefaultDateRange, parseDateRangeFromSearchParams } from "@/modules/sales/lib/date-range";
import {
  buildPipelineSearchParams,
  parseFiltersFromSearchParams,
  parseRepIdsFromSearchParams,
  salesPathWithSearchParams,
} from "@/modules/sales/lib/pipeline-search-params";

/** Syncs date range with URL search params (preserves list filter params). */
export function useSalesDateRange(): [SalesDateRange, (range: SalesDateRange) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const range = useMemo(
    () => parseDateRangeFromSearchParams(searchParams),
    [searchParams]
  );

  useEffect(() => {
    if (!searchParams.get("range")) {
      const filters = parseFiltersFromSearchParams(searchParams);
      const repIds = parseRepIdsFromSearchParams(searchParams);
      router.replace(
        `${pathname}?${buildPipelineSearchParams(getDefaultDateRange(), filters, repIds).toString()}`,
        { scroll: false }
      );
    }
  }, [pathname, router, searchParams]);

  const setRange = useCallback(
    (next: SalesDateRange) => {
      const filters = parseFiltersFromSearchParams(searchParams);
      const repIds = parseRepIdsFromSearchParams(searchParams);
      const q = buildPipelineSearchParams(next, filters, repIds);
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return [range, setRange];
}

export { salesPathWithSearchParams };

/** @deprecated use salesPathWithSearchParams */
export function salesPathWithDateRange(path: string, searchParams: URLSearchParams): string {
  return salesPathWithSearchParams(path, searchParams);
}
