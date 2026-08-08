"use client";

import { useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import type { PageResult } from "@/lib/api";
import { DEFAULT_PAGE_SIZE } from "@/components/ui";

type FetchPageFn<T> = (page: number) => Promise<PageResult<T>>;

export function useInfinitePagedList<T>({
  queryKey,
  queryFn,
  enabled = true,
  staleTime = 30_000,
  pageSize = DEFAULT_PAGE_SIZE,
}: {
  queryKey: readonly unknown[];
  queryFn: FetchPageFn<T>;
  enabled?: boolean;
  staleTime?: number;
  pageSize?: number;
}) {
  const query = useInfiniteQuery({
    queryKey: [...queryKey, pageSize],
    queryFn: ({ pageParam }) => queryFn(pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const next = lastPage.page + 1;
      return next < lastPage.totalPages ? next : undefined;
    },
    enabled,
    staleTime,
    placeholderData: keepPreviousData,
  });

  const items = query.data?.pages.flatMap((page) => page.content) ?? [];
  const totalElements = query.data?.pages[0]?.totalElements ?? 0;

  return {
    ...query,
    items,
    totalElements,
    hasMore: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}
