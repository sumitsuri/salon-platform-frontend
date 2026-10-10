import { isLocalDev } from "./env";

/** Employee sign-in at the employee app origin root (Play Store / TWA launch URL). */
export const EMPLOYEE_HOST_LOGIN_PATH = "/";

/** Legacy paths — redirect to canonical entry. */
export const EMPLOYEE_LOGIN_PATH_LEGACY = "/employee/login/";
export const EMPLOYEE_HOST_LOGIN_PATH_LEGACY = "/login/";

/** Platform internal app sign-in at platform origin root. */
export const PLATFORM_HOST_LOGIN_PATH = "/";

/** Canonical manager / brand CEO app origin (no trailing slash). */
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

/** Canonical platform (Antrahq internal) app origin (no trailing slash). */
export function platformAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_PLATFORM_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && isPlatformAppHost()) return window.location.origin;
  return "https://platform.antrahq.com";
}

const EMPLOYEE_HOSTS = new Set(["employee.antrahq.com"]);
const MANAGER_HOSTS = new Set(["app.antrahq.com"]);
const PLATFORM_HOSTS = new Set(["platform.antrahq.com"]);

/** Local dev: map 127.0.0.1 employee.localhost / platform.localhost / app.localhost in /etc/hosts */
function devEmployeeHost(): string | undefined {
  return process.env.NEXT_PUBLIC_EMPLOYEE_HOST?.toLowerCase();
}

function devManagerHost(): string | undefined {
  return process.env.NEXT_PUBLIC_MANAGER_HOST?.toLowerCase();
}

function devPlatformHost(): string | undefined {
  return process.env.NEXT_PUBLIC_PLATFORM_HOST?.toLowerCase();
}

function resolveHost(hostname?: string): string {
  return (hostname ?? (typeof window !== "undefined" ? window.location.hostname : "")).toLowerCase();
}

export function isEmployeeAppHost(hostname?: string): boolean {
  const h = resolveHost(hostname);
  if (EMPLOYEE_HOSTS.has(h)) return true;
  if (isLocalDev && devEmployeeHost() && h === devEmployeeHost()) return true;
  return false;
}

export function isManagerAppHost(hostname?: string): boolean {
  const h = resolveHost(hostname);
  if (MANAGER_HOSTS.has(h)) return true;
  if (isLocalDev && devManagerHost() && h === devManagerHost()) return true;
  if (isLocalDev && !devManagerHost() && !devEmployeeHost() && !devPlatformHost() && h === "localhost") {
    return true;
  }
  return false;
}

export function isPlatformAppHost(hostname?: string): boolean {
  const h = resolveHost(hostname);
  if (PLATFORM_HOSTS.has(h)) return true;
  if (isLocalDev && devPlatformHost() && h === devPlatformHost()) return true;
  return false;
}

/** Map app-host /employee/* paths to URLs on the employee origin. */
export function pathOnEmployeeOrigin(pathname: string): string {
  if (pathname === "/employee/login" || pathname.startsWith("/employee/login/")) {
    return EMPLOYEE_HOST_LOGIN_PATH;
  }
  return pathname;
}

export function employeeLoginPath(): string {
  if (typeof window !== "undefined" && isEmployeeAppHost()) {
    return EMPLOYEE_HOST_LOGIN_PATH;
  }
  if (shouldUseEmployeeOriginForStaffPortal()) {
    return EMPLOYEE_HOST_LOGIN_PATH;
  }
  return EMPLOYEE_LOGIN_PATH_LEGACY;
}

export function platformLoginPath(): string {
  if (typeof window !== "undefined" && isPlatformAppHost()) {
    return PLATFORM_HOST_LOGIN_PATH;
  }
  return `${platformAppOrigin()}${PLATFORM_HOST_LOGIN_PATH}`;
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

export function platformLoginUrl(): string {
  return `${platformAppOrigin()}${PLATFORM_HOST_LOGIN_PATH}`;
}

export function isEmployeeLoginPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (isEmployeeAppHost()) {
    if (pathname === "/" || pathname === "/login" || pathname.startsWith("/login/")) return true;
  }
  return pathname === "/employee/login" || pathname.startsWith("/employee/login/");
}

export function isPlatformLoginPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (isPlatformAppHost()) {
    return pathname === "/" || pathname === "/login" || pathname.startsWith("/login/");
  }
  return false;
}

/** Unauthenticated redirect target for the current host. */
export function resolveUnauthenticatedLoginPath(): string {
  if (typeof window !== "undefined") {
    if (isPlatformAppHost()) return platformLoginPath();
    if (isEmployeeAppHost()) return employeeLoginPath();
  }
  return managerLoginPath();
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

/** Send /platform/* on the manager host to the platform app origin (separate store listing). */
export function redirectPlatformRoutesToPlatformHost(pathname: string): boolean {
  if (typeof window === "undefined") return false;
  if (isPlatformAppHost()) return false;
  if (!pathname.startsWith("/platform")) return false;
  const target = `${platformAppOrigin()}${pathname}${window.location.search}`;
  window.location.replace(target);
  return true;
}
