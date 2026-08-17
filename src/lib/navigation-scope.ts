import type { ProductDateRange } from "./date-range";
import { dateRangeToSearchParams } from "./date-range";

export type AppScope = "admin" | "manager";

export function customersPath(scope: AppScope): string {
  return scope === "admin" ? "/admin/customers" : "/manager/customers";
}

export function customerDetailPath(scope: AppScope, customerId: string): string {
  const params = new URLSearchParams({ id: customerId });
  return `${customersPath(scope)}/detail?${params.toString()}`;
}

export type WalkInUrlParams = {
  tab?: "history";
  customerId?: string;
  bookingId?: string;
  /** Read-only billing detail for completed/historical visits (SideSheet). */
  detailBookingId?: string;
  edit?: boolean;
  staffId?: string;
};

/** Build walk-in hub / flow URLs while preserving scoped query params. */
export function buildWalkInUrl(params: WalkInUrlParams = {}): string {
  const search = new URLSearchParams();
  if (params.tab === "history") search.set("tab", "history");
  if (params.customerId) search.set("customerId", params.customerId);
  if (params.bookingId) search.set("bookingId", params.bookingId);
  if (params.detailBookingId) search.set("detailBookingId", params.detailBookingId);
  if (params.edit) search.set("edit", "1");
  if (params.staffId) search.set("staffId", params.staffId);
  const q = search.toString();
  return `/manager/walk-in${q ? `?${q}` : ""}`;
}

export type AdminBookingsQuery = {
  customerId?: string;
  branchId?: string;
  detailBookingId?: string;
  dateRange?: ProductDateRange;
};

export function adminBookingsPath(query: AdminBookingsQuery = {}): string {
  const params = new URLSearchParams();
  if (query.customerId) params.set("customerId", query.customerId);
  if (query.branchId) params.set("branchId", query.branchId);
  if (query.detailBookingId) params.set("detailBookingId", query.detailBookingId);
  if (query.dateRange) {
    dateRangeToSearchParams(query.dateRange).forEach((value, key) => {
      params.set(key, value);
    });
  }
  const q = params.toString();
  return `/admin/bookings${q ? `?${q}` : ""}`;
}

export function customerDetailPathWithBooking(
  scope: AppScope,
  customerId: string,
  detailBookingId?: string
): string {
  const params = new URLSearchParams({ id: customerId });
  if (detailBookingId) params.set("detailBookingId", detailBookingId);
  return `${customersPath(scope)}/detail?${params.toString()}`;
}

export function managerSchedulePath(date?: string, bookingId?: string): string {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (bookingId) params.set("bookingId", bookingId);
  const q = params.toString();
  return `/manager/schedule${q ? `?${q}` : ""}`;
}

export function appendQueryParam(href: string, key: string, value: string): string {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set(key, value);
  const q = params.toString();
  return q ? `${path}?${q}` : path;
}

export function removeQueryParams(href: string, keys: string[]): string {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  keys.forEach((k) => params.delete(k));
  const q = params.toString();
  return q ? `${path}?${q}` : path;
}

export function managerMembershipsPath(customerId?: string, extras?: { phone?: string; name?: string }): string {
  const params = new URLSearchParams();
  if (customerId) params.set("customerId", customerId);
  if (extras?.phone) params.set("phone", extras.phone);
  if (extras?.name) params.set("name", extras.name);
  const q = params.toString();
  return `/manager/memberships${q ? `?${q}` : ""}`;
}
