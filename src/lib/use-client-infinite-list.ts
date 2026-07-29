"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_PAGE_SIZE } from "@/components/ui";

/** Client-side infinite reveal for in-memory arrays (e.g. dashboard aggregates). */
export function useClientInfiniteList<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [items, pageSize]);

  const visible = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  const loadMore = useCallback(() => {
    setVisibleCount((current) => Math.min(current + pageSize, items.length));
  }, [items.length, pageSize]);

  return {
    visible,
    totalElements: items.length,
    loadedCount: visible.length,
    hasMore,
    loadMore,
  };
}
