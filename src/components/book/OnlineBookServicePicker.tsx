"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Minus, Plus, Search } from "lucide-react";
import type { BookService } from "@/lib/book-api";
import { catalogItemsFromBookServices } from "@/lib/book-catalog";
import { formatMoney } from "@/lib/utils";
import {
  buildWalkInSubCategories,
  filterWalkInServices,
  groupWalkInSubCategories,
  shouldAutoSelectSubCategory,
} from "@/app/manager/walk-in/walk-in-catalog";

export function OnlineBookServicePicker({
  services,
  branchId,
  cartIds,
  accent,
  onToggle,
}: {
  services: BookService[];
  branchId?: string;
  cartIds: string[];
  accent: string;
  onToggle: (branchServiceId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState("");
  const [subCategory, setSubCategory] = useState("");

  const catalogItems = useMemo(
    () => catalogItemsFromBookServices(services, branchId),
    [services, branchId]
  );

  const audiences = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of catalogItems) {
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
  }, [catalogItems]);

  const subCategories = useMemo(
    () => buildWalkInSubCategories(catalogItems, audience),
    [catalogItems, audience]
  );

  const subGroups = useMemo(() => {
    if (audience) {
      const name = audiences.find((a) => a.id === audience)?.name ?? "";
      return [{ parentId: audience, parentName: name, items: subCategories }];
    }
    return groupWalkInSubCategories(subCategories);
  }, [audience, subCategories, audiences]);

  const visibleServices = useMemo(
    () => filterWalkInServices(catalogItems, audience, subCategory, query),
    [catalogItems, audience, subCategory, query]
  );

  const inSearch = query.trim().length > 0;
  const inServiceList = !inSearch && !!subCategory;
  const inBrowse = !inSearch && !subCategory;

  const activeSub = subCategories.find((s) => s.id === subCategory);
  const activeAudience = audiences.find((a) => a.id === audience);

  function selectAudience(id: string) {
    setAudience(id);
    const subs = buildWalkInSubCategories(catalogItems, id);
    setSubCategory(shouldAutoSelectSubCategory(subs, id) ?? "");
  }

  function serviceById(id: string) {
    return services.find((s) => s.branchServiceId === id);
  }

  return (
    <div className="bg-white">
      <div className="sticky top-[3.25rem] z-30 space-y-3 border-b border-black/[0.06] bg-white book-content-pad py-3 md:top-[3.5rem] lg:top-[6.5rem]">
        <div className="relative mx-auto max-w-3xl lg:max-w-none">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8e8e93]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search treatments & services"
            className="w-full rounded-full border-0 bg-[#f2f2f7] py-3 pl-10 pr-4 text-[15px] text-[#1c1917] placeholder:text-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[var(--book-accent)]/30 md:py-3.5"
          />
        </div>

        {!inSearch ? (
          <div className="flex flex-wrap gap-2 md:gap-2.5">
            <AudienceChip label="All" active={!audience} accent={accent} onClick={() => selectAudience("")} />
            {audiences.map((a) => (
              <AudienceChip
                key={a.id}
                label={a.name}
                active={audience === a.id}
                accent={accent}
                onClick={() => selectAudience(a.id)}
              />
            ))}
          </div>
        ) : null}

        {inServiceList && activeSub ? (
          <button
            type="button"
            onClick={() => setSubCategory("")}
            className="text-left text-sm font-medium text-[var(--book-accent)] touch-manipulation"
          >
            ← {activeAudience ? `${activeAudience.name} · ` : ""}
            {activeSub.name}
          </button>
        ) : null}
      </div>

      <div className="book-content-pad py-2 pb-6 md:py-4">
        {inSearch || inServiceList ? (
          <ul className="grid grid-cols-1 gap-0 md:grid-cols-2 md:gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {visibleServices.length === 0 ? (
              <li className="py-12 text-center text-sm text-[#8e8e93]">No services match your search</li>
            ) : (
              visibleServices.map((item) => {
                const svc = serviceById(item.id);
                if (!svc) return null;
                const inCart = cartIds.includes(item.id);
                return (
                  <li key={item.id} className="border-b border-[#f2f2f7] md:rounded-xl md:border md:border-[#f2f2f7] md:px-2">
                    <ServiceRow
                      name={svc.name}
                      meta={[svc.durationMinutes ? `${svc.durationMinutes} min` : null, svc.categoryName]
                        .filter(Boolean)
                        .join(" · ")}
                      price={svc.price}
                      inCart={inCart}
                      accent={accent}
                      onToggle={() => onToggle(item.id)}
                    />
                  </li>
                );
              })
            )}
          </ul>
        ) : (
          <div className="space-y-8 md:space-y-10">
            {subGroups.map((group) => (
              <section key={group.parentId}>
                {!audience ? (
                  <h2 className="mb-3 px-0.5 text-xs font-bold uppercase tracking-wider text-[#8e8e93] md:text-sm">
                    {group.parentName}
                  </h2>
                ) : null}
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.items.map((sub) => (
                    <li key={sub.id}>
                      <button
                        type="button"
                        onClick={() => setSubCategory(sub.id)}
                        className="flex h-full w-full items-center gap-3 rounded-2xl border border-[#f2f2f7] bg-white px-4 py-4 text-left shadow-sm transition hover:border-[#e5e5ea] hover:shadow-md active:scale-[0.99] touch-manipulation"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[16px] leading-snug text-[#1c1917]">{sub.name}</p>
                          <p className="mt-0.5 text-sm text-[#8e8e93]">
                            {sub.count} service{sub.count === 1 ? "" : "s"} · from {formatMoney(sub.minPrice)}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 shrink-0 text-[#c7c7cc]" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AudienceChip({
  label,
  active,
  accent,
  onClick,
}: {
  label: string;
  active: boolean;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition touch-manipulation ${
        active ? "text-white shadow-sm" : "bg-[#f2f2f7] text-[#1c1917]"
      }`}
      style={active ? { backgroundColor: accent } : undefined}
    >
      {label}
    </button>
  );
}

function ServiceRow({
  name,
  meta,
  price,
  inCart,
  accent,
  onToggle,
}: {
  name: string;
  meta?: string;
  price: number;
  inCart: boolean;
  accent: string;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start gap-3 py-4">
      <div className="min-w-0 flex-1 pr-2">
        <p className="text-[16px] font-semibold leading-snug text-[#1c1917] break-words">{name}</p>
        {meta ? <p className="mt-1 text-sm text-[#8e8e93]">{meta}</p> : null}
        <p className="mt-2 text-[15px] font-bold tabular-nums text-[#1c1917]">{formatMoney(price)}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={inCart}
        aria-label={inCart ? `Remove ${name}` : `Add ${name}`}
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition touch-manipulation ${
          inCart ? "border-emerald-500 bg-emerald-500 text-white" : "border-[#d1d1d6] bg-white text-[#1c1917]"
        }`}
        style={!inCart ? { borderColor: accent, color: accent } : undefined}
      >
        {inCart ? <Minus className="h-4 w-4" strokeWidth={2.5} /> : <Plus className="h-4 w-4" strokeWidth={2.5} />}
      </button>
    </div>
  );
}
