"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, CreditCard, Filter, Scissors, Star, Users } from "lucide-react";
import {
  type CampaignMembershipFilter,
} from "@/lib/api";
import {
  isoDaysAgo,
  isoStartOfYear,
  RATING_OPTIONS,
  SPEND_PRESETS,
  VISIT_COUNT_OPTIONS,
  type CampaignFormState,
} from "@/lib/campaign-form";
import {
  PageLoader,
  SearchableMultiSelect,
  SearchableSelect,
  inputClass,
} from "@/components/ui";
import { cn } from "@/lib/utils";

type FilterOptions = {
  names: { value: string; label: string }[];
  societies: { value: string; label: string }[];
  phones: { value: string; label: string }[];
};

type SectionKey = "basic" | "visits" | "membership" | "services" | "reviews";

type Props = {
  form: CampaignFormState;
  onChange: <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => void;
  filterOptions?: FilterOptions;
  filtersLoading?: boolean;
  branchOptions: { value: string; label: string }[];
  serviceOptions: { value: string; label: string }[];
  categoryOptions: { value: string; label: string }[];
  collapsible?: boolean;
};

function FilterSection({
  id,
  title,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  id: SectionKey;
  title: string;
  icon: typeof Filter;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="campaign-filter-section" data-testid={`campaign-filter-section-${id}`}>
      <button type="button" onClick={onToggle} className="campaign-filter-section-trigger">
        <Icon className="w-4 h-4 shrink-0 text-[var(--brand-text)]" />
        <span className="flex-1 text-sm font-semibold text-[var(--text-primary)]">{title}</span>
        <ChevronDown className={cn("w-4 h-4 text-[var(--text-tertiary)] transition-transform", open && "rotate-180")} />
      </button>
      {open ? <div className="campaign-filter-section-body">{children}</div> : null}
    </div>
  );
}

