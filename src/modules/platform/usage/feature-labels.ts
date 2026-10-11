import { FEATURE_KEY_LABELS } from "@/lib/product-analytics/feature-key-labels";

const PORTAL_NAMES: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  employee: "Employee",
  platform: "Platform",
  auth: "Sign-in",
};

function titleWords(raw: string): string {
  return raw
    .split(/[._\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** App surface from a feature key (`admin.bookings` → `Admin`). */
export function featurePortalLabel(key: string): string | null {
  if (!key) return null;
  const dot = key.indexOf(".");
  if (dot <= 0) return null;
  const portal = key.slice(0, dot);
  return PORTAL_NAMES[portal] ?? titleWords(portal);
}

/**
 * Human-readable feature title for tables and charts.
 * Storage keys use dots (`portal.screen`); this never shows raw keys in the primary label.
 */
export function featureLabel(key: string): string {
  if (!key) return "—";
  const normalized = key.trim().toLowerCase();
  const catalog = FEATURE_KEY_LABELS[normalized] ?? FEATURE_KEY_LABELS[key.trim()];
  if (catalog) return catalog;

  const dot = normalized.indexOf(".");
  if (dot <= 0) return titleWords(normalized);

  const portal = normalized.slice(0, dot);
  const rest = normalized.slice(dot + 1);
  const portalLabel = PORTAL_NAMES[portal] ?? titleWords(portal);
  const screen = titleWords(rest.replace(/\./g, " "));
  return `${portalLabel} — ${screen}`;
}
