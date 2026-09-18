import type { ServicePackagePlan, ServicePackagePlanItem } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

export function formatPlanIncludes(
  plan: Pick<ServicePackagePlan, "planType" | "creditValue" | "listPriceTotal" | "items">
): string {
  if (plan.planType === "VALUE_CREDIT") {
    const credit = plan.creditValue ?? plan.listPriceTotal;
    if (credit == null || !Number.isFinite(credit)) return "";
    return `${formatCurrency(credit)} credit`;
  }
  return formatPackageInclusions(plan.items);
}

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
