import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DEFAULT_TENANT_LOCALE, type TenantLocaleKit } from "@/lib/tenant-locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Whole-rupee display for dashboards and cards. */
export function formatCurrency(amount: number | string, kit: TenantLocaleKit = DEFAULT_TENANT_LOCALE) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(kit.locale, {
    style: "currency",
    currency: kit.currency,
    maximumFractionDigits: 0,
  }).format(n);
}

/** Precise money for bills / payments (paise-safe rounding display). */
export function formatMoney(amount: number | string, kit: TenantLocaleKit = DEFAULT_TENANT_LOCALE) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(kit.locale, {
    style: "currency",
    currency: kit.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}
