import type { BranchServiceItem } from "@/lib/api";

export type WalkInSubCategory = {
  id: string;
  name: string;
  parentId: string;
  parentName: string;
  count: number;
  minPrice: number;
};

export type WalkInSubCategoryGroup = {
  parentId: string;
  parentName: string;
  items: WalkInSubCategory[];
};

function topKey(s: BranchServiceItem) {
  return s.parentCategoryId || s.categoryId || "other";
}

function subKey(s: BranchServiceItem) {
  return s.categoryId || s.categoryName || topKey(s);
}

function servicesInTop(services: BranchServiceItem[], catalogTop: string) {
  if (!catalogTop) return services;
  return services.filter((s) => topKey(s) === catalogTop);
}

/** Leaf categories within the selected audience (Men / Women / …). */
export function buildWalkInSubCategories(
  services: BranchServiceItem[],
  catalogTop: string
): WalkInSubCategory[] {
  const map = new Map<string, WalkInSubCategory>();
  for (const s of servicesInTop(services, catalogTop)) {
    const id = subKey(s);
    const name = s.categoryName || s.parentCategoryName || "Other";
    const parentId = topKey(s);
    const parentName = s.parentCategoryName || s.categoryName || "Other";
    const existing = map.get(id);
    if (existing) {
      existing.count += 1;
      existing.minPrice = Math.min(existing.minPrice, s.price);
    } else {
      map.set(id, {
        id,
        name,
        parentId,
        parentName,
        count: 1,
        minPrice: s.price,
      });
    }
  }
  return [...map.values()].sort((a, b) => {
    const parentCmp = a.parentName.localeCompare(b.parentName);
    if (parentCmp !== 0) return parentCmp;
    return a.name.localeCompare(b.name);
  });
}

/** Group subcategories under audience headings when browsing “All”. */
export function groupWalkInSubCategories(items: WalkInSubCategory[]): WalkInSubCategoryGroup[] {
  const groups = new Map<string, WalkInSubCategoryGroup>();
  for (const item of items) {
    let group = groups.get(item.parentId);
    if (!group) {
      group = { parentId: item.parentId, parentName: item.parentName, items: [] };
      groups.set(item.parentId, group);
    }
    group.items.push(item);
  }
  const preferred = ["Men", "Women", "Kids", "Shared", "Spa"];
  return [...groups.values()].sort((a, b) => {
    const ai = preferred.indexOf(a.parentName);
    const bi = preferred.indexOf(b.parentName);
    if (ai >= 0 || bi >= 0) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    return a.parentName.localeCompare(b.parentName);
  });
}

export function filterWalkInServices(
  services: BranchServiceItem[],
  catalogTop: string,
  catalogSub: string,
  serviceQuery: string
): BranchServiceItem[] {
  const q = serviceQuery.trim().toLowerCase();
  if (q) {
    return services.filter(
      (s) =>
        s.serviceName.toLowerCase().includes(q) ||
        (s.categoryName || "").toLowerCase().includes(q) ||
        (s.parentCategoryName || "").toLowerCase().includes(q)
    );
  }
  if (!catalogSub) return [];

  let list = servicesInTop(services, catalogTop);
  list = list.filter((s) => subKey(s) === catalogSub);
  return list.sort((a, b) => a.serviceName.localeCompare(b.serviceName));
}

/** Skip the tile grid when an audience has only one leaf bucket. */
export function shouldAutoSelectSubCategory(
  subCategories: WalkInSubCategory[],
  catalogTop: string
): string | null {
  if (!catalogTop || subCategories.length !== 1) return null;
  return subCategories[0]?.id ?? null;
}
