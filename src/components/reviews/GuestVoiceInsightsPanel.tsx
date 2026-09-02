"use client";

import { useTranslations } from "next-intl";
import { BarChart3, MessageSquare, Tags } from "lucide-react";
import { CompactStatsStrip } from "@/components/CompactStatsStrip";
import { CATEGORY_LABELS, TAG_LABELS, ratingTone } from "@/components/reviews/guest-voice-utils";
import { cn } from "@/lib/utils";

const STAR_ORDER = [5, 4, 3, 2, 1] as const;

function GuestVoiceSectionHead({
  title,
  icon: Icon,
  variant = "metrics",
}: {
  title: string;
  icon: typeof BarChart3;
  variant?: "metrics" | "insight";
}) {
  return (
    <div
      className={cn(
        "dashboard-overview-section-head",
        variant === "metrics" && "dashboard-overview-section-head--metrics",
        variant === "insight" && "guest-voice-section-head--insight"
      )}
    >
      <span
        className={cn(
          "dashboard-overview-section-icon",
          variant === "metrics" && "dashboard-overview-section-icon--metrics",
          variant === "insight" && "guest-voice-section-icon--insight"
        )}
        aria-hidden
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <h2 className="dashboard-overview-section-title">{title}</h2>
    </div>
  );
}

function RatingMixChart({
  distribution,
  totalReviews,
  onSelectRating,
}: {
  distribution: Record<number, number>;
  totalReviews: number;
  onSelectRating: (stars: number) => void;
}) {
  const maxCount = Math.max(...STAR_ORDER.map((stars) => distribution[stars] ?? 0), 1);

  return (
    <div className="guest-voice-rating-panel">
      <div className="guest-voice-rating-chart" role="group" aria-label="Rating distribution">
        {STAR_ORDER.map((stars) => {
          const count = distribution[stars] ?? 0;
          const height = Math.max(count > 0 ? 14 : 6, Math.round((count / maxCount) * 100));
          const tone = ratingTone(stars);
          return (
            <button
              key={stars}
              type="button"
              disabled={count === 0}
              data-testid={`guest-voice-rating-mix-${stars}`}
              onClick={() => onSelectRating(stars)}
              className={cn(
                "guest-voice-rating-col touch-manipulation",
                count > 0 ? "guest-voice-rating-col--active" : "guest-voice-rating-col--empty"
              )}
            >
              <span className="guest-voice-rating-count tabular-nums">{count}</span>
              <div className="guest-voice-rating-bar-track">
                <div
                  className={cn("guest-voice-rating-bar", tone.bar)}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="guest-voice-rating-star">{stars}★</span>
            </button>
          );
        })}
      </div>
      {totalReviews > 0 ? (
        <p className="guest-voice-rating-footnote">{totalReviews} reviews · tap a bar to filter</p>
      ) : null}
    </div>
  );
}

export function GuestVoiceInsightsPanel({
  ratingDistribution,
  totalReviews,
  topTags,
  categoryAverages,
  onRatingFilter,
  onTagClick,
}: {
  ratingDistribution: Record<number, number>;
  totalReviews: number;
  topTags: [string, number][];
  categoryAverages: [string, number][];
  onRatingFilter: (stars: number) => void;
  onTagClick?: (tag: string) => void;
}) {
  const t = useTranslations("admin.guestVoice");

  const categoryItems = categoryAverages.map(([category, avg], index) => {
    const rounded = Math.round(avg);
    const accent =
      rounded >= 4 ? "emerald" : rounded >= 3 ? "sky" : rounded >= 2 ? "amber" : "violet";
    return {
      id: category,
      label: CATEGORY_LABELS[category] ?? category,
      value: `${avg.toFixed(1)}★`,
      accent: accent as "emerald" | "sky" | "amber" | "violet",
      featured: index === 0,
    };
  });

  return (
    <>
      <div className="guest-voice-insights-block">
        <GuestVoiceSectionHead title={t("ratingMix")} icon={BarChart3} />
        <RatingMixChart
          distribution={ratingDistribution}
          totalReviews={totalReviews}
          onSelectRating={onRatingFilter}
        />
      </div>

      <div className="guest-voice-insights-split">
        <div className="guest-voice-insights-block guest-voice-insights-block--half">
          <GuestVoiceSectionHead title={t("improvementAreas")} icon={Tags} variant="insight" />
          {topTags.length === 0 ? (
            <p className="guest-voice-insights-empty">{t("noTagsYet")}</p>
          ) : (
            <div className="guest-voice-theme-chips">
              {topTags.map(([tag, count]) => (
                <button
                  key={tag}
                  type="button"
                  className="guest-voice-theme-chip touch-manipulation"
                  onClick={() => onTagClick?.(tag)}
                >
                  <span className="guest-voice-theme-chip-label">{TAG_LABELS[tag] ?? tag}</span>
                  <span className="guest-voice-theme-chip-count tabular-nums">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {categoryItems.length > 0 ? (
          <div className="guest-voice-insights-block guest-voice-insights-block--half">
            <GuestVoiceSectionHead title={t("categoryBreakdown")} icon={MessageSquare} />
            <CompactStatsStrip
              testId="guest-voice-category-strip"
              items={categoryItems}
              className="guest-voice-category-strip"
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
