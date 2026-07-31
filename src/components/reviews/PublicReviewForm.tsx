"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { api, PublicReviewContext, SubmitPublicReviewResult } from "@/lib/api";
import { StarRatingRow } from "@/components/reviews/StarRatingRow";
import { ReviewTagChip } from "@/components/reviews/ReviewTagChip";

const TAG_LABELS: Record<string, string> = {
  WAIT_TIME: "Wait time",
  STAFF_ATTITUDE: "Staff attitude",
  SERVICE_QUALITY: "Service quality",
  CLEANLINESS: "Cleanliness",
  VALUE_FOR_MONEY: "Value for money",
  OTHER: "Something else",
};

type Props = {
  token: string;
  context: PublicReviewContext;
};

export function PublicReviewForm({ token, context }: Props) {
  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [overallHover, setOverallHover] = useState<number | null>(null);
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>({});
  const [categoryHover, setCategoryHover] = useState<{ id: string; value: number } | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SubmitPublicReviewResult | null>(null);

  const categoryOptions = useMemo(
    () => context.categoryOptions ?? [],
    [context.categoryOptions],
  );

  const tagOptions = useMemo(
    () => context.improvementTagOptions?.map((tag) => ({ id: tag, label: TAG_LABELS[tag] ?? tag })) ?? [],
    [context.improvementTagOptions],
  );

  const showDetails = overallRating != null;
  const tagPrompt =
    overallRating != null && overallRating >= 4
      ? "What did you enjoy most?"
      : "What could we improve?";

  function setCategoryRating(id: string, value: number) {
    setCategoryRatings((prev) => ({ ...prev, [id]: value }));
  }

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function categoryHoverValue(id: string): number | null {
    return categoryHover?.id === id ? categoryHover.value : null;
  }

  function allCategoriesRated(): boolean {
    return categoryOptions.every((option) => categoryRatings[option.id] != null);
  }

  async function submit() {
    if (overallRating == null) {
      setError("Please choose an overall rating.");
      return;
    }
    if (!allCategoriesRated()) {
      setError("Please rate all categories before submitting.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await api.submitPublicReview({
        token,
        overallRating,
        categoryRatings,
        improvementTags: tags,
        comment: comment.trim() || undefined,
      });
      setResult(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  if (context.alreadySubmitted) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-center space-y-2">
        <p className="text-lg font-semibold">Thank you!</p>
        <p className="text-sm text-muted-foreground">
          You already shared feedback for your visit at {context.branchName}.
        </p>
        {context.submittedRating != null && (
          <p className="text-sm font-medium">Your overall rating: {context.submittedRating}/5</p>
        )}
      </div>
    );
  }

  if (result) {
    return (
      <div className="rounded-2xl border bg-card p-6 space-y-4 text-center">
        <p className="text-lg font-semibold">{result.thankYouMessage}</p>
        {result.promptGoogleReview && result.googleReviewUrl && (
          <a
            href={result.googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Share on Google
          </a>
        )}
        {result.recoveryCreated && (
          <p className="text-xs text-muted-foreground">
            Your feedback was sent privately to the branch manager so we can improve.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-6 space-y-6">
      <div className="space-y-1 text-center">
        <p className="text-sm text-muted-foreground">{context.branchName}</p>
        <h1 className="text-xl font-semibold">Hi {context.customerFirstName}, how was your visit?</h1>
        <p className="text-sm text-muted-foreground">Rate your experience — takes about a minute.</p>
      </div>

      <section className="space-y-3 rounded-xl border bg-muted/20 p-4">
        <h2 className="text-sm font-semibold text-center">Overall experience</h2>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((value) => {
            const displayRating = overallHover ?? overallRating ?? 0;
            return (
              <button
                key={value}
                type="button"
                aria-label={`Overall: ${value} stars`}
                onMouseEnter={() => setOverallHover(value)}
                onMouseLeave={() => setOverallHover(null)}
                onClick={() => setOverallRating(value)}
                className="p-1"
              >
                <Star
                  className={`w-10 h-10 ${
                    value <= displayRating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </section>

      {showDetails && (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Rate by category</h2>
            <div className="space-y-3">
              {categoryOptions.map((option) => (
                <StarRatingRow
                  key={option.id}
                  label={option.label}
                  value={categoryRatings[option.id] ?? null}
                  hover={categoryHoverValue(option.id)}
                  onChange={(value) => setCategoryRating(option.id, value)}
                  onHover={(value) =>
                    setCategoryHover(value == null ? null : { id: option.id, value })
                  }
                  required
                />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">{tagPrompt}</h2>
              {tags.length > 0 && (
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  {tags.length} selected
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Optional — tap all that apply</p>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((tag) => (
                <ReviewTagChip
                  key={tag.id}
                  label={tag.label}
                  selected={tags.includes(tag.id)}
                  onToggle={() => toggleTag(tag.id)}
                />
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Your review</h2>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share more about your visit (optional)"
              rows={4}
              maxLength={2000}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{comment.length}/2000</p>
          </section>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={submitting || overallRating == null || (showDetails && !allCategoriesRated())}
        onClick={() => void submit()}
        className="w-full min-h-12 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </div>
  );
}
