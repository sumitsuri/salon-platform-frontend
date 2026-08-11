export type AppScope = "admin" | "manager";

export function customersPath(scope: AppScope): string {
  return scope === "admin" ? "/admin/customers" : "/manager/customers";
}

export function customerDetailPath(scope: AppScope, customerId: string): string {
  const params = new URLSearchParams({ id: customerId });
  return `${customersPath(scope)}/detail?${params.toString()}`;
}

export function adminBookingsPath(customerId?: string): string {
  const params = new URLSearchParams();
  if (customerId) params.set("customerId", customerId);
  const q = params.toString();
  return `/admin/bookings${q ? `?${q}` : ""}`;
}

export type WalkInUrlParams = {
  tab?: "history";
  customerId?: string;
  bookingId?: string;
  edit?: boolean;
  staffId?: string;
};

/** Build walk-in hub / flow URLs while preserving scoped query params. */
export function buildWalkInUrl(params: WalkInUrlParams = {}): string {
  const search = new URLSearchParams();
  if (params.tab === "history") search.set("tab", "history");
  if (params.customerId) search.set("customerId", params.customerId);
  if (params.bookingId) search.set("bookingId", params.bookingId);
  if (params.edit) search.set("edit", "1");
  if (params.staffId) search.set("staffId", params.staffId);
  const q = search.toString();
  return `/manager/walk-in${q ? `?${q}` : ""}`;
}

export function managerMembershipsPath(customerId?: string, extras?: { phone?: string; name?: string }): string {
  const params = new URLSearchParams();
  if (customerId) params.set("customerId", customerId);
  if (extras?.phone) params.set("phone", extras.phone);
  if (extras?.name) params.set("name", extras.name);
  const q = params.toString();
  return `/manager/memberships${q ? `?${q}` : ""}`;
}
