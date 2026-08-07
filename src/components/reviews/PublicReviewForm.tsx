"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Star } from "lucide-react";
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

function copyToClipboard(text: string) {
  if (!text || typeof navigator === "undefined") return;
  void navigator.clipboard?.writeText(text).catch(() => {});
}

function ReviewSuccess({
  context,
  result,
}: {
  context: PublicReviewContext;
  result: SubmitPublicReviewResult;
}) {
  const [redirectBlocked, setRedirectBlocked] = useState(false);

  useEffect(() => {
    if (!result.autoRedirectGoogle || !result.googleReviewUrl) return;

    if (result.suggestedPublicReviewText) {
      copyToClipboard(result.suggestedPublicReviewText);
    }

    const opened = window.open(result.googleReviewUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      setRedirectBlocked(true);
    }
  }, [result]);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm text-center space-y-5">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
        <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
          {result.thankYouMessage}
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Your {result.overallRating}-star rating for {context.branchName} has been recorded.
        </p>
      </div>

      <div className="flex justify-center gap-1" aria-label={`${result.overallRating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Star
            key={value}
            className={`h-6 w-6 ${
              value <= result.overallRating
                ? "fill-amber-400 text-amber-400"
                : "text-[var(--text-tertiary)]/30"
            }`}
          />
        ))}
      </div>

      <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
        {result.recoveryCreated
          ? "Your feedback was sent to the branch team for follow-up. We appreciate you helping us improve."
          : "We appreciate you taking the time to share your experience."}
      </p>

      {redirectBlocked && result.googleReviewUrl && (
        <p className="text-xs text-[var(--text-tertiary)]">
          Your browser blocked a background window.{" "}
          <a
            href={result.googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--brand-text)] underline-offset-2 hover:underline"
          >
            Continue here
          </a>
        </p>
      )}

      {!result.autoRedirectGoogle && result.promptGoogleReview && result.googleReviewUrl && (
        <a
          href={result.googleReviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm font-medium text-[var(--brand-text)] underline-offset-2 hover:underline"
        >
          Share your experience publicly
        </a>
      )}
    </div>
  );
}

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

  const autoPublishMinRating = context.googleAutoPublishMinRating ?? 4;
  const showDetails = overallRating != null;
  const tagPrompt =
    overallRating != null && overallRating >= autoPublishMinRating
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
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center space-y-3 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-lg font-semibold text-[var(--text-primary)]">Thank you</p>
        <p className="text-sm text-[var(--text-secondary)]">
          You already shared feedback for your visit at {context.branchName}.
        </p>
        {context.submittedRating != null && (
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Your overall rating: {context.submittedRating}/5
          </p>
        )}
      </div>
    );
  }

  if (result) {
    return <ReviewSuccess context={context} result={result} />;
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-6 shadow-sm">
      <div className="space-y-1 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
          {context.branchName}
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
          Hi {context.customerFirstName}, how was your visit?
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">Rate your experience — takes about a minute.</p>
      </div>

      <section className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/40 p-4">
        <h2 className="text-sm font-semibold text-center text-[var(--text-primary)]">Overall experience</h2>
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
                className="p-1 touch-manipulation"
              >
                <Star
                  className={`w-10 h-10 ${
                    value <= displayRating
                      ? "fill-amber-400 text-amber-400"
                      : "text-[var(--text-tertiary)]/30"
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
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Rate by category</h2>
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
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{tagPrompt}</h2>
              {tags.length > 0 && (
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  {tags.length} selected
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">Optional — tap all that apply</p>
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
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Your review</h2>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share more about your visit (optional)"
              rows={4}
              maxLength={2000}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm resize-none"
            />
            <p className="text-xs text-[var(--text-tertiary)] text-right">{comment.length}/2000</p>
          </section>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={submitting || overallRating == null || (showDetails && !allCategoriesRated())}
        onClick={() => void submit()}
        className="w-full min-h-12 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50 touch-manipulation"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </div>
  );
}
