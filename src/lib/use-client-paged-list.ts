"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export const DEFAULT_LIST_PAGE_SIZE = 10;

export function useClientPagedList<T>(items: T[], pageSize = DEFAULT_LIST_PAGE_SIZE) {
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [items, pageSize]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize) || 1);
  const safePage = Math.min(page, totalPages - 1);

  const pageItems = useMemo(
    () => items.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [items, safePage, pageSize],
  );

  const goPrev = useCallback(() => setPage((p) => Math.max(0, Math.min(p, totalPages - 1) - 1)), [totalPages]);
  const goNext = useCallback(() => setPage((p) => Math.min(totalPages - 1, Math.min(p, totalPages - 1) + 1)), [totalPages]);

  return {
    page: safePage,
    totalPages,
    pageItems,
    goPrev,
    goNext,
    hasPrev: safePage > 0,
    hasNext: safePage < totalPages - 1,
    showPager: items.length > pageSize,
  };
}
