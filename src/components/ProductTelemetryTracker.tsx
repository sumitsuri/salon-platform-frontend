"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { productAnalytics, type ProductAnalyticsPortal } from "@/lib/product-analytics";

type Props = {
  portal: ProductAnalyticsPortal;
  active: boolean;
};

/** Fire-and-forget product usage events — never blocks UI or auth flows. */
export function ProductTelemetryTracker({ portal, active }: Props) {
  const pathname = usePathname();

  useEffect(() => {
    if (!active) return;
    productAnalytics.configure(portal);
    productAnalytics.resetSession();
    productAnalytics.trackSessionStarted();
  }, [active, portal]);

  useEffect(() => {
    if (!active || !pathname) return;
    productAnalytics.trackScreen(pathname);
  }, [active, pathname, portal]);

  return null;
}
