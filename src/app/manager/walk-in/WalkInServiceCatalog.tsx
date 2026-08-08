"use client";

import { Search, Star, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { BranchServiceItem } from "@/lib/api";
import { TenantLocaleKit } from "@/lib/tenant-locale";
import { formatCurrency, cn } from "@/lib/utils";
import { Card, inputClass } from "@/components/ui";

interface WalkInServiceCatalogProps {
  serviceQuery: string;
  onServiceQueryChange: (q: string) => void;
  recentServices: BranchServiceItem[];
  favoriteServices: BranchServiceItem[];
  favoriteServiceIds: string[];
  topCategories: { id: string; name: string }[];
  catalogTop: string;
  onCatalogTopChange: (id: string) => void;
  filteredServices: BranchServiceItem[];
  localeKit: TenantLocaleKit;
  onAddService: (s: BranchServiceItem) => void;
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
  filteredServices,
  localeKit,
  onAddService,
  onToggleFavorite,
}: WalkInServiceCatalogProps) {
  const t = useTranslations("manager.walkIn");

  return (
    <Card padding={false} className="flex flex-col min-h-0 flex-1 overflow-hidden">
      <div className="px-3 sm:px-4 py-3 border-b border-[var(--border)] space-y-3 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="search"
            value={serviceQuery}
            onChange={(e) => onServiceQueryChange(e.target.value)}
            placeholder={t("searchServices")}
            className={`${inputClass} pl-10 py-3 text-sm`}
          />
        </div>

        {!serviceQuery && recentServices.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
              {t("recentServices")}
            </p>
            <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain max-w-full min-w-0 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {recentServices.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onAddService(s)}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--brand)] transition touch-manipulation"
                >
                  {s.serviceName}
                </button>
              ))}
            </div>
          </div>
        )}

        {!serviceQuery && favoriteServices.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
              {t("favorites")}
            </p>
            <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain max-w-full min-w-0 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {favoriteServices.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onAddService(s)}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300 hover:opacity-80 transition touch-manipulation"
                >
                  <Star className="w-3 h-3 fill-current" />
                  {s.serviceName}
                </button>
              ))}
            </div>
          </div>
        )}

        {!serviceQuery && topCategories.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain max-w-full min-w-0 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => onCatalogTopChange("")}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition border touch-manipulation",
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
                onClick={() => onCatalogTopChange(top.id)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition border touch-manipulation",
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
      </div>

      <div className="p-2 sm:p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {filteredServices.length === 0 ? (
          <p className="col-span-full text-sm text-[var(--text-secondary)] text-center py-6">{t("noServicesMatch")}</p>
        ) : (
          filteredServices.map((s) => {
            const isFav = favoriteServiceIds.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                data-testid="walk-in-service-card"
                onClick={() => onAddService(s)}
                className="flex items-center justify-between gap-2 p-3 min-h-[3.25rem] rounded-xl border border-[var(--border)] hover:border-[var(--brand)] hover:bg-[var(--brand-light)] transition text-left active:scale-[0.98] touch-manipulation min-w-0"
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
                  <Plus className="w-4 h-4 text-[var(--brand-text)]" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </Card>
  );
}
