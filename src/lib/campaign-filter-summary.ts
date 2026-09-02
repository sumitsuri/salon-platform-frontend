import type { Campaign, CampaignMembershipFilter } from "@/lib/api";
import type { CampaignFormState } from "@/lib/campaign-form";

export type CampaignCriteriaItem = {
  id: string;
  label: string;
  value: string;
  tone?: "default" | "brand" | "muted";
};

type LookupMaps = {
  branchLabel?: string;
  serviceLabels?: Record<string, string>;
  categoryLabels?: Record<string, string>;
};

function membershipLabel(filter?: CampaignMembershipFilter): string | undefined {
  if (!filter) return undefined;
  const map: Record<CampaignMembershipFilter, string> = {
    NON_MEMBER: "Non-members",
    ACTIVE: "Active members",
    EXPIRED: "Expired members",
    EXPIRING_SOON: "Expiring soon",
  };
  return map[filter];
}

function fromForm(form: CampaignFormState, maps: LookupMaps): CampaignCriteriaItem[] {
  const items: CampaignCriteriaItem[] = [];

  if (form.filterBranchId && maps.branchLabel) {
    items.push({ id: "branch", label: "Branch", value: maps.branchLabel, tone: "brand" });
  }
  if (form.filterMinVisitCount != null || form.filterMaxVisitCount != null) {
    const min = form.filterMinVisitCount ?? 0;
    const max = form.filterMaxVisitCount != null ? `–${form.filterMaxVisitCount}` : "+";
    items.push({ id: "visits", label: "Visits", value: `${min}${max}`, tone: "brand" });
  }
  if (form.filterMinLifetimeSpend != null || form.filterMaxLifetimeSpend != null) {
    const parts: string[] = [];
    if (form.filterMinLifetimeSpend != null) parts.push(`₹${form.filterMinLifetimeSpend}+`);
    if (form.filterMaxLifetimeSpend != null) parts.push(`up to ₹${form.filterMaxLifetimeSpend}`);
    items.push({ id: "spend", label: "Lifetime spend", value: parts.join(" "), tone: "brand" });
  }
  if (form.filterLastVisitFrom || form.filterLastVisitTo) {
    items.push({
      id: "lastVisit",
      label: "Last visit",
      value: [form.filterLastVisitFrom, form.filterLastVisitTo].filter(Boolean).join(" → "),
      tone: "brand",
    });
  }
  const membership = membershipLabel(form.filterMembershipFilter);
  if (membership) {
    items.push({ id: "membership", label: "Membership", value: membership, tone: "brand" });
  }
  if (form.filterMembershipExpiringWithinDays != null) {
    items.push({
      id: "expiring",
      label: "Expiring within",
      value: `${form.filterMembershipExpiringWithinDays} days`,
      tone: "brand",
    });
  }
  if (form.filterHasServiceIds.length > 0) {
    const names = form.filterHasServiceIds.map((id) => maps.serviceLabels?.[id] ?? id);
    items.push({ id: "hasServices", label: "Has service", value: names.join(", "), tone: "brand" });
  }
  if (form.filterExcludeServiceIds.length > 0) {
    const names = form.filterExcludeServiceIds.map((id) => maps.serviceLabels?.[id] ?? id);
    items.push({ id: "excludeServices", label: "Exclude service", value: names.join(", "), tone: "muted" });
  }
  if (form.filterHasServiceCategoryIds.length > 0) {
    const names = form.filterHasServiceCategoryIds.map((id) => maps.categoryLabels?.[id] ?? id);
    items.push({ id: "hasCategories", label: "Service category", value: names.join(", "), tone: "brand" });
  }
  if (form.filterMinOverallRating != null || form.filterMaxOverallRating != null) {
    items.push({
      id: "rating",
      label: "Rating",
      value: `${form.filterMinOverallRating ?? 1}–${form.filterMaxOverallRating ?? 5}★`,
      tone: "brand",
    });
  }
  if (form.filterHasSubmittedReview === true) {
    items.push({ id: "reviewed", label: "Reviews", value: "Submitted in-app review", tone: "brand" });
  }
  if (form.filterGoogleReviewNotSubmitted === true) {
    items.push({ id: "noGoogle", label: "Google review", value: "Not submitted yet", tone: "brand" });
  }
  if (form.filterBookingSource) {
    items.push({
      id: "booking",
      label: "Booking source",
      value: form.filterBookingSource === "WALK_IN" ? "Walk-in" : "Online",
      tone: "brand",
    });
  }
  if (form.filterSociety) {
    items.push({ id: "society", label: "Society", value: form.filterSociety, tone: "muted" });
  }
  if (form.filterNames.length > 0) {
    items.push({ id: "names", label: "Names", value: form.filterNames.join(", "), tone: "muted" });
  }

  items.push({
    id: "channel",
    label: "Channel",
    value: form.channel === "WHATSAPP" ? "WhatsApp opt-in only" : "SMS opt-in only",
    tone: "default",
  });

  return items;
}

export function buildCriteriaFromForm(form: CampaignFormState, maps: LookupMaps = {}): CampaignCriteriaItem[] {
  return fromForm(form, maps);
}

export function buildCriteriaFromCampaign(campaign: Campaign, maps: LookupMaps = {}): CampaignCriteriaItem[] {
  const formLike: CampaignFormState = {
    name: campaign.name,
    channel: campaign.channel,
    messageText: campaign.messageText,
    templateId: campaign.templateId,
    filterNames:
      campaign.filterNames?.length
        ? campaign.filterNames
        : campaign.filterName
          ? campaign.filterName.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
    filterSociety: campaign.filterSociety ?? "",
    filterPhones:
      campaign.filterPhones?.length
        ? campaign.filterPhones
        : campaign.filterPhone
          ? campaign.filterPhone.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
    filterMinVisitCount: campaign.filterMinVisitCount,
    filterMaxVisitCount: campaign.filterMaxVisitCount,
    filterMinLifetimeSpend: campaign.filterMinLifetimeSpend,
    filterMaxLifetimeSpend: campaign.filterMaxLifetimeSpend,
    filterLastVisitFrom: campaign.filterLastVisitFrom,
    filterLastVisitTo: campaign.filterLastVisitTo,
    filterBranchId: campaign.filterBranchId,
    filterMembershipFilter: campaign.filterMembershipFilter,
    filterMembershipExpiringWithinDays: campaign.filterMembershipExpiringWithinDays,
    filterHasServiceIds: campaign.filterHasServiceIds ?? [],
    filterExcludeServiceIds: campaign.filterExcludeServiceIds ?? [],
    filterHasServiceCategoryIds: campaign.filterHasServiceCategoryIds ?? [],
    filterExcludeServiceCategoryIds: campaign.filterExcludeServiceCategoryIds ?? [],
    filterMaxOverallRating: campaign.filterMaxOverallRating,
    filterMinOverallRating: campaign.filterMinOverallRating,
    filterHasSubmittedReview: campaign.filterHasSubmittedReview,
    filterGoogleReviewNotSubmitted: campaign.filterGoogleReviewNotSubmitted,
    filterBookingSource: campaign.filterBookingSource,
  };
  return fromForm(formLike, maps);
}
