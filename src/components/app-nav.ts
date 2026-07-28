import { LucideIcon } from "lucide-react";

export type AppNavChildItem = {
  href: string;
  label: string;
  exact?: boolean;
};

export type AppNavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  exact?: boolean;
  children?: AppNavChildItem[];
  /** Primary mobile action — renders as floating button, not in a bottom tab bar */
  fab?: boolean;
};

/** Normalize paths for nav matching (trailing slashes from `trailingSlash: true`). */
export function normalizeNavPath(path: string): string {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

export function isNavActive(pathname: string, href: string, exact?: boolean): boolean {
  const path = normalizeNavPath(pathname);
  const target = normalizeNavPath(href);
  if (exact) {
    return path === target;
  }
  return path === target || path.startsWith(`${target}/`);
}

export function isHomePath(pathname: string, homeHref: string): boolean {
  return normalizeNavPath(pathname) === normalizeNavPath(homeHref);
}

/** @deprecated use AppNavItem */
export type MobileNavItem = AppNavItem;

/** Fixed mobile top bar height (h-14 + safe area) — main content must offset this. */
export const MOBILE_TOP_BAR_OFFSET =
  "pt-[calc(3.5rem+env(safe-area-inset-top,0px)+1rem)] md:pt-0";

/** Standard mobile content padding (drawer nav — no bottom tab bar). */
export const MOBILE_MAIN_PADDING =
  "pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] md:pb-6";

/** Extra bottom space when a mobile FAB is shown (manager walk-in). */
export const MOBILE_MAIN_PADDING_FAB =
  "pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-6";

/** @deprecated use MOBILE_MAIN_PADDING */
export const MOBILE_NAV_MAIN_PADDING = MOBILE_MAIN_PADDING;

/** @deprecated use MOBILE_MAIN_PADDING_FAB */
export const MOBILE_NAV_MAIN_PADDING_FAB = MOBILE_MAIN_PADDING_FAB;
