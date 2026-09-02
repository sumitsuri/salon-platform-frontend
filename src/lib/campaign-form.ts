import type {
  CampaignChannel,
  CampaignMembershipFilter,
  CampaignTemplate,
  CreateCampaignRequest,
} from "@/lib/api";

export type CampaignFormState = {
  name: string;
  channel: CampaignChannel;
  messageText: string;
  templateId?: string;
  filterNames: string[];
  filterSociety: string;
  filterPhones: string[];
  filterMinVisitCount?: number;
  filterMaxVisitCount?: number;
  filterMinLifetimeSpend?: number;
  filterMaxLifetimeSpend?: number;
  filterLastVisitFrom?: string;
  filterLastVisitTo?: string;
  filterBranchId?: string;
  filterMembershipFilter?: CampaignMembershipFilter;
  filterMembershipExpiringWithinDays?: number;
  filterHasServiceIds: string[];
  filterExcludeServiceIds: string[];
  filterHasServiceCategoryIds: string[];
  filterExcludeServiceCategoryIds: string[];
  filterMaxOverallRating?: number;
  filterMinOverallRating?: number;
  filterHasSubmittedReview?: boolean;
  filterGoogleReviewNotSubmitted?: boolean;
  filterBookingSource?: "WALK_IN" | "ONLINE";
};

export const emptyCampaignForm: CampaignFormState = {
  name: "",
  channel: "WHATSAPP",
  messageText: "",
  filterNames: [],
  filterSociety: "",
  filterPhones: [],
  filterHasServiceIds: [],
  filterExcludeServiceIds: [],
  filterHasServiceCategoryIds: [],
  filterExcludeServiceCategoryIds: [],
};

export function buildCampaignPayload(form: CampaignFormState): CreateCampaignRequest {
  return {
    name: form.name,
    channel: form.channel,
    messageText: form.messageText,
    templateId: form.templateId,
    filterNames: form.filterNames.length ? form.filterNames : undefined,
    filterSociety: form.filterSociety || undefined,
    filterPhones: form.filterPhones.length ? form.filterPhones : undefined,
    filterMinVisitCount: form.filterMinVisitCount,
    filterMaxVisitCount: form.filterMaxVisitCount,
    filterMinLifetimeSpend: form.filterMinLifetimeSpend,
    filterMaxLifetimeSpend: form.filterMaxLifetimeSpend,
    filterLastVisitFrom: form.filterLastVisitFrom || undefined,
    filterLastVisitTo: form.filterLastVisitTo || undefined,
    filterWhatsappOptInOnly: form.channel === "WHATSAPP" ? true : undefined,
    filterSmsOptInOnly: form.channel === "SMS" ? true : undefined,
    filterBranchId: form.filterBranchId || undefined,
    filterMembershipFilter: form.filterMembershipFilter,
    filterMembershipExpiringWithinDays: form.filterMembershipExpiringWithinDays,
    filterHasServiceIds: form.filterHasServiceIds.length ? form.filterHasServiceIds : undefined,
    filterExcludeServiceIds: form.filterExcludeServiceIds.length ? form.filterExcludeServiceIds : undefined,
    filterHasServiceCategoryIds: form.filterHasServiceCategoryIds.length
      ? form.filterHasServiceCategoryIds
      : undefined,
    filterExcludeServiceCategoryIds: form.filterExcludeServiceCategoryIds.length
      ? form.filterExcludeServiceCategoryIds
      : undefined,
    filterMaxOverallRating: form.filterMaxOverallRating,
    filterMinOverallRating: form.filterMinOverallRating,
    filterHasSubmittedReview: form.filterHasSubmittedReview,
    filterGoogleReviewNotSubmitted: form.filterGoogleReviewNotSubmitted,
    filterBookingSource: form.filterBookingSource,
  };
}

export function applyCampaignTemplate(template: CampaignTemplate): CampaignFormState {
  const f = template.filters;
  return {
    name: template.name,
    channel: "WHATSAPP",
    messageText: template.suggestedMessage,
    templateId: template.id,
    filterNames: [],
    filterSociety: "",
    filterPhones: [],
    filterMinVisitCount: f.minVisitCount,
    filterMaxVisitCount: f.maxVisitCount,
    filterMinLifetimeSpend: f.minLifetimeSpend,
    filterMaxLifetimeSpend: f.maxLifetimeSpend,
    filterLastVisitFrom: f.lastVisitFrom,
    filterLastVisitTo: f.lastVisitTo,
    filterBranchId: f.branchId,
    filterMembershipFilter: f.membershipFilter,
    filterMembershipExpiringWithinDays: f.membershipExpiringWithinDays,
    filterHasServiceIds: f.hasServiceIds ?? [],
    filterExcludeServiceIds: f.excludeServiceIds ?? [],
    filterHasServiceCategoryIds: f.hasServiceCategoryIds ?? [],
    filterExcludeServiceCategoryIds: f.excludeServiceCategoryIds ?? [],
    filterMaxOverallRating: f.maxOverallRating,
    filterMinOverallRating: f.minOverallRating,
    filterHasSubmittedReview: f.hasSubmittedReview,
    filterGoogleReviewNotSubmitted: f.googleReviewNotSubmitted,
    filterBookingSource: f.bookingSource,
  };
}

export function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function isoStartOfYear(): string {
  const y = new Date().getFullYear();
  return `${y}-01-01`;
}

export const VISIT_COUNT_OPTIONS = [0, 1, 2, 3, 5, 10, 15, 20];

export const SPEND_PRESETS = [500, 1000, 2000, 5000, 8000, 15000, 25000];

export const RATING_OPTIONS = [1, 2, 3, 4, 5];
