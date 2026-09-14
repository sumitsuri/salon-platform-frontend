import { ServicePackagePlan, ServicePackagePlanItem } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

export function formatPackageInclusions(items: ServicePackagePlanItem[] | undefined): string {
  if (!items?.length) return "";
  return items
    .map((i) => {
      const name = i.serviceName || "Service";
      return i.quantity > 1 ? `${name} ×${i.quantity}` : name;
    })
    .join(", ");
}

export function packageSavingsLabel(plan: Pick<ServicePackagePlan, "listPriceTotal" | "packagePrice">): string | null {
  if (plan.listPriceTotal == null || plan.packagePrice == null) return null;
  const save = plan.listPriceTotal - plan.packagePrice;
  if (!Number.isFinite(save) || save <= 0) return null;
  return formatCurrency(save);
}
