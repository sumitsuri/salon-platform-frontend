/** Pre-rendered booking entry paths for static export (extend as tenants onboard). */
export const BOOK_STATIC_PATHS: { tenantSlug: string; branchCode: string }[] = [
  { tenantSlug: "demo-brand", branchCode: "lit" },
  { tenantSlug: "demo-brand", branchCode: "web" },
  { tenantSlug: "demo-brand", branchCode: "alp" },
  { tenantSlug: "demo-brand", branchCode: "gp" },
  { tenantSlug: "demo-brand", branchCode: "var" },
  { tenantSlug: "mystic-wellness", branchCode: "mw01" },
  { tenantSlug: "mystic-wellness", branchCode: "mw02" },
  { tenantSlug: "mystic-wellness", branchCode: "mw03" },
  { tenantSlug: "mystic-wellness", branchCode: "mw04" },
  { tenantSlug: "mystic-wellness", branchCode: "mw05" },
  { tenantSlug: "mystic-wellness", branchCode: "gp" },
  { tenantSlug: "velvet-scissors", branchCode: "main" },
];

/** Parse /book/{tenant}/{branch?}/ from the browser pathname. */
export function parseBookPathname(pathname: string): { tenantSlug: string; branchCode?: string } | null {
  const match = pathname.match(/^\/book\/?([^/]*)\/?([^/]*)\/?$/);
  if (!match) return null;
  const tenantSlug = match[1]?.trim().toLowerCase();
  if (!tenantSlug || tenantSlug === "__dynamic__") return null;
  const branchRaw = match[2]?.trim().toLowerCase();
  if (!branchRaw) return { tenantSlug };
  return { tenantSlug, branchCode: branchRaw };
}

export function productionBookBaseUrl() {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "book.antrahq.com" || host === "app.antrahq.com") {
      return `https://${host}`;
    }
  }
  return process.env.NEXT_PUBLIC_BOOK_BASE_URL || "http://localhost:3000";
}

export function buildPublicBookUrl(tenantSlug: string, branchCode: string) {
  return `${productionBookBaseUrl()}/book/${tenantSlug}/${branchCode.toLowerCase()}/`;
}
