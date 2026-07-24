"use client";

import { defaultLocale, LOCALE_COOKIE, resolveLocale, type AppLocale } from "@/i18n/config";

const ONE_YEAR = 60 * 60 * 24 * 365;

export function setLocaleCookie(locale: AppLocale) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const path = basePath || "/";
  document.cookie = `${LOCALE_COOKIE}=${locale};path=${path};max-age=${ONE_YEAR};SameSite=Lax`;
}

export function getLocaleCookie(): AppLocale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  if (!match) return null;
  return resolveLocale(decodeURIComponent(match[1]));
}

/** Set cookie when it differs; reload when SSR must re-render in the user's saved locale. */
export function syncLocaleFromUser(preferredLocale?: string | null, force = false) {
  if (!preferredLocale) return;
  const target = resolveLocale(preferredLocale);
  const current = getLocaleCookie();
  if (current === target) return;
  // Trust an existing session cookie unless login explicitly forces DB preference.
  if (!force && current !== null) return;
  // No cookie yet and default English — server already renders en-IN; just persist cookie.
  if (current === null && target === defaultLocale) {
    setLocaleCookie(target);
    return;
  }
  applyLocaleChange(target);
}

/** Persist locale cookie and reload so all client/server components pick up new messages. */
export function applyLocaleChange(locale: AppLocale) {
  setLocaleCookie(locale);
  window.location.reload();
}
