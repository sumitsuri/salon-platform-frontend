export type LoginPortal = "employee" | "manager" | "admin";

export const AUTH_PORTAL_STORAGE_KEY = "authPortal";

export function storeLoginPortal(portal: LoginPortal) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(AUTH_PORTAL_STORAGE_KEY, portal);
}

export function consumeLoginPortal(): LoginPortal | null {
  if (typeof window === "undefined") return null;
  const v = sessionStorage.getItem(AUTH_PORTAL_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_PORTAL_STORAGE_KEY);
  if (v === "employee" || v === "manager" || v === "admin") return v;
  return null;
}

export function loginPathForPortal(portal: LoginPortal | null): string {
  if (portal === "employee") return "/employee/login/";
  return "/login/";
}
