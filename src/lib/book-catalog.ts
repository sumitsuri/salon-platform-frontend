import type { BranchServiceItem } from "@/lib/api";
import type { BookService } from "@/lib/book-api";

export function bookServiceToCatalogItem(s: BookService, branchId = ""): BranchServiceItem {
  return {
    id: s.branchServiceId,
    branchId,
    serviceId: s.serviceId,
    serviceName: s.name,
    categoryName: s.categoryName || "",
    categoryId: s.categoryId,
    parentCategoryId: s.parentCategoryId,
    parentCategoryName: s.parentCategoryName,
    price: s.price,
    gstRate: 0,
    durationMinutes: s.durationMinutes,
  };
}

export function catalogItemsFromBookServices(services: BookService[], branchId?: string): BranchServiceItem[] {
  return services.map((s) => bookServiceToCatalogItem(s, branchId));
}
