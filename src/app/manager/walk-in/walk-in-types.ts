export interface WalkInCartItem {
  branchServiceId: string;
  serviceName: string;
  basePrice: number;
  priceExtra: number;
  variablePricing: boolean;
  /** Primary stylist (legacy + first slot). */
  staffId: string;
  /** One stylist per unit; length should match quantity when set. */
  staffIds?: string[];
  packageSubscriptionId?: string;
  /** Units for this line (paid services and package redemptions; defaults to 1). */
  quantity?: number;
}

export function walkInCartItemQty(c: WalkInCartItem) {
  return Math.max(1, c.quantity ?? 1);
}

/** Stylist id per unit (length = quantity). */
export function walkInCartStaffSlots(c: WalkInCartItem): string[] {
  const qty = walkInCartItemQty(c);
  if (c.staffIds && c.staffIds.length > 0) {
    const slots = c.staffIds.slice(0, qty);
    while (slots.length < qty) {
      slots.push(c.staffId || "");
    }
    return slots;
  }
  return Array.from({ length: qty }, () => c.staffId || "");
}

export function walkInCartStylistsComplete(c: WalkInCartItem): boolean {
  return walkInCartStaffSlots(c).every((id) => !!id);
}

export function walkInCartWithStaffSlots(c: WalkInCartItem, slots: string[]): WalkInCartItem {
  const qty = Math.max(1, slots.length);
  const primary = slots.find(Boolean) || c.staffId || "";
  return {
    ...c,
    quantity: qty,
    staffIds: slots,
    staffId: primary,
  };
}

export function walkInCartAdjustQtySlots(
  c: WalkInCartItem,
  newQty: number,
  fillStaffId: string
): WalkInCartItem {
  const slots = walkInCartStaffSlots(c);
  const clamped = Math.max(1, Math.min(newQty, WALK_IN_MAX_SERVICE_QTY));
  while (slots.length < clamped) {
    slots.push(fillStaffId);
  }
  while (slots.length > clamped) {
    slots.pop();
  }
  return walkInCartWithStaffSlots(c, slots);
}

export function walkInCartEnsureStaffSlots(c: WalkInCartItem, fillStaffId: string): WalkInCartItem {
  const slots = walkInCartStaffSlots(c).map((id) => id || fillStaffId);
  return walkInCartWithStaffSlots(c, slots);
}

export function walkInCartAppendUnit(c: WalkInCartItem, fillStaffId: string): WalkInCartItem {
  const slots = walkInCartStaffSlots(c);
  if (slots.length >= WALK_IN_MAX_SERVICE_QTY) return c;
  slots.push(fillStaffId);
  return walkInCartWithStaffSlots(c, slots);
}

export function walkInCartPopUnit(c: WalkInCartItem): WalkInCartItem {
  const slots = walkInCartStaffSlots(c);
  if (slots.length <= 1) return c;
  slots.pop();
  return walkInCartWithStaffSlots(c, slots);
}

export type WalkInLinePayload = {
  branchServiceId: string;
  staffId: string;
  quantity: number;
  unitPrice?: number;
  packageSubscriptionId?: string;
};

export function walkInCartToLinePayload(items: WalkInCartItem[]): WalkInLinePayload[] {
  const out: WalkInLinePayload[] = [];
  for (const c of items) {
    const unitTotal = walkInCartUnitPrice(c);
    const grouped = new Map<string, number>();
    for (const staffId of walkInCartStaffSlots(c)) {
      if (!staffId) continue;
      grouped.set(staffId, (grouped.get(staffId) || 0) + 1);
    }
    for (const [staffId, quantity] of grouped) {
      const payload: WalkInLinePayload = {
        branchServiceId: c.branchServiceId,
        staffId,
        quantity,
      };
      if (c.packageSubscriptionId) {
        payload.packageSubscriptionId = c.packageSubscriptionId;
      } else if (unitTotal > c.basePrice) {
        payload.unitPrice = unitTotal;
      }
      out.push(payload);
    }
  }
  return out;
}

export function walkInCartPayloadLineCount(cart: WalkInCartItem[]): number {
  return walkInCartToLinePayload(cart).length;
}

type BookingLineLike = {
  branchServiceId: string;
  serviceName: string;
  staffId: string;
  unitPrice: number;
  quantity: number;
  packageSubscriptionId?: string;
};

export function walkInCartFromBookingLines(
  lines: BookingLineLike[],
  resolveBasePrice: (line: BookingLineLike) => number
): WalkInCartItem[] {
  type Bucket = WalkInCartItem & { slots: string[] };
  const buckets = new Map<string, Bucket>();

  for (const l of lines) {
    const pkg = l.packageSubscriptionId || "";
    const basePrice = resolveBasePrice(l);
    const priceExtra = pkg ? 0 : Math.max(0, l.unitPrice - basePrice);
    const key = `${l.branchServiceId}|${pkg}|${pkg ? "0" : l.unitPrice}`;
    const qty = Math.max(1, l.quantity ?? 1);
    const repeat = Array.from({ length: qty }, () => l.staffId);
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, {
        branchServiceId: l.branchServiceId,
        serviceName: l.serviceName,
        basePrice,
        priceExtra,
        variablePricing: false,
        staffId: l.staffId,
        packageSubscriptionId: l.packageSubscriptionId,
        quantity: qty,
        staffIds: repeat,
        slots: repeat,
      });
    } else {
      existing.slots.push(...repeat);
      existing.quantity = existing.slots.length;
      existing.staffIds = existing.slots;
      existing.staffId = existing.slots.find(Boolean) || existing.staffId;
    }
  }

  return [...buckets.values()].map(({ slots: _s, ...item }) =>
    walkInCartWithStaffSlots(item, item.staffIds || [])
  );
}

/** Per-unit billable price (before quantity). Package redemptions are always 0. */
export function walkInCartUnitPrice(c: WalkInCartItem) {
  if (c.packageSubscriptionId) return 0;
  return c.basePrice + (c.priceExtra || 0);
}

export function walkInCartLinePrice(c: WalkInCartItem) {
  const qty = walkInCartItemQty(c);
  return walkInCartUnitPrice(c) * qty;
}

export function walkInCartServiceCount(cart: WalkInCartItem[]) {
  return cart.reduce((n, c) => n + walkInCartItemQty(c), 0);
}

export const WALK_IN_MAX_SERVICE_QTY = 99;