export function CampaignFormFields({
  form,
  onChange,
  filterOptions,
  filtersLoading,
  branchOptions,
  serviceOptions,
  categoryOptions,
  collapsible = true,
}: Props) {
  const t = useTranslations("admin.campaigns");
  const tCommon = useTranslations("common");
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    basic: true,
    visits: false,
    membership: false,
    services: false,
    reviews: false,
  });

  const lastVisitFromOptions = useMemo(
    () => [
      { value: "", label: t("lastVisitAny") },
      { value: isoDaysAgo(7), label: t("lastVisit7d") },
      { value: isoDaysAgo(30), label: t("lastVisit30d") },
      { value: isoDaysAgo(90), label: t("lastVisit90d") },
      { value: isoDaysAgo(180), label: t("lastVisit180d") },
      { value: isoStartOfYear(), label: t("lastVisitYtd") },
    ],
    [t],
  );

  const lastVisitToOptions = useMemo(
    () => [
      { value: "", label: t("lastVisitAny") },
      { value: isoDaysAgo(7), label: t("lastVisitBefore7d") },
      { value: isoDaysAgo(14), label: t("lastVisitBefore14d") },
      { value: isoDaysAgo(21), label: t("lastVisitBefore21d") },
      { value: isoDaysAgo(30), label: t("lastVisitBefore30d") },
      { value: isoDaysAgo(45), label: t("lastVisitBefore45d") },
      { value: isoDaysAgo(60), label: t("lastVisitBefore60d") },
      { value: isoDaysAgo(90), label: t("lastVisitBefore90d") },
    ],
    [t],
  );

  const visitCountOptions = useMemo(
    () => [
      { value: "", label: t("visitAny") },
      ...VISIT_COUNT_OPTIONS.map((n) => ({ value: String(n), label: String(n) })),
    ],
    [t],
  );

  const spendOptions = useMemo(
    () => [
      { value: "", label: t("spendAny") },
      ...SPEND_PRESETS.map((n) => ({
        value: String(n),
        label: t("spendAtLeast", { amount: n.toLocaleString("en-IN") }),
      })),
    ],
    [t],
  );

  const maxSpendOptions = useMemo(
    () => [
      { value: "", label: t("spendAny") },
      ...SPEND_PRESETS.map((n) => ({
        value: String(n),
        label: t("spendAtMost", { amount: n.toLocaleString("en-IN") }),
      })),
    ],
    [t],
  );

  const membershipOptions = useMemo(
    () => [
      { value: "", label: tCommon("all") },
      { value: "NON_MEMBER", label: t("membershipNonMember") },
      { value: "ACTIVE", label: t("membershipActive") },
      { value: "EXPIRED", label: t("membershipExpired") },
      { value: "EXPIRING_SOON", label: t("membershipExpiringSoon") },
    ],
    [t, tCommon],
  );

  const ratingMaxOptions = useMemo(
    () => [
      { value: "", label: tCommon("all") },
      ...RATING_OPTIONS.map((n) => ({ value: String(n), label: t("ratingAtMost", { stars: n }) })),
    ],
    [t, tCommon],
  );

  const ratingMinOptions = useMemo(
    () => [
      { value: "", label: tCommon("all") },
      ...RATING_OPTIONS.map((n) => ({ value: String(n), label: t("ratingAtLeast", { stars: n }) })),
    ],
    [t, tCommon],
  );

  const reviewStatusOptions = useMemo(
    () => [
      { value: "", label: tCommon("all") },
      { value: "true", label: t("hasReviewYes") },
      { value: "false", label: t("hasReviewNo") },
    ],
    [t, tCommon],
  );

  const bookingSourceOptions = useMemo(
    () => [
      { value: "", label: tCommon("all") },
      { value: "WALK_IN", label: t("bookingWalkIn") },
      { value: "ONLINE", label: t("bookingOnline") },
    ],
    [t, tCommon],
  );

  const gridClass = "grid gap-3 sm:grid-cols-2";

  function toggleSection(key: SectionKey) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function wrapSection(key: SectionKey, title: string, icon: typeof Filter, body: React.ReactNode) {
    if (!collapsible) {
      return (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{title}</p>
          {body}
        </div>
      );
    }
    return (
      <FilterSection
        id={key}
        title={title}
        icon={icon}
        open={openSections[key]}
        onToggle={() => toggleSection(key)}
      >
        {body}
      </FilterSection>
    );
  }

  if (filtersLoading || !filterOptions) {
    return <PageLoader label={t("loadingFilters")} />;
  }

  const basicFields = (
    <div className={gridClass}>
      <SearchableMultiSelect
        value={form.filterNames}
        onChange={(v) => onChange("filterNames", v)}
        options={filterOptions.names}
        placeholder={t("nameContains")}
        allLabel={tCommon("all")}
      />
      <SearchableSelect
        value={form.filterSociety || ""}
        onChange={(v) => onChange("filterSociety", v)}
        options={filterOptions.societies}
        placeholder={t("societyContains")}
        allLabel={tCommon("all")}
      />
      <SearchableMultiSelect
        value={form.filterPhones}
        onChange={(v) => onChange("filterPhones", v)}
        options={filterOptions.phones}
        placeholder={t("phoneContains")}
        allLabel={tCommon("all")}
      />
      <SearchableSelect
        value={form.filterBranchId || ""}
        onChange={(v) => onChange("filterBranchId", v || undefined)}
        options={branchOptions}
        placeholder={t("filterBranch")}
        allLabel={tCommon("all")}
      />
    </div>
  );

  const visitFields = (
    <div className={gridClass}>
      <SearchableSelect
        value={form.filterMinVisitCount != null ? String(form.filterMinVisitCount) : ""}
        onChange={(v) => onChange("filterMinVisitCount", v ? Number(v) : undefined)}
        options={visitCountOptions}
        placeholder={t("minVisits")}
        allLabel={t("visitAny")}
      />
      <SearchableSelect
        value={form.filterMaxVisitCount != null ? String(form.filterMaxVisitCount) : ""}
        onChange={(v) => onChange("filterMaxVisitCount", v ? Number(v) : undefined)}
        options={visitCountOptions}
        placeholder={t("maxVisits")}
        allLabel={t("visitAny")}
      />
      <SearchableSelect
        value={form.filterLastVisitFrom || ""}
        onChange={(v) => onChange("filterLastVisitFrom", v || undefined)}
        options={lastVisitFromOptions}
        placeholder={t("lastVisitFrom")}
        allLabel={t("lastVisitAny")}
      />
      <SearchableSelect
        value={form.filterLastVisitTo || ""}
        onChange={(v) => onChange("filterLastVisitTo", v || undefined)}
        options={lastVisitToOptions}
        placeholder={t("lastVisitTo")}
        allLabel={t("lastVisitAny")}
      />
      <SearchableSelect
        value={form.filterMinLifetimeSpend != null ? String(form.filterMinLifetimeSpend) : ""}
        onChange={(v) => onChange("filterMinLifetimeSpend", v ? Number(v) : undefined)}
        options={spendOptions}
        placeholder={t("minLifetimeSpend")}
        allLabel={t("spendAny")}
      />
      <SearchableSelect
        value={form.filterMaxLifetimeSpend != null ? String(form.filterMaxLifetimeSpend) : ""}
        onChange={(v) => onChange("filterMaxLifetimeSpend", v ? Number(v) : undefined)}
        options={maxSpendOptions}
        placeholder={t("maxLifetimeSpend")}
        allLabel={t("spendAny")}
      />
    </div>
  );

  const membershipFields = (
    <div className="grid gap-3 sm:grid-cols-2">
      <SearchableSelect
        value={form.filterMembershipFilter || ""}
        onChange={(v) =>
          onChange("filterMembershipFilter", (v || undefined) as CampaignMembershipFilter | undefined)
        }
        options={membershipOptions}
        placeholder={t("membershipFilter")}
        allLabel={tCommon("all")}
      />
      {form.filterMembershipFilter === "EXPIRING_SOON" && (
        <input
          type="number"
          min={1}
          max={90}
          placeholder={t("membershipExpiringDays")}
          value={form.filterMembershipExpiringWithinDays ?? 14}
          onChange={(e) => onChange("filterMembershipExpiringWithinDays", Number(e.target.value) || 14)}
          className={inputClass}
        />
      )}
    </div>
  );

  const serviceFields = (
    <div className="grid gap-3 sm:grid-cols-2">
      <SearchableMultiSelect
        value={form.filterHasServiceIds}
        onChange={(v) => onChange("filterHasServiceIds", v)}
        options={serviceOptions}
        placeholder={t("hasServices")}
        allLabel={tCommon("all")}
      />
      <SearchableMultiSelect
        value={form.filterExcludeServiceIds}
        onChange={(v) => onChange("filterExcludeServiceIds", v)}
        options={serviceOptions}
        placeholder={t("excludeServices")}
        allLabel={tCommon("all")}
      />
      <SearchableMultiSelect
        value={form.filterHasServiceCategoryIds}
        onChange={(v) => onChange("filterHasServiceCategoryIds", v)}
        options={categoryOptions}
        placeholder={t("hasCategories")}
        allLabel={tCommon("all")}
      />
      <SearchableMultiSelect
        value={form.filterExcludeServiceCategoryIds}
        onChange={(v) => onChange("filterExcludeServiceCategoryIds", v)}
        options={categoryOptions}
        placeholder={t("excludeCategories")}
        allLabel={tCommon("all")}
      />
    </div>
  );

  const reviewFields = (
    <div className={gridClass}>
      <SearchableSelect
        value={form.filterMaxOverallRating != null ? String(form.filterMaxOverallRating) : ""}
        onChange={(v) => onChange("filterMaxOverallRating", v ? Number(v) : undefined)}
        options={ratingMaxOptions}
        placeholder={t("maxRating")}
        allLabel={tCommon("all")}
      />
      <SearchableSelect
        value={form.filterMinOverallRating != null ? String(form.filterMinOverallRating) : ""}
        onChange={(v) => onChange("filterMinOverallRating", v ? Number(v) : undefined)}
        options={ratingMinOptions}
        placeholder={t("minRating")}
        allLabel={tCommon("all")}
      />
      <SearchableSelect
        value={form.filterHasSubmittedReview === undefined ? "" : String(form.filterHasSubmittedReview)}
        onChange={(v) => onChange("filterHasSubmittedReview", v === "" ? undefined : v === "true")}
        options={reviewStatusOptions}
        placeholder={t("hasReview")}
        allLabel={tCommon("all")}
      />
      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] sm:col-span-2">
        <input
          type="checkbox"
          checked={form.filterGoogleReviewNotSubmitted === true}
          onChange={(e) => onChange("filterGoogleReviewNotSubmitted", e.target.checked || undefined)}
          className="rounded border-[var(--border-subtle)]"
        />
        {t("googleReviewNotSubmitted")}
      </label>
      <SearchableSelect
        value={form.filterBookingSource || ""}
        onChange={(v) => onChange("filterBookingSource", (v || undefined) as CampaignFormState["filterBookingSource"])}
        options={bookingSourceOptions}
        placeholder={t("bookingSource")}
        allLabel={tCommon("all")}
      />
    </div>
  );

  return (
    <div className="space-y-3">
      {wrapSection("basic", t("filterSectionBasic"), Filter, basicFields)}
      {wrapSection("visits", t("filterSectionVisits"), Users, visitFields)}
      {wrapSection("membership", t("filterSectionMembership"), CreditCard, membershipFields)}
      {wrapSection("services", t("filterSectionServices"), Scissors, serviceFields)}
      {wrapSection("reviews", t("filterSectionReviews"), Star, reviewFields)}
    </div>
  );
}
