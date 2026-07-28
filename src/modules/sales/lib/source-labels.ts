import type { LeadSource } from "@/modules/sales/api/salesApi";

const SOURCE_LABELS: Record<LeadSource, string> = {
  FIELD: "Field",
  MARKETING_WEB: "Marketing Web",
  REFERRAL: "Referral",
  INBOUND_CALL: "Inbound Call",
  OTHER: "Other",
};

export function formatLeadSource(source: LeadSource | string): string {
  if (source in SOURCE_LABELS) {
    return SOURCE_LABELS[source as LeadSource];
  }
  return source.replace(/_/g, " ");
}

export const INCOMING_LEADS_SOURCE: LeadSource = "MARKETING_WEB";
