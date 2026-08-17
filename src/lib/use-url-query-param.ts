"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Read/write a single query param while preserving others. Enables deep links + browser back. */
export function useUrlQueryParam(name: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const value = searchParams.get(name);

  const hrefWithout = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(name);
    const q = params.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [name, pathname, searchParams]);

  const set = useCallback(
    (next: string | null, mode: "push" | "replace" = "push") => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set(name, next);
      else params.delete(name);
      const q = params.toString();
      const href = q ? `${pathname}?${q}` : pathname;
      if (mode === "replace") router.replace(href);
      else router.push(href);
    },
    [name, pathname, router, searchParams]
  );

  return { value, set, hrefWithout, isSet: !!value };
}

/** Pair of query params, e.g. drawer type + entity id. */
export function useUrlDrawerParams(typeParam = "drawer", idParam = "id") {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const drawerType = searchParams.get(typeParam);
  const drawerId = searchParams.get(idParam);

  const open = useCallback(
    (type: string, id: string, mode: "push" | "replace" = "push") => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(typeParam, type);
      params.set(idParam, id);
      const href = `${pathname}?${params.toString()}`;
      if (mode === "replace") router.replace(href);
      else router.push(href);
    },
    [idParam, pathname, router, searchParams, typeParam]
  );

  const close = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(typeParam);
    params.delete(idParam);
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }, [idParam, pathname, router, searchParams, typeParam]);

  return {
    drawerType,
    drawerId,
    isOpen: !!(drawerType && drawerId),
    open,
    close,
  };
}
