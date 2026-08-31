"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

/** Static export + trailingSlash: build href consistent with the address bar. */
export function buildPathWithSearch(pathname: string, params: URLSearchParams): string {
  const q = params.toString();
  const base = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return q ? `${base}?${q}` : base;
}

function readSearchParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function applyHistoryUrl(href: string, mode: "push" | "replace") {
  if (mode === "replace") {
    window.history.replaceState(window.history.state, "", href);
  } else {
    window.history.pushState(window.history.state, "", href);
  }
}

/**
 * Read/write a query param while preserving others.
 * Uses the History API for same-page query changes — Next.js 16.2.x static
 * export restores stale searchParams from router cache on router.replace().
 *
 * Avoids useSearchParams() so route pages render immediately without Suspense.
 */
export function useUrlQueryParam(name: string) {
  const pathname = usePathname();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const sync = () => setRevision((r) => r + 1);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    setRevision((r) => r + 1);
  }, [pathname]);

  const value = useMemo(() => {
    void revision;
    if (typeof window === "undefined") return null;
    return readSearchParams().get(name);
  }, [name, revision]);

  const hrefWithout = useMemo(() => {
    void revision;
    const params = readSearchParams();
    params.delete(name);
    return buildPathWithSearch(pathname, params);
  }, [name, pathname, revision]);

  const bump = useCallback(() => setRevision((r) => r + 1), []);

  const unset = useCallback(() => {
    if (typeof window === "undefined") return;
    const params = readSearchParams();
    if (!params.has(name)) return;

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    applyHistoryUrl(hrefWithout, "replace");
    bump();
  }, [name, hrefWithout, bump]);

  const set = useCallback(
    (next: string | null, mode: "push" | "replace" = "push") => {
      if (typeof window === "undefined") return;

      if (next === null) {
        unset();
        return;
      }

      const params = readSearchParams();
      params.set(name, next);
      const href = buildPathWithSearch(pathname, params);
      applyHistoryUrl(href, mode);
      bump();
    },
    [name, pathname, unset, bump]
  );

  const pushHref = useCallback(
    (href: string) => {
      if (typeof window === "undefined") return;
      applyHistoryUrl(href, "push");
      bump();
    },
    [bump]
  );

  return { value, set, unset, pushHref, hrefWithout, isSet: !!value };
}

/** Pair of query params, e.g. drawer type + entity id. */
export function useUrlDrawerParams(typeParam = "drawer", idParam = "id") {
  const pathname = usePathname();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const sync = () => setRevision((r) => r + 1);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    setRevision((r) => r + 1);
  }, [pathname]);

  const params = useMemo(() => {
    void revision;
    return readSearchParams();
  }, [revision]);

  const drawerType = params.get(typeParam);
  const drawerId = params.get(idParam);

  const applyParams = useCallback(
    (next: URLSearchParams, mode: "push" | "replace") => {
      if (typeof window === "undefined") return;
      const href = buildPathWithSearch(pathname, next);
      applyHistoryUrl(href, mode);
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
    if (typeof window === "undefined") return;
    const current = readSearchParams();
    if (!current.has(typeParam) && !current.has(idParam)) return;

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

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
