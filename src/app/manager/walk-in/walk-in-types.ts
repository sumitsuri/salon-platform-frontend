export interface WalkInCartItem {
  branchServiceId: string;
  serviceName: string;
  basePrice: number;
  priceExtra: number;
  variablePricing: boolean;
  staffId: string;
}

export function walkInCartLinePrice(c: WalkInCartItem) {
  return c.basePrice + (c.priceExtra || 0);
}
