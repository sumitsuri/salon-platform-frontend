import type { CustomerPackageSubscription } from "@/lib/api";

export function isValueCreditSubscription(sub: CustomerPackageSubscription): boolean {
  if (sub.planType === "VALUE_CREDIT") return true;
  const hasCredit =
    (sub.creditRemaining != null && sub.creditRemaining > 0) ||
    (sub.creditTotal != null && sub.creditTotal > 0);
  return hasCredit && (sub.entitlements?.length ?? 0) === 0;
}

export function pickAutoValueCreditSubscription(
  subscriptions: CustomerPackageSubscription[]
): CustomerPackageSubscription | null {
  const candidates = subscriptions.filter(
    (s) => isValueCreditSubscription(s) && (s.creditRemaining ?? 0) > 0
  );
  if (candidates.length === 0) return null;
  return [...candidates].sort(
    (a, b) => (b.creditRemaining ?? 0) - (a.creditRemaining ?? 0)
  )[0];
}
