/** Client-only prefs for walk-in speed: recent/favorites/draft. Safe without backend. */

export interface RecentCustomer {
  phone?: string;
  visitPassId?: string;
  name: string;
  customerId?: string;
  society?: string;
  flat?: string;
}

export interface WalkInDraft {
  phone: string;
  visitPassId: string;
  customerName: string;
  customerId: string;
  society: string;
  flat: string;
  cart: {
    branchServiceId: string;
    serviceName: string;
    staffId: string;
    basePrice?: number;
    priceExtra?: number;
    variablePricing?: boolean;
    /** @deprecated legacy total price */
    price?: number;
  }[];
  step: 1 | 2 | 3;
  savedAt: number;
}

const MAX_RECENT = 8;
const MAX_FAVORITES = 12;
const DRAFT_TTL_MS = 12 * 60 * 60 * 1000;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readList(key: string): string[] {
  const parsed = safeParse<string[]>(typeof window !== "undefined" ? localStorage.getItem(key) : null);
  return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
}

function writeList(key: string, ids: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* quota / private mode */
  }
}

function recentServicesKey(branchId: string) {
  return `walk-in:recent-services:${branchId}`;
}
function favoriteServicesKey(branchId: string) {
  return `walk-in:favorite-services:${branchId}`;
}
function recentCustomersKey(branchId: string) {
  return `walk-in:recent-customers:${branchId}`;
}
function draftKey(branchId: string) {
  return `walk-in:draft:${branchId}`;
}

export function getRecentServiceIds(branchId: string): string[] {
  if (!branchId) return [];
  return readList(recentServicesKey(branchId)).slice(0, MAX_RECENT);
}

export function pushRecentService(branchId: string, serviceId: string) {
  if (!branchId || !serviceId) return;
  const next = [serviceId, ...getRecentServiceIds(branchId).filter((id) => id !== serviceId)].slice(
    0,
    MAX_RECENT
  );
  writeList(recentServicesKey(branchId), next);
}

export function getFavoriteServiceIds(branchId: string): string[] {
  if (!branchId) return [];
  return readList(favoriteServicesKey(branchId)).slice(0, MAX_FAVORITES);
}

export function toggleFavoriteService(branchId: string, serviceId: string): string[] {
  if (!branchId || !serviceId) return [];
  const cur = getFavoriteServiceIds(branchId);
  const next = cur.includes(serviceId)
    ? cur.filter((id) => id !== serviceId)
    : [serviceId, ...cur].slice(0, MAX_FAVORITES);
  writeList(favoriteServicesKey(branchId), next);
  return next;
}

export function getRecentCustomers(branchId: string): RecentCustomer[] {
  if (!branchId || typeof window === "undefined") return [];
  const parsed = safeParse<RecentCustomer[]>(localStorage.getItem(recentCustomersKey(branchId)));
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((c) => c && typeof c.name === "string" && (c.phone || c.visitPassId || c.customerId))
    .slice(0, MAX_RECENT);
}

export function pushRecentCustomer(branchId: string, customer: RecentCustomer) {
  if (!branchId || !customer.name) return;
  const key = customer.customerId || customer.visitPassId || customer.phone;
  if (!key) return;
  const rest = getRecentCustomers(branchId).filter(
    (c) =>
      (customer.customerId && c.customerId !== customer.customerId) ||
      (customer.visitPassId && c.visitPassId !== customer.visitPassId) ||
      (customer.phone && c.phone !== customer.phone)
  );
  const next = [customer, ...rest].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(recentCustomersKey(branchId), JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function loadWalkInDraft(branchId: string): WalkInDraft | null {
  if (!branchId || typeof window === "undefined") return null;
  const draft = safeParse<WalkInDraft>(localStorage.getItem(draftKey(branchId)));
  if (!draft || !draft.savedAt) return null;
  if (Date.now() - draft.savedAt > DRAFT_TTL_MS) {
    clearWalkInDraft(branchId);
    return null;
  }
  if (!Array.isArray(draft.cart)) return null;
  return draft;
}

export function saveWalkInDraft(branchId: string, draft: Omit<WalkInDraft, "savedAt">) {
  if (!branchId || typeof window === "undefined") return;
  try {
    localStorage.setItem(draftKey(branchId), JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function clearWalkInDraft(branchId: string) {
  if (!branchId || typeof window === "undefined") return;
  try {
    localStorage.removeItem(draftKey(branchId));
  } catch {
    /* ignore */
  }
}
