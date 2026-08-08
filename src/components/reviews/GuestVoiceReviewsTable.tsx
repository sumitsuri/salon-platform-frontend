"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ArrowDownUp, Star } from "lucide-react";
import { GuestVoiceReviewItem } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, FilterableTable } from "@/components/ui";
import {
  CATEGORY_LABELS,
  EMPTY_REVIEW_FILTERS,
  ReviewListFilters,
  ReviewSortKey,
  TAG_LABELS,
  activeFilterCount,
  filterReviews,
  formatReviewDate,
  ratingTone,
  sortReviews,
} from "@/components/reviews/guest-voice-utils";

type Props = {
  reviews: GuestVoiceReviewItem[];
  filters: ReviewListFilters;
  sortKey: ReviewSortKey;
  onFiltersChange: (filters: ReviewListFilters) => void;
  onSortChange: (sortKey: ReviewSortKey) => void;
  onClearFilters: () => void;
};

function RatingBadge({ rating }: { rating: number }) {
  const tone = ratingTone(rating);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        tone.badge,
      )}
    >
      <Star className="h-3.5 w-3.5 fill-current" />
      {rating}/5
    </span>
  );
}

function CategoryCell({ value }: { value?: number }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const tone = ratingTone(value);
  return (
    <span className={cn("inline-flex min-w-[2rem] justify-center rounded-md px-1.5 py-0.5 text-xs font-medium", tone.badge)}>
      {value}★
    </span>
  );
}

