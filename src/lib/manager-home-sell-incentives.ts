import type { MembershipPlan, ServicePackagePlan } from "@/lib/api";

export const MANAGER_HOME_INCENTIVE_RATE_PERCENT = 5;

/** Flat floor incentive credited to staff per membership sold (INR). */
export const STAFF_MEMBERSHIP_SALE_INCENTIVE_INR = 50;
/** Percent of package sale price credited to staff (e.g. 3%). */
export const STAFF_PACKAGE_SALE_INCENTIVE_PERCENT = 3;
/** Marketing / cap for “earn up to” on high-value packages (INR). */
export const STAFF_PACKAGE_SALE_INCENTIVE_MAX_INR = 500;

export function packageSaleIncentiveFromAmount(saleAmount: number): number {
  if (!Number.isFinite(saleAmount) || saleAmount <= 0) return 0;
  const raw = Math.round((saleAmount * STAFF_PACKAGE_SALE_INCENTIVE_PERCENT) / 100);
  return Math.min(raw, STAFF_PACKAGE_SALE_INCENTIVE_MAX_INR);
}

export type SellSpotlightMembership = {
  plan: MembershipPlan;
  saleAmount: number;
  illustrativeIncentive: number;
};

export type SellSpotlightPackage = {
  plan: ServicePackagePlan;
  saleAmount: number;
  guestSavings: number | null;
  illustrativeIncentive: number;
};

function roundIncentive(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (amount < 100) return Math.round(amount);
  return Math.round(amount / 10) * 10;
}

export function illustrativeIncentiveFromSale(saleAmount: number): number {
  return roundIncentive((saleAmount * MANAGER_HOME_INCENTIVE_RATE_PERCENT) / 100);
}

export function pickMembershipSpotlight(plans: MembershipPlan[]): SellSpotlightMembership | null {
  const active = plans.filter((p) => p.status === "ACTIVE" && p.feeAmount > 0);
  if (active.length === 0) return null;
  const plan = [...active].sort((a, b) => b.feeAmount - a.feeAmount)[0];
  return {
    plan,
    saleAmount: plan.feeAmount,
    illustrativeIncentive: STAFF_MEMBERSHIP_SALE_INCENTIVE_INR,
  };
}

export function pickPackageSpotlight(plans: ServicePackagePlan[]): SellSpotlightPackage | null {
  const active = plans.filter((p) => p.status === "ACTIVE" && p.packagePrice > 0);
  if (active.length === 0) return null;
  const plan = [...active].sort((a, b) => {
    const saveA = Math.max(0, (a.listPriceTotal ?? 0) - a.packagePrice);
    const saveB = Math.max(0, (b.listPriceTotal ?? 0) - b.packagePrice);
    return saveB - saveA || b.packagePrice - a.packagePrice;
  })[0];
  const guestSavings =
    plan.listPriceTotal != null && plan.packagePrice != null
      ? Math.max(0, plan.listPriceTotal - plan.packagePrice)
      : null;
  return {
    plan,
    saleAmount: plan.packagePrice,
    guestSavings: guestSavings != null && guestSavings > 0 ? guestSavings : null,
    illustrativeIncentive: packageSaleIncentiveFromAmount(plan.packagePrice),
  };
}

export function countTodayPromoSales(completedBookings: { billPreview?: { membershipFeeAmount?: number; packageFeeAmount?: number } }[]): {
  memberships: number;
  packages: number;
} {
  let memberships = 0;
  let packages = 0;
  for (const b of completedBookings) {
    const preview = b.billPreview;
    if (!preview) continue;
    if (preview.membershipFeeAmount != null && preview.membershipFeeAmount > 0) memberships += 1;
    if (preview.packageFeeAmount != null && preview.packageFeeAmount > 0) packages += 1;
  }
  return { memberships, packages };
}
