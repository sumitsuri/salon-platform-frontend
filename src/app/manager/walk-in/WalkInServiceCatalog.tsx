"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Search, Star, Plus, Minus, ChevronDown, ChevronLeft, X, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { BranchServiceItem } from "@/lib/api";
import { TenantLocaleKit } from "@/lib/tenant-locale";
import { formatCurrency, cn } from "@/lib/utils";
import { useScrollLock } from "@/lib/use-scroll-lock";
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

function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function CatalogPickerSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const tCommon = useTranslations("common");
  const mounted = useIsMounted();

  useScrollLock(open);

  if (!open || !mounted) return null;

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[140] bg-black/45 lg:hidden"
        aria-label={tCommon("close")}
        onClick={onClose}
      />
      <div
        className="fixed inset-x-0 bottom-0 z-[150] flex max-h-[min(72dvh,520px)] flex-col rounded-t-2xl border-t border-[var(--border)] bg-[var(--surface)] shadow-2xl pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5 shrink-0">
          <p className="font-bold text-sm text-[var(--text-primary)]">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-muted)] touch-manipulation"
            aria-label={tCommon("close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain touch-scroll-y min-h-0 flex-1 p-2" data-touch-scroll>
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}

function HorizontalScrollFade({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain max-w-full min-w-0 pb-0.5 scroll-fade-x touch-scroll-x">
        {children}
      </div>
    </div>
  );
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
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [subCategorySheetOpen, setSubCategorySheetOpen] = useState(false);

  const inSearchMode = serviceQuery.trim().length > 0;
  const inServiceList = !inSearchMode && !!catalogSub;
  const inBrowseMode = !inSearchMode && !catalogSub;
  const cartServiceIdSet = new Set(cartServiceIds);

  const activeTop = topCategories.find((c) => c.id === catalogTop);
  const activeSub = subCategories.find((s) => s.id === catalogSub);

  const desktopRecent = recentServices.filter((s) => !cartServiceIdSet.has(s.id));
  const desktopFavorites = favoriteServices.filter((s) => !cartServiceIdSet.has(s.id));

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
      "flex items-center justify-between gap-2 rounded-xl border transition text-left touch-manipulation min-w-0",
      "p-2.5 min-h-[2.75rem] lg:p-3 lg:min-h-[3.25rem]",
      inCart
        ? "border-emerald-300 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/30"
        : "border-[var(--border)] hover:border-[var(--brand)] hover:bg-[var(--brand-light)] active:scale-[0.98]"
    );
  }

  function handleTopChange(id: string) {
    onCatalogTopChange(id);
    onCatalogSubChange("");
    setCategorySheetOpen(false);
  }

  function handleSubChange(id: string) {
    onCatalogSubChange(id);
    setSubCategorySheetOpen(false);
  }

  function serviceSubtitle(s: BranchServiceItem) {
    if (inServiceList || inSearchMode) {
      return s.durationMinutes ? `${s.durationMinutes}m` : null;
    }
    const parts = [s.parentCategoryName, s.categoryName].filter(Boolean);
    if (s.durationMinutes) parts.push(`${s.durationMinutes}m`);
    return parts.length > 0 ? parts.join(" · ") : null;
  }

  function pickerButtonClass(active: boolean) {
    return cn(
      "flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left touch-manipulation min-h-10",
      active
        ? "border-[var(--brand)] bg-[var(--brand-light)]/40"
        : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--brand)]/50"
    );
  }

  return (
    <Card padding={false} className="flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-hidden">
      <div className="px-2.5 sm:px-3 py-1.5 lg:py-2 border-b border-[var(--border)] space-y-1.5 lg:space-y-2 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="search"
            value={serviceQuery}
            onChange={(e) => onServiceQueryChange(e.target.value)}
            placeholder={t("searchServices")}
            className={`${inputClass} pl-9 py-2 text-sm lg:py-2.5`}
          />
        </div>

        {/* Desktop only — quick picks, never show in-cart services as chips (P0) */}
        {!inSearchMode && desktopRecent.length > 0 && (
          <HorizontalScrollFade className="hidden lg:block">
            {desktopRecent.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onToggleService(s)}
                className={cn(serviceChipClass(false), "inline-flex items-center gap-1")}
                aria-label={serviceActionLabel(s, false)}
              >
                {s.serviceName}
              </button>
            ))}
          </HorizontalScrollFade>
        )}

        {!inSearchMode && desktopFavorites.length > 0 && (
          <HorizontalScrollFade className="hidden lg:block">
            {desktopFavorites.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onToggleService(s)}
                className={cn(serviceChipClass(false), "flex items-center gap-1")}
                aria-label={serviceActionLabel(s, false)}
              >
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                {s.serviceName}
              </button>
            ))}
          </HorizontalScrollFade>
        )}

        {/* Mobile: quick step back within the catalog (header back does the same) */}
        {inServiceList && activeSub && (
          <button
            type="button"
            onClick={() => onCatalogSubChange("")}
            className="inline-flex items-center gap-1 rounded-lg px-1 py-1 text-xs font-semibold text-[var(--brand-text)] hover:bg-[var(--surface-muted)] touch-manipulation lg:hidden"
          >
            <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {t("backToServiceTypes")}
          </button>
        )}

        {/* Mobile: category pickers instead of horizontal chip rows (P0) */}
        {!inSearchMode && topCategories.length > 0 && (
          <div className="flex gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setCategorySheetOpen(true)}
              className={pickerButtonClass(!!catalogTop)}
              aria-haspopup="dialog"
              aria-expanded={categorySheetOpen}
            >
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                  {t("categorySheetTitle")}
                </span>
                <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
                  {activeTop?.name ?? t("allCategories")}
                </span>
              </span>
              <ChevronDown className="w-4 h-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
            </button>

            {(catalogTop || inServiceList) && subCategories.length > 0 && (
              <button
                type="button"
                onClick={() => setSubCategorySheetOpen(true)}
                className={pickerButtonClass(!!catalogSub)}
                aria-haspopup="dialog"
                aria-expanded={subCategorySheetOpen}
              >
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                    {t("subcategorySheetTitle")}
                  </span>
                  <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
                    {activeSub?.name ?? t("pickSubcategory")}
                  </span>
                </span>
                <ChevronDown className="w-4 h-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
              </button>
            )}
          </div>
        )}

        {/* Desktop: horizontal category chips */}
        {!inSearchMode && topCategories.length > 0 && (
          <HorizontalScrollFade className="hidden lg:block">
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
          </HorizontalScrollFade>
        )}

        {inServiceList && subCategories.length > 1 && (
          <HorizontalScrollFade className="hidden lg:block">
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
          </HorizontalScrollFade>
        )}
      </div>

      <div
        className="p-1.5 sm:p-2 lg:p-2.5 lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:touch-scroll-y"
        data-touch-scroll
      >
        {inBrowseMode ? (
          <div className="space-y-2 lg:space-y-3">
            {subCategoryGroups.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] text-center py-8">{t("noServicesMatch")}</p>
            ) : (
              subCategoryGroups.map((group) => (
                <section key={group.parentId} className="space-y-1.5 lg:space-y-2">
                  {!catalogTop && (
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-0.5">
                      {group.parentName}
                    </h3>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 lg:gap-2">
                    {group.items.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        data-testid="walk-in-subcategory-tile"
                        onClick={() => onCatalogSubChange(sub.id)}
                        className="flex flex-col items-start gap-0.5 p-2.5 min-h-[4.5rem] lg:min-h-[5rem] rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--brand)] hover:bg-[var(--brand-light)]/50 transition text-left active:scale-[0.98] touch-manipulation min-w-0 shadow-sm"
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
          <div className="flex flex-col gap-1.5 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-2">
            {filteredServices.length === 0 ? (
              <p className="col-span-full text-sm text-[var(--text-secondary)] text-center py-6">{t("noServicesMatch")}</p>
            ) : (
              filteredServices.map((s) => {
                const isFav = favoriteServiceIds.includes(s.id);
                const inCart = cartServiceIdSet.has(s.id);
                const meta = serviceSubtitle(s);
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
                    <div className="min-w-0 flex items-center gap-1.5">
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
                        className="p-0.5 -m-0.5 shrink-0 cursor-pointer"
                      >
                        <Star
                          className={cn(
                            "w-3.5 h-3.5",
                            isFav ? "fill-amber-400 text-amber-400" : "text-[var(--text-tertiary)]"
                          )}
                        />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-[var(--text-primary)] truncate leading-tight">
                          {s.serviceName}
                        </p>
                        {meta ? (
                          <p className="text-[11px] text-[var(--text-tertiary)] truncate leading-tight">{meta}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <span className="font-bold text-sm text-[var(--brand-text)] tabular-nums">
                        {s.variablePricing
                          ? t("priceFrom", { price: formatCurrency(s.price, localeKit) })
                          : formatCurrency(s.price, localeKit)}
                      </span>
                      {serviceActionIcon(inCart, "w-3.5 h-3.5")}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <CatalogPickerSheet
        open={categorySheetOpen}
        onClose={() => setCategorySheetOpen(false)}
        title={t("categorySheetTitle")}
      >
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => handleTopChange("")}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-3 text-left touch-manipulation min-h-11",
              !catalogTop
                ? "border-[var(--brand)] bg-[var(--brand-light)]/50"
                : "border-[var(--border)] hover:border-[var(--brand)]/40"
            )}
          >
            <span className="font-semibold text-sm text-[var(--text-primary)]">{t("allCategories")}</span>
            {!catalogTop ? <Check className="w-4 h-4 text-[var(--brand-text)] shrink-0" /> : null}
          </button>
          {topCategories.map((top) => (
            <button
              key={top.id}
              type="button"
              onClick={() => handleTopChange(top.id)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-3 text-left touch-manipulation min-h-11",
                catalogTop === top.id
                  ? "border-[var(--brand)] bg-[var(--brand-light)]/50"
                  : "border-[var(--border)] hover:border-[var(--brand)]/40"
              )}
            >
              <span className="font-semibold text-sm text-[var(--text-primary)]">{top.name}</span>
              {catalogTop === top.id ? <Check className="w-4 h-4 text-[var(--brand-text)] shrink-0" /> : null}
            </button>
          ))}
        </div>
      </CatalogPickerSheet>

      <CatalogPickerSheet
        open={subCategorySheetOpen}
        onClose={() => setSubCategorySheetOpen(false)}
        title={t("subcategorySheetTitle")}
      >
        <div className="space-y-1">
          {inServiceList && (
            <button
              type="button"
              onClick={() => handleSubChange("")}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-3 py-3 text-left touch-manipulation min-h-11 hover:border-[var(--brand)]/40"
            >
              <span className="font-semibold text-sm text-[var(--brand-text)]">{t("changeCategory")}</span>
            </button>
          )}
          {subCategories.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => handleSubChange(sub.id)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-3 text-left touch-manipulation min-h-11",
                catalogSub === sub.id
                  ? "border-[var(--brand)] bg-[var(--brand-light)]/50"
                  : "border-[var(--border)] hover:border-[var(--brand)]/40"
              )}
            >
              <div className="min-w-0">
                <span className="font-semibold text-sm text-[var(--text-primary)]">{sub.name}</span>
                {!catalogTop && sub.parentName ? (
                  <span className="block text-[11px] text-[var(--text-tertiary)] truncate">{sub.parentName}</span>
                ) : null}
              </div>
              {catalogSub === sub.id ? <Check className="w-4 h-4 text-[var(--brand-text)] shrink-0" /> : null}
            </button>
          ))}
        </div>
      </CatalogPickerSheet>
    </Card>
  );
}
