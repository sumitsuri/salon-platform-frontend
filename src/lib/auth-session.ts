import type { AuthUser } from "./api";
import { employeeLoginPath, isEmployeeAppHost, managerLoginPath } from "./app-hosts";

const STORAGE_KEY = "auth";

interface PersistedAuth {
  state?: { user?: AuthUser | null };
  user?: AuthUser;
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: PersistedAuth = JSON.parse(raw);
    return parsed?.state?.user ?? parsed?.user ?? null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (!user) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { user }, version: 0 }));
}

export function patchStoredUser(patch: Partial<AuthUser>): AuthUser | null {
  const user = getStoredUser();
  if (!user) return null;
  const updated = { ...user, ...patch };
  setStoredUser(updated);
  return updated;
}

export function clearStoredAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function isAccessTokenExpired(token: string, bufferMs = 30_000): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload?.exp) return true;
    return payload.exp * 1000 <= Date.now() + bufferMs;
  } catch {
    return true;
  }
}

export async function syncAuthStore(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  const { useAuthStore } = await import("./auth-store");
  if (user) useAuthStore.getState().setUser(user);
  else useAuthStore.getState().logout();
}

export function redirectToLogin(expired = false) {
  if (typeof window === "undefined") return;
  const onEmployeeArea =
    isEmployeeAppHost() || window.location.pathname.startsWith("/employee");
  const base = onEmployeeArea ? employeeLoginPath() : managerLoginPath();
  const path = expired ? `${base}?expired=1` : base;
  const onEmployeeHost = isEmployeeAppHost();
  const onLogin =
    window.location.pathname.startsWith("/login") ||
    (!onEmployeeHost && window.location.pathname.startsWith("/employee/login"));
  if (!onLogin) {
    window.location.href = path;
  }
}
