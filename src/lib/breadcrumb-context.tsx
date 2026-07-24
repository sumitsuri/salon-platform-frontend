"use client";

import { createContext, useCallback, useContext, useMemo, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AppNavItem } from "@/components/app-nav";
import { BreadcrumbItem } from "@/components/Breadcrumbs";

type BreadcrumbContextValue = {
  pageBreadcrumbs: BreadcrumbItem[] | null;
  setPageBreadcrumbs: (items: BreadcrumbItem[] | null) => void;
  nav: AppNavItem[];
  homeHref: string;
  homeLabel: string;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

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
  const [pageBreadcrumbs, setPageBreadcrumbsState] = useState<BreadcrumbItem[] | null>(null);
  const setPageBreadcrumbs = useCallback((items: BreadcrumbItem[] | null) => {
    setPageBreadcrumbsState(items);
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
  if (pathname === homeHref) return [];

  const current = nav
    .filter((item) => item.href !== homeHref)
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  if (!current) {
    return [{ label: homeLabel, href: homeHref }];
  }

  return [
    { label: homeLabel, href: homeHref },
    { label: current.label },
  ];
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
  const ctx = useContext(BreadcrumbContext);

  useEffect(() => {
    if (!ctx) return;
    ctx.setPageBreadcrumbs(items);
    return () => ctx.setPageBreadcrumbs(null);
  }, [ctx, items]);
}

export function useBreadcrumbActions() {
  const ctx = useContext(BreadcrumbContext);
  return {
    setPageBreadcrumbs: ctx?.setPageBreadcrumbs ?? (() => {}),
  };
}
