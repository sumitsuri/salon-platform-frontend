import { isLocalDev } from "./env";

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

export function employeeLoginPath(): string {
  return "/employee/login/";
}

export function managerLoginPath(): string {
  return "/login/";
}

export function employeeLoginUrl(): string {
  return `${employeeAppOrigin()}${employeeLoginPath()}`;
}

export function managerLoginUrl(): string {
  return `${managerAppOrigin()}${managerLoginPath()}`;
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
  const target = `${employeeAppOrigin()}${pathname}${window.location.search}`;
  window.location.replace(target);
  return true;
}
