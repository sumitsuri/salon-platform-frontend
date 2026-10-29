import { normalizeNavPath } from "@/components/app-nav";

export type ProductAnalyticsPortal = "employee" | "manager" | "admin";

const EMPLOYEE_ROUTES: Record<string, string> = {
  "/employee": "employee.home",
  "/employee/time": "employee.time",
  "/employee/sales": "employee.sales",
  "/employee/progress": "employee.progress",
  "/employee/profile": "employee.profile",
  "/employee/advance": "employee.advance",
  "/admin/requests": "admin.requests",
  "/employee/goals": "employee.goals",
  "/employee/growth": "employee.growth",
  "/employee/leaves": "employee.leaves",
  "/employee/attendance": "employee.attendance",
  "/employee/reviews": "employee.reviews",
};

const MANAGER_ROUTES: Record<string, string> = {
  "/manager": "manager.home",
  "/manager/schedule": "manager.schedule",
  "/manager/walk-in": "manager.walk_in",
  "/manager/memberships": "manager.memberships",
  "/manager/packages": "manager.packages",
  "/manager/customers": "manager.customers",
  "/manager/scalp-scan": "manager.scalp_scan",
  "/manager/face-scan": "manager.face_scan",
  "/manager/attendance": "manager.attendance",
  "/manager/inventory": "manager.inventory",
};

const ADMIN_ROUTES: Record<string, string> = {
  "/admin": "admin.home",
  "/admin/ops": "admin.ops",
  "/admin/bookings": "admin.bookings",
  "/admin/customers": "admin.customers",
  "/admin/services": "admin.services",
  "/admin/inventory": "admin.inventory",
  "/admin/employees": "admin.employees",
  "/admin/leads": "admin.leads",
  "/admin/campaigns": "admin.campaigns",
  "/admin/whatsapp-templates": "admin.whatsapp_templates",
  "/admin/promotions": "admin.promotions",
  "/admin/busy-hours": "admin.busyHours",
  "/admin/scratch-cards": "admin.scratch_cards",
  "/admin/finance": "admin.finance",
  "/admin/branches": "admin.branches",
  "/admin/market-pulse": "admin.market_pulse",
  "/admin/local-spotlight": "admin.local_spotlight",
  "/admin/insights": "admin.insights",
  "/admin/guest-voice": "admin.guest_voice",
};

const ROUTE_MAP: Record<ProductAnalyticsPortal, Record<string, string>> = {
  employee: EMPLOYEE_ROUTES,
  manager: MANAGER_ROUTES,
  admin: ADMIN_ROUTES,
};

/** Stable feature keys for any brand/branch — derived from route only. */
export function featureKeyForRoute(portal: ProductAnalyticsPortal, pathname: string): string {
  const path = normalizeNavPath(pathname);
  const mapped = ROUTE_MAP[portal][path];
  if (mapped) return mapped;

  const segments = path.split("/").filter(Boolean);
  if (segments.length >= 2 && segments[0] === portal) {
    return `${portal}.${segments.slice(1).join(".")}`;
  }
  return `${portal}.home`;
}
