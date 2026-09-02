"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, MessageSquareText, Star } from "lucide-react";
import { GuestVoiceReviewItem } from "@/lib/api";
import { cn } from "@/lib/utils";
import { DataListPanel } from "@/components/DataListPanel";
import { FilterableTable, selectClass } from "@/components/ui";
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

type QuickFilter = "all" | "promoters" | "needsAttention";

function RatingBadge({ rating, compact = false }: { rating: number; compact?: boolean }) {
  const tone = ratingTone(rating);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full font-semibold ring-1",
        compact ? "px-2 py-0.5 text-[10px]" : "gap-1 px-2.5 py-1 text-xs",
        tone.badge
      )}
    >
      <Star className={cn("fill-current", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
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

function resolveQuickFilter(filters: ReviewListFilters): QuickFilter {
  if (filters.minRating === "4" && !filters.maxRatingExclusive && !filters.exactRating) {
    return "promoters";
  }
  if (filters.maxRatingExclusive === "4" && !filters.minRating && !filters.exactRating) {
    return "needsAttention";
  }
  return "all";
}

function CompactReviewRow({
  review,
  expanded,
  onToggle,
  revealHint,
  labels,
}: {
  review: GuestVoiceReviewItem;
  expanded: boolean;
  onToggle: () => void;
  revealHint: string;
  labels: {
    unknownBranch: string;
    noWrittenReview: string;
    googlePublished: string;
    googlePending: string;
  };
}) {
  const tags = review.improvementTags ?? [];
  const categories = Object.entries(review.categoryRatings ?? {}).filter(([, value]) => value != null);
  const signalClass =
    review.overallRating <= 2
      ? "guest-voice-review-row-signal--low"
      : review.overallRating === 3
        ? "guest-voice-review-row-signal--mid"
        : "guest-voice-review-row-signal--high";

  return (
    <div
      className="guest-voice-review-row"
      data-testid="guest-voice-review-row"
      data-rating={review.overallRating}
    >
      <button
        type="button"
        className="guest-voice-review-row-trigger touch-manipulation"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span className={cn("guest-voice-review-row-signal", signalClass)} aria-hidden />
        <span className="guest-voice-review-row-body min-w-0 flex-1 text-left">
          <span className="guest-voice-review-row-top flex items-start justify-between gap-2">
            <span className="min-w-0">
              <span className="guest-voice-review-row-name truncate">{review.customerFirstName}</span>
              <span className="guest-voice-review-row-meta truncate">
                {review.branchName ?? labels.unknownBranch} · {formatReviewDate(review.submittedAt)}
              </span>
            </span>
            <RatingBadge rating={review.overallRating} compact />
          </span>
          <p className={cn("guest-voice-review-row-preview", expanded && "guest-voice-review-row-preview--hidden")}>
            {review.comment || labels.noWrittenReview}
          </p>
          {!expanded ? <span className="guest-voice-review-row-hint">{revealHint}</span> : null}
        </span>
        <ChevronDown
          className={cn("guest-voice-review-row-chevron h-4 w-4 shrink-0", expanded && "rotate-180")}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div className="guest-voice-review-row-detail">
          {categories.length > 0 ? (
            <div className="guest-voice-review-row-tags">
              {categories.map(([key, value]) => (
                <span key={key} className="guest-voice-review-row-tag">
                  {CATEGORY_LABELS[key] ?? key}: {value}★
                </span>
              ))}
            </div>
          ) : null}
          {tags.length > 0 ? (
            <div className="guest-voice-review-row-tags">
              {tags.map((tag) => (
                <span key={tag} className="guest-voice-review-row-tag guest-voice-review-row-tag--muted">
                  {TAG_LABELS[tag] ?? tag}
                </span>
              ))}
            </div>
          ) : null}
          <p className="guest-voice-review-row-comment whitespace-pre-wrap">
            {review.comment || labels.noWrittenReview}
          </p>
          {review.overallRating >= 4 ? (
            <p className="guest-voice-review-row-google">
              {review.googleReviewRedirected ? labels.googlePublished : labels.googlePending}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
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
  const [showFilters, setShowFilters] = useState(false);
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);

  const filtered = useMemo(
    () => sortReviews(filterReviews(reviews, filters), sortKey),
    [reviews, filters, sortKey]
  );

  const filterCount = activeFilterCount(filters);
  const quickFilter = resolveQuickFilter(filters);

  function patchFilters(patch: Partial<ReviewListFilters>) {
    onFiltersChange({ ...filters, ...patch });
  }

  function applyQuickFilter(next: QuickFilter) {
    if (next === "all") {
      onClearFilters();
      return;
    }
    if (next === "promoters") {
      onFiltersChange({ ...EMPTY_REVIEW_FILTERS, minRating: "4" });
      return;
    }
    onFiltersChange({ ...EMPTY_REVIEW_FILTERS, maxRatingExclusive: "4" });
  }

  const filterColumns = [
    {
      label: t("columns.customer"),
      filter: {
        type: "text" as const,
        placeholder: t("filters.customerPlaceholder"),
        value: filters.customer,
        onChange: (value: string) => patchFilters({ customer: value }),
      },
    },
    {
      label: t("columns.overall"),
      filter: {
        type: "select" as const,
        value: filters.exactRating,
        onChange: (value: string) =>
          patchFilters({ exactRating: value, minRating: "", maxRatingExclusive: "" }),
        options: [
          { value: "", label: t("filters.anyRating") },
          ...([5, 4, 3, 2, 1].map((stars) => ({ value: String(stars), label: `${stars}★ only` }))),
        ],
      },
    },
    {
      label: t("filters.ratingBelow"),
      filter: {
        type: "select" as const,
        value: filters.maxRatingExclusive,
        onChange: (value: string) => patchFilters({ maxRatingExclusive: value, exactRating: "", minRating: "" }),
        options: [
          { value: "", label: t("filters.anyRating") },
          { value: "2", label: t("filters.belowStars", { stars: 2 }) },
          { value: "3", label: t("filters.belowStars", { stars: 3 }) },
          { value: "4", label: t("filters.belowStars", { stars: 4 }) },
          { value: "5", label: t("filters.belowStars", { stars: 5 }) },
        ],
      },
    },
    {
      label: t("filters.minRating"),
      filter: {
        type: "select" as const,
        value: filters.minRating,
        onChange: (value: string) => patchFilters({ minRating: value, exactRating: "", maxRatingExclusive: "" }),
        options: [
          { value: "", label: t("filters.anyRating") },
          ...([1, 2, 3, 4, 5].map((stars) => ({
            value: String(stars),
            label: t("filters.atLeastStars", { stars }),
          }))),
        ],
      },
    },
    {
      label: t("filters.dateTo"),
      filter: {
        type: "date" as const,
        value: filters.dateTo,
        onChange: (value: string) => patchFilters({ dateTo: value }),
      },
    },
  ];

  const tableColumns = [
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
        onChange: (value: string) =>
          patchFilters({ exactRating: value, minRating: "", maxRatingExclusive: "" }),
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

  const activeChips: { key: string; label: string; onClear: () => void }[] = [];
  if (filters.exactRating) {
    activeChips.push({
      key: "exact",
      label: `${filters.exactRating}★`,
      onClear: () => patchFilters({ exactRating: "" }),
    });
  }
  if (filters.minRating) {
    activeChips.push({
      key: "min",
      label: t("filters.atLeastStars", { stars: Number(filters.minRating) }),
      onClear: () => patchFilters({ minRating: "" }),
    });
  }
  if (filters.maxRatingExclusive) {
    activeChips.push({
      key: "max",
      label: t("filters.belowStars", { stars: Number(filters.maxRatingExclusive) }),
      onClear: () => patchFilters({ maxRatingExclusive: "" }),
    });
  }
  if (filters.dateTo) {
    activeChips.push({
      key: "dateTo",
      label: t("filters.dateToChip", { date: filters.dateTo }),
      onClear: () => patchFilters({ dateTo: "" }),
    });
  }
  if (filters.dateFrom) {
    activeChips.push({
      key: "dateFrom",
      label: t("filters.dateFromChip", { date: filters.dateFrom }),
      onClear: () => patchFilters({ dateFrom: "" }),
    });
  }
  if (filters.customer.trim()) {
    activeChips.push({
      key: "customer",
      label: filters.customer.trim(),
      onClear: () => patchFilters({ customer: "" }),
    });
  }

  const rowLabels = {
    unknownBranch: t("unknownBranch"),
    noWrittenReview: t("noWrittenReview"),
    googlePublished: t("googlePublished"),
    googlePending: t("googlePending"),
  };

  return (
    <DataListPanel
      id="guest-voice-reviews-table"
      testId="guest-voice-reviews-table"
      className="guest-voice-reviews-panel"
      icon={MessageSquareText}
      title={t("reviewsTableTitle")}
      hint={t("reviewsTableHint", { shown: filtered.length, total: reviews.length })}
      toolbarStart={
        <div className="guest-voice-quick-filters" role="tablist" aria-label={t("reviewsTableTitle")}>
          {(
            [
              { id: "all" as const, label: t("quickFilterAll") },
              { id: "promoters" as const, label: t("quickFilterPromoters") },
              { id: "needsAttention" as const, label: t("quickFilterNeedsAttention") },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={quickFilter === item.id}
              className={cn(
                "guest-voice-quick-filter touch-manipulation",
                quickFilter === item.id && "guest-voice-quick-filter--active"
              )}
              onClick={() => applyQuickFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      }
      toolbarEnd={
        <label className="guest-voice-sort-label min-w-0">
          <span className="sr-only">{t("sortNewest")}</span>
          <select
            value={sortKey}
            onChange={(e) => onSortChange(e.target.value as ReviewSortKey)}
            className={cn(selectClass, "guest-voice-sort-select min-h-9 py-1.5 text-xs")}
            data-testid="guest-voice-sort"
          >
            <option value="dateDesc">{t("sortNewest")}</option>
            <option value="dateAsc">{t("sortOldest")}</option>
            <option value="ratingDesc">{t("sortRatingHigh")}</option>
            <option value="ratingAsc">{t("sortRatingLow")}</option>
          </select>
        </label>
      }
      activeChips={activeChips}
      onClearAllFilters={onClearFilters}
      filterColumns={filterColumns}
      showFilters={showFilters}
      onShowFiltersChange={setShowFilters}
      activeFilterCount={filterCount}
      filterButtonTestId="guest-voice-open-filters"
      clearAllTestId="guest-voice-clear-filters"
    >
      {filtered.length === 0 ? (
        <p className="guest-voice-reviews-empty">{t("noReviewsMatchFilters")}</p>
      ) : (
        <>
          <div className="md:hidden guest-voice-reviews-list" data-testid="guest-voice-mobile-list">
            {filtered.map((review) => (
              <CompactReviewRow
                key={review.reviewId}
                review={review}
                expanded={expandedReviewId === review.reviewId}
                onToggle={() =>
                  setExpandedReviewId((current) =>
                    current === review.reviewId ? null : review.reviewId
                  )
                }
                revealHint={t("reviewRevealHint")}
                labels={rowLabels}
              />
            ))}
          </div>

          <div className="hidden md:block responsive-table-wrap">
            <FilterableTable columns={tableColumns}>
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
    </DataListPanel>
  );
}

export { EMPTY_REVIEW_FILTERS };
