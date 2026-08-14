"use client";

import { Search, Star, Plus, Minus, ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { BranchServiceItem } from "@/lib/api";
import { TenantLocaleKit } from "@/lib/tenant-locale";
import { formatCurrency, cn } from "@/lib/utils";
import { Card, inputClass } from "@/components/ui";
import type { WalkInSubCategory, WalkInSubCategoryGroup } from "./walk-in-catalog";

interface WalkInServiceCatalogProps {
  serviceQuery: string;
  onServiceQueryChange: (q: string) => void;
  recentServices: BranchServiceItem[];
  favoriteServices: BranchServiceItem[];
  favoriteServiceIds: string[];
  topCategories: { id: string; name: string }[];
  catalogTop: string;
  onCatalogTopChange: (id: string) => void;
  catalogSub: string;
  onCatalogSubChange: (id: string) => void;
  subCategoryGroups: WalkInSubCategoryGroup[];
  subCategories: WalkInSubCategory[];
  filteredServices: BranchServiceItem[];
  cartServiceIds: string[];
  localeKit: TenantLocaleKit;
  onToggleService: (s: BranchServiceItem) => void;
  onToggleFavorite: (id: string) => void;
}

export function WalkInServiceCatalog({
  serviceQuery,
  onServiceQueryChange,
  recentServices,
  favoriteServices,
  favoriteServiceIds,
  topCategories,
  catalogTop,
  onCatalogTopChange,
  catalogSub,
  onCatalogSubChange,
  subCategoryGroups,
  subCategories,
  filteredServices,
  cartServiceIds,
  localeKit,
  onToggleService,
  onToggleFavorite,
}: WalkInServiceCatalogProps) {
  const t = useTranslations("manager.walkIn");

  const inSearchMode = serviceQuery.trim().length > 0;
  const inServiceList = !inSearchMode && !!catalogSub;
  const inBrowseMode = !inSearchMode && !catalogSub;
  const cartServiceIdSet = new Set(cartServiceIds);

  function serviceActionLabel(s: BranchServiceItem, inCart: boolean) {
    return inCart ? t("removeServiceFromCart", { name: s.serviceName }) : s.serviceName;
  }

  function serviceActionIcon(inCart: boolean, className?: string) {
    if (inCart) {
      return <Minus className={cn("w-4 h-4 text-emerald-700 dark:text-emerald-400", className)} aria-hidden />;
    }
    return <Plus className={cn("w-4 h-4 text-[var(--brand-text)]", className)} aria-hidden />;
  }
  function serviceChipClass(inCart: boolean) {
    return cn(
      "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition touch-manipulation",
      inCart
        ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
        : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--brand)] text-[var(--text-primary)]"
    );
  }

  function serviceCardClass(inCart: boolean) {
    return cn(
      "flex items-center justify-between gap-2 p-3 min-h-[3.25rem] rounded-xl border transition text-left touch-manipulation min-w-0",
      inCart
        ? "border-emerald-300 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/30"
        : "border-[var(--border)] hover:border-[var(--brand)] hover:bg-[var(--brand-light)] active:scale-[0.98]"
    );
  }

  const activeSub = subCategories.find((s) => s.id === catalogSub);

  function handleTopChange(id: string) {
    onCatalogTopChange(id);
    onCatalogSubChange("");
  }

  return (
    <Card padding={false} className="flex flex-col min-h-0 flex-1 overflow-hidden">
      <div className="px-2.5 sm:px-3 py-2 border-b border-[var(--border)] space-y-2 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="search"
            value={serviceQuery}
            onChange={(e) => onServiceQueryChange(e.target.value)}
            placeholder={t("searchServices")}
            className={`${inputClass} pl-9 py-2.5 text-sm`}
          />
        </div>

        {!inSearchMode && recentServices.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain max-w-full min-w-0 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {recentServices.map((s) => {
                const inCart = cartServiceIdSet.has(s.id);
                return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onToggleService(s)}
                  className={cn(serviceChipClass(inCart), "inline-flex items-center gap-1")}
                  aria-pressed={inCart}
                  aria-label={serviceActionLabel(s, inCart)}
                >
                  {inCart ? serviceActionIcon(true, "w-3 h-3") : null}
                  {s.serviceName}
                </button>
              );
              })}
            </div>
        )}

        {!inSearchMode && favoriteServices.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain max-w-full min-w-0 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {favoriteServices.map((s) => {
                const inCart = cartServiceIdSet.has(s.id);
                return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onToggleService(s)}
                  className={cn(serviceChipClass(inCart), "flex items-center gap-1")}
                  aria-pressed={inCart}
                  aria-label={serviceActionLabel(s, inCart)}
                >
                  <Star className={cn("w-3 h-3", inCart ? "fill-emerald-600 text-emerald-600" : "fill-amber-500 text-amber-500")} />
                  {inCart ? serviceActionIcon(true, "w-3 h-3") : null}
                  {s.serviceName}
                </button>
              );
              })}
            </div>
        )}

        {!inSearchMode && topCategories.length > 0 && (
          <div className="flex gap-1 overflow-x-auto overscroll-x-contain max-w-full min-w-0 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => handleTopChange("")}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition border touch-manipulation min-h-9",
                  !catalogTop
                    ? "bg-[var(--brand)] text-[var(--brand-on-brand)] border-transparent"
                    : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brand)]"
                )}
              >
                {t("allCategories")}
              </button>
              {topCategories.map((top) => (
                <button
                  key={top.id}
                  type="button"
                  onClick={() => handleTopChange(top.id)}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition border touch-manipulation min-h-9",
                    catalogTop === top.id
                      ? "bg-[var(--brand)] text-[var(--brand-on-brand)] border-transparent"
                      : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brand)]"
                  )}
                >
                  {top.name}
                </button>
              ))}
            </div>
        )}

        {inServiceList && subCategories.length > 1 && (
          <div className="flex gap-1 overflow-x-auto overscroll-x-contain max-w-full min-w-0 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {subCategories.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => onCatalogSubChange(sub.id)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition border touch-manipulation min-h-9",
                  catalogSub === sub.id
                    ? "bg-[var(--brand-light)] text-[var(--brand-text)] border-[var(--brand)]"
                    : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brand)]"
                )}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {inServiceList && activeSub && (
        <div className="px-2.5 sm:px-3 py-1.5 border-b border-[var(--border)] bg-[var(--surface-muted)]/40 shrink-0 flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => onCatalogSubChange("")}
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--brand-text)] touch-manipulation shrink-0 min-h-8"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {t("backToCategories")}
          </button>
          <span className="text-xs text-[var(--text-secondary)] truncate">
            {activeSub.parentName} · {activeSub.name}
          </span>
        </div>
      )}

      <div className="p-2 sm:p-2.5 flex-1 min-h-0 overflow-y-auto overscroll-contain touch-scroll-y" data-touch-scroll>
        {inBrowseMode ? (
          <div className="space-y-3">
            {subCategoryGroups.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] text-center py-8">{t("noServicesMatch")}</p>
            ) : (
              subCategoryGroups.map((group) => (
                <section key={group.parentId} className="space-y-2">
                  {!catalogTop && (
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-0.5">
                      {group.parentName}
                    </h3>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {group.items.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        data-testid="walk-in-subcategory-tile"
                        onClick={() => onCatalogSubChange(sub.id)}
                        className="flex flex-col items-start gap-1 p-3 min-h-[5rem] rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--brand)] hover:bg-[var(--brand-light)]/50 transition text-left active:scale-[0.98] touch-manipulation min-w-0 shadow-sm"
                      >
                        <p className="font-semibold text-sm text-[var(--text-primary)] leading-snug line-clamp-2">
                          {sub.name}
                        </p>
                        <p className="text-[11px] text-[var(--text-tertiary)]">
                          {t("categoryServiceCount", { count: sub.count })}
                        </p>
                        <p className="text-xs font-bold text-[var(--brand-text)] tabular-nums mt-auto">
                          {t("priceFrom", { price: formatCurrency(sub.minPrice, localeKit) })}
                        </p>
                      </button>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {filteredServices.length === 0 ? (
              <p className="col-span-full text-sm text-[var(--text-secondary)] text-center py-6">{t("noServicesMatch")}</p>
            ) : (
              filteredServices.map((s) => {
                const isFav = favoriteServiceIds.includes(s.id);
                const inCart = cartServiceIdSet.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    data-testid="walk-in-service-card"
                    onClick={() => onToggleService(s)}
                    className={serviceCardClass(inCart)}
                    aria-pressed={inCart}
                    aria-label={serviceActionLabel(s, inCart)}
                  >
                    <div className="min-w-0 flex items-start gap-1.5">
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={isFav ? t("unstarFavorite") : t("starFavorite")}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(s.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            e.preventDefault();
                            onToggleFavorite(s.id);
                          }
                        }}
                        className="p-0.5 -m-0.5 mt-0.5 shrink-0 cursor-pointer"
                      >
                        <Star
                          className={cn(
                            "w-3.5 h-3.5",
                            isFav ? "fill-amber-400 text-amber-400" : "text-[var(--text-tertiary)]"
                          )}
                        />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{s.serviceName}</p>
                        <p className="text-xs text-[var(--text-tertiary)] truncate">
                          {[s.parentCategoryName, s.categoryName].filter(Boolean).join(" · ")}
                          {s.durationMinutes ? ` · ${s.durationMinutes}m` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="font-bold text-sm text-[var(--brand-text)]">
                        {s.variablePricing
                          ? t("priceFrom", { price: formatCurrency(s.price, localeKit) })
                          : formatCurrency(s.price, localeKit)}
                      </span>
                      {serviceActionIcon(inCart)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