export function GuestVoiceReviewsTable({
  reviews,
  filters,
  sortKey,
  onFiltersChange,
  onSortChange,
  onClearFilters,
}: Props) {
  const t = useTranslations("admin.guestVoice");
  const tCommon = useTranslations("common");

  const filtered = useMemo(
    () => sortReviews(filterReviews(reviews, filters), sortKey),
    [reviews, filters, sortKey],
  );

  const filterCount = activeFilterCount(filters);

  function patchFilters(patch: Partial<ReviewListFilters>) {
    onFiltersChange({ ...filters, ...patch });
  }

  const columns = [
    {
      label: t("columns.customer"),
      filter: {
        type: "text" as const,
        placeholder: t("filters.customerPlaceholder"),
        value: filters.customer,
        onChange: (value: string) => patchFilters({ customer: value }),
      },
    },
    { label: t("columns.branch") },
    {
      label: t("columns.submitted"),
      filter: {
        type: "date" as const,
        value: filters.dateFrom,
        onChange: (value: string) => patchFilters({ dateFrom: value }),
      },
    },
    {
      label: t("columns.overall"),
      filter: {
        type: "select" as const,
        value: filters.exactRating,
        onChange: (value: string) => patchFilters({ exactRating: value, minRating: "", maxRatingExclusive: "" }),
        options: [
          { value: "", label: t("filters.anyRating") },
          ...([5, 4, 3, 2, 1].map((stars) => ({ value: String(stars), label: `${stars}★ only` }))),
        ],
      },
    },
    { label: CATEGORY_LABELS.SERVICE },
    { label: CATEGORY_LABELS.AMBIENCE },
    { label: CATEGORY_LABELS.STAFF },
    { label: CATEGORY_LABELS.CLEANLINESS },
    { label: CATEGORY_LABELS.VALUE_FOR_MONEY },
    { label: t("columns.google") },
    { label: t("columns.tags") },
    { label: t("columns.review") },
  ];

  return (
    <section
      id="guest-voice-reviews-table"
      data-testid="guest-voice-reviews-table"
      className="space-y-4 scroll-mt-24 min-w-0 max-w-full"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="font-semibold text-lg">{t("reviewsTableTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("reviewsTableHint", { shown: filtered.length, total: reviews.length })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
            <select
              value={sortKey}
              onChange={(e) => onSortChange(e.target.value as ReviewSortKey)}
              className="rounded-lg border bg-background px-3 py-2 text-sm min-h-10"
              data-testid="guest-voice-sort"
            >
              <option value="dateDesc">{t("sortNewest")}</option>
              <option value="dateAsc">{t("sortOldest")}</option>
              <option value="ratingDesc">{t("sortRatingHigh")}</option>
              <option value="ratingAsc">{t("sortRatingLow")}</option>
            </select>
          </label>
          {filterCount > 0 && (
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-lg border px-3 py-2 text-sm font-medium min-h-10 hover:bg-muted"
              data-testid="guest-voice-clear-filters"
            >
              {tCommon("clearFilters")} ({filterCount})
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-sm">
          <span className="font-medium">{t("filters.ratingBelow")}</span>
          <select
            value={filters.maxRatingExclusive}
            onChange={(e) =>
              patchFilters({
                maxRatingExclusive: e.target.value,
                exactRating: "",
              })
            }
            className="w-full rounded-lg border bg-background px-3 py-2 min-h-10"
            data-testid="guest-voice-filter-rating-below"
          >
            <option value="">{t("filters.anyRating")}</option>
            <option value="2">{t("filters.belowStars", { stars: 2 })}</option>
            <option value="3">{t("filters.belowStars", { stars: 3 })}</option>
            <option value="4">{t("filters.belowStars", { stars: 4 })}</option>
            <option value="5">{t("filters.belowStars", { stars: 5 })}</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">{t("filters.minRating")}</span>
          <select
            value={filters.minRating}
            onChange={(e) =>
              patchFilters({
                minRating: e.target.value,
                exactRating: "",
              })
            }
            className="w-full rounded-lg border bg-background px-3 py-2 min-h-10"
            data-testid="guest-voice-filter-min-rating"
          >
            <option value="">{t("filters.anyRating")}</option>
            {[1, 2, 3, 4, 5].map((stars) => (
              <option key={stars} value={String(stars)}>
                {t("filters.atLeastStars", { stars })}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">{t("filters.dateTo")}</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => patchFilters({ dateTo: e.target.value })}
            className="w-full rounded-lg border bg-background px-3 py-2 min-h-10"
            data-testid="guest-voice-filter-date-to"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={onClearFilters}
            className="w-full rounded-lg border px-3 py-2 text-sm font-medium min-h-10 hover:bg-muted"
          >
            {t("filters.resetAll")}
          </button>
        </div>
      </div>

      <Card className="overflow-hidden p-0 min-w-0 max-w-full">
        {filtered.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">{t("noReviewsMatchFilters")}</p>
        ) : (
          <>
            <div className="lg:hidden divide-y divide-[var(--border)]" data-testid="guest-voice-mobile-list">
              {filtered.map((review) => {
                const tone = ratingTone(review.overallRating);
                return (
                  <div
                    key={review.reviewId}
                    className={cn("px-4 py-3.5 space-y-2", tone.row)}
                    data-testid="guest-voice-review-row"
                    data-rating={review.overallRating}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{review.customerFirstName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {review.branchName ?? t("unknownBranch")} · {formatReviewDate(review.submittedAt)}
                        </p>
                      </div>
                      <RatingBadge rating={review.overallRating} />
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      {review.categoryRatings?.SERVICE != null && (
                        <span className="rounded-md bg-muted px-1.5 py-0.5">
                          {CATEGORY_LABELS.SERVICE}: {review.categoryRatings.SERVICE}★
                        </span>
                      )}
                      {review.categoryRatings?.STAFF != null && (
                        <span className="rounded-md bg-muted px-1.5 py-0.5">
                          {CATEGORY_LABELS.STAFF}: {review.categoryRatings.STAFF}★
                        </span>
                      )}
                    </div>
                    {(review.improvementTags ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {review.improvementTags.map((tag) => (
                          <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                            {TAG_LABELS[tag] ?? tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)] line-clamp-3">
                      {review.comment || t("noWrittenReview")}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="hidden lg:block responsive-table-wrap">
              <FilterableTable columns={columns}>
                {filtered.map((review) => {
                  const tone = ratingTone(review.overallRating);
                  return (
                    <tr
                      key={review.reviewId}
                      className={cn("border-b border-[var(--border)] align-top", tone.row)}
                      data-testid="guest-voice-review-row"
                      data-rating={review.overallRating}
                    >
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{review.customerFirstName}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {review.branchName ?? t("unknownBranch")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {formatReviewDate(review.submittedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <RatingBadge rating={review.overallRating} />
                      </td>
                      <td className="px-4 py-3"><CategoryCell value={review.categoryRatings?.SERVICE} /></td>
                      <td className="px-4 py-3"><CategoryCell value={review.categoryRatings?.AMBIENCE} /></td>
                      <td className="px-4 py-3"><CategoryCell value={review.categoryRatings?.STAFF} /></td>
                      <td className="px-4 py-3"><CategoryCell value={review.categoryRatings?.CLEANLINESS} /></td>
                      <td className="px-4 py-3"><CategoryCell value={review.categoryRatings?.VALUE_FOR_MONEY} /></td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {review.overallRating >= 4 ? (
                          review.googleReviewRedirected ? (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                              {t("googlePublished")}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">{t("googlePending")}</span>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 min-w-[10rem]">
                        <div className="flex flex-wrap gap-1">
                          {(review.improvementTags ?? []).length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            review.improvementTags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium"
                              >
                                {TAG_LABELS[tag] ?? tag}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 min-w-[14rem] max-w-[24rem]">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap line-clamp-3">
                          {review.comment || t("noWrittenReview")}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </FilterableTable>
            </div>
          </>
        )}
      </Card>
    </section>
  );
}

export { EMPTY_REVIEW_FILTERS };
