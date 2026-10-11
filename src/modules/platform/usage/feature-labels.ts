/** Human-readable labels for stable product analytics feature keys (portal.route segments). */

const EXPLICIT: Record<string, string> = {
  "auth.login": "Sign-in",
  "admin.session": "Admin · Session",
  "manager.session": "Manager · Session",
  "employee.session": "Employee · Session",
};

const PORTAL_NAMES: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  employee: "Employee",
  platform: "Platform",
};

function titleWords(raw: string): string {
  return raw
    .split(/[._\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Map a feature key (e.g. `admin.local_spotlight`) to a display title. */
export function featureLabel(key: string): string {
  if (!key) return "—";
  const normalized = key.trim();
  if (EXPLICIT[normalized]) return EXPLICIT[normalized];

  const dot = normalized.indexOf(".");
  if (dot <= 0) return titleWords(normalized);

  const portal = normalized.slice(0, dot);
  const rest = normalized.slice(dot + 1);
  const portalLabel = PORTAL_NAMES[portal] ?? titleWords(portal);
  const featureLabelPart = titleWords(rest.replace(/\./g, " "));
  return `${portalLabel} · ${featureLabelPart}`;
}
