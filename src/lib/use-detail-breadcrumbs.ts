"use client";

import { useMemo } from "react";
import { useSetPageBreadcrumbs } from "@/lib/breadcrumb-context";
import { BreadcrumbItem } from "@/components/Breadcrumbs";

/** Mobile top-bar breadcrumbs while a URL-backed detail overlay is open. */
export function useDetailBreadcrumbs(
  open: boolean,
  items: BreadcrumbItem[] | null | undefined
) {
  const crumbs = useMemo(() => (open && items?.length ? items : null), [open, items]);
  useSetPageBreadcrumbs(crumbs);
}
