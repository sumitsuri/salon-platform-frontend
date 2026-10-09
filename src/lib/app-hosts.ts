import { isLocalDev } from "./env";

/** Employee portal sign-in on employee.antrahq.com (not under /employee prefix). */
export const EMPLOYEE_HOST_LOGIN_PATH = "/login/";

/** Legacy / fallback on app.antrahq.com before redirect to employee host. */
export const EMPLOYEE_LOGIN_PATH_LEGACY = "/employee/login/";

/** Canonical manager / admin app origin (no trailing slash). */
export function managerAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_MANAGER_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "https://app.antrahq.com";
}

/** Canonical employee app origin (no trailing slash). */
export function employeeAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_EMPLOYEE_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && isEmployeeAppHost()) return window.location.origin;
  if (typeof window !== "undefined") return window.location.origin;
  return "https://employee.antrahq.com";
}

const EMPLOYEE_HOSTS = new Set(["employee.antrahq.com"]);

/** Local dev: set NEXT_PUBLIC_EMPLOYEE_HOST=employee.localhost and map 127.0.0.1 employee.localhost in /etc/hosts */
function devEmployeeHost(): string | undefined {
  return process.env.NEXT_PUBLIC_EMPLOYEE_HOST?.toLowerCase();
}

export function isEmployeeAppHost(hostname?: string): boolean {
  const h = (hostname ?? (typeof window !== "undefined" ? window.location.hostname : "")).toLowerCase();
  if (EMPLOYEE_HOSTS.has(h)) return true;
  if (isLocalDev && devEmployeeHost() && h === devEmployeeHost()) return true;
  return false;
}

/** Map app-host /employee/* paths to URLs on the employee origin. */
export function pathOnEmployeeOrigin(pathname: string): string {
  if (pathname === "/employee/login" || pathname.startsWith("/employee/login/")) {
    return EMPLOYEE_HOST_LOGIN_PATH;
  }
  return pathname;
}

/** In-app login route (host-aware). */
export function employeeLoginPath(): string {
  if (typeof window !== "undefined" && isEmployeeAppHost()) {
    return EMPLOYEE_HOST_LOGIN_PATH;
  }
  if (shouldUseEmployeeOriginForStaffPortal()) {
    return EMPLOYEE_HOST_LOGIN_PATH;
  }
  return EMPLOYEE_LOGIN_PATH_LEGACY;
}

export function managerLoginPath(): string {
  return "/login/";
}

export function employeeLoginUrl(): string {
  return `${employeeAppOrigin()}${EMPLOYEE_HOST_LOGIN_PATH}`;
}

export function managerLoginUrl(): string {
  return `${managerAppOrigin()}${managerLoginPath()}`;
}

export function isEmployeeLoginPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return isEmployeeAppHost();
  }
  return pathname === "/employee/login" || pathname.startsWith("/employee/login/");
}

/** Staff portal should run on the employee host in production. */
export function shouldUseEmployeeOriginForStaffPortal(): boolean {
  if (isLocalDev && !process.env.NEXT_PUBLIC_EMPLOYEE_APP_URL) return false;
  return Boolean(process.env.NEXT_PUBLIC_EMPLOYEE_APP_URL) || !isLocalDev;
}

export function redirectStaffPortalToEmployeeHost(pathname: string): boolean {
  if (typeof window === "undefined") return false;
  if (!shouldUseEmployeeOriginForStaffPortal()) return false;
  if (isEmployeeAppHost()) return false;
  if (!pathname.startsWith("/employee")) return false;
  const onEmployee = pathOnEmployeeOrigin(pathname);
  const target = `${employeeAppOrigin()}${onEmployee}${window.location.search}`;
  window.location.replace(target);
  return true;
}
