"use client";

import { useEffect, useMemo, useRef } from "react";
import { useBreadcrumbActions } from "@/lib/breadcrumb-context";
import { BreadcrumbItem } from "@/components/Breadcrumbs";

function breadcrumbStableKey(items: BreadcrumbItem[] | null): string {
  if (!items) return "";
  return items.map((i) => `${i.label}|${i.href ?? ""}|${i.onClick ? "fn" : ""}`).join(">");
}

/** Mobile top-bar breadcrumbs while a URL-backed detail overlay is open. */
export function useDetailBreadcrumbs(
  open: boolean,
  items: BreadcrumbItem[] | null | undefined
) {
  const { setPageBreadcrumbs } = useBreadcrumbActions();
  const crumbs = useMemo(() => (open && items?.length ? items : null), [open, items]);
  const crumbsRef = useRef(crumbs);
  crumbsRef.current = crumbs;
  const stableKey = open && crumbs ? breadcrumbStableKey(crumbs) : "";

  useEffect(() => {
    if (!open || !crumbsRef.current) return;
    setPageBreadcrumbs(crumbsRef.current);
    return () => setPageBreadcrumbs(null);
  }, [setPageBreadcrumbs, open, stableKey]);
}
