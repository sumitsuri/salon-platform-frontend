export interface WalkInCartItem {
  branchServiceId: string;
  serviceName: string;
  basePrice: number;
  priceExtra: number;
  variablePricing: boolean;
  staffId: string;
  packageSubscriptionId?: string;
  /** Package redemption count for this visit (defaults to 1). */
  quantity?: number;
}

export function walkInCartLinePrice(c: WalkInCartItem) {
  if (c.packageSubscriptionId) return 0;
  return c.basePrice + (c.priceExtra || 0);
}
