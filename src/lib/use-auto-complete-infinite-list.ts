"use client";

import { useEffect } from "react";
import { useInfinitePagedList } from "@/lib/use-infinite-paged-list";
import type { PageResult } from "@/lib/api";
import { DEFAULT_PAGE_SIZE } from "@/components/ui";

/** Loads every page in the background (for kanban boards / aggregations). */
export function useAutoCompleteInfiniteList<T>({
  queryKey,
  queryFn,
  enabled = true,
  staleTime = 30_000,
  pageSize = DEFAULT_PAGE_SIZE,
}: {
  queryKey: readonly unknown[];
  queryFn: (page: number) => Promise<PageResult<T>>;
  enabled?: boolean;
  staleTime?: number;
  pageSize?: number;
}) {
  const result = useInfinitePagedList({ queryKey, queryFn, enabled, staleTime, pageSize });

  useEffect(() => {
    if (!enabled) return;
    if (result.hasMore && !result.isFetchingNextPage && !result.isLoading) {
      void result.fetchNextPage();
    }
  }, [enabled, result.hasMore, result.isFetchingNextPage, result.isLoading, result.fetchNextPage]);

  return result;
}
