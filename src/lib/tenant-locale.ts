/**
 * Tenant locale kit — India defaults today; markets swap config later
 * without rewriting UI. Currency/timezone/tax are not hardcoded in new code paths.
 */
export type TaxModel = "GST_IN" | "GENERIC";

export interface TenantLocaleKit {
  currency: string;
  locale: string;
  timeZone: string;
  taxModel: TaxModel;
  /** Address field labels for customer forms */
  addressPrimaryLabel: "society";
  addressSecondaryLabel: "flat";
}

export const DEFAULT_TENANT_LOCALE: TenantLocaleKit = {
  currency: "INR",
  locale: "en-IN",
  timeZone: "Asia/Kolkata",
  taxModel: "GST_IN",
  addressPrimaryLabel: "society",
  addressSecondaryLabel: "flat",
};

/** Resolve kit for the active tenant. Extend when backend exposes tenant settings. */
export function getTenantLocaleKit(_tenantId?: string | null): TenantLocaleKit {
  return DEFAULT_TENANT_LOCALE;
}

export function formatTenantDateTime(
  iso: string | Date,
  kit: TenantLocaleKit = DEFAULT_TENANT_LOCALE,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString(kit.locale, {
    timeZone: kit.timeZone,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}
