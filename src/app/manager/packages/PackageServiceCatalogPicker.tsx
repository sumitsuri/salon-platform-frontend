"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Minus, Plus } from "lucide-react";
import { api, BranchServiceItem } from "@/lib/api";
import { getTenantLocaleKit } from "@/lib/tenant-locale";
import { formatCurrency } from "@/lib/utils";
import { btnSecondarySm } from "@/components/ui";
import { WalkInServiceCatalog } from "../walk-in/WalkInServiceCatalog";
import {
  buildWalkInSubCategories,
  filterWalkInServices,
  groupWalkInSubCategories,
} from "../walk-in/walk-in-catalog";
import type { PackagePlanItemDraft } from "./package-plan-types";

type Props = {
  branchId: string;
  items: PackagePlanItemDraft[];
  onChange: (items: PackagePlanItemDraft[]) => void;
  disabled?: boolean;
};

export function PackageServiceCatalogPicker({ branchId, items, onChange, disabled }: Props) {
  const t = useTranslations("manager.packages");
  const localeKit = getTenantLocaleKit();
  const [serviceQuery, setServiceQuery] = useState("");
  const [catalogTop, setCatalogTop] = useState("");
  const [catalogSub, setCatalogSub] = useState("");

  const { data: services = [] } = useQuery({
    queryKey: ["branch-services", branchId],
    queryFn: () => api.getBranchServices(branchId),
    enabled: !!branchId,
  });

  const topCategories = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of services) {
      const id = s.parentCategoryId || s.categoryId || "other";
      const name = s.parentCategoryName || s.categoryName || "Other";
      if (!map.has(id)) map.set(id, name);
    }
    const preferred = ["Men", "Women", "Kids", "Shared", "Spa"];
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => {
        const ai = preferred.indexOf(a.name);
        const bi = preferred.indexOf(b.name);
        if (ai >= 0 || bi >= 0) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
        return a.name.localeCompare(b.name);
      });
  }, [services]);

  const subCategories = useMemo(
    () => buildWalkInSubCategories(services, catalogTop),
    [services, catalogTop]
  );

  const subCategoryGroups = useMemo(() => {
    if (catalogTop) {
      const parentName = topCategories.find((c) => c.id === catalogTop)?.name ?? "";
      return [{ parentId: catalogTop, parentName, items: subCategories }];
    }
    return groupWalkInSubCategories(subCategories);
  }, [catalogTop, subCategories, topCategories]);

  const filteredServices = useMemo(
    () => filterWalkInServices(services, catalogTop, catalogSub, serviceQuery),
    [services, catalogTop, catalogSub, serviceQuery]
  );

  const selectedBranchIds = useMemo(() => {
    const byService = new Map(services.map((s) => [s.serviceId, s.id]));
    return items.map((i) => byService.get(i.serviceId)).filter(Boolean) as string[];
  }, [items, services]);

  function toggleService(s: BranchServiceItem) {
    if (disabled) return;
    const exists = items.find((i) => i.serviceId === s.serviceId);
    if (exists) {
      onChange(items.filter((i) => i.serviceId !== s.serviceId));
    } else {
      onChange([
        ...items,
        {
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          quantity: 1,
          sortOrder: items.length,
        },
      ]);
    }
  }

  function setQty(serviceId: string, delta: number) {
    onChange(
      items
        .map((i) =>
          i.serviceId === serviceId
            ? { ...i, quantity: Math.max(1, Math.min(99, i.quantity + delta)) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  }

  if (!branchId) {
    return <p className="text-xs text-amber-800">{t("itemsNeedBranch")}</p>;
  }

  return (
    <div className="space-y-3">
      {items.length > 0 ? (
        <ul className="space-y-1.5 rounded-xl border border-sky-200/80 bg-sky-50/40 p-2 dark:border-sky-900/40 dark:bg-sky-950/20">
          {items.map((row) => (
            <li key={row.serviceId} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">{row.serviceName}</span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={disabled}
                  className={btnSecondarySm}
                  onClick={() => setQty(row.serviceId, -1)}
                  aria-label={t("decreaseSessions")}
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-6 text-center tabular-nums text-xs font-semibold">{row.quantity}</span>
                <button
                  type="button"
                  disabled={disabled}
                  className={btnSecondarySm}
                  onClick={() => setQty(row.serviceId, 1)}
                  aria-label={t("increaseSessions")}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-center text-[var(--text-tertiary)] py-2">{t("itemsEmpty")}</p>
      )}

      <WalkInServiceCatalog
        serviceQuery={serviceQuery}
        onServiceQueryChange={setServiceQuery}
        recentServices={[]}
        favoriteServices={[]}
        favoriteServiceIds={[]}
        topCategories={topCategories}
        catalogTop={catalogTop}
        onCatalogTopChange={(id) => {
          setCatalogTop(id);
          setCatalogSub("");
        }}
        catalogSub={catalogSub}
        onCatalogSubChange={setCatalogSub}
        subCategoryGroups={subCategoryGroups}
        subCategories={subCategories}
        filteredServices={filteredServices}
        cartServiceIds={selectedBranchIds}
        localeKit={localeKit}
        onToggleService={toggleService}
        onToggleFavorite={() => undefined}
        variant="walk-in"
        scrollWithParent
      />
    </div>
  );
}
