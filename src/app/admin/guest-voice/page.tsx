"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { useAdminBranchSelection } from "@/lib/use-admin-branch-selection";
import { cn } from "@/lib/utils";
import { BranchMultiSelect } from "@/components/BranchMultiSelect";
import { PageHeader } from "@/components/ui";
import { AdminDataSkeleton } from "@/components/admin/AdminDataSkeleton";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { ProductDateRange, resolvePresetRange, toIsoDateTimeRange } from "@/lib/date-range";
import { GuestVoiceStatsStrip } from "@/components/reviews/GuestVoiceStatsStrip";
import {
  GuestVoiceReviewsTable,
  EMPTY_REVIEW_FILTERS,
} from "@/components/reviews/GuestVoiceReviewsTable";
import {
  CATEGORY_LABELS,
  ReviewListFilters,
  ReviewSortKey,
  TAG_LABELS,
  formatReviewDate,
  ratingTone,
} from "@/components/reviews/guest-voice-utils";

export default function AdminGuestVoicePage() {
  const t = useTranslations("admin.guestVoice");
  const [dateRange, setDateRange] = useState<ProductDateRange>(() => ({
    preset: "last_30_days",
    ...resolvePresetRange("last_30_days"),
  }));
  const [listFilters, setListFilters] = useState<ReviewListFilters>(EMPTY_REVIEW_FILTERS);
  const [sortKey, setSortKey] = useState<ReviewSortKey>("dateDesc");
  const tableRef = useRef<HTMLDivElement>(null);
  const apiRange = useMemo(() => toIsoDateTimeRange(dateRange), [dateRange]);

  const { branches, selectedBranches, setSelectedBranches, branchesSelected } =
    useAdminBranchSelection();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["guest-voice", selectedBranches, dateRange.preset, dateRange.from, dateRange.to],
    queryFn: () =>
      api.getGuestVoiceSummary({
        from: apiRange.from,
        to: apiRange.to,
        branchIds:
          selectedBranches.length > 0 && selectedBranches.length < branches.length
            ? selectedBranches
            : undefined,
      }),
    enabled: branchesSelected,
  });

  const scrollToReviews = useCallback(() => {
    window.setTimeout(() => {
      document.getElementById("guest-voice-reviews-table")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }, []);

  const applyListFilters = useCallback(
    (patch: Partial<ReviewListFilters>) => {
      setListFilters({ ...EMPTY_REVIEW_FILTERS, ...patch });
      scrollToReviews();
    },
    [scrollToReviews],
  );

  const clearListFilters = useCallback(() => {
    setListFilters(EMPTY_REVIEW_FILTERS);
  }, []);

  const topTags = Object.entries(data?.improvementTagCounts ?? {})
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const categoryAverages = Object.entries(data?.categoryAverageRatings ?? {})
    .filter(([, avg]) => avg > 0)
    .sort((a, b) => b[1] - a[1]);

  const reviewItems = data?.reviews ?? [];

  return (
    <div className="space-y-4 pb-8 md:space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("heroDescription")}
        action={
          <DateRangeSelector
            value={dateRange}
            onChange={setDateRange}
            testId="guest-voice-date-range"
          />
        }
      />

      <div className="guest-voice-toolbar">
        <BranchMultiSelect
          branches={branches}
          selected={selectedBranches}
          onChange={setSelectedBranches}
          className="max-w-full sm:max-w-xs"
        />
      </div>

      {(isLoading || isFetching) && !data ? (
        <AdminDataSkeleton rows={4} />
      ) : !data ? (
        <p className="text-sm text-muted-foreground">{t("unavailable")}</p>
      ) : (
        <>
          <GuestVoiceStatsStrip
            avgRating={data.totalReviews > 0 ? `${data.averageRating.toFixed(1)}★` : "—"}
            totalReviews={data.totalReviews}
            promoters={data.promotersCount}
            needsAttention={data.openRecoveries.length}
            labels={{
              avgRating: t("avgRating"),
              totalReviews: t("totalReviews"),
              promoters: t("promoters"),
              needsAttention: t("needsAttention"),
            }}
            onAvgClick={() => {
              clearListFilters();
              scrollToReviews();
            }}
            onReviewsClick={() => applyListFilters({})}
            onPromotersClick={() => applyListFilters({ minRating: "4" })}
            onAttentionClick={() => applyListFilters({ maxRatingExclusive: "4" })}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border bg-card p-4 space-y-3">
              <h2 className="font-semibold">{t("ratingMix")}</h2>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = data.ratingDistribution[stars] ?? 0;
                  const pct = data.totalReviews > 0 ? Math.round((count / data.totalReviews) * 100) : 0;
                  const tone = ratingTone(stars);
                  return (
                    <button
                      key={stars}
                      type="button"
                      disabled={count === 0}
                      onClick={() => applyListFilters({ exactRating: String(stars) })}
                      data-testid={`guest-voice-rating-mix-${stars}`}
                      className={cn(
                        "flex w-full items-center gap-2 text-sm rounded-lg px-2 py-1.5 transition",
                        count > 0 ? "hover:bg-muted/60 cursor-pointer" : "opacity-50 cursor-default",
                      )}
                    >
                      <span className="w-8 text-left font-medium">{stars}★</span>
                      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                        <div className={cn("h-full", tone.bar)} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-10 text-right font-semibold tabular-nums">{count}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border bg-card p-4 space-y-3">
              <h2 className="font-semibold">{t("improvementAreas")}</h2>
              {topTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noTagsYet")}</p>
              ) : (
                <ul className="space-y-2">
                  {topTags.map(([tag, count]) => (
                    <li key={tag} className="flex items-center justify-between text-sm">
                      <span>{TAG_LABELS[tag] ?? tag}</span>
                      <span className="font-medium">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {categoryAverages.length > 0 && (
            <section className="rounded-2xl border bg-card p-4 space-y-3">
              <h2 className="font-semibold">{t("categoryBreakdown")}</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {categoryAverages.map(([category, avg]) => {
                  const rounded = Math.round(avg);
                  const tone = ratingTone(Math.min(5, Math.max(1, rounded)));
                  return (
                    <div
                      key={category}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-3 py-2 text-sm",
                        tone.row,
                      )}
                    >
                      <span>{CATEGORY_LABELS[category] ?? category}</span>
                      <span className="font-semibold">{avg.toFixed(1)}★</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <div ref={tableRef}>
            <GuestVoiceReviewsTable
              reviews={reviewItems}
              filters={listFilters}
              sortKey={sortKey}
              onFiltersChange={setListFilters}
              onSortChange={setSortKey}
              onClearFilters={clearListFilters}
            />
          </div>

          {data.openRecoveries.length > 0 && (
            <section
              id="guest-voice-recoveries"
              className="rounded-2xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 p-4 space-y-3 scroll-mt-24"
            >
              <h2 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                {t("openRecoveries")}
              </h2>
              <ul className="space-y-3">
                {data.openRecoveries.slice(0, 8).map((item) => {
                  const tone = ratingTone(item.overallRating);
                  return (
                    <li
                      key={item.recoveryId}
                      className={cn("rounded-xl border border-amber-200/60 bg-background/70 p-3 space-y-2", tone.row)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{item.customerFirstName ?? t("unknownCustomer")}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.branchName ?? t("unknownBranch")} · {formatReviewDate(item.createdAt)}
                          </p>
                        </div>
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold ring-1", tone.badge)}>
                          {item.overallRating}/5
                        </span>
                      </div>
                      {item.improvementTags && item.improvementTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {item.improvementTags.map((tag) => (
                            <span key={tag} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs dark:bg-amber-950/50">
                              {TAG_LABELS[tag] ?? tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.comment && (
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap">{item.comment}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
