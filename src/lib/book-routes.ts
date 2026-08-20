/** Pre-rendered booking entry paths for static export (extend as tenants onboard). */
export const BOOK_STATIC_PATHS: { tenantSlug: string; branchCode: string }[] = [
  { tenantSlug: "demo-brand", branchCode: "lit" },
  { tenantSlug: "demo-brand", branchCode: "web" },
  { tenantSlug: "demo-brand", branchCode: "alp" },
  { tenantSlug: "demo-brand", branchCode: "gp" },
  { tenantSlug: "demo-brand", branchCode: "var" },
  { tenantSlug: "mystic-wellness", branchCode: "gp" },
  { tenantSlug: "velvet-scissors", branchCode: "main" },
];

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
