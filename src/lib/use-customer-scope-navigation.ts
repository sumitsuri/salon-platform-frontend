"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { useSetPageBreadcrumbs } from "@/lib/breadcrumb-context";
import { BreadcrumbItem } from "@/components/Breadcrumbs";
import { AppScope, customerDetailPath, customersPath } from "@/lib/navigation-scope";

export function useCustomerScopeNavigation({
  customerId,
  scope,
  currentPageLabel,
  enabled = true,
}: {
  customerId: string | undefined;
  scope: AppScope;
  currentPageLabel: string;
  enabled?: boolean;
}) {
  const tAdmin = useTranslations("admin.layout");
  const tManager = useTranslations("manager.nav");

  const customersHref = customersPath(scope);
  const homeHref = scope === "admin" ? "/admin" : "/manager";
  const homeLabel = scope === "admin" ? tAdmin("nav.overview") : tManager("home");
  const customersLabel = scope === "admin" ? tAdmin("nav.customers") : tManager("customers");

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => api.getCustomer(customerId!),
    enabled: enabled && !!customerId,
    staleTime: 60_000,
  });

  const breadcrumbs = useMemo((): BreadcrumbItem[] | null => {
    if (!customerId) return null;
    const crumbs: BreadcrumbItem[] = [
      { label: homeLabel, href: homeHref },
      { label: customersLabel, href: customersHref },
    ];
    if (customer?.name) {
      crumbs.push({ label: customer.name, href: customerDetailPath(scope, customerId) });
    } else if (isLoading) {
      crumbs.push({ label: "…" });
    }
    crumbs.push({ label: currentPageLabel });
    return crumbs;
  }, [customerId, customer?.name, isLoading, scope, homeHref, homeLabel, customersHref, customersLabel, currentPageLabel]);

  useSetPageBreadcrumbs(breadcrumbs);

  return {
    customer,
    isLoading,
    customersHref,
    customersLabel,
    customerDetailHref: customerId ? customerDetailPath(scope, customerId) : customersHref,
    isScoped: !!customerId,
  };
}
