"use client";

import { createContext, useCallback, useContext, useMemo, useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AppNavItem, isNavActive, normalizeNavPath } from "@/components/app-nav";
import { BreadcrumbItem } from "@/components/Breadcrumbs";

type BreadcrumbContextValue = {
  pageBreadcrumbs: BreadcrumbItem[] | null;
  setPageBreadcrumbs: (items: BreadcrumbItem[] | null) => void;
  nav: AppNavItem[];
  homeHref: string;
  homeLabel: string;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

function breadcrumbStableKey(items: BreadcrumbItem[] | null): string {
  if (!items) return "";
  return items.map((i) => `${i.label}|${i.href ?? ""}|${i.onClick ? "fn" : ""}`).join(">");
}

export function BreadcrumbProvider({
  nav,
  homeHref,
  homeLabel,
  children,
}: {
  nav: AppNavItem[];
  homeHref: string;
  homeLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [pageBreadcrumbs, setPageBreadcrumbsState] = useState<BreadcrumbItem[] | null>(null);

  // Route changes must drop page-level overrides; otherwise stale crumbs block shell updates.
  useEffect(() => {
    setPageBreadcrumbsState(null);
  }, [pathname]);

  const setPageBreadcrumbs = useCallback((items: BreadcrumbItem[] | null) => {
    setPageBreadcrumbsState((prev) => {
      if (breadcrumbStableKey(prev) === breadcrumbStableKey(items)) return prev;
      return items;
    });
  }, []);

  const value = useMemo(
    () => ({ pageBreadcrumbs, setPageBreadcrumbs, nav, homeHref, homeLabel }),
    [pageBreadcrumbs, setPageBreadcrumbs, nav, homeHref, homeLabel]
  );

  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

function buildRouteBreadcrumbs(
  pathname: string,
  homeHref: string,
  homeLabel: string,
  nav: AppNavItem[]
): BreadcrumbItem[] {
  const path = normalizeNavPath(pathname);
  const home = normalizeNavPath(homeHref);

  if (path === home) return [];

  for (const item of nav) {
    const matchedChild = item.children
      ?.slice()
      .sort((a, b) => normalizeNavPath(b.href).length - normalizeNavPath(a.href).length)
      .find((child) => isNavActive(pathname, child.href, child.exact));

    if (!matchedChild) continue;

    const crumbs: BreadcrumbItem[] = [];
    const itemPath = normalizeNavPath(item.href);

    if (itemPath !== home) {
      crumbs.push({ label: homeLabel, href: homeHref });
    }

    if (itemPath !== home || item.children?.length) {
      crumbs.push({ label: item.label, href: item.href });
    }

    return crumbs;
  }

  const topLevel = nav
    .slice()
    .sort((a, b) => normalizeNavPath(b.href).length - normalizeNavPath(a.href).length)
    .find(
      (item) =>
        normalizeNavPath(item.href) !== home && isNavActive(pathname, item.href, item.exact)
    );

  if (topLevel) {
    return [{ label: homeLabel, href: homeHref }];
  }

  const homeNav = nav.find((item) => normalizeNavPath(item.href) === home);
  if (homeNav && isNavActive(pathname, homeNav.href, false)) {
    return [{ label: homeLabel, href: homeHref }];
  }

  return [{ label: homeLabel, href: homeHref }];
}

export function useBreadcrumbs(): BreadcrumbItem[] {
  const ctx = useContext(BreadcrumbContext);
  const pathname = usePathname();

  return useMemo(() => {
    if (!ctx) return [];
    if (ctx.pageBreadcrumbs) return ctx.pageBreadcrumbs;
    return buildRouteBreadcrumbs(pathname, ctx.homeHref, ctx.homeLabel, ctx.nav);
  }, [ctx, pathname]);
}

/** Override auto route breadcrumbs (e.g. platform tenant drill-down). Clears on unmount. */
export function useSetPageBreadcrumbs(items: BreadcrumbItem[] | null) {
  const setPageBreadcrumbs = useContext(BreadcrumbContext)?.setPageBreadcrumbs;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const stableKey = breadcrumbStableKey(items);

  useEffect(() => {
    if (!setPageBreadcrumbs) return;
    setPageBreadcrumbs(itemsRef.current);
    return () => setPageBreadcrumbs(null);
  }, [setPageBreadcrumbs, stableKey]);
}

export function useBreadcrumbActions() {
  const ctx = useContext(BreadcrumbContext);
  return {
    setPageBreadcrumbs: ctx?.setPageBreadcrumbs ?? (() => {}),
  };
}
