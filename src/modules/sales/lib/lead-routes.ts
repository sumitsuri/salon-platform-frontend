/** Static-export-safe lead detail URL (query param, no dynamic segment). */
export function salesLeadDetailHref(leadId: string): string {
  return `/platform/sales/leads/detail?id=${encodeURIComponent(leadId)}`;
}
