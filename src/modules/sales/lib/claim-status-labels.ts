import { LeadClaimStatus, LeadStage } from "@/modules/sales/api/salesApi";
import { STAGE_LABELS } from "@/modules/sales/lib/stage-utils";

export function formatClaimBadge(place: {
  claimStatus?: LeadClaimStatus;
  leadStage?: LeadStage;
  claimedByRepName?: string;
  alreadyLead?: boolean;
}): { label: string; tone: "brand" | "muted" | "warn" | "success" } {
  switch (place.claimStatus) {
    case "CLAIMED_BY_ME":
      return {
        label: place.leadStage ? STAGE_LABELS[place.leadStage] : "Yours",
        tone: "success",
      };
    case "CLAIMED_BY_OTHER":
      return {
        label: place.claimedByRepName ? `Claimed · ${place.claimedByRepName}` : "Claimed",
        tone: "warn",
      };
    case "UNCLAIMED":
    case "CLAIM_EXPIRED":
      return {
        label: place.leadStage ? `In CRM · ${STAGE_LABELS[place.leadStage]}` : "In CRM · Open",
        tone: "muted",
      };
    case "OPEN":
    default:
      return { label: "New on map", tone: "brand" };
  }
}
