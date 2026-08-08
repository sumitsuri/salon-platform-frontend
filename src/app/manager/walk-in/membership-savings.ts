import type { BranchServiceItem, MembershipPlan, ServiceScopeType } from "@/lib/api";
import { WalkInCartItem, walkInCartLinePrice } from "./walk-in-types";

function serviceEligible(
  scope: ServiceScopeType,
  scopeIds: string[],
  serviceId: string,
  categoryId?: string
): boolean {
  if (!scope || scope === "ALL") return true;
  const ids = new Set(scopeIds ?? []);
  if (ids.size === 0) return true;
  if (scope === "CATEGORY") return !!categoryId && ids.has(categoryId);
  return !!serviceId && ids.has(serviceId);
}

export type MembershipSavingsEstimate = {
  amount: number;
  planName: string;
  benefitPercent: number;
};

export function estimateBestMembershipSavings(
  cart: WalkInCartItem[],
  servicesById: Map<string, BranchServiceItem>,
  plans: MembershipPlan[]
): MembershipSavingsEstimate | null {
  if (plans.length === 0) return null;

  let best: MembershipSavingsEstimate = { amount: 0, planName: plans[0].name, benefitPercent: plans[0].benefitPercent };

  for (const plan of plans) {
    let discount = 0;
    for (const item of cart) {
      const svc = servicesById.get(item.branchServiceId);
      if (!svc) continue;
      if (!serviceEligible(plan.serviceScope, plan.scopeIds, svc.serviceId, svc.categoryId)) continue;
      discount += (walkInCartLinePrice(item) * plan.benefitPercent) / 100;
    }
    discount = Math.round(discount * 100) / 100;
    if (discount > best.amount) {
      best = { amount: discount, planName: plan.name, benefitPercent: plan.benefitPercent };
    }
  }

  if (best.amount > 0) return best;

  const topPlan = plans.reduce((a, b) => (b.benefitPercent > a.benefitPercent ? b : a));
  return { amount: 0, planName: topPlan.name, benefitPercent: topPlan.benefitPercent };
}

export function maxMembershipBenefitPercent(plans: MembershipPlan[]): number {
  if (plans.length === 0) return 0;
  return plans.reduce((max, p) => Math.max(max, p.benefitPercent), 0);
}
