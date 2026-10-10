import { getHomeForRole } from "./auth-store";
import {
  employeeAppOrigin,
  isEmployeeAppHost,
  isManagerAppHost,
  isPlatformAppHost,
  managerAppOrigin,
  platformAppOrigin,
} from "./app-hosts";
import { isPlatformRole } from "./platform-roles";

/** Origin where this role's session should live (separate WebView / browser storage per app). */
export function canonicalOriginForRole(role: string): string {
  if (role === "SALON_STAFF") return employeeAppOrigin();
  if (isPlatformRole(role)) return platformAppOrigin();
  return managerAppOrigin();
}

export function homePathForRole(role: string): string {
  const path = getHomeForRole(role);
  return path.endsWith("/") ? path : `${path}/`;
}

/** Navigate to role home, crossing origins when the user is on the wrong Antrahq app host. */
export function navigateToRoleHome(role: string, router: { replace: (href: string) => void }) {
  const path = getHomeForRole(role);
  if (typeof window === "undefined") {
    router.replace(path);
    return;
  }
  const expected = canonicalOriginForRole(role);
  if (window.location.origin !== expected) {
    window.location.replace(`${expected}${path.startsWith("/") ? path : `/${path}`}`);
    return;
  }
  router.replace(path);
}

export function isOnCorrectHostForRole(role: string | undefined | null): boolean {
  if (!role || typeof window === "undefined") return true;
  if (role === "SALON_STAFF") return isEmployeeAppHost();
  if (isPlatformRole(role)) return isPlatformAppHost();
  return isManagerAppHost();
}
