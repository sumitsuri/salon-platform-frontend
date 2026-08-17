"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Static export + trailingSlash: build href consistent with the address bar. */
function buildPathWithSearch(pathname: string, params: URLSearchParams): string {
  const q = params.toString();
  const base = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return q ? `${base}?${q}` : base;
}

function readSearchParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

/**
 * Read/write a query param while preserving others.
 * Uses the History API for same-page query changes — Next.js 16.2.x static
 * export restores stale searchParams from router cache on router.replace().
 */
export function useUrlQueryParam(name: string) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const sync = () => setRevision((r) => r + 1);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  // Next.js client navigations update searchParams but not popstate.
  useEffect(() => {
    setRevision((r) => r + 1);
  }, [searchParams]);

  const value = useMemo(() => {
    void revision;
    if (typeof window !== "undefined") {
      return readSearchParams().get(name);
    }
    return searchParams.get(name);
  }, [name, searchParams, revision]);

  const hrefWithout = useMemo(() => {
    void revision;
    const params =
      typeof window !== "undefined" ? readSearchParams() : new URLSearchParams(searchParams.toString());
    params.delete(name);
    return buildPathWithSearch(pathname, params);
  }, [name, pathname, searchParams, revision]);

  const set = useCallback(
    (next: string | null, mode: "push" | "replace" = "push") => {
      if (typeof window === "undefined") return;

      const params = readSearchParams();
      if (next) params.set(name, next);
      else params.delete(name);
      const href = buildPathWithSearch(pathname, params);

      if (mode === "replace") {
        window.history.replaceState(window.history.state, "", href);
      } else {
        window.history.pushState(window.history.state, "", href);
      }
      setRevision((r) => r + 1);
    },
    [name, pathname]
  );

  return { value, set, hrefWithout, isSet: !!value };
}

/** Pair of query params, e.g. drawer type + entity id. */
export function useUrlDrawerParams(typeParam = "drawer", idParam = "id") {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const sync = () => setRevision((r) => r + 1);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    setRevision((r) => r + 1);
  }, [searchParams]);

  const params = useMemo(() => {
    void revision;
    return typeof window !== "undefined" ? readSearchParams() : new URLSearchParams(searchParams.toString());
  }, [searchParams, revision]);

  const drawerType = params.get(typeParam);
  const drawerId = params.get(idParam);

  const applyParams = useCallback(
    (next: URLSearchParams, mode: "push" | "replace") => {
      if (typeof window === "undefined") return;
      const href = buildPathWithSearch(pathname, next);
      if (mode === "replace") {
        window.history.replaceState(window.history.state, "", href);
      } else {
        window.history.pushState(window.history.state, "", href);
      }
      setRevision((r) => r + 1);
    },
    [pathname]
  );

  const open = useCallback(
    (type: string, id: string, mode: "push" | "replace" = "push") => {
      const next = readSearchParams();
      next.set(typeParam, type);
      next.set(idParam, id);
      applyParams(next, mode);
    },
    [applyParams, idParam, typeParam]
  );

  const close = useCallback(() => {
    const next = readSearchParams();
    next.delete(typeParam);
    next.delete(idParam);
    applyParams(next, "replace");
  }, [applyParams, idParam, typeParam]);

  return {
    drawerType,
    drawerId,
    isOpen: !!(drawerType && drawerId),
    open,
    close,
  };
}
